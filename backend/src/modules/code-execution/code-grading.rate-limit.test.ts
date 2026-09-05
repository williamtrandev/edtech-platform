import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeGradingService } from "./code-grading.service";
import { RateLimitError } from "./execution-limiter";

const runCode = vi.fn();

vi.mock("./code-runner", () => ({
  runCode: (...args: unknown[]) => runCode(...args),
  isExecutableLanguage: (language: string) => language !== "cobol"
}));


const tests = [{ name: "t1", input: "", expectedOutput: "1", hidden: false }];
const params = { language: "python", code: "print(1)", tests };

/**
 * The grader turns sandbox trouble into `null`, which callers read as "grade
 * this by hand". That is right for an outage, but saturation is temporary and
 * the practice-run endpoint needs to tell them apart so it can say "try again"
 * instead of silently parking the submission.
 */
describe("CodeGradingService rate limits", () => {
  beforeEach(() => {
    runCode.mockReset();
  });

  it("propagates a rate limit rather than reporting it as ungradeable", async () => {
    runCode.mockRejectedValue(new RateLimitError("Code execution queue is full"));

    await expect(new CodeGradingService().gradeCodeQuestion(params)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("still reports a genuine outage as ungradeable, so grading falls back to manual", async () => {
    runCode.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(new CodeGradingService().gradeCodeQuestion(params)).resolves.toBeNull();
  });

  it("reports an unrunnable language as ungradeable without calling the sandbox", async () => {
    await expect(
      new CodeGradingService().gradeCodeQuestion({ ...params, language: "cobol" })
    ).resolves.toBeNull();
    expect(runCode).not.toHaveBeenCalled();
  });

  it("grades normally when the sandbox answers", async () => {
    runCode.mockResolvedValue({ stdout: "1\n", stderr: "", exitCode: 0, timedOut: false, compileError: null });

    await expect(new CodeGradingService().gradeCodeQuestion(params)).resolves.toMatchObject({
      total: 1,
      passed: 1,
      allPassed: true
    });
  });

  it("stops running further tests once the sandbox reports saturation", async () => {
    runCode
      .mockResolvedValueOnce({ stdout: "1\n", stderr: "", exitCode: 0, timedOut: false, compileError: null })
      .mockRejectedValueOnce(new RateLimitError("busy"));

    const twoTests = [tests[0], { name: "t2", input: "", expectedOutput: "2", hidden: false }];
    await expect(
      new CodeGradingService().gradeCodeQuestion({ ...params, tests: twoTests })
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(runCode).toHaveBeenCalledTimes(2);
  });
});
