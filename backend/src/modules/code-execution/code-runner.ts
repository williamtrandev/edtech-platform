import { z } from "zod";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

/**
 * Maps our CODE-question language ids onto Piston language ids / aliases.
 * SQL is intentionally absent: Piston has no reliable SQL runtime, so SQL
 * questions fall back to manual grading.
 */
const PISTON_LANGUAGE: Record<string, string[]> = {
  python: ["python", "python3"],
  javascript: ["javascript", "node-javascript"],
  typescript: ["typescript"],
  go: ["go"],
  rust: ["rust"],
  java: ["java"],
  cpp: ["c++", "cpp"],
  bash: ["bash"],
  sql: ["sqlite3", "sqlite"]
};

const SOURCE_FILENAME: Record<string, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  go: "main.go",
  rust: "main.rs",
  java: "Main.java",
  cpp: "main.cpp",
  bash: "main.sh",
  sql: "main.sql"
};

const runtimeSchema = z.object({
  language: z.string(),
  version: z.string(),
  aliases: z.array(z.string()).default([])
});

const executeResponseSchema = z.object({
  run: z.object({
    stdout: z.string().default(""),
    stderr: z.string().default(""),
    code: z.number().nullable().default(null),
    signal: z.string().nullable().default(null)
  }),
  compile: z
    .object({
      stdout: z.string().default(""),
      stderr: z.string().default(""),
      code: z.number().nullable().default(null)
    })
    .optional()
});

export type CodeRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  compileError: string | null;
};

type PistonRuntime = z.infer<typeof runtimeSchema>;

let runtimesCache: PistonRuntime[] | null = null;

async function fetchRuntimes(): Promise<PistonRuntime[]> {
  if (runtimesCache) {
    return runtimesCache;
  }
  const response = await fetch(`${env.PISTON_URL}/runtimes`, {
    signal: AbortSignal.timeout(env.CODE_EXECUTION_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`Piston runtimes request failed: ${response.status}`);
  }
  // Third-party response: validate before trusting.
  runtimesCache = z.array(runtimeSchema).parse(await response.json());
  return runtimesCache;
}

/** Returns true when a language can be auto-executed (has a known Piston runtime). */
export function isExecutableLanguage(language: string): boolean {
  return language in PISTON_LANGUAGE;
}

async function resolveRuntime(language: string): Promise<{ language: string; version: string } | null> {
  const candidates = PISTON_LANGUAGE[language];
  if (!candidates) {
    return null;
  }
  const runtimes = await fetchRuntimes();
  for (const candidate of candidates) {
    const match = runtimes.find((runtime) => runtime.language === candidate || runtime.aliases.includes(candidate));
    if (match) {
      return { language: match.language, version: match.version };
    }
  }
  return null;
}

/**
 * Runs a single source against one stdin in the Piston sandbox. Piston enforces
 * the actual isolation (no network, CPU/memory/time caps) — we never execute
 * untrusted code in this process.
 */
export async function runCode(params: { language: string; source: string; stdin: string }): Promise<CodeRunResult> {
  const runtime = await resolveRuntime(params.language);
  if (!runtime) {
    throw new Error(`No executable runtime for language: ${params.language}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Piston enforces its own per-run CPU/time caps (defaults are within its
      // configured limits); we keep an outer wall-clock guard via AbortSignal.
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: SOURCE_FILENAME[params.language] ?? "main.txt", content: params.source }],
        stdin: params.stdin
      }),
      signal: AbortSignal.timeout(env.CODE_EXECUTION_TIMEOUT_MS + 4000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { stdout: "", stderr: "Execution timed out", exitCode: null, timedOut: true, compileError: null };
    }
    throw error;
  }

  if (response.status === 429) {
    throw new Error("Piston rate limit reached");
  }
  if (!response.ok) {
    throw new Error(`Piston execute failed: ${response.status}`);
  }

  const parsed = executeResponseSchema.parse(await response.json());
  const compileError = parsed.compile && parsed.compile.code !== 0 && parsed.compile.stderr ? parsed.compile.stderr : null;

  return {
    stdout: parsed.run.stdout,
    stderr: parsed.run.stderr,
    exitCode: parsed.run.code,
    timedOut: parsed.run.signal === "SIGKILL",
    compileError
  };
}

export function resetRuntimesCache(): void {
  runtimesCache = null;
  logger.debug("Piston runtimes cache cleared");
}
