export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export const USER_STATUS = {
  active: "ACTIVE",
  suspended: "SUSPENDED"
} as const;

export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
  locked: "LOCKED"
} as const;

export const EXAM_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export const EXAM_SCOPE = {
  lesson: "LESSON",
  course: "COURSE"
} as const;

export const EXAM_QUESTION_TYPE = {
  singleChoice: "SINGLE_CHOICE",
  multipleChoice: "MULTIPLE_CHOICE",
  freeText: "FREE_TEXT",
  code: "CODE"
} as const;

/** Languages a CODE question may target (frontend Monaco + Phase 3 runner). */
export const CODE_QUESTION_LANGUAGES = ["python", "javascript", "typescript", "go", "rust", "java", "cpp", "sql", "bash"] as const;

export type CodeQuestionLanguage = (typeof CODE_QUESTION_LANGUAGES)[number];

export const EXAM_ATTEMPT_STATUS = {
  inProgress: "IN_PROGRESS",
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;

export const ASSIGNMENT_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export const ASSIGNMENT_SUBMISSION_STATUS = {
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;

export const NOTIFICATION_TYPE = {
  enrollmentSuccess: "ENROLLMENT_SUCCESS",
  assignmentGraded: "ASSIGNMENT_GRADED",
  certificateIssued: "CERTIFICATE_ISSUED",
  coursePublished: "COURSE_PUBLISHED",
  system: "SYSTEM"
} as const;

export const CERTIFICATE_STATUS = {
  active: "ACTIVE",
  revoked: "REVOKED"
} as const;
