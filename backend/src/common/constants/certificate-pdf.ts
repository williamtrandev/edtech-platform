export const CERTIFICATE_PDF_JOB = {
  name: "generate",
  attempts: 3,
  backoffDelayMs: 2000
} as const;

export const CERTIFICATE_PDF_CACHE = {
  keyPrefix: "certificate-pdf:",
  ttlSeconds: 3600
} as const;

export const CERTIFICATE_PDF_POLL = {
  intervalMs: 400,
  maxWaitMs: 20000
} as const;
