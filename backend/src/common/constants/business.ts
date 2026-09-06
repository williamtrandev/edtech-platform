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

/**
 * Learning tracks a course can belong to — the programming subject, distinct
 * from `Course.language`, which is the spoken language of the material.
 *
 * A plain string column validated against this list, rather than a Prisma enum,
 * so adding a track needs no migration. Display names live in the frontend
 * `track.*` translations; these ids are the stable API contract.
 */
export const COURSE_TRACKS = ["python", "javascript", "go", "sql", "rust", "devops"] as const;

export type CourseTrack = (typeof COURSE_TRACKS)[number];

export const PROBLEM_DIFFICULTY = { easy: "EASY", medium: "MEDIUM", hard: "HARD" } as const;

export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTY)[keyof typeof PROBLEM_DIFFICULTY];

export const PROBLEM_STATUS = { draft: "DRAFT", published: "PUBLISHED", archived: "ARCHIVED" } as const;

export type ProblemStatus = (typeof PROBLEM_STATUS)[keyof typeof PROBLEM_STATUS];

export const PROBLEM_ERROR_CODE = {
  notFound: "PROBLEM_NOT_FOUND",
  languageInvalid: "PROBLEM_LANGUAGE_INVALID",
  testsRequired: "PROBLEM_TESTS_REQUIRED",
  testInvalid: "PROBLEM_TEST_INVALID"
} as const;

export function isCourseTrack(value: string): value is CourseTrack {
  return (COURSE_TRACKS as readonly string[]).includes(value);
}

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
