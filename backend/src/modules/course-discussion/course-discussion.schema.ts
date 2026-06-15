import { z } from "zod";

export const listCourseDiscussionCommentsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({
    lessonId: z.string().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const createCourseDiscussionCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    lessonId: z.string().min(1).nullable().optional(),
    parentId: z.string().min(1).nullable().optional(),
    body: z.string().trim().min(1).max(2000)
  })
});

export const deleteCourseDiscussionCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    commentId: z.string().min(1)
  })
});
