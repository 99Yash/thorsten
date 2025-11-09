import { z } from 'zod';

const datePartSchema = z
  .object({
    year: z.number().int().optional(),
    month: z.number().int().optional(),
    day: z.number().int().optional(),
  })
  .partial();

const looseObjectSchema = z.looseObject({});

const imageItemSchema = z
  .object({
    url: z.url(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
  })
  .partial();

const certificationSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    issuer: z.string().optional(),
    date: z.string().optional(),
    issued: z.string().optional(),
    year: z.union([z.number().int(), z.string()]).optional(),
    url: z.url().optional(),
  })
  .loose();

const projectSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional(),
  })
  .loose();

const projectsCollectionSchema = z
  .object({
    total: z.number().optional(),
    items: z.array(projectSchema).optional(),
  })
  .loose();

const educationSchema = z.object({
  start: datePartSchema.optional(),
  end: datePartSchema.optional(),
  fieldOfStudy: z.string().optional(),
  degree: z.string().optional(),
  grade: z.string().optional(),
  schoolName: z.string().optional(),
  description: z.string().optional(),
  activities: z.string().optional(),
  url: z.url().optional(),
  schoolId: z.string().or(z.number()).optional(),
  logo: z.array(imageItemSchema).nullable().optional(),
});

const positionSchema = z.object({
  companyId: z.string().or(z.number()).optional(),
  companyName: z.string().optional(),
  companyUsername: z.string().optional(),
  companyURL: z.url().optional(),
  companyLogo: z.url().optional(),
  companyIndustry: z.string().optional(),
  companyStaffCountRange: z.string().optional(),
  title: z.string().optional(),
  multiLocaleTitle: z.record(z.string(), z.string()).optional(),
  multiLocaleCompanyName: z.record(z.string(), z.string()).optional(),
  location: z.string().optional(),
  locationType: z.string().optional(),
  description: z.string().optional(),
  employmentType: z.string().optional(),
  start: datePartSchema.optional(),
  end: datePartSchema.optional(),
});

export const LinkedInRawProfileSchema = z
  .object({
    id: z.number().optional(),
    urn: z.string().optional(),
    username: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    isPremium: z.boolean().optional(),
    isOpenToWork: z.boolean().optional(),
    isHiring: z.boolean().optional(),
    profilePicture: z.url().optional(),
    profilePictures: z.array(imageItemSchema).optional(),
    summary: z.string().optional(),
    headline: z.string().optional(),
    geo: z
      .object({
        country: z.string().optional(),
        city: z.string().optional(),
        full: z.string().optional(),
        countryCode: z.string().optional(),
      })
      .optional(),
    skills: z
      .array(
        z
          .object({
            name: z.string().optional(),
          })
          .loose()
      )
      .optional(),
    educations: z.array(educationSchema).optional(),
    position: z.array(positionSchema).optional(),
    fullPositions: z.array(positionSchema).optional(),
    languages: z
      .array(
        z
          .object({
            name: z.string().optional(),
            proficiency: z.string().optional(),
          })
          .loose()
      )
      .optional(),
    certifications: z.array(certificationSchema).optional(),
    projects: z
      .union([z.array(projectSchema), projectsCollectionSchema])
      .optional(),
    supportedLocales: z
      .array(z.union([z.string(), looseObjectSchema]))
      .optional(),
    multiLocaleFirstName: z.record(z.string(), z.string()).optional(),
    multiLocaleLastName: z.record(z.string(), z.string()).optional(),
    multiLocaleHeadline: z.record(z.string(), z.string()).optional(),
  })
  .partial()
  .loose();

export type LinkedInRawProfile = z.infer<typeof LinkedInRawProfileSchema>;
export type LinkedInCertification = z.infer<typeof certificationSchema>;
export type LinkedInProject = z.infer<typeof projectSchema>;
