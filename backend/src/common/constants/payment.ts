export const COURSE_PAYMENT_STATUS = {
  pending: "PENDING",
  completed: "COMPLETED",
  failed: "FAILED",
  refunded: "REFUNDED"
} as const;

export type CoursePaymentStatus = (typeof COURSE_PAYMENT_STATUS)[keyof typeof COURSE_PAYMENT_STATUS];

export const PAYMENT_PROVIDER = {
  mock: "MOCK"
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const DEFAULT_COURSE_CURRENCY = "USD";

export const COURSE_PAYMENT_IDEMPOTENCY = {
  ttlSeconds: 60 * 60 * 24
} as const;
