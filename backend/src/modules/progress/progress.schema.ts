import { z } from "zod";

export const createLessonProgressSchema = z.object({
  body: z
    .object({
      lessonId: z.string().min(1),
      isCompleted: z.boolean().optional(),
      watchPositionSeconds: z.number().int().min(0).optional()
    })
    .refine((value) => value.isCompleted !== undefined || value.watchPositionSeconds !== undefined, {
      message: "Provide isCompleted and/or watchPositionSeconds"
    })
});

export const courseProgressParamSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  })
});

export const courseLessonProgressParamSchema = courseProgressParamSchema;

export const syncLessonProgressSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          clientEventId: z.string().trim().min(1).max(128),
          lessonId: z.string().min(1),
          isCompleted: z.boolean().optional(),
          watchPositionSeconds: z.number().int().min(0).optional(),
          recordedAt: z.string().datetime().optional()
        })
      )
      .min(1)
      .max(50)
  })
});
