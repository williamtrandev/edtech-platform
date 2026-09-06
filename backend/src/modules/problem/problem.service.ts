import { AppError } from "../../common/errors/app-error";
import { PROBLEM_ERROR_CODE } from "../../common/constants/business";
import type { ProblemListFilters, ProblemRepository } from "./problem.repository";
import type { CodeGradingService, CodeQuestionGrade } from "../code-execution/code-grading.service";
import { isRateLimitError } from "../code-execution/execution-limiter";
import { toSampleTests, type ProblemTest } from "../../common/problem/problem-validation";

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
  constructor(
    private readonly problemRepository: ProblemRepository,
    private readonly codeGradingService: CodeGradingService
  ) {}

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

  async runProblem(user: Express.UserClaims | undefined, slug: string, code: string) {
    const problem = await this.requireGradable(user, slug);

    // Only the worked examples. Running the hidden cases would hand out the
    // answer key one failure at a time.
    return this.gradeAgainst(problem.language, code, toSampleTests(problem.tests).map((test) => ({ ...test, hidden: false })));
  }

  async submitProblem(user: Express.UserClaims | undefined, slug: string, code: string) {
    const problem = await this.requireGradable(user, slug);
    const grade = await this.gradeAgainst(problem.language, code, problem.tests);

    await this.problemRepository.createSubmission({
      problemId: problem.id,
      userId: user!.id,
      code,
      passed: grade.passed,
      total: grade.total,
      allPassed: grade.allPassed,
      gradingResult: {
        total: grade.total,
        passed: grade.passed,
        allPassed: grade.allPassed,
        results: grade.results.map(({ name, passed, hidden }) => ({ name, passed, hidden }))
      }
    });

    return { ...grade, results: grade.results.map((result) => maskHidden(result)) };
  }

  async listSubmissions(user: Express.UserClaims | undefined, slug: string) {
    const problem = await this.requireGradable(user, slug);
    return this.problemRepository.findSubmissions(user!.id, problem.id);
  }

  private async requireGradable(user: Express.UserClaims | undefined, slug: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const problem = await this.problemRepository.findGradableBySlug(slug);
    if (!problem) {
      throw new AppError("Problem not found", 404, PROBLEM_ERROR_CODE.notFound);
    }

    return { ...problem, tests: (Array.isArray(problem.tests) ? problem.tests : []) as ProblemTest[] };
  }

  /**
   * Runs code and turns sandbox trouble into something the caller can act on.
   * Saturation is temporary and worth retrying; an outage is not the learner's
   * fault and must not read as a failed solution.
   */
  private async gradeAgainst(language: string, code: string, tests: ProblemTest[]): Promise<CodeQuestionGrade> {
    let grade: CodeQuestionGrade | null;
    try {
      grade = await this.codeGradingService.gradeCodeQuestion({ language, code, tests });
    } catch (error) {
      if (isRateLimitError(error)) {
        throw new AppError("Code execution is busy, try again shortly", 429, "CODE_EXECUTION_BUSY");
      }
      throw error;
    }

    if (!grade) {
      throw new AppError("Code execution is unavailable", 503, "CODE_EXECUTION_UNAVAILABLE");
    }

    return grade;
  }
}

/** A hidden case reports only whether it passed; its data stays secret. */
function maskHidden(result: CodeQuestionGrade["results"][number]) {
  return result.hidden ? { name: result.name, passed: result.passed, hidden: true } : result;
}
