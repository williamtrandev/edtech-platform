import { Prisma, ProblemDifficulty, ProblemStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type ProblemListFilters = {
  track?: string;
  difficulty?: ProblemDifficulty;
  search?: string;
};

export class ProblemRepository {
  /**
   * Columns a learner is allowed to see. `tests` is deliberately absent: the
   * hidden half of a suite must never leave the server, so it is excluded at
   * the query rather than stripped afterwards.
   */
  private readonly publicSelect = {
    id: true,
    slug: true,
    title: true,
    statement: true,
    difficulty: true,
    track: true,
    language: true,
    starterCode: true,
    sampleTests: true,
    createdAt: true
  } satisfies Prisma.ProblemSelect;

  async findManyPublished(page: number, limit: number, filters: ProblemListFilters = {}) {
    const search = filters.search?.trim();
    const where: Prisma.ProblemWhereInput = {
      status: ProblemStatus.PUBLISHED,
      ...(filters.track ? { track: filters.track } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.problem.findMany({
        where,
        select: this.publicSelect,
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.problem.count({ where })
    ]);

    return { items, total };
  }

  /** The learner-facing view of one problem, without its test suite. */
  async findPublishedBySlug(slug: string) {
    return prisma.problem.findFirst({
      where: { slug, status: ProblemStatus.PUBLISHED },
      select: this.publicSelect
    });
  }

  /** The full row, suite included. Server-side grading only — never serialized. */
  async findGradableBySlug(slug: string) {
    return prisma.problem.findFirst({
      where: { slug, status: ProblemStatus.PUBLISHED },
      select: { id: true, slug: true, language: true, tests: true }
    });
  }

  /** Slugs from the given set that this user has already passed in full. */
  async findSolvedSlugs(userId: string, slugs: string[]): Promise<Set<string>> {
    if (slugs.length === 0) {
      return new Set();
    }

    const rows = await prisma.problemSubmission.findMany({
      where: { userId, allPassed: true, problem: { slug: { in: slugs } } },
      select: { problem: { select: { slug: true } } },
      distinct: ["problemId"]
    });

    return new Set(rows.map((row) => row.problem.slug));
  }

  async createSubmission(data: {
    problemId: string;
    userId: string;
    code: string;
    passed: number;
    total: number;
    allPassed: boolean;
    gradingResult: Prisma.InputJsonValue;
  }) {
    return prisma.problemSubmission.create({ data });
  }

  async findSubmissions(userId: string, problemId: string, limit = 20) {
    return prisma.problemSubmission.findMany({
      where: { userId, problemId },
      select: { id: true, passed: true, total: true, allPassed: true, code: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }
}
