import { z } from "zod";

export const createCoursePaymentSchema = z.object({
  body: z.object({
    courseId: z.string().min(1)
  })
});

export const coursePaymentStatusSchema = z.object({
  query: z.object({
    courseId: z.string().min(1)
  })
});

export const listMyCoursePaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});
