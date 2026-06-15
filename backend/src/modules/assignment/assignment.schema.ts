import { z } from "zod";

const assignmentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const nullableTrimmedString = (max: number) => z.string().trim().max(max).nullable().optional();

export const courseAssignmentsParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const createAssignmentSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200),
    instructions: nullableTrimmedString(5000),
    status: assignmentStatusSchema.default("DRAFT"),
    dueAt: z.coerce.date().nullable().optional(),
    maxScore: z.coerce.number().int().min(1).max(10000).nullable().optional(),
    attachmentUrl: nullableTrimmedString(2000)
  })
});

export const updateAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    instructions: nullableTrimmedString(5000),
    status: assignmentStatusSchema.optional(),
    dueAt: z.coerce.date().nullable().optional(),
    maxScore: z.coerce.number().int().min(1).max(10000).nullable().optional(),
    attachmentUrl: nullableTrimmedString(2000)
  })
});

export const assignmentIdParamSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1)
  })
});

const rubricCriterionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  maxPoints: z.coerce.number().int().min(1).max(1000)
});

export const replaceAssignmentRubricSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1)
  }),
  body: z.object({
    criteria: z.array(rubricCriterionInputSchema).max(20)
  })
});
