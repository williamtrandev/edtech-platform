export const LEARNING_PATH_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type LearningPathStatus = (typeof LEARNING_PATH_STATUS)[keyof typeof LEARNING_PATH_STATUS];
