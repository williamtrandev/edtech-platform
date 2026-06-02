import { z } from "zod";
import { ASSIGNMENT_STATUS, COURSE_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import type { I18nKey } from "../i18n";
import { isLessonHtmlEmpty } from "../lib/lesson-content";

type Translate = (key: I18nKey) => string;

const requiredTrimmed = (t: Translate, minKey: I18nKey, max: number, maxKey: I18nKey) =>
  z.string().trim().min(1, t(minKey)).max(max, t(maxKey));

export function createCourseFormSchema(t: Translate) {
  return z.object({
    title: z.string().trim().min(3, t("validation.courseTitleMin")),
    description: z.string().trim().min(10, t("validation.courseDescriptionMin")).max(1000, t("validation.courseDescriptionMax")),
    category: requiredTrimmed(t, "validation.courseCategoryRequired", 100, "validation.courseMetadataMax"),
    level: requiredTrimmed(t, "validation.courseLevelRequired", 100, "validation.courseMetadataMax"),
    language: requiredTrimmed(t, "validation.courseLanguageRequired", 100, "validation.courseMetadataMax"),
    durationMinutes: z.coerce.number().int().min(1, t("validation.courseDurationMin")).max(100000, t("validation.courseDurationMax")),
    requirements: z.string().trim().min(1, t("validation.courseRequirementsRequired")).max(2000, t("validation.courseLongTextMax")),
    outcomes: z.string().trim().min(1, t("validation.courseOutcomesRequired")).max(2000, t("validation.courseLongTextMax")),
    coverImageUrl: z.string().trim().min(1, t("validation.courseCoverRequired")).max(2000, t("validation.courseCoverUrlMax")),
    status: z.enum([COURSE_STATUS.draft, COURSE_STATUS.published, COURSE_STATUS.archived]).default(COURSE_STATUS.draft)
  });
}

export type CreateCourseFormValues = z.infer<ReturnType<typeof createCourseFormSchema>>;

export function updateCourseFormSchema(t: Translate) {
  return z.object({
    title: z.string().trim().min(3, t("validation.courseTitleMin")).optional(),
    description: z.string().max(1000, t("validation.courseDescriptionMax")).optional(),
    category: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    level: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    language: z.string().max(100, t("validation.courseMetadataMax")).optional(),
    durationMinutes: z.coerce.number().int().min(1, t("validation.courseDurationMin")).max(100000, t("validation.courseDurationMax")).optional().or(z.literal("")),
    requirements: z.string().max(2000, t("validation.courseLongTextMax")).optional(),
    outcomes: z.string().max(2000, t("validation.courseLongTextMax")).optional(),
    coverImageUrl: z.string().max(2000, t("validation.courseCoverUrlMax")).optional(),
    priceCents: z.coerce.number().int().min(0, t("validation.coursePriceMin")).max(10_000_000, t("validation.coursePriceMax")).optional().or(z.literal("")),
    currency: z.string().trim().length(3, t("validation.courseCurrencyInvalid")).optional(),
    status: z.enum([COURSE_STATUS.draft, COURSE_STATUS.published, COURSE_STATUS.archived, COURSE_STATUS.locked]).default(COURSE_STATUS.draft)
  });
}

export type UpdateCourseFormValues = z.infer<ReturnType<typeof updateCourseFormSchema>>;

export function createLessonFormSchema(t: Translate) {
  return z
    .object({
      title: z.string().min(3, t("validation.lessonTitleMin")),
      contentType: z
        .enum([
          LESSON_CONTENT_TYPE.video,
          LESSON_CONTENT_TYPE.text,
          LESSON_CONTENT_TYPE.resource,
          LESSON_CONTENT_TYPE.quiz,
          LESSON_CONTENT_TYPE.liveSession
        ])
        .default(LESSON_CONTENT_TYPE.text),
      content: z.string().default(""),
      quizExamId: z.string().optional(),
      liveMeetingUrl: z.string().optional(),
      liveStartsAt: z.string().optional(),
      liveInstructions: z.string().optional(),
      liveDurationMinutes: z.coerce.number().int().min(5, t("validation.lessonLiveDurationMin")).max(480, t("validation.lessonLiveDurationMax")).optional().or(z.literal("")),
      sortOrder: z.coerce.number().int().min(1),
      prerequisiteLessonId: z.string().nullable().optional()
    })
    .superRefine((values, context) => {
      if (values.contentType === LESSON_CONTENT_TYPE.quiz) {
        if (!values.quizExamId?.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["quizExamId"],
            message: t("validation.lessonQuizExamRequired")
          });
        }
        return;
      }

      if (values.contentType === LESSON_CONTENT_TYPE.liveSession) {
        const meetingUrl = values.liveMeetingUrl?.trim() ?? "";
        const instructions = values.liveInstructions?.trim() ?? "";
        if (!meetingUrl && !instructions) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["liveMeetingUrl"],
            message: t("validation.lessonLiveSessionRequired")
          });
        }
        return;
      }

      if (!values.content.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: t("validation.lessonContentRequired")
        });
        return;
      }

      if (values.contentType === LESSON_CONTENT_TYPE.text && isLessonHtmlEmpty(values.content)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: t("validation.lessonContentRequired")
        });
      }
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

export function createExamAttemptGradeFormSchema(t: Translate) {
  return z.object({
    score: z.coerce.number().int().min(0, t("validation.examAttemptScoreMin")).max(100, t("validation.examAttemptScoreMax"))
  });
}

export type ExamAttemptGradeFormValues = z.infer<ReturnType<typeof createExamAttemptGradeFormSchema>>;

export function createAssignmentFormSchema(t: Translate) {
  return z.object({
    title: z.string().min(3, t("validation.assignmentTitleMin")).max(200, t("validation.assignmentTitleMax")),
    instructions: z.string().max(5000, t("validation.assignmentInstructionsMax")).optional(),
    status: z.enum([ASSIGNMENT_STATUS.draft, ASSIGNMENT_STATUS.published, ASSIGNMENT_STATUS.archived]).default(ASSIGNMENT_STATUS.draft),
    dueAt: z.string().optional(),
    maxScore: z.coerce.number().int().min(1, t("validation.assignmentMaxScoreMin")).max(10000, t("validation.assignmentMaxScoreMax")).optional().or(z.literal("")),
    attachmentUrl: z.string().max(2000, t("validation.assignmentAttachmentUrlMax")).optional()
  });
}

export type AssignmentFormValues = z.infer<ReturnType<typeof createAssignmentFormSchema>>;

export function createAssignmentSubmissionFormSchema(t: Translate) {
  return z
    .object({
      content: z.string().max(10000, t("validation.assignmentSubmissionContentMax")).optional(),
      attachmentUrl: z.string().max(2000, t("validation.assignmentAttachmentUrlMax")).optional()
    })
    .refine((value) => Boolean(value.content?.trim() || value.attachmentUrl?.trim()), {
      message: t("validation.assignmentSubmissionRequired"),
      path: ["content"]
    });
}

export type AssignmentSubmissionFormValues = z.infer<ReturnType<typeof createAssignmentSubmissionFormSchema>>;

export function createAssignmentGradeFormSchema(t: Translate) {
  return z.object({
    score: z.coerce.number().int().min(0, t("validation.assignmentScoreMin")).max(10000, t("validation.assignmentScoreMax")),
    feedback: z.string().max(5000, t("validation.assignmentFeedbackMax")).optional()
  });
}

export type AssignmentGradeFormValues = z.infer<ReturnType<typeof createAssignmentGradeFormSchema>>;
