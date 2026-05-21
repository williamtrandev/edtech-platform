export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export const EXAM_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export const EXAM_QUESTION_TYPE = {
  singleChoice: "SINGLE_CHOICE",
  multipleChoice: "MULTIPLE_CHOICE",
  freeText: "FREE_TEXT"
} as const;

export type ExamQuestionType = (typeof EXAM_QUESTION_TYPE)[keyof typeof EXAM_QUESTION_TYPE];

export const EXAM_ATTEMPT_STATUS = {
  inProgress: "IN_PROGRESS",
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;

export type ExamAttemptStatus = (typeof EXAM_ATTEMPT_STATUS)[keyof typeof EXAM_ATTEMPT_STATUS];

export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_STATUS = {
  active: "ACTIVE",
  suspended: "SUSPENDED"
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const LESSON_CONTENT_TYPE = {
  text: "TEXT",
  video: "VIDEO",
  resource: "RESOURCE"
} as const;

export type LessonContentType = (typeof LESSON_CONTENT_TYPE)[keyof typeof LESSON_CONTENT_TYPE];
