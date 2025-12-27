import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '~/db';
import { linkedinProfile } from '~/db/schemas';
import { createId } from '~/db/schemas/helpers';
import { AppError } from '~/lib/errors';
import {
  extractLinkedInUsername,
  isLikelyUsername,
} from '~/lib/linkedin/parse';
import type { LinkedInRawProfile } from '~/lib/linkedin/schema';
import { LinkedInRawProfileSchema } from '~/lib/linkedin/schema';
import { createExternalServiceError } from '~/lib/utils';

const RAPID_API_URL = 'real-time-people-company-data.p.rapidapi.com';

// Request deduplication: Track pending API requests by username
// This prevents multiple simultaneous requests for the same profile
const pendingRequests = new Map<
  string,
  Promise<{ data: LinkedInRawProfile; lastAnalysedAt: Date }>
>();

const BodySchema = z
  .object({
    url: z.url().optional(),
    username: z.string().optional(),
    forceRefresh: z.boolean().optional(), // bypass cache and fetch fresh
  })
  .refine((v) => Boolean(v.url || v.username), {
    message: 'Either url or username must be provided',
    path: ['url'],
  });

if (process.env.DEBUG_LINKEDIN_ROUTE === '1') {
  console.log('[LinkedIn][route] BodySchema:', BodySchema);
  console.log(
    '[LinkedIn][route] LinkedInRawProfileSchema:',
    LinkedInRawProfileSchema
  );
}

/**
 * Fetches a LinkedIn profile from the external API and stores it in the database.
 * This function is used for request deduplication - multiple calls for the same
 * username will share the same promise.
 */
async function fetchProfileFromAPI(
  username: string
): Promise<{ data: LinkedInRawProfile; lastAnalysedAt: Date }> {
  const apiHost = RAPID_API_URL;
  const apiKey = process.env.RAPID_API_KEY;

  if (!apiKey) {
    throw new AppError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Server is not configured for LinkedIn fetch (missing RAPID_API_KEY).',
    });
  }

  const endpoint = `https://${apiHost}/?username=${encodeURIComponent(
    username
  )}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppError({
        code: 'TIMEOUT',
        message: 'Request to LinkedIn API timed out after 30 seconds',
        cause: err,
      });
    }
    throw createExternalServiceError(
      'LinkedIn API',
      'Failed to fetch profile',
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw createExternalServiceError(
      'LinkedIn API',
      `Failed to fetch LinkedIn profile data: ${
        text || `Status ${res.status}`
      }`,
      { status: res.status, response: text }
    );
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new AppError({
      code: 'PARSE_ERROR',
      message: 'Failed to parse response from LinkedIn API',
      cause: err,
    });
  }

  const validated = LinkedInRawProfileSchema.safeParse(raw);
  if (!validated.success) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        '[LinkedIn][route] Validation errors:',
        validated.error.issues
      );
    }
    throw new AppError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'LinkedIn API returned invalid data structure',
      cause: validated.error,
    });
  }

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_LINKEDIN_ROUTE === '1'
  ) {
    console.dir(
      {
        tag: '[LinkedIn][route] fetch response',
        ok: res.ok,
        status: res.status,
        endpoint,
        body: validated.data,
      },
      { depth: 3, colors: true }
    );
  }

  // From this point on, always use the validated data (profileData), not the raw response.
  const profileData = validated.data;
  const now = new Date();

  const fullName =
    [profileData.firstName, profileData.lastName].filter(Boolean).join(' ') ||
    null;
  const updateData = {
    fullName,
    headline: profileData.headline || null,
    profilePicture: profileData.profilePicture || null,
    location: profileData.geo?.full || null,
    summary: profileData.summary || null,
    rawData: profileData,
    lastAnalysedAt: now,
  };

  // Use upsert to avoid race conditions
  await db
    .insert(linkedinProfile)
    .values({
      id: createId('lpro'),
      username,
      ...updateData,
    })
    .onConflictDoUpdate({
      target: linkedinProfile.username,
      set: updateData,
    });

  return {
    data: profileData,
    lastAnalysedAt: now,
  };
}

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch (err) {
      throw new AppError({
        code: 'PARSE_ERROR',
        message: 'Invalid request body. Expected JSON.',
        cause: err,
      });
    }

    const body = BodySchema.parse(json);

    let username: string | null = null;
    if (body.username && isLikelyUsername(body.username)) {
      username = body.username.trim();
    } else if (body.url) {
      username = extractLinkedInUsername(body.url);
    }

    if (!username) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL or username for a personal profile' },
        { status: 400 }
      );
    }

    if (!body.forceRefresh) {
      const cached = await db.query.linkedinProfile.findFirst({
        where: eq(linkedinProfile.username, username),
      });

      if (cached) {
        return NextResponse.json(
          {
            data: cached.rawData,
            lastAnalysedAt: cached.lastAnalysedAt.toISOString(),
            cached: true,
          },
          { status: 200 }
        );
      }
    }

    // Deduplication strategy:
    // If there's already a pending request for this username, wait for that
    // in-flight request to complete instead of starting a new one. This
    // ensures concurrent requests for the same profile share a single
    // upstream API call, preserving our concurrency optimization.
    const existingRequest = pendingRequests.get(username);
    if (existingRequest) {
      try {
        const result = await existingRequest;
        return NextResponse.json(
          {
            data: result.data,
            lastAnalysedAt: result.lastAnalysedAt.toISOString(),
            cached: false,
          },
          { status: 200 }
        );
      } catch (err) {
        pendingRequests.delete(username);
        throw err;
      }
    }

    const fetchPromise = fetchProfileFromAPI(username);
    pendingRequests.set(username, fetchPromise);

    try {
      const result = await fetchPromise;
      return NextResponse.json(
        {
          data: result.data,
          lastAnalysedAt: result.lastAnalysedAt.toISOString(),
          cached: false,
        },
        { status: 200 }
      );
    } finally {
      pendingRequests.delete(username);
    }
  } catch (err) {
    console.error('[LinkedIn][route] Error:', err);

    if (err instanceof AppError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: err.getStatusFromCode() }
      );
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: err.issues.map((issue) => issue.message).join(', '),
        },
        { status: 400 }
      );
    }

    // Generic fallback handler: ensure any unexpected error is caught and reported as a 500.
    return NextResponse.json(
      {
        error: 'Unexpected server error while fetching LinkedIn profile.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
