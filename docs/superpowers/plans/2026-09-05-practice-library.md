# Practice Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone `/practice` library of coding problems that anyone can browse and any signed-in learner can solve, with every submission recorded.

**Architecture:** Two new Prisma models (`Problem`, `ProblemSubmission`) behind a new `problem` backend module following the repository/service/controller/route split used by every other module. The sandbox layer (`CodeGradingService`, `runCode`) and the `CodeExercise` React component are reused unchanged. Two new public frontend routes consume a new `problem.service.ts` through react-query hooks.

**Tech Stack:** Express 4 + Prisma 5 + zod (backend), Vite 5 + React 18 + react-router 6 + TanStack Query + Tailwind 4 (frontend), vitest 2 for tests.

**Spec:** `docs/superpowers/specs/2026-09-05-practice-library-design.md`

## Global Constraints

- Conventional Commits, English, **no AI co-author or "Generated with" trailer**.
- Every backend test file relies on `backend/vitest.setup.ts` for required env. Do not import `config/env.ts` in a test without it — CI has no `.env`.
- Problem `language` must be a member of `EXECUTABLE_CODE_LANGUAGES` (exported from `backend/src/modules/code-execution/code-runner.ts`).
- Size caps come from `LESSON_CODE_LIMITS` in `backend/src/common/constants/lesson-content.ts`: `starterCodeMax` 20000, `testsMax` 20, `testNameMax` 80, `testIoMax` 5000.
- Test `input` is preserved verbatim (it is piped to stdin); `expectedOutput` is trimmed to match `normalizeOutput`.
- Hidden tests must never appear in a learner-facing response.
- Run `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build` in the affected package before every commit.
- After changing `prisma/schema.prisma`, run `npx prisma generate` or the type check will fail on a stale client.

---

### Task 1: Problem constants and payload validation

Pure logic first: the rules a problem must satisfy, with no database involved.

**Files:**
- Modify: `backend/src/common/constants/business.ts`
- Create: `backend/src/common/problem/problem-validation.ts`
- Test: `backend/src/common/problem/problem-validation.test.ts`

**Interfaces:**
- Consumes: `EXECUTABLE_CODE_LANGUAGES` from `../../modules/code-execution/code-runner`; `LESSON_CODE_LIMITS` from `../constants/lesson-content`.
- Produces:
  - `PROBLEM_DIFFICULTY` / `ProblemDifficulty`, `PROBLEM_STATUS` / `ProblemStatus`, `PROBLEM_ERROR_CODE` in `business.ts`
  - `export type ProblemTest = { name: string; input: string; expectedOutput: string; hidden: boolean }`
  - `export function validateProblemTests(raw: unknown): ProblemTest[]`
  - `export function toSampleTests(tests: ProblemTest[]): Array<{ name: string; input: string; expectedOutput: string }>`

- [ ] **Step 1: Add the constants**

In `backend/src/common/constants/business.ts`, after `COURSE_TRACKS`:

```ts
export const PROBLEM_DIFFICULTY = { easy: "EASY", medium: "MEDIUM", hard: "HARD" } as const;
export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTY)[keyof typeof PROBLEM_DIFFICULTY];

export const PROBLEM_STATUS = { draft: "DRAFT", published: "PUBLISHED", archived: "ARCHIVED" } as const;
export type ProblemStatus = (typeof PROBLEM_STATUS)[keyof typeof PROBLEM_STATUS];

export const PROBLEM_ERROR_CODE = {
  notFound: "PROBLEM_NOT_FOUND",
  languageInvalid: "PROBLEM_LANGUAGE_INVALID",
  testsRequired: "PROBLEM_TESTS_REQUIRED",
  testInvalid: "PROBLEM_TEST_INVALID"
} as const;
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/common/problem/problem-validation.test.ts`:

```ts
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

  it("rejects an over-long test name", () => {
    expect(() => validateProblemTests([test({ name: "x".repeat(81) })])).toThrow();
  });

  it("rejects over-long test io", () => {
    expect(() => validateProblemTests([test({ expectedOutput: "x".repeat(5001) })])).toThrow();
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
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd backend && npx vitest run src/common/problem/problem-validation.test.ts`
Expected: FAIL — `Failed to load url ./problem-validation`.

- [ ] **Step 4: Implement**

Create `backend/src/common/problem/problem-validation.ts`:

```ts
import { AppError } from "../errors/app-error";
import { PROBLEM_ERROR_CODE } from "../constants/business";
import { LESSON_CODE_LIMITS } from "../constants/lesson-content";

export type ProblemTest = { name: string; input: string; expectedOutput: string; hidden: boolean };

/**
 * Validates a problem's full test suite.
 *
 * `input` is kept verbatim because it is piped to the program's stdin, where
 * whitespace is significant, and an empty input is legitimate. `expectedOutput`
 * is trimmed to match the grader's output normalization.
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

/** The public subset of a suite: visible tests, with the hidden flag stripped. */
export function toSampleTests(tests: ProblemTest[]) {
  return tests.filter((test) => !test.hidden).map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }));
}
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `cd backend && npx vitest run src/common/problem/problem-validation.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 6: Prove the tests can fail**

Temporarily change `expectedOutput.trim()` to `expectedOutput`, re-run, and confirm the trimming test goes red. Restore.

- [ ] **Step 7: Verify and commit**

```bash
cd backend && pnpm run lint && pnpm run typecheck && pnpm run test
git add backend/src/common/constants/business.ts backend/src/common/problem
git commit -F - <<'EOF'
feat(practice): validate problem test suites

Practice problems need the same guarantees lesson exercises got: a known
language, a bounded suite, and every case carrying a name and an expected
output. Splitting the rule out now keeps it testable without a database.
EOF
```

---

### Task 2: Prisma models and migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_practice_problems/migration.sql`

**Interfaces:**
- Produces: Prisma models `Problem`, `ProblemSubmission`; enums `ProblemDifficulty`, `ProblemStatus`; relation `User.problemSubmissions`.

- [ ] **Step 1: Add the enums and models**

Append the two enums next to the other enums in `backend/prisma/schema.prisma`, and the two models after `Course`. Use exactly the shapes given in the spec's "Data model" section.

- [ ] **Step 2: Add the back-relation on User**

In `model User`, alongside `coursePayments`:

```prisma
  problemSubmissions     ProblemSubmission[]
```

- [ ] **Step 3: Generate the migration SQL without touching the database**

> **DANGER.** `--shadow-database-url` is destructive: Prisma DROPS the target
> schema and replays every migration into it. Pointing it at a real database
> destroys that database. It must only ever receive a throwaway Postgres.

Start a scratch database, diff against it, then throw it away:

```bash
cd backend
docker run --rm -d --name prisma-shadow -p 5433:5432 -e POSTGRES_PASSWORD=shadow postgres:16
mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_add_practice_problems"
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "postgresql://postgres:shadow@localhost:5433/postgres" \
  --script
docker stop prisma-shadow
```

Paste the output into the new `migration.sql`. **Do not run `migrate deploy`** — applying it to the remote database is the repository owner's call.

- [ ] **Step 4: Regenerate the client and type check**

```bash
cd backend && npx prisma generate && pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma
git commit -F - <<'EOF'
feat(practice): add problem and submission models

ExamQuestion was the obvious host for practice problems, but its examId
is required and every consumer depends on that. Making it nullable to
carry course-less problems would weaken an invariant across the whole
exam module, so practice gets its own model.

The migration is written but not applied; it targets a remote database.
EOF
```

---

### Task 3: Problem repository and read endpoints

**Files:**
- Create: `backend/src/modules/problem/problem.repository.ts`
- Create: `backend/src/modules/problem/problem.service.ts`
- Create: `backend/src/modules/problem/problem.controller.ts`
- Create: `backend/src/modules/problem/problem.schema.ts`
- Create: `backend/src/modules/problem/problem.route.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/problem/problem.service.test.ts`

**Interfaces:**
- Consumes: `validateProblemTests`, `toSampleTests` from Task 1.
- Produces:
  - `ProblemRepository` with `findManyPublished(params)`, `findPublishedBySlug(slug)`, `findSolvedSlugs(userId, slugs)`
  - `ProblemService` with `listProblems(user, query)`, `getProblem(slug)`
  - `problemRouter` mounted at `/practice`
  - Learner-facing shape `PublicProblem = { id, slug, title, statement, difficulty, track, language, starterCode, sampleTests }` — **no `tests` field**

- [ ] **Step 1: Write the failing test for the leak guard**

Create `backend/src/modules/problem/problem.service.test.ts`:

```ts
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
  status: "PUBLISHED"
};

function serviceWith(row: unknown) {
  const repository = {
    findPublishedBySlug: vi.fn(async () => row),
    findManyPublished: vi.fn(async () => ({ items: [row], total: 1 })),
    findSolvedSlugs: vi.fn(async () => new Set<string>())
  };
  return { service: new ProblemService(repository as never), repository };
}

describe("ProblemService.getProblem", () => {
  it("never returns the full test suite to a learner", async () => {
    const { service } = serviceWith(problemRow);

    const problem = await service.getProblem("two-sum");

    expect(problem).not.toHaveProperty("tests");
    expect(problem.sampleTests).toEqual([{ name: "adds", input: "2 3", expectedOutput: "5" }]);
  });

  it("derives sample tests from the suite when the column is empty", async () => {
    const { service } = serviceWith({ ...problemRow, sampleTests: [] });

    const problem = await service.getProblem("two-sum");

    expect(problem.sampleTests).toEqual([{ name: "adds", input: "2 3", expectedOutput: "5" }]);
  });

  it("throws PROBLEM_NOT_FOUND for an unknown slug", async () => {
    const { service } = serviceWith(null);

    await expect(service.getProblem("nope")).rejects.toMatchObject({ code: "PROBLEM_NOT_FOUND", statusCode: 404 });
  });
});

describe("ProblemService.listProblems", () => {
  it("marks nothing solved for a signed-out caller", async () => {
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
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx vitest run src/modules/problem/problem.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the repository**

`backend/src/modules/problem/problem.repository.ts` — follow `course-review.repository.ts` for style. `findManyPublished` filters on `status: PUBLISHED` plus optional `track`, `difficulty`, and a case-insensitive `title` contains for `search`; orders by `createdAt desc`; returns `{ items, total }` from a `$transaction`. `findSolvedSlugs` returns a `Set<string>` of slugs the user has an `allPassed` submission for.

- [ ] **Step 4: Implement the service**

`backend/src/modules/problem/problem.service.ts` maps rows through a single `toPublicProblem` helper that destructures `tests` out and falls back to `toSampleTests(tests)` when `sampleTests` is empty. Throw `new AppError("Problem not found", 404, PROBLEM_ERROR_CODE.notFound)` when the row is null.

- [ ] **Step 5: Run tests and confirm they pass**

Run: `cd backend && npx vitest run src/modules/problem/problem.service.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Add schema, controller, and routes**

`problem.schema.ts` — zod for the list query (`page`, `limit`, `track`, `difficulty`, `search`, `solved`) and a `slug` param. `problem.controller.ts` mirrors `course.controller.ts`. `problem.route.ts`:

```ts
problemRouter.get("/", optionalAuthMiddleware, validateRequest(listProblemsSchema), asyncHandler(problemController.listProblems));
problemRouter.get("/:slug", optionalAuthMiddleware, validateRequest(problemSlugSchema), asyncHandler(problemController.getProblem));
```

Mount in `backend/src/app.ts` beside the other routers: `app.use("/practice", problemRouter);`

- [ ] **Step 7: Verify and commit**

```bash
cd backend && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
git add backend/src/modules/problem backend/src/app.ts
git commit -F - <<'EOF'
feat(practice): list and read practice problems

Both endpoints are readable signed out, so the library is shareable and
indexable. The hidden half of a problem's test suite is stripped in one
place, and a test pins that it never reaches a learner.
EOF
```

---

### Task 4: Run and submit endpoints

**Files:**
- Modify: `backend/src/modules/problem/problem.service.ts`
- Modify: `backend/src/modules/problem/problem.controller.ts`
- Modify: `backend/src/modules/problem/problem.route.ts`
- Modify: `backend/src/modules/problem/problem.schema.ts`
- Modify: `backend/src/modules/problem/problem.repository.ts`
- Test: `backend/src/modules/problem/problem-run.test.ts`

**Interfaces:**
- Consumes: `CodeGradingService.gradeCodeQuestion` from `../code-execution/code-grading.service`; `isRateLimitError` from `../code-execution/execution-limiter`.
- Produces: `ProblemService.runProblem(user, slug, code)`, `ProblemService.submitProblem(user, slug, code)`, `ProblemService.listSubmissions(user, slug)`; `ProblemRepository.createSubmission(...)`, `findSubmissions(userId, problemId)`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/problem/problem-run.test.ts` covering:
1. `runProblem` grades against **sample tests only** — assert the `tests` argument handed to `gradeCodeQuestion` has length 1 for the fixture above, and contains no hidden case.
2. `submitProblem` grades against the **full suite** and calls `createSubmission` once with `{ passed, total, allPassed }` matching the grade.
3. `submitProblem` masks hidden cases in what it returns — a returned result entry with `hidden: true` carries no `input` or `expectedOutput`.
4. A `RateLimitError` from grading surfaces as `429 CODE_EXECUTION_BUSY`.
5. A `null` grade surfaces as `503 CODE_EXECUTION_UNAVAILABLE`.
6. `runProblem` for a signed-out caller throws `401 UNAUTHORIZED`.

Use the same `vi.fn()` stub-repository style as Task 3, plus a stubbed grading service.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx vitest run src/modules/problem/problem-run.test.ts`
Expected: FAIL — `runProblem is not a function`.

- [ ] **Step 3: Implement**

Add a private `gradeAgainst(language, code, tests)` on `ProblemService` that wraps `gradeCodeQuestion` in the same try/catch used by `CodeRunService.runVisibleTests` — `isRateLimitError` becomes `429 CODE_EXECUTION_BUSY`, `null` becomes `503 CODE_EXECUTION_UNAVAILABLE`. `runProblem` passes `toSampleTests(tests)`; `submitProblem` passes the full suite, records the submission, and masks hidden entries before returning.

- [ ] **Step 4: Run tests and confirm they pass**

Run: `cd backend && npx vitest run src/modules/problem/problem-run.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the routes**

```ts
problemRouter.post("/:slug/run", authMiddleware, validateRequest(runProblemSchema), asyncHandler(problemController.runProblem));
problemRouter.post("/:slug/submit", authMiddleware, validateRequest(runProblemSchema), asyncHandler(problemController.submitProblem));
problemRouter.get("/:slug/submissions", authMiddleware, validateRequest(problemSlugSchema), asyncHandler(problemController.listSubmissions));
```

`runProblemSchema` body: `{ code: z.string().min(1).max(20000) }`.

- [ ] **Step 6: Verify and commit**

```bash
cd backend && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
git add backend/src/modules/problem
git commit -F - <<'EOF'
feat(practice): run and submit practice solutions

Run checks the worked examples, submit checks everything and is recorded,
so a learner can see what they have solved. Sandbox saturation answers 429
rather than looking like a failed solution, matching the lesson runner.
EOF
```

---

### Task 5: Seed practice problems

**Files:**
- Create: `backend/scripts/seed-problems.ts`
- Modify: `backend/package.json` (add `"seed:problems": "tsx scripts/seed-problems.ts"`)

- [ ] **Step 1: Write the seed**

Eight problems across `python`, `javascript`, `bash`, and `sql`, spread over the three difficulties, each with a slug, statement, starter code, and 3–4 tests of which at least one is hidden. Reuse the stdin/stdout shape from `CODE_EXERCISES` in `scripts/seed-courses.ts`. Upsert by `slug` so re-running is safe.

- [ ] **Step 2: Run it**

```bash
cd backend && SUPABASE_DB_URL=$SUPABASE_DIRECT_URL npm run seed:problems
```

The pooler drops bulk writes; the direct URL is required.

- [ ] **Step 3: Verify through the API**

```bash
curl -s localhost:4000/practice | python3 -m json.tool | head -30
curl -s localhost:4000/practice/<slug> | python3 -m json.tool
```

Expected: the list returns eight problems; the detail response has `sampleTests` and **no** `tests` key.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/seed-problems.ts backend/package.json
git commit -m "feat(practice): seed a starter problem set"
```

---

### Task 6: Frontend service, hooks, and the practice list page

**Files:**
- Create: `frontend/src/services/problem.service.ts`
- Create: `frontend/src/hooks/use-problems.ts`
- Create: `frontend/src/pages/practice-page.tsx`
- Modify: `frontend/src/constants/business.ts` (mirror `PROBLEM_DIFFICULTY`)
- Modify: `frontend/src/lib/router.tsx`
- Modify: `frontend/src/i18n/locales/en/home.json`, `frontend/src/i18n/locales/vi/home.json`

**Interfaces:**
- Produces: `problemService` with `getProblems`, `getProblem`, `runProblem`, `submitProblem`, `getSubmissions`; hooks `usePracticeProblems`, `usePracticeProblem`, `useProblemSubmissions`; types `ProblemSummary`, `PracticeProblem`, `ProblemSubmission`.

- [ ] **Step 1: Add the service and hooks**

Follow `course.service.ts` and `use-courses.ts` exactly — same `httpClient`, same `ApiResponse<T>` wrapper, same query-key shape (`["problems", ...]`).

- [ ] **Step 2: Build the list page**

`/practice` renders a filter row (track, difficulty, search) reusing `ExploreFilterField`'s visual shape, and a grid of problem cards showing title, difficulty badge, track, and a solved marker when `solved` is true. Read `?track=` and `?difficulty=` from `useSearchParams` so links are shareable, falling back to "all" on an unknown value — same guard as the explore page.

- [ ] **Step 3: Register the route**

In `frontend/src/lib/router.tsx`, beside `/explore` (public, no `RequireAuth`):

```tsx
  {
    path: "/practice",
    element: <PracticePage />
  },
```

- [ ] **Step 4: Add i18n keys**

Both locales, following the flat `"section.key"` convention: `practice.title`, `practice.subtitle`, `practice.allDifficulties`, `practice.solved`, `practice.empty`, `practice.emptyDescription`, `difficulty.EASY`, `difficulty.MEDIUM`, `difficulty.HARD`.

- [ ] **Step 5: Verify in the browser**

Start the frontend, open `/practice`, and confirm: eight cards render, the track filter narrows the list, `?difficulty=EASY` preselects, and the console is clean.

- [ ] **Step 6: Verify and commit**

```bash
cd frontend && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
git add frontend/src
git commit -m "feat(practice): add the practice library list page"
```

---

### Task 7: Practice problem page

**Files:**
- Create: `frontend/src/pages/practice-problem-page.tsx`
- Modify: `frontend/src/lib/router.tsx`
- Modify: both `home.json` locale files

- [ ] **Step 1: Build the page**

`/practice/:slug` renders the statement beside a `CodeExercise`. Wire it exactly as `learner-exam-attempt-panel.tsx` does: `onRun` → `runResult`, Submit → `result`, `isRunning` guarding both buttons. Seed the editor from `starterCode`. Show a signed-out visitor the problem and the editor with both buttons disabled and a prompt to sign in — reading is public, running is not.

- [ ] **Step 2: Add submission history**

Below the editor, a collapsed section listing the caller's submissions: timestamp, passed/total, and a pass or fail marker. Only fetch it when signed in.

- [ ] **Step 3: Register the route**

```tsx
  {
    path: "/practice/:slug",
    element: <PracticeProblemPage />
  },
```

- [ ] **Step 4: Add i18n keys**

`practice.run`, `practice.submit`, `practice.submissions`, `practice.noSubmissions`, `practice.signInToRun`, `practice.solvedAt`.

- [ ] **Step 5: Verify end to end in the browser**

With Piston running: open a seeded problem, Run the starter code and confirm it fails the sample tests, replace it with a correct solution, Submit, and confirm every test passes and the submission appears in the history. Then `docker stop piston` and confirm Run reports the busy or unavailable message rather than failing silently. `docker start piston` afterwards.

- [ ] **Step 6: Verify and commit**

```bash
cd frontend && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
git add frontend/src
git commit -m "feat(practice): add the practice problem page"
```

---

## Self-Review

**Spec coverage:** Data model → Task 2. API table → Tasks 3 and 4. No-enrollment-gate → Tasks 3 and 4 (no enrollment lookup anywhere). Error contract → Task 4. Frontend routes → Tasks 6 and 7. Constraints (language, caps, whitespace) → Task 1. Verification bullets → Task 1 (validation), Task 3 (hidden-test leak, signed-out access), Task 7 (end-to-end).

**Placeholders:** None. Every code step carries real code; the three prose-only steps (Tasks 3.3, 3.4, 5.1) name the exact file, the pattern file to copy, and the required behaviour.

**Type consistency:** `ProblemTest` is defined in Task 1 and consumed by Tasks 3 and 4. `toSampleTests` keeps its name throughout. `PublicProblem` omits `tests` in Task 3 and is unchanged in Task 7. The frontend `ProblemSummary` carries `solved`, produced by `listProblems` in Task 3.

**Gap found and fixed:** the spec allows an empty `sampleTests`, so Task 3 falls back to deriving them from the suite rather than showing a learner nothing.
