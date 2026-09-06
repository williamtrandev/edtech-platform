import { describe, expect, it, vi } from "vitest";
import { RateLimitError } from "../code-execution/execution-limiter";
import { ProblemService } from "./problem.service";

const gradable = {
  id: "p1",
  slug: "two-sum",
  language: "python",
  tests: [
    { name: "adds", input: "2 3", expectedOutput: "5", hidden: false },
    { name: "big", input: "1000000 1", expectedOutput: "1000001", hidden: true }
  ]
};

const grade = {
  total: 2,
  passed: 2,
  allPassed: true,
  results: [
    { name: "adds", passed: true, hidden: false, input: "2 3", expectedOutput: "5", stdout: "5\n" },
    { name: "big", passed: true, hidden: true, input: "1000000 1", expectedOutput: "1000001", stdout: "1000001\n" }
  ]
};

function build(overrides: { grade?: unknown; gradeError?: unknown } = {}) {
  const repository = {
    findGradableBySlug: vi.fn(async () => gradable),
    createSubmission: vi.fn(async () => ({ id: "s1" })),
    findSubmissions: vi.fn(async () => []),
    findPublishedBySlug: vi.fn(async () => null),
    findManyPublished: vi.fn(async () => ({ items: [], total: 0 })),
    findSolvedSlugs: vi.fn(async () => new Set<string>())
  };
  const grading = {
    gradeCodeQuestion: vi.fn(async (_params: { language: string; code: string; tests: Array<{ name: string }> }) => {
      if (overrides.gradeError) {
        throw overrides.gradeError;
      }
      return "grade" in overrides ? overrides.grade : grade;
    })
  };
  return { service: new ProblemService(repository as never, grading as never), repository, grading };
}

const user = { id: "u1" } as never;

describe("ProblemService.runProblem", () => {
  it("checks only the worked examples, never the hidden cases", async () => {
    const { service, grading } = build();

    await service.runProblem(user, "two-sum", "print(1)");

    const [passed] = grading.gradeCodeQuestion.mock.calls[0];
    expect(passed.tests).toHaveLength(1);
    expect(passed.tests[0].name).toBe("adds");
  });

  it("records nothing — a practice run is not an attempt", async () => {
    const { service, repository } = build();

    await service.runProblem(user, "two-sum", "print(1)");

    expect(repository.createSubmission).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    const { service } = build();

    await expect(service.runProblem(undefined, "two-sum", "print(1)")).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("ProblemService.submitProblem", () => {
  it("checks the whole suite", async () => {
    const { service, grading } = build();

    await service.submitProblem(user, "two-sum", "print(1)");

    const [passed] = grading.gradeCodeQuestion.mock.calls[0];
    expect(passed.tests).toHaveLength(2);
  });

  it("records the attempt with the score it earned", async () => {
    const { service, repository } = build();

    await service.submitProblem(user, "two-sum", "print(1)");

    expect(repository.createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ problemId: "p1", userId: "u1", passed: 2, total: 2, allPassed: true })
    );
  });

  it("masks the hidden cases in what it returns", async () => {
    const { service } = build();

    const result = await service.submitProblem(user, "two-sum", "print(1)");
    const hidden = result.results.find((entry) => entry.hidden);

    expect(hidden).toBeDefined();
    expect(hidden).not.toHaveProperty("input");
    expect(hidden).not.toHaveProperty("expectedOutput");
    expect(hidden).not.toHaveProperty("stdout");
    expect(hidden?.passed).toBe(true);
  });

  it("leaves the visible cases intact, so a learner can debug", async () => {
    const { service } = build();

    const result = await service.submitProblem(user, "two-sum", "print(1)");
    const visible = result.results.find((entry) => !entry.hidden);

    expect(visible).toMatchObject({ name: "adds", input: "2 3", expectedOutput: "5" });
  });
});

describe("sandbox failures", () => {
  it("reports saturation as busy, which is worth retrying", async () => {
    const { service } = build({ gradeError: new RateLimitError("queue full") });

    await expect(service.submitProblem(user, "two-sum", "print(1)")).rejects.toMatchObject({
      statusCode: 429,
      code: "CODE_EXECUTION_BUSY"
    });
  });

  it("reports an outage as unavailable, which is not the learner's fault", async () => {
    const { service } = build({ grade: null });

    await expect(service.submitProblem(user, "two-sum", "print(1)")).rejects.toMatchObject({
      statusCode: 503,
      code: "CODE_EXECUTION_UNAVAILABLE"
    });
  });

  it("does not record a submission when the sandbox failed", async () => {
    const { service, repository } = build({ gradeError: new RateLimitError("queue full") });

    await expect(service.submitProblem(user, "two-sum", "print(1)")).rejects.toThrow();
    expect(repository.createSubmission).not.toHaveBeenCalled();
  });
});
