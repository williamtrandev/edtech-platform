import { z } from "zod";
import { COURSE_TRACKS, PROBLEM_DIFFICULTY } from "../../common/constants/business";

const difficultySchema = z.enum([PROBLEM_DIFFICULTY.easy, PROBLEM_DIFFICULTY.medium, PROBLEM_DIFFICULTY.hard]);

export const listProblemsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    track: z.enum(COURSE_TRACKS).optional(),
    difficulty: difficultySchema.optional(),
    search: z.string().trim().max(200).optional()
  })
});

export const problemSlugSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1).max(200)
  })
});

export const runProblemSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1).max(200)
  }),
  // Matches the exam answer cap, so the same solution fits either surface.
  body: z.object({
    code: z.string().min(1).max(20000)
  })
});
