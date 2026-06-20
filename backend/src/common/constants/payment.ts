export const COURSE_PAYMENT_STATUS = {
  pending: "PENDING",
  completed: "COMPLETED",
  failed: "FAILED",
  refunded: "REFUNDED"
} as const;

export type CoursePaymentStatus = (typeof COURSE_PAYMENT_STATUS)[keyof typeof COURSE_PAYMENT_STATUS];

export const PAYMENT_PROVIDER = {
  mock: "MOCK",
  stripe: "STRIPE",
  vnpay: "VNPAY"
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const DEFAULT_COURSE_CURRENCY = "USD";

/** VNPay settles in VND only. amountCents holds the integer VND amount for VND courses (no minor unit). */
export const VNPAY_CURRENCY = "VND";

/** Stripe zero-decimal currencies: amount is NOT multiplied by 100. */
export const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
]);

export const COURSE_PAYMENT_IDEMPOTENCY = {
  ttlSeconds: 60 * 60 * 24
} as const;
