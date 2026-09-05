import { AppError } from "../errors/app-error";
import { PROBLEM_ERROR_CODE } from "../constants/business";
import { LESSON_CODE_LIMITS } from "../constants/lesson-content";

export type ProblemTest = { name: string; input: string; expectedOutput: string; hidden: boolean };

/**
 * Validates a practice problem's full test suite.
 *
 * `input` is kept verbatim because it is piped to the program's stdin, where
 * whitespace is significant, and an empty input is legitimate — plenty of
 * problems read nothing. `expectedOutput` is trimmed to match the grader's
 * output normalization, so an author's stray newline cannot fail a learner.
 *
 * `hidden` defaults to visible. Guessing the other way would risk silently
 * concealing a worked example the author meant to show.
 */
export function validateProblemTests(raw: unknown): ProblemTest[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError("A problem requires at least one test", 422, PROBLEM_ERROR_CODE.testsRequired);
  }

  if (raw.length > LESSON_CODE_LIMITS.testsMax) {
    throw new AppError(
      `A problem allows at most ${LESSON_CODE_LIMITS.testsMax} tests`,
      422,
      PROBLEM_ERROR_CODE.testInvalid
    );
  }

  return raw.map((entry, index) => {
    const position = index + 1;
    const value = entry as Partial<ProblemTest> | null;
    const name = typeof value?.name === "string" ? value.name.trim() : "";
    const input = typeof value?.input === "string" ? value.input : "";
    const expectedOutput = typeof value?.expectedOutput === "string" ? value.expectedOutput.trim() : "";

    if (!name) {
      throw new AppError(`Test ${position} requires a name`, 422, PROBLEM_ERROR_CODE.testInvalid);
    }

    if (name.length > LESSON_CODE_LIMITS.testNameMax) {
      throw new AppError(
        `Test ${position} name must be at most ${LESSON_CODE_LIMITS.testNameMax} characters`,
        422,
        PROBLEM_ERROR_CODE.testInvalid
      );
    }

    if (!expectedOutput) {
      throw new AppError(`Test ${position} requires an expected output`, 422, PROBLEM_ERROR_CODE.testInvalid);
    }

    if (input.length > LESSON_CODE_LIMITS.testIoMax || expectedOutput.length > LESSON_CODE_LIMITS.testIoMax) {
      throw new AppError(
        `Test ${position} input and expected output must each be at most ${LESSON_CODE_LIMITS.testIoMax} characters`,
        422,
        PROBLEM_ERROR_CODE.testInvalid
      );
    }

    return { name, input, expectedOutput, hidden: value?.hidden === true };
  });
}

/** The public subset of a suite: visible tests only, with the hidden flag stripped. */
export function toSampleTests(tests: ProblemTest[]) {
  return tests.filter((test) => !test.hidden).map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }));
}
