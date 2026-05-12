import { z } from "zod";

const courseStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const listCoursesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: courseStatusSchema.optional()
  })
});

export const courseIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
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
    status: courseStatusSchema.optional()
  })
});
