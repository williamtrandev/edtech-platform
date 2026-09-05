/**
 * Minimum environment for importing application modules under test.
 *
 * `src/config/env.ts` validates the whole environment at import time, and most
 * modules reach it transitively through the logger. Without this, the suite
 * would only pass on a machine that happens to have a populated `.env` — it
 * would fail in CI, and would silently read a developer's real credentials
 * when it did pass. These values are deliberately fake and unreachable.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  SUPABASE_DB_URL: "postgresql://test:test@127.0.0.1:5432/test",
  SUPABASE_DIRECT_URL: "postgresql://test:test@127.0.0.1:5432/test",
  REDIS_URL: "redis://127.0.0.1:6379",
  SUPABASE_JWT_SECRET: "test-jwt-secret",
  PISTON_URL: "http://127.0.0.1:2000/api/v2"
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  // Never override a value the developer set on purpose.
  process.env[key] ??= value;
}
