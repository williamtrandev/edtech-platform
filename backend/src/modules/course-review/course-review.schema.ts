import { z } from "zod";

export const listCourseReviewsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const upsertCourseReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).nullable().optional()
  })
});

export const courseReviewMeSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});
