import { z } from "zod";
import { LESSON_PROGRESS_WEIGHT } from "../../common/constants/lesson-progress";

const progressWeightSchema = z.coerce
  .number()
  .int()
  .min(LESSON_PROGRESS_WEIGHT.min)
  .max(LESSON_PROGRESS_WEIGHT.max);

export const courseLessonsParamSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  })
});

export const createLessonSchema = z.object({
  body: z.object({
    courseId: z.string().min(1),
    title: z.string().min(3).max(200),
    contentType: z.enum(["VIDEO", "TEXT", "RESOURCE", "QUIZ", "LIVE_SESSION"]),
    content: z.string().min(1),
    sortOrder: z.coerce.number().int().min(1),
    progressWeight: progressWeightSchema.optional(),
    prerequisiteLessonId: z.string().min(1).nullable().optional()
  })
});

export const lessonIdParamSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1)
  })
});

export const updateLessonOrderSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1)
  }),
  body: z.object({
    sortOrder: z.coerce.number().int().min(1)
  })
});

export const updateCourseLessonOrderSchema = z.object({
  params: z.object({
    courseId: z.string().min(1)
  }),
  body: z.object({
    lessonIds: z.array(z.string().min(1)).min(1)
  })
});

export const updateLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1)
  }),
  body: z.object({
    title: z.string().min(3).max(200),
    contentType: z.enum(["VIDEO", "TEXT", "RESOURCE", "QUIZ", "LIVE_SESSION"]),
    content: z.string().min(1),
    progressWeight: progressWeightSchema.optional(),
    prerequisiteLessonId: z.string().min(1).nullable().optional()
  })
});
