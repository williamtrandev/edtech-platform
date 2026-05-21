import { z } from "zod";

const examStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const nullableTrimmedString = (max: number) => z.string().trim().max(max).nullable().optional();

export const courseExamsParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const createExamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: nullableTrimmedString(1000),
    status: examStatusSchema.default("DRAFT"),
    durationMinutes: z.coerce.number().int().min(1).max(10000).nullable().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).nullable().optional()
  })
});

export const updateExamSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: nullableTrimmedString(1000),
    status: examStatusSchema.optional(),
    durationMinutes: z.coerce.number().int().min(1).max(10000).nullable().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).nullable().optional()
  })
});

export const examIdParamSchema = z.object({
  params: z.object({
    examId: z.string().min(1)
  })
});
