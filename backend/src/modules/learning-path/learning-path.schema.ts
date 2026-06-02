import { z } from "zod";
import { LEARNING_PATH_STATUS } from "../../common/constants/learning-path";

const learningPathStatusSchema = z.enum([
  LEARNING_PATH_STATUS.draft,
  LEARNING_PATH_STATUS.published,
  LEARNING_PATH_STATUS.archived
]);

const mediaUrlSchema = z
  .string()
  .min(1)
  .max(2000)
  .refine((value) => value.startsWith("/uploads/") || z.string().url().safeParse(value).success, {
    message: "Must be an absolute URL or uploaded media path"
  });

export const listLearningPathsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: learningPathStatusSchema.optional()
  })
});

export const learningPathIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const createLearningPathSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    coverImageUrl: mediaUrlSchema.optional().nullable(),
    status: learningPathStatusSchema.default(LEARNING_PATH_STATUS.draft)
  })
});

export const updateLearningPathSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    coverImageUrl: mediaUrlSchema.optional().nullable(),
    status: learningPathStatusSchema.optional()
  })
});

export const addLearningPathCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    courseId: z.string().min(1),
    sortOrder: z.coerce.number().int().min(1).max(1000).optional()
  })
});

export const removeLearningPathCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    courseId: z.string().min(1)
  })
});
