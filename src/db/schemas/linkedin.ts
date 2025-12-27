import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { LinkedInRawProfile } from '~/lib/linkedin/schema';
import { lifecycle_dates } from './helpers';

export const linkedinProfile = pgTable(
  'linkedin_profile',
  {
    id: text('id').primaryKey(),

    username: text('username').notNull(),

    // Denormalized fields for easy display without parsing rawData
    fullName: text('full_name'),
    headline: text('headline'),
    profilePicture: text('profile_picture'),
    location: text('location'),
    summary: text('summary'),

    rawData: jsonb('raw_data').$type<LinkedInRawProfile>().notNull(),

    // When we last fetched from API (what user sees as "last analysed")
    lastAnalysedAt: timestamp('last_analysed_at').notNull(),

    ...lifecycle_dates,
  },
  (table) => [uniqueIndex('linkedin_profile_username_idx').on(table.username)]
);

export type LinkedinProfile = typeof linkedinProfile.$inferSelect;
export type NewLinkedinProfile = typeof linkedinProfile.$inferInsert;
