import { z } from "zod";
import { CODE_QUESTION_LANGUAGES } from "../../common/constants/business";

const questionTypeSchema = z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "FREE_TEXT", "CODE"]);
const optionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(500)
});

const codeTestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  input: z.string().max(10000).default(""),
  expectedOutput: z.string().max(10000).default(""),
  hidden: z.boolean().default(false)
});

const codePayloadSchema = z.object({
  language: z.enum(CODE_QUESTION_LANGUAGES),
  starterCode: z.string().max(20000).default(""),
  solutionCode: z.string().max(20000).default(""),
  instructions: z.string().trim().max(4000).nullable().optional(),
  tests: z.array(codeTestSchema).min(1).max(40)
});

const questionPayloadBaseSchema = z.object({
  type: questionTypeSchema,
  prompt: z.string().trim().min(3).max(2000),
  options: z.array(optionSchema).max(12).default([]),
  correctAnswers: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  code: codePayloadSchema.nullable().optional(),
  explanation: z.string().trim().max(2000).nullable().optional(),
  points: z.coerce.number().int().min(1).max(100).default(1),
  sortOrder: z.coerce.number().int().min(1)
});

const questionPayloadSchema = questionPayloadBaseSchema
  .superRefine((value, ctx) => {
    if (value.type === "FREE_TEXT") {
      return;
    }

    if (value.type === "CODE") {
      if (!value.code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["code"],
          message: "Code questions need a code configuration"
        });
      }
      return;
    }

    if (value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Choice questions need at least two options"
      });
    }

    const optionIds = new Set(value.options.map((option) => option.id));
    if (optionIds.size !== value.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Option IDs must be unique"
      });
    }

    if (!value.correctAnswers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswers"],
        message: "Choice questions need at least one correct answer"
      });
    }

    if (value.type === "SINGLE_CHOICE" && value.correctAnswers.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswers"],
        message: "Single choice questions need exactly one correct answer"
      });
    }

    if (value.correctAnswers.some((answer) => !optionIds.has(answer))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswers"],
        message: "Correct answers must match option IDs"
      });
    }
  });

export const examQuestionsParamSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  })
});

export const createExamQuestionSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  }),
  body: questionPayloadSchema
});

export const updateExamQuestionSchema = z.object({
  params: z.object({
    questionId: z.string().min(1)
  }),
  body: questionPayloadBaseSchema.partial()
});

export const examQuestionIdParamSchema = z.object({
  params: z.object({
    questionId: z.string().min(1)
  })
});
