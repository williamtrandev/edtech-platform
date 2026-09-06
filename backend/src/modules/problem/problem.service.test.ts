import { describe, expect, it, vi } from "vitest";
import { ProblemService } from "./problem.service";

const problemRow = {
  id: "p1",
  slug: "two-sum",
  title: "Two Sum",
  statement: "Read two integers and print their sum.",
  difficulty: "EASY",
  track: "python",
  language: "python",
  starterCode: "print(0)",
  sampleTests: [{ name: "adds", input: "2 3", expectedOutput: "5" }],
  tests: [
    { name: "adds", input: "2 3", expectedOutput: "5", hidden: false },
    { name: "big", input: "1000000 1", expectedOutput: "1000001", hidden: true }
  ],
  status: "PUBLISHED",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01")
};

function serviceWith(row: unknown) {
  const repository = {
    findPublishedBySlug: vi.fn(async () => row),
    findManyPublished: vi.fn(async () => ({ items: row ? [row] : [], total: row ? 1 : 0 })),
    findSolvedSlugs: vi.fn(async () => new Set<string>())
  };
  return { service: new ProblemService(repository as never, {} as never), repository };
}

describe("ProblemService.getProblem", () => {
  it("never returns the full test suite to a learner", async () => {
    const { service } = serviceWith(problemRow);

    const problem = await service.getProblem("two-sum");

    expect(problem).not.toHaveProperty("tests");
    expect(problem.sampleTests).toEqual([{ name: "adds", input: "2 3", expectedOutput: "5" }]);
  });

  it("shows no worked example rather than reaching into the suite", async () => {
    const { service } = serviceWith({ ...problemRow, sampleTests: [] });

    const problem = await service.getProblem("two-sum");

    // The repository never selects `tests`, so there is nothing to fall back
    // to — which is the point. A fallback would mean loading the secret suite
    // into the path that serves learners.
    expect(problem.sampleTests).toEqual([]);
  });

  it("throws PROBLEM_NOT_FOUND for an unknown slug", async () => {
    const { service } = serviceWith(null);

    await expect(service.getProblem("nope")).rejects.toMatchObject({
      code: "PROBLEM_NOT_FOUND",
      statusCode: 404
    });
  });
});

describe("ProblemService.listProblems", () => {
  it("marks nothing solved for a signed-out caller, and does not ask", async () => {
    const { service, repository } = serviceWith(problemRow);

    const page = await service.listProblems(undefined, { page: 1, limit: 20 });

    expect(page.items[0].solved).toBe(false);
    expect(repository.findSolvedSlugs).not.toHaveBeenCalled();
  });

  it("marks a problem solved when the caller has passed it", async () => {
    const { service, repository } = serviceWith(problemRow);
    repository.findSolvedSlugs.mockResolvedValue(new Set(["two-sum"]));

    const page = await service.listProblems({ id: "u1" } as never, { page: 1, limit: 20 });

    expect(page.items[0].solved).toBe(true);
  });

  it("omits the test suite from every list row", async () => {
    const { service } = serviceWith(problemRow);

    const page = await service.listProblems(undefined, { page: 1, limit: 20 });

    expect(page.items[0]).not.toHaveProperty("tests");
  });

  it("reports pagination alongside the rows", async () => {
    const { service } = serviceWith(problemRow);

    const page = await service.listProblems(undefined, { page: 2, limit: 5 });

    expect(page.pagination).toEqual({ page: 2, limit: 5, total: 1 });
  });

  it("skips the solved lookup when the page is empty", async () => {
    const { service, repository } = serviceWith(null);

    const page = await service.listProblems({ id: "u1" } as never, { page: 1, limit: 20 });

    expect(page.items).toEqual([]);
    expect(repository.findSolvedSlugs).not.toHaveBeenCalled();
  });
});
