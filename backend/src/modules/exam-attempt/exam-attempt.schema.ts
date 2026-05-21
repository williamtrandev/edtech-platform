import { z } from "zod";

const answerSchema = z.union([z.string().trim().max(4000), z.array(z.string().trim().min(1).max(80)).max(20)]);

export const examAttemptParamSchema = z.object({
  params: z.object({
    attemptId: z.string().min(1)
  })
});

export const startExamAttemptSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  })
});

export const saveExamAttemptAnswersSchema = z.object({
  params: z.object({
    attemptId: z.string().min(1)
  }),
  body: z.object({
    answers: z
      .array(
        z.object({
          questionId: z.string().min(1),
          answer: answerSchema.nullable()
        })
      )
      .min(1)
      .max(200)
  })
});

export const gradeExamAttemptSchema = z.object({
  params: z.object({
    attemptId: z.string().min(1)
  }),
  body: z.object({
    score: z.number().int().min(0).max(100)
  })
});

export const submitExamAttemptSchema = z.object({
  params: z.object({
    attemptId: z.string().min(1)
  }),
  body: z.object({
    answers: z
      .array(
        z.object({
          questionId: z.string().min(1),
          answer: answerSchema.nullable()
        })
      )
      .min(1)
      .max(200)
  })
});
