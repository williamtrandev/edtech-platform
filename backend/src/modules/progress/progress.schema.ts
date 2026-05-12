import { z } from "zod";

export const createLessonProgressSchema = z.object({
  body: z.object({
    lessonId: z.string().min(1),
    isCompleted: z.boolean().default(true)
  })
});

export const courseProgressParamSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  })
});
