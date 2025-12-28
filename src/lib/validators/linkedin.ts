import * as z from 'zod/v4';
import { isLikelyUsername } from '~/lib/linkedin/parse';

export const usernameQueryParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((val) => isLikelyUsername(val), {
    message: 'Invalid username format in query parameter',
  });

export const profileFormInputSchema = z
  .object({
    input: z
      .string()
      .trim()
      .min(3, 'Please enter a LinkedIn profile URL or username')
      .max(2048, 'Input exceeds maximum length of 2048 characters')
      .refine(
        (val) => {
          const trimmed = val.trim();
          if (!trimmed) return false;

          if (isLikelyUsername(trimmed)) {
            return true;
          }

          try {
            const url = new URL(
              trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
            );
            const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
            if (
              hostname !== 'linkedin.com' &&
              hostname !== 'linkedin.cn' &&
              !hostname.endsWith('.linkedin.com') &&
              !hostname.endsWith('.linkedin.cn')
            ) {
              return false;
            }
            const pathname = url.pathname.toLowerCase();
            return (
              pathname.includes('/in/') ||
              pathname.includes('/pub/') ||
              pathname.split('/').includes('in')
            );
          } catch {
            return false;
          }
        },
        { message: 'Enter a valid LinkedIn personal profile URL or username' }
      )
      .transform((val) => val.trim()),
  });

export const linkedinApiBodySchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, 'URL cannot be empty')
      .max(2048, 'URL exceeds maximum length of 2048 characters')
      .url('Invalid URL format')
      .optional(),
    username: z
      .string()
      .trim()
      .min(1, 'Username cannot be empty')
      .max(100, 'Username exceeds maximum length of 100 characters')
      .regex(
        /^[a-zA-Z0-9-]+$/,
        'Username can only contain letters, numbers, and hyphens'
      )
      .optional(),
    forceRefresh: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.url || v.username), {
    message: 'Either url or username must be provided',
    path: ['url'],
  })
  .refine(
    (v) => {
      if (v.url) {
        try {
          const url = new URL(v.url);
          const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
          return (
            hostname === 'linkedin.com' ||
            hostname === 'linkedin.cn' ||
            hostname.endsWith('.linkedin.com') ||
            hostname.endsWith('.linkedin.cn')
          );
        } catch {
          return false;
        }
      }
      return true;
    },
    {
      message: 'URL must be a valid LinkedIn profile URL',
      path: ['url'],
    }
  );
