export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const LESSON_CONTENT_TYPE = {
  text: "TEXT",
  video: "VIDEO",
  resource: "RESOURCE"
} as const;

export type LessonContentType = (typeof LESSON_CONTENT_TYPE)[keyof typeof LESSON_CONTENT_TYPE];
