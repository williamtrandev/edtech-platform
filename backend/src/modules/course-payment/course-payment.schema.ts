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
