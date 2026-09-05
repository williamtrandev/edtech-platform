import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const logLevelSchema = z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]);

const emailProviderSchema = z.enum(["LOG", "SMTP", "RESEND"]);

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const booleanFromEnv = z.preprocess((v) => {
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return v;
}, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: logLevelSchema.default("info"),
    SUPABASE_DB_URL: z.string().min(1),
    SUPABASE_DIRECT_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    /** Public app URL used in notification email links. */
    APP_PUBLIC_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:5173")),
    /** LOG = log only. SMTP = nodemailer. RESEND = Resend HTTP API. */
    EMAIL_PROVIDER: emailProviderSchema.default("LOG"),
    EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).default("EdTech Platform <noreply@localhost>")),
    SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SMTP_PASS: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SMTP_SECURE: booleanFromEnv.default(false),
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /** Project URL (e.g. https://xxxx.supabase.co). Required when access tokens use RS256/ES256 (JWKS verification). */
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    /**
     * Piston code-execution API base — must be a self-hosted instance.
     *
     * Deliberately has no default. It used to fall back to the public
     * emkc.org instance, which silently pointed every learner at a shared,
     * heavily rate-limited endpoint that fails after a handful of runs.
     * Failing to boot is better than that.
     */
    PISTON_URL: z.preprocess(emptyToUndefined, z.string().url()),
    /** When false, CODE questions skip auto-execution and fall back to manual grading. */
    CODE_EXECUTION_ENABLED: booleanFromEnv.default(true),
    /** Per-run wall-clock limit (ms) for a single code execution against one test. */
    CODE_EXECUTION_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    /** Executions this process may have in flight at once; the rest queue. */
    CODE_EXECUTION_MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
    /** Queued executions allowed before new work is rejected instead of piling up. */
    CODE_EXECUTION_MAX_QUEUE: z.coerce.number().int().positive().default(50),
    /** Tries per execution, including the first, when the sandbox reports a rate limit. */
    CODE_EXECUTION_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),

    // --- Payments ---
    /** Stripe secret key (sk_test_... / sk_live_...). When set, Stripe provider is enabled. */
    STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /** Stripe webhook signing secret (whsec_...). Required to verify webhook events. */
    STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /** VNPay merchant terminal code. When set with hash secret, VNPay provider is enabled. */
    VNPAY_TMN_CODE: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /** VNPay HMAC-SHA512 secret. */
    VNPAY_HASH_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /** VNPay payment gateway URL. Sandbox default. */
    VNPAY_PAY_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().default("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
    )
  })
  .superRefine((value, ctx) => {
    if (value.EMAIL_PROVIDER === "SMTP" && !value.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required when EMAIL_PROVIDER is SMTP"
      });
    }

    if (value.EMAIL_PROVIDER === "RESEND" && !value.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when EMAIL_PROVIDER is RESEND"
      });
    }
  });

export const env = envSchema.parse(process.env);
