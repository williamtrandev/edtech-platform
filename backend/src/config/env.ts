import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace"]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: logLevelSchema.default("info"),
  SUPABASE_DB_URL: z.string().min(1),
  SUPABASE_DIRECT_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  /** Project URL (e.g. https://xxxx.supabase.co). Required when access tokens use RS256/ES256 (JWKS verification). */
  SUPABASE_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional()
  ),
  /** Pretty-print logs: `true` / `false`. When omitted, pretty logs run only in `development`. */
  LOG_PRETTY: z.enum(["true", "false"]).optional()
});

export const env = envSchema.parse(process.env);
