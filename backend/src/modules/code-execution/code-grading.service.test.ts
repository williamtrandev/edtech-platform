import { describe, expect, it } from "vitest";
import { normalizeOutput } from "./code-grading.service";

/**
 * normalizeOutput decides whether a learner's submission passes. Every case
 * below is a way a correct program can differ from the author's expected
 * output without being wrong — none of them may fail a learner.
 */
describe("normalizeOutput", () => {
  it("treats Windows and Unix line endings as equal", () => {
    expect(normalizeOutput("a\r\nb")).toBe(normalizeOutput("a\nb"));
  });

  it("ignores a trailing newline, which most languages print by default", () => {
    expect(normalizeOutput("55\n")).toBe(normalizeOutput("55"));
  });

  it("ignores several trailing blank lines", () => {
    expect(normalizeOutput("55\n\n\n")).toBe(normalizeOutput("55"));
  });

  it("ignores trailing spaces and tabs on every line, not just the last", () => {
    expect(normalizeOutput("a   \nb\t\nc")).toBe(normalizeOutput("a\nb\nc"));
  });

  it("ignores leading and trailing whitespace around the whole output", () => {
    expect(normalizeOutput("  \n55\n  ")).toBe(normalizeOutput("55"));
  });

  it("keeps interior blank lines, which are real output structure", () => {
    expect(normalizeOutput("a\n\nb")).not.toBe(normalizeOutput("a\nb"));
  });

  it("keeps leading indentation on interior lines", () => {
    expect(normalizeOutput("a\n  b")).not.toBe(normalizeOutput("a\nb"));
  });

  it("keeps the difference between distinct values", () => {
    expect(normalizeOutput("55")).not.toBe(normalizeOutput("56"));
  });

  it("collapses whitespace-only output to an empty string", () => {
    expect(normalizeOutput(" \n\t\n ")).toBe("");
  });
});
