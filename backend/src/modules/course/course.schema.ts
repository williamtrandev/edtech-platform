import { z } from "zod";

const courseStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "LOCKED"]);
const courseSortSchema = z.enum(["newest", "oldest", "popular", "highest-rated", "title"]);
const enrollmentFilterSchema = z.enum(["all", "enrolled", "not-enrolled"]);
const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional();
const optionalNullableTrimmedString = (max: number) => optionalTrimmedString(max).nullable();
const mediaUrlSchema = z
  .string()
  .min(1)
  .max(2000)
  .refine((value) => value.startsWith("/uploads/") || z.string().url().safeParse(value).success, {
    message: "Must be an absolute URL or uploaded media path"
  });

export const listCoursesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: courseStatusSchema.optional(),
    search: z.string().trim().max(200).optional(),
    category: optionalTrimmedString(100),
    level: optionalTrimmedString(100),
    language: optionalTrimmedString(100),
    instructorId: optionalTrimmedString(200),
    enrollment: enrollmentFilterSchema.default("all"),
    sort: courseSortSchema.default("newest")
  })
});

export const courseFacetsSchema = z.object({
  query: z.object({
    status: courseStatusSchema.optional()
  })
});

export const courseSearchSuggestionsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(120).default(""),
    limit: z.coerce.number().int().min(1).max(20).default(8)
  })
});

export const courseSearchEventSchema = z.object({
  body: z.object({
    term: z.string().trim().min(1).max(120)
  })
});

export const courseIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const lockCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    reason: z.string().trim().max(1000).optional()
  })
});

export const assignCourseInstructorSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      instructorId: z.string().trim().min(1).max(200)
    })
    .strict()
});

export const courseEnrollmentsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional()
  })
});

const requiredTrimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(1000),
    category: requiredTrimmedString(1, 100),
    level: requiredTrimmedString(1, 100),
    language: requiredTrimmedString(1, 100),
    durationMinutes: z.coerce.number().int().min(1).max(100000),
    requirements: requiredTrimmedString(1, 2000),
    outcomes: requiredTrimmedString(1, 2000),
    coverImageUrl: mediaUrlSchema,
    priceCents: z.coerce.number().int().min(0).max(10_000_000).default(0),
    currency: z.string().trim().length(3).default("USD"),
    status: courseStatusSchema.default("DRAFT")
  })
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    category: optionalNullableTrimmedString(100),
    level: optionalNullableTrimmedString(100),
    language: optionalNullableTrimmedString(100),
    durationMinutes: z.coerce.number().int().min(1).max(100000).nullable().optional(),
    requirements: optionalNullableTrimmedString(2000),
    outcomes: optionalNullableTrimmedString(2000),
    coverImageUrl: mediaUrlSchema.nullable().optional(),
    priceCents: z.coerce.number().int().min(0).max(10_000_000).optional(),
    currency: z.string().trim().length(3).optional(),
    status: courseStatusSchema.optional()
  })
});
