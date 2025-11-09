import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  extractLinkedInUsername,
  isLikelyUsername,
} from '~/lib/linkedin/parse';
import { LinkedInRawProfileSchema } from '~/lib/linkedin/schema';

const RAPID_API_URL = 'real-time-people-company-data.p.rapidapi.com';

const BodySchema = z
  .object({
    url: z.url().optional(),
    username: z.string().optional(),
  })
  .refine((v) => Boolean(v.url || v.username), {
    message: 'Either url or username must be provided',
    path: ['url'],
  });

// Server-side schema logs

console.log('[LinkedIn][route] BodySchema:', BodySchema);

console.log(
  '[LinkedIn][route] LinkedInRawProfileSchema:',
  LinkedInRawProfileSchema
);

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
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

    const apiHost = RAPID_API_URL;
    const apiKey = process.env.RAPID_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Server is not configured for LinkedIn fetch (missing RAPID_API_KEY).',
        },
        { status: 500 }
      );
    }

    const endpoint = `https://${apiHost}/?username=${encodeURIComponent(
      username
    )}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'Failed to fetch LinkedIn profile data',
          details: text || `Status ${res.status}`,
        },
        { status: res.status }
      );
    }

    const raw = await res.json();
    console.dir(
      {
        tag: '[LinkedIn][route] fetch response',
        ok: res.ok,
        status: res.status,
        endpoint,
        body: raw,
      },
      { depth: Infinity, colors: true }
    );
    // Bypass schema validation and return raw payload
    return NextResponse.json({ data: raw }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected server error while fetching LinkedIn profile.' },
      { status: 500 }
    );
  }
}
