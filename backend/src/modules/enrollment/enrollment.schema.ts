import { z } from "zod";

export const createEnrollmentSchema = z.object({
  body: z.object({
    courseId: z.string().min(1)
  })
});
