# Practice Library — Design

**Date:** 2026-09-05
**Status:** Approved for implementation
**Sub-project:** SP4 of the post-payments roadmap

## Problem

Every code exercise on the platform lives inside a course: either as an exam `CODE` question or as a lesson of type `CODE_EXERCISE`. Both are enrollment-gated. A visitor cannot write a single line of code without first finding a course and enrolling in it.

That makes the platform's core promise — "learn to code by building" — reachable only after a commitment. It also means there is nowhere to practise a skill on its own, and no record of what a learner has solved.

## Goal

A standalone `/practice` section: a browsable library of coding problems, each solvable in the browser, with no enrollment required. Every submission is recorded, so a learner can see what they have solved and revisit earlier attempts.

## Non-goals

- Contests, timed rounds, or ranking. Gamification is SP5.
- Editorial solutions or discussion threads.
- Multi-file or project-shaped problems. The judging model stays stdin/stdout, unchanged from exams and lessons.
- Problem authoring UI. v1 seeds problems; an admin UI is a later increment.

## Key decision: a new `Problem` model, not a reused `ExamQuestion`

`ExamQuestion` is the obvious candidate for reuse — it already stores a language, starter code, sample tests, and secret tests.

It is the wrong choice. `ExamQuestion.examId` is a required foreign key, and every consumer relies on that: grading walks an attempt's questions, the learner selects go through `examId`, and the repository's selects assume a parent exam. Hosting a standalone problem would mean making `examId` nullable, which weakens an invariant that currently holds everywhere and forces a null check into code paths that have never needed one.

A practice problem is a different entity with a different lifecycle. It gets its own model.

What *is* reused, unchanged:

- `CodeGradingService.gradeCodeQuestion` and `runCode` — the sandbox layer, already bounded and retried.
- The `CodeExercise` React component, already built for exams and lessons.
- The `errors.api.<CODE>` error-message convention.

## Data model

```prisma
enum ProblemDifficulty {
  EASY
  MEDIUM
  HARD
}

enum ProblemStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Problem {
  id          String            @id @default(cuid())
  /// Stable, human-readable id used in URLs. Never reused.
  slug        String            @unique
  title       String
  /// Markdown-free plain text; rendered as paragraphs.
  statement   String
  difficulty  ProblemDifficulty
  /// Learning track, validated against COURSE_TRACKS.
  track       String?
  language    String
  starterCode String?
  /// Public examples: [{ name, input, expectedOutput }]
  sampleTests Json
  /// Full suite, including hidden cases: [{ name, input, expectedOutput, hidden }]
  tests       Json
  status      ProblemStatus     @default(DRAFT)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  submissions ProblemSubmission[]

  @@index([status])
  @@index([track])
  @@index([difficulty])
}

model ProblemSubmission {
  id            String   @id @default(cuid())
  problemId     String
  userId        String
  code          String
  passed        Int
  total         Int
  allPassed     Boolean
  /// { total, passed, allPassed, results: [{ name, passed, hidden }] }
  gradingResult Json
  createdAt     DateTime @default(now())

  problem Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([problemId])
  @@index([userId, problemId])
}
```

`sampleTests` is a public subset of `tests`. Keeping them in separate columns mirrors how `ExamQuestion` splits `codeConfig` from `correctAnswers`, and means the learner-facing select can never accidentally leak a hidden case.

## API

All routes mount at `/practice`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/practice` | optional | List published problems. Filters: `track`, `difficulty`, `search`, `solved`. Paginated. |
| GET | `/practice/:slug` | optional | One published problem. Never returns `tests`, only `sampleTests`. |
| POST | `/practice/:slug/run` | required | Run code against `sampleTests` only. Records nothing. |
| POST | `/practice/:slug/submit` | required | Run against the full `tests`, record a `ProblemSubmission`, return the graded result with hidden cases masked. |
| GET | `/practice/:slug/submissions` | required | The caller's own submissions for this problem, newest first. |

**No enrollment check anywhere.** That is the point of the feature. Listing and reading a problem are public so the library is indexable and shareable; running and submitting require a signed-in user so submissions have an owner and the sandbox is not open to anonymous traffic.

`solved` on the list endpoint is only meaningful for a signed-in caller; for a guest it is ignored.

### Error contract

Reuses the existing sandbox codes, so the messages added in PR #10 apply unchanged:

- `429 CODE_EXECUTION_BUSY` — sandbox saturated, retry.
- `503 CODE_EXECUTION_UNAVAILABLE` — sandbox down or language unrunnable.
- `404 PROBLEM_NOT_FOUND` — unknown slug, or the problem is not published.

## Frontend

Two routes, both public:

- `/practice` — filterable list. Track and difficulty selects reuse the shape of the explore page's filter row. A signed-in learner sees a solved marker per row.
- `/practice/:slug` — statement on one side, `CodeExercise` on the other. Run and Submit buttons. Submission history below, collapsed by default.

`CodeExercise` is used as-is. It already accepts `onRun`, `isRunning`, `runResult`, and `result`; Submit maps to `result`, Run maps to `runResult`, matching how the exam attempt panel already drives it.

## Constraints

- Problem `language` must be in `EXECUTABLE_CODE_LANGUAGES`. A practice problem exists to be run; a language the sandbox cannot execute would strand the learner, exactly as it would in a lesson exercise.
- `tests` must contain at least one case; `sampleTests` may be empty (a problem with no worked example is legitimate).
- Size caps mirror `LESSON_CODE_LIMITS`: starter code 20000 chars, 1–20 tests, test name 80, test input/output 5000 each.
- Submitted code is capped at 20000 characters, matching the exam answer cap.

## Verification

- Server-side validation of problem payloads is covered by unit tests, as `validateAndNormalizeLessonContent` is.
- Hidden tests must never appear in any learner-facing response. This gets an explicit test.
- The list and detail endpoints must work for a signed-out caller. This gets an explicit test.
