import { z } from "zod";

export const courseLessonsParamSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  })
});

export const createLessonSchema = z.object({
  body: z.object({
    courseId: z.string().min(1),
    title: z.string().min(3).max(200),
    contentType: z.enum(["VIDEO", "TEXT", "RESOURCE"]),
    content: z.string().min(1),
    sortOrder: z.coerce.number().int().min(1)
  })
});
