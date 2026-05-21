import { z } from "zod";
import { COURSE_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import type { I18nKey } from "../i18n";

type Translate = (key: I18nKey) => string;

export function createCourseFormSchema(t: Translate) {
  return z.object({
    title: z.string().min(3, t("validation.courseTitleMin")),
    description: z.string().max(1000, t("validation.courseDescriptionMax")).optional(),
    category: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    level: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    language: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    durationMinutes: z.coerce.number().int().min(1, t("validation.courseDurationMin")).max(100000, t("validation.courseDurationMax")).optional().or(z.literal("")),
    requirements: z.string().max(2000, t("validation.courseLongTextMax")).optional(),
    outcomes: z.string().max(2000, t("validation.courseLongTextMax")).optional(),
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

export function createExamFormSchema(t: Translate) {
  return z.object({
    title: z.string().min(3, t("validation.examTitleMin")).max(200, t("validation.examTitleMax")),
    description: z.string().max(1000, t("validation.examDescriptionMax")).optional(),
    status: z.enum([EXAM_STATUS.draft, EXAM_STATUS.published, EXAM_STATUS.archived]).default(EXAM_STATUS.draft),
    durationMinutes: z.coerce.number().int().min(1, t("validation.examDurationMin")).max(10000, t("validation.examDurationMax")).optional().or(z.literal("")),
    passingScore: z.coerce.number().int().min(0, t("validation.examPassingScoreMin")).max(100, t("validation.examPassingScoreMax")).optional().or(z.literal(""))
  });
}

export type ExamFormValues = z.infer<ReturnType<typeof createExamFormSchema>>;

export function createExamQuestionFormSchema(t: Translate) {
  return z.object({
    type: z.enum([EXAM_QUESTION_TYPE.singleChoice, EXAM_QUESTION_TYPE.multipleChoice, EXAM_QUESTION_TYPE.freeText]).default(EXAM_QUESTION_TYPE.singleChoice),
    prompt: z.string().min(3, t("validation.examQuestionPromptMin")).max(2000, t("validation.examQuestionPromptMax")),
    optionsText: z.string().max(4000, t("validation.examQuestionOptionsMax")).optional(),
    correctAnswersText: z.string().max(500, t("validation.examQuestionAnswersMax")).optional(),
    explanation: z.string().max(2000, t("validation.examQuestionExplanationMax")).optional(),
    points: z.coerce.number().int().min(1, t("validation.examQuestionPointsMin")).max(100, t("validation.examQuestionPointsMax")),
    sortOrder: z.coerce.number().int().min(1)
  });
}

export type ExamQuestionFormValues = z.infer<ReturnType<typeof createExamQuestionFormSchema>>;
