import { z } from "zod";

export const listAssignmentSubmissionsSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const submitAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1)
  }),
  body: z
    .object({
      content: z.string().trim().max(10000).nullable().optional(),
      attachmentUrl: z.string().trim().max(2000).nullable().optional()
    })
    .refine((value) => Boolean(value.content?.trim() || value.attachmentUrl?.trim()), {
      message: "Submission content or attachment is required"
    })
});

export const gradeAssignmentSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().min(1)
  }),
  body: z.object({
    score: z.coerce.number().int().min(0).max(10000),
    feedback: z.string().trim().max(5000).nullable().optional()
  })
});
