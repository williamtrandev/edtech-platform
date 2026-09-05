import { describe, expect, it } from "vitest";
import { toSampleTests, validateProblemTests } from "./problem-validation";

const test = (over: Partial<{ name: string; input: string; expectedOutput: string; hidden: boolean }> = {}) => ({
  name: "adds",
  input: "2 3",
  expectedOutput: "5",
  hidden: false,
  ...over
});

describe("validateProblemTests", () => {
  it("accepts a well-formed suite", () => {
    expect(validateProblemTests([test()])).toEqual([{ name: "adds", input: "2 3", expectedOutput: "5", hidden: false }]);
  });

  it("requires at least one test", () => {
    expect(() => validateProblemTests([])).toThrow();
  });

  it("rejects a non-array", () => {
    expect(() => validateProblemTests("nope")).toThrow();
  });

  it("rejects more than twenty tests", () => {
    expect(() => validateProblemTests(Array.from({ length: 21 }, () => test()))).toThrow();
  });

  it("requires a name", () => {
    expect(() => validateProblemTests([test({ name: "   " })])).toThrow();
  });

  it("requires an expected output", () => {
    expect(() => validateProblemTests([test({ expectedOutput: "  " })])).toThrow();
  });

  it("allows an empty input, for a program that reads no stdin", () => {
    expect(validateProblemTests([test({ input: "" })])[0].input).toBe("");
  });

  it("preserves stdin whitespace, which is significant", () => {
    expect(validateProblemTests([test({ input: "  a b  \n" })])[0].input).toBe("  a b  \n");
  });

  it("trims expected output, matching the grader's normalization", () => {
    expect(validateProblemTests([test({ expectedOutput: "  5  " })])[0].expectedOutput).toBe("5");
  });

  it("defaults hidden to false", () => {
    expect(validateProblemTests([{ name: "t", input: "", expectedOutput: "1" }])[0].hidden).toBe(false);
  });

  it("treats a non-boolean hidden as visible rather than guessing", () => {
    expect(validateProblemTests([{ name: "t", input: "", expectedOutput: "1", hidden: "yes" }])[0].hidden).toBe(false);
  });

  it("rejects an over-long test name", () => {
    expect(() => validateProblemTests([test({ name: "x".repeat(81) })])).toThrow();
  });

  it("rejects over-long expected output", () => {
    expect(() => validateProblemTests([test({ expectedOutput: "x".repeat(5001) })])).toThrow();
  });

  it("rejects over-long input", () => {
    expect(() => validateProblemTests([test({ input: "x".repeat(5001) })])).toThrow();
  });

  it("reports which test is at fault", () => {
    expect(() => validateProblemTests([test(), test({ name: "" })])).toThrow(/Test 2/);
  });
});

describe("toSampleTests", () => {
  it("keeps only visible tests and drops the hidden flag", () => {
    const tests = [test({ name: "visible" }), test({ name: "secret", hidden: true })];

    expect(toSampleTests(tests)).toEqual([{ name: "visible", input: "2 3", expectedOutput: "5" }]);
  });

  it("returns an empty list when every test is hidden", () => {
    expect(toSampleTests([test({ hidden: true })])).toEqual([]);
  });
});
