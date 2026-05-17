import { z } from "zod";
import { COURSE_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import type { I18nKey } from "../i18n";

type Translate = (key: I18nKey) => string;

export function createCourseFormSchema(t: Translate) {
  return z.object({
    title: z.string().min(3, t("validation.courseTitleMin")),
    description: z.string().max(1000, t("validation.courseDescriptionMax")).optional(),
    coverImageUrl: z.string().max(2000, t("validation.courseCoverUrlMax")).optional(),
    status: z.enum([COURSE_STATUS.draft, COURSE_STATUS.published, COURSE_STATUS.archived]).default(COURSE_STATUS.draft)
  });
}

export type CreateCourseFormValues = z.infer<ReturnType<typeof createCourseFormSchema>>;

export const updateCourseFormSchema = createCourseFormSchema;

export type UpdateCourseFormValues = z.infer<ReturnType<typeof updateCourseFormSchema>>;

export function createLessonFormSchema(t: Translate) {
  return z.object({
    title: z.string().min(3, t("validation.lessonTitleMin")),
    contentType: z.enum([LESSON_CONTENT_TYPE.video, LESSON_CONTENT_TYPE.text, LESSON_CONTENT_TYPE.resource]).default(LESSON_CONTENT_TYPE.text),
    content: z.string().min(1, t("validation.lessonContentRequired")),
    sortOrder: z.coerce.number().int().min(1)
  });
}

export type CreateLessonFormValues = z.infer<ReturnType<typeof createLessonFormSchema>>;
