export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export const LESSON_CONTENT_TYPE = {
  text: "TEXT",
  video: "VIDEO",
  resource: "RESOURCE"
} as const;
