import { z } from "zod";

export const createCourseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().max(1000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT")
});

export type CreateCourseFormValues = z.infer<typeof createCourseFormSchema>;

export const createLessonFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  contentType: z.enum(["VIDEO", "TEXT", "RESOURCE"]).default("TEXT"),
  content: z.string().min(1, "Content is required"),
  sortOrder: z.coerce.number().int().min(1)
});

export type CreateLessonFormValues = z.infer<typeof createLessonFormSchema>;
