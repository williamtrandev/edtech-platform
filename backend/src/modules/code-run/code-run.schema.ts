import { z } from "zod";

export const runCodeSchema = z.object({
  params: z.object({
    questionId: z.string().min(1)
  }),
  body: z.object({
    code: z.string().max(20000)
  })
});

export const runLessonCodeSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1)
  }),
  body: z.object({
    code: z.string().max(20000)
  })
});
