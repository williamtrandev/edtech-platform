import { z } from "zod";
import { EXAM_ATTEMPT_EVENT_TYPE, EXAM_SUBMIT_REASON } from "../../common/constants/exam-integrity";

const answerSchema = z.union([z.string().trim().max(4000), z.array(z.string().trim().min(1).max(80)).max(20)]);
const examAttemptStatusSchema = z.enum(["IN_PROGRESS", "SUBMITTED", "GRADED"]);
const examAttemptEventTypeSchema = z.enum([
  EXAM_ATTEMPT_EVENT_TYPE.tabHidden,
  EXAM_ATTEMPT_EVENT_TYPE.tabVisible,
  EXAM_ATTEMPT_EVENT_TYPE.windowBlur,
  EXAM_ATTEMPT_EVENT_TYPE.windowFocus,
  EXAM_ATTEMPT_EVENT_TYPE.reconnect,
  EXAM_ATTEMPT_EVENT_TYPE.timerExpired,
  EXAM_ATTEMPT_EVENT_TYPE.manualSubmit
]);

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

export const listExamAttemptsSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: examAttemptStatusSchema.optional()
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
      .max(200),
    submitReason: z.enum([EXAM_SUBMIT_REASON.manual, EXAM_SUBMIT_REASON.timer]).optional()
  })
});

export const recordExamIntegrityEventsSchema = z.object({
  params: z.object({
    attemptId: z.string().min(1)
  }),
  body: z.object({
    events: z
      .array(
        z.object({
          type: examAttemptEventTypeSchema,
          clientEventId: z.string().trim().min(1).max(128).optional(),
          metadata: z.record(z.unknown()).optional()
        })
      )
      .min(1)
      .max(50)
  })
});
