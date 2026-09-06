import { AppError } from "../../common/errors/app-error";
import { PROBLEM_ERROR_CODE } from "../../common/constants/business";
import type { ProblemTest } from "../../common/problem/problem-validation";
import type { ProblemListFilters, ProblemRepository } from "./problem.repository";

type ProblemRow = {
  id: string;
  slug: string;
  title: string;
  statement: string;
  difficulty: string;
  track: string | null;
  language: string;
  starterCode: string | null;
  sampleTests: unknown;
  createdAt: Date;
};

export type ListProblemsQuery = ProblemListFilters & { page: number; limit: number };

export class ProblemService {
  constructor(private readonly problemRepository: ProblemRepository) {}

  /**
   * Reshapes a row for a learner.
   *
   * There is deliberately no fallback to the full suite when `sampleTests` is
   * empty: the repository never selects `tests`, so the secret cases cannot
   * reach this path at all. A problem with no worked example simply shows
   * none, which the author controls when writing it.
   */
  private toPublicProblem(row: ProblemRow) {
    const stored = Array.isArray(row.sampleTests) ? (row.sampleTests as ProblemTest[]) : [];
    const sampleTests = stored.map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }));

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      statement: row.statement,
      difficulty: row.difficulty,
      track: row.track,
      language: row.language,
      starterCode: row.starterCode,
      sampleTests,
      createdAt: row.createdAt
    };
  }

  async listProblems(user: Express.UserClaims | undefined, query: ListProblemsQuery) {
    const { page, limit, ...filters } = query;
    const { items, total } = await this.problemRepository.findManyPublished(page, limit, filters);

    // Only a signed-in caller can have solved anything, and an empty page has
    // nothing to look up — skip the query in both cases.
    const solved =
      user?.id && items.length > 0
        ? await this.problemRepository.findSolvedSlugs(
            user.id,
            items.map((item) => item.slug)
          )
        : new Set<string>();

    return {
      items: items.map((item) => ({
        ...this.toPublicProblem(item as ProblemRow),
        solved: solved.has(item.slug)
      })),
      pagination: { page, limit, total }
    };
  }

  async getProblem(slug: string) {
    const row = await this.problemRepository.findPublishedBySlug(slug);
    if (!row) {
      throw new AppError("Problem not found", 404, PROBLEM_ERROR_CODE.notFound);
    }

    return this.toPublicProblem(row as ProblemRow);
  }
}
