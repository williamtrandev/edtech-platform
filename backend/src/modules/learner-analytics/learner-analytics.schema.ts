import { z } from "zod";

export const courseLearnerAnalyticsParamSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  })
});
