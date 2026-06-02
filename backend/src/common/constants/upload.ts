export const UPLOAD_STORAGE = {
  publicPathPrefix: "/uploads/",
  directoryName: "uploads"
} as const;

export const FILE_CLEANUP_JOB = {
  name: "orphan-scan",
  attempts: 2,
  backoffDelayMs: 5000,
  minFileAgeMs: 24 * 60 * 60 * 1000
} as const;
