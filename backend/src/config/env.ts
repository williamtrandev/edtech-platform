import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  SUPABASE_DB_URL: z.string().min(1),
  SUPABASE_DIRECT_URL: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1)
});

export const env = envSchema.parse(process.env);
