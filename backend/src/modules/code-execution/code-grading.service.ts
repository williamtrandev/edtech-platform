import { logger } from "../../config/logger";
import { isExecutableLanguage, runCode } from "./code-runner";

export type CodeTest = {
  name: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

export type CodeQuestionGrade = {
  total: number;
  passed: number;
  allPassed: boolean;
  results: Array<{ name: string; passed: boolean; hidden: boolean }>;
};

/** Normalizes output for comparison: CRLF, trailing spaces per line, and trailing blank lines. */
function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n+$/g, "")
    .trim();
}

export class CodeGradingService {
  /**
   * Runs `code` against each test in the Piston sandbox and reports pass/fail.
   * Returns `null` when the language is not executable or an infrastructure
   * failure occurs (rate limit, network) — the caller then falls back to
   * manual grading rather than scoring the learner zero for an outage.
   */
  async gradeCodeQuestion(params: { language: string; code: string; tests: CodeTest[] }): Promise<CodeQuestionGrade | null> {
    if (!isExecutableLanguage(params.language) || params.tests.length === 0 || !params.code.trim()) {
      return null;
    }

    try {
      const results: CodeQuestionGrade["results"] = [];
      let passed = 0;

      for (const test of params.tests) {
        const run = await runCode({ language: params.language, source: params.code, stdin: test.input });
        const ok = !run.compileError && !run.timedOut && normalizeOutput(run.stdout) === normalizeOutput(test.expectedOutput);
        if (ok) {
          passed += 1;
        }
        results.push({ name: test.name, passed: ok, hidden: test.hidden });
      }

      return {
        total: params.tests.length,
        passed,
        allPassed: passed === params.tests.length,
        results
      };
    } catch (error) {
      logger.warn(`Code grading failed, falling back to manual: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
