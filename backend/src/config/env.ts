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
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional())
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
