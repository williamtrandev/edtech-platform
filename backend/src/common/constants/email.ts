export const EMAIL_PROVIDER = {
  log: "LOG",
  smtp: "SMTP",
  resend: "RESEND"
} as const;

export type EmailProvider = (typeof EMAIL_PROVIDER)[keyof typeof EMAIL_PROVIDER];

export const NOTIFICATION_EMAIL_JOB = {
  name: "send",
  attempts: 5,
  backoffDelayMs: 3000
} as const;
