import { z } from "zod";
import { EXAM_SCOPE } from "../../common/constants/business";

const examStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const examScopeSchema = z.enum([EXAM_SCOPE.lesson, EXAM_SCOPE.course]);
const nullableTrimmedString = (max: number) => z.string().trim().max(max).nullable().optional();

const examScopeBodySchema = z
  .object({
    scope: examScopeSchema.default(EXAM_SCOPE.course),
    lessonId: z.string().min(1).nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (value.scope === EXAM_SCOPE.lesson && !value.lessonId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lessonId is required when scope is LESSON",
        path: ["lessonId"]
      });
    }

    if (value.scope === EXAM_SCOPE.course && value.lessonId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lessonId must be empty when scope is COURSE",
        path: ["lessonId"]
      });
    }
  });

export const courseExamsParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z
    .object({
      scope: examScopeSchema.optional(),
      lessonId: z.string().min(1).optional()
    })
    .optional()
});

export const createExamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(200),
      description: nullableTrimmedString(1000),
      status: examStatusSchema.default("DRAFT"),
      durationMinutes: z.coerce.number().int().min(1).max(10000).nullable().optional(),
      passingScore: z.coerce.number().int().min(0).max(100).nullable().optional()
    })
    .and(examScopeBodySchema)
});

export const updateExamSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      description: nullableTrimmedString(1000),
      status: examStatusSchema.optional(),
      durationMinutes: z.coerce.number().int().min(1).max(10000).nullable().optional(),
      passingScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
      scope: examScopeSchema.optional(),
      lessonId: z.string().min(1).nullable().optional()
    })
    .superRefine((value, ctx) => {
      if (value.scope === EXAM_SCOPE.lesson && value.lessonId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lessonId is required when scope is LESSON",
          path: ["lessonId"]
        });
      }

      if (value.scope === EXAM_SCOPE.course && value.lessonId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lessonId must be empty when scope is COURSE",
          path: ["lessonId"]
        });
      }
    })
});

export const examIdParamSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  })
});
