export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export const EXAM_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export const EXAM_QUESTION_TYPE = {
  singleChoice: "SINGLE_CHOICE",
  multipleChoice: "MULTIPLE_CHOICE",
  freeText: "FREE_TEXT"
} as const;

export const EXAM_ATTEMPT_STATUS = {
  inProgress: "IN_PROGRESS",
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;
