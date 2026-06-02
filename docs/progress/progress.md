# System Features Progress

Source: `system-feats.md`  
Last updated: 2026-06-01

Legend:

- `[x]` Implemented enough for current product flow
- `[~]` Partial / needs follow-up
- `[ ]` Not implemented

## 1. Product Goal / Roles

- [x] Basic LMS shell exists: course catalog, course detail, lesson content, enrollment, progress.
- [x] Three roles exist: `USER`, `INSTRUCTOR`, `ADMIN`.
- [x] Role-based routing exists for learner explore, instructor/admin course workspace, admin users.
- [x] Sidebar navigation is scoped per role; admin no longer sees learner menus.
- [x] Course workspace UI now differs by role: instructors see owned-course creation workspace, admins see review/management workspace.
- [x] Frontend data hooks are centralized under `frontend/src/hooks` for easier feature control.
- [~] Product still missing advanced analytics refinements and several workflow items; certificate PDF, notification preferences, and email queue are now in place.

## 2. Authentication / Account Flow

- [x] Login/register/logout with Supabase auth.
- [x] Register supports choosing learner or instructor.
- [x] Email confirmation redirects to confirmation screen, then user must log in.
- [x] Reset password flow implemented with localized expired/missing-session states.
- [x] Auth errors are mapped to i18n, including `Email not confirmed`.
- [x] Error/success banners update when language changes.
- [~] Admin account setup exists through seed script, not product UI.
- [x] User suspension/status implemented.

## 3. Course Discovery Flow

- [x] Explore page displays only `PUBLISHED` courses.
- [x] Guest/user/instructor/admin can view public catalog.
- [x] Course search by title/description.
- [x] Server-side pagination and frontend lazy loading at 12 courses/page.
- [x] Course cards show cover image, title, description, enrolled learner count.
- [x] Course detail route exists.
- [x] Course detail switches CTA between sign in, enroll, and continue learning.
- [x] Lesson content access is locked to enrolled learners, course owner, or admin.
- [x] Filters exist for category, level, language, instructor, enrollment status.
- [x] Sort exists for newest, oldest, most enrolled, highest rated, title.
- [x] Course metadata exists: category, level, language, estimated duration, requirements, outcomes.
- [x] Guest enroll CTA redirects to login and returns to course detail after login.

## 4. Course Enrollment Flow

- [x] Authenticated user can enroll in published course.
- [x] Backend checks course exists and is `PUBLISHED`.
- [x] Duplicate enrollment protected by DB unique constraint.
- [x] Duplicate enrollment returns existing row instead of creating duplicate.
- [x] My Learning page lists enrolled courses.
- [x] Enrollment action invalidates enrollment, course, and progress queries.
- [x] Enrollment response includes initial progress snapshot (`0%` until first lesson completion).
- [x] Enrollment success notification implemented through in-app notifications.
- [x] Dedicated learner learning page exists (`/courses/:courseId/learn`) and enrolled learners are redirected there from curriculum flow.
- [x] Admin manual enrollment/removal implemented for course owner/admin.
- [x] Drop/cancel enrollment implemented for learners.

## 5. Course Learning Flow

- [x] Lessons support `TEXT`, `VIDEO`, `RESOURCE`.
- [x] Rich text lesson authoring exists.
- [x] Video/resource upload and preview exist.
- [x] Lesson completion endpoint exists.
- [x] Course progress percentage from completed lessons exists.
- [x] My Progress page exists.
- [~] Course detail still contains learner reader fallback, but primary learner flow is dedicated `/learn` page.
- [x] Learner lesson content panel with previous/next navigation on course detail.
- [~] RESOURCE preview supports images/PDF/markdown/text where possible; unsupported files open externally.
- [x] Video watch progress/resume implemented (`watchPositionSeconds`) in learner `/learn` flow.
- [x] QUIZ and LIVE_SESSION lesson types: enum + migration, studio authoring (link exam / live details), learner `/learn` quiz attempt panel + live session card.
- [x] Lesson prerequisites: `Lesson.prerequisiteLessonId`, cycle validation on instructor update, learner unlock in `GET /lesson-progress/courses/:courseId/me/lessons`, progress writes blocked with `LESSON_LOCKED_PREREQUISITE`, learn curriculum lock UI + studio prerequisite picker.
- [x] Offline progress sync: local queue for lesson completion/watch position, `POST /lesson-progress/sync` batch replay with idempotency, learn-page sync banner.
- [x] Deleted lesson recovery/archive: `Lesson.archivedAt`, `DELETE /lessons/:id` archives (keeps progress), `POST /lessons/:id/restore`, learners see active lessons only, studio archived panel + restore.

## 6. Instructor Course Management Flow

- [x] Instructor can open course studio.
- [x] Instructor can create course.
- [x] Instructor can edit own course.
- [x] Instructor can add/edit/delete lessons.
- [x] Instructor can upload cover image, lesson files, lesson videos.
- [x] Instructor can reorder lessons with drag-and-drop.
- [x] Reorder uses debounced/silent update behavior in UI.
- [x] Course status supports `DRAFT`, `PUBLISHED`, `ARCHIVED`, `LOCKED`.
- [x] Admin can lock/unlock invalid courses via `POST/DELETE /courses/:id/locks` with optional reason; restores prior status on unlock.
- [x] Locked courses hidden from learner explore/enrollment; instructor read-only until admin unlocks.
- [x] Instructor/admin can view enrolled students for course.
- [x] Admin can manage existing courses.
- [x] Instructor workspace list defaults to owned courses; admin workspace can review all courses.
- [~] Admin cannot create course by product decision in current code, while spec permission matrix says admin can.
- [x] Publish validation blocks missing title, cover, required metadata, outcomes, requirements, or lesson.
- [x] Category, level, language, outcomes, requirements can be created/edited.
- [x] Publish is blocked when course has no lessons.
- [x] Course preview flow: `/courses/:courseId/preview` (+ lesson) for course owner/admin, amber banner, no progress writes, fresh-learner prerequisite simulation, CTA on course studio.
- [x] Course analytics on studio course detail (`GET /courses/:id/analytics`: completion/engagement, exam/assignment stats, at-risk learners, certificate history).
- [x] Course owner assignment: admin `PUT /courses/:id/instructors`, studio owner picker on course detail.
- [x] Archive impact warning/audit: `GET /courses/:id/archive-impact`, confirm dialog impact summary, `COURSE_ARCHIVED` audit stores impact snapshot.
- [x] Course review workflow implemented.

- [x] Exam model/schema implemented with course ownership and status lifecycle.
- [x] Exam authoring supports metadata CRUD, archive, and question authoring for single-choice, multi-choice, and free-text questions.
- [x] Exam attempt lifecycle supports start, answer capture, idempotent submit, auto-grading worker, and graded results UI.
- [x] Exam timer and timeout auto-submit implemented in learner exam UI.
- [x] Answer autosave API and debounced frontend autosave UX implemented.
- [x] Auto-grading for single/multi choice via BullMQ `exam-grading` worker.
- [x] Manual grading API (`PATCH /exam-attempts/:attemptId/grading`) for instructor/admin.
- [x] Manual grading UI implemented: instructor/admin can list exam attempts, inspect answers, filter by status, and save score.
- [x] Exam submit requires `Idempotency-Key` and caches duplicate submit response in Redis.
- [x] Anti-cheat integrity events: client tab/focus/reconnect logging, server submit events, instructor integrity log and attempt flags.
- [x] Grading worker exists; admin failed-job inbox with retry batch, discard, and dead-letter move on `/jobs`.

## 8. Assignment Flow

- [x] Assignment model/schema implemented.
- [x] Assignment creation/publishing/archive implemented for instructor owner/admin.
- [x] Student submission flow implemented for enrolled learners.
- [x] Assignment attachment upload picker wired (`LessonUploadField` + upload service).
- [x] Late submission flag set when `submittedAt > dueAt`.
- [x] Instructor grading/feedback implemented.
- [x] Rubric support: criteria on assignment (`PUT /assignments/:assignmentId/rubric-criteria`), per-criterion grading, learner rubric breakdown.
- [x] Grade history timeline for learners (`GET /learner-analytics/courses/:courseId/me` + sidebar on course learn page).

## 9. Progress Tracking Flow

- [x] Lesson completion stored per user/lesson.
- [x] Course progress percentage is calculated server-side from lesson counts.
- [x] Progress permission checks use enrollment or owner/admin access.
- [x] Progress uses weighted lessons, exams, and assignments with completion criteria.
- [~] Student dashboard exists; per-lesson progress API added (`GET /lesson-progress/courses/:courseId/me/lessons`).
- [x] Weighted progress implemented (lessons + exams + assignments segments).
- [x] Course completion criteria: lessons-only or full requirements (lessons + passed exams + submitted assignments).
- [x] Certificate auto-issue hooks on lesson complete, exam graded, assignment submit.
- [x] Instructor at-risk learner insights in `GET /courses/:id/analytics` (inactive, stalled, low progress).
- [x] Progress recalculation on lesson removal: completed lessons capped to current total; issued certificates are not auto-revoked when requirements change.

## 10. Certificate Flow

- [x] Certificate model/schema implemented.
- [x] Certificate PDF generation implemented (`GET /certificates/:certificateId/pdf`) with Redis cache and BullMQ `certificate-pdf` worker.
- [x] Public verification page implemented.
- [x] Certificate revoke/restore implemented for course owner/admin with audit entries.
- [x] Certificate issue notification implemented; certificate history timeline in course analytics UI.
- [x] Certificate issue audited (`CERTIFICATE_ISSUED`).

## 11. Notification Flow

- [x] Notification model/schema implemented.
- [x] In-app notification center implemented in authenticated layout.
- [x] Enrollment success notification implemented.
- [x] Assignment graded, certificate issued, exam submit/graded, and course published notifications implemented in-app.
- [x] User notification preferences implemented in account settings (`GET/PATCH /notifications/preferences`).
- [x] Email notification queue implemented with typed templates and SMTP/Resend/log providers.

## 12. Admin User Management Flow

- [x] Admin-only users page exists.
- [x] Admin can list users.
- [x] Admin can create user rows.
- [x] Admin can assign roles on create.
- [~] Role labels are localized.
- [x] User search/filter exists by email/ID and role.
- [x] User detail page implemented (`/users/:id`).
- [x] Role update for existing users exists in UI/API flow.
- [x] Suspend/reactivate exists with `ACTIVE`/`SUSPENDED` user status.
- [x] Last admin protection exists for role downgrade/delete.
- [~] Admin role/status updates are audited; full admin action audit UI missing.

## 13. Audit Flow

- [x] Audit log model/schema exists.
- [x] Role/status change audit implemented for admin user updates.
- [x] Course publish/archive audit implemented.
- [~] Grade/certificate/admin override audit partially implemented (certificate revoke/restore audited).
- [x] Append-only audit rules enforced in Prisma client (`auditLog` update/delete/upsert blocked).
- [x] Audit UI implemented for admin audit log browsing/filtering.

## 14. Analytics Flow

- [~] Basic learner count appears on course/explore cards.
- [~] Basic course progress appears for current user.
- [x] Analytics queue refreshes platform overview snapshot into Redis (`platform-overview` job every 5 minutes).
- [x] Student learning analytics (`GET /learner-analytics/me`: summary, exams/assignments, study streak, grade history, recent activity; My Progress UI).
- [x] Instructor course analytics on course detail (`GET /courses/:id/analytics`).
- [~] Basic platform analytics page implemented for admin (`/analytics`).
- [x] Queue failure rate shown on admin `/jobs` per queue (`failed / (completed + failed)`).

## 15. Background Job Flow

- [x] BullMQ/Redis base queue scaffold exists.
- [x] Analytics worker scaffold exists.
- [x] Worker logging uses shared Winston logger in job workers.
- [~] Email notification job queue implemented with worker, retry/backoff, and Resend/log delivery.
- [x] Exam grading jobs implemented (`exam-grading` queue + worker).
- [x] Certificate PDF jobs implemented (`certificate-pdf` queue, warm on issue/restore, cache invalidation on revoke).
- [~] In-app notification delivery is synchronous; queued email delivery implemented via BullMQ worker.
- [x] File cleanup jobs implemented (`file-cleanup` queue, orphan `/uploads` scan, daily cron 04:00, 24h grace).
- [x] Job monitoring UI on admin `/jobs` with paginated failed-job inbox, retry batch, discard, and dead-letter queue move.

## 16. Search & Discovery Flow

- [x] Explore search by keyword.
- [x] Search results are paginated.
- [x] Anonymous users see only published courses.
- [x] Archived courses are hidden from public catalog.
- [x] Filters exist for category, level, language, instructor.
- [x] Sort options implemented.
- [x] Instructor filter source implemented through `GET /courses/facets`.
- [x] Ratings/reviews implemented with course review model, course detail UI, and highest-rated sort.

## 17. Permission Matrix

- [x] View published courses: `USER`, `INSTRUCTOR`, `ADMIN`, guest.
- [x] View draft courses: instructor owner/admin via detail/workspace.
- [x] Create course: instructor.
- [x] Edit/archive course: owner/admin (blocked while locked except admin unlock).
- [x] Lock/unlock course moderation: admin only.
- [x] View enrolled students: owner/admin.
- [x] Create/edit/reorder/delete lessons: owner/admin.
- [x] View own progress: user.
- [x] Manage users page: admin only.
- [~] Admin create course differs from spec: current product blocks admin creation.
- [x] Lesson access requires enrollment or owner/admin access.
- [x] Exam permissions implemented for metadata/list/archive/questions and learner attempts.
- [x] Assignments permissions implemented for owner/admin management and enrolled learner submission.
- [x] Certificate permissions implemented for current-user list and public verification.
- [x] Notifications permissions implemented for current-user-only access.
- [x] Audit/job monitoring permissions: admin-only via auth middleware + service checks.

## 18. Recommended Priorities Status

### Phase 1 - Learning Foundation

- [x] Authentication
- [x] Role-based layout
- [x] Course catalog
- [x] Course detail
- [x] Enrollment
- [x] Lesson learning (course detail learner reader + prev/next)
- [x] Lesson completion
- [~] My Learning dashboard

### Phase 2 - Instructor Studio

- [x] Course creation
- [x] Lesson management
- [x] Course publishing via status
- [x] Student enrollment list
- [~] Basic course analytics

### Phase 3 - Exam & Assignment

- [x] Exam creation
- [x] Exam taking
- [x] Auto-save
- [x] Submit exam
- [x] Manual grading (API + UI)
- [x] Assignment creation
- [x] Assignment submission
- [x] Assignment grading

### Phase 4 - Progress & Certificate

- [x] Weighted progress
- [~] Course completion based on lesson completion only.
- [x] Certificate auto-issue
- [x] Certificate PDF
- [x] Certificate verification page

### Phase 5 - Admin & Reliability

- [~] User management
- [x] Role change
- [x] Audit logs
- [~] Queue dashboard
- [~] Notification management
- [~] Platform analytics

### Phase 6 - Advanced Features

- [x] Anti-cheat logs (exam attempt integrity events API + instructor UI)
- [x] Course review workflow
- [x] Live session
- [x] Discussion/comments
- [x] Rating/review
- [x] Learning path
- [x] Payment support

## 19. Constants / Domain Model

- [x] `USER_ROLE`: `USER`, `INSTRUCTOR`, `ADMIN`.
- [x] `COURSE_STATUS`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- [x] `LESSON_CONTENT_TYPE`: `TEXT`, `VIDEO`, `RESOURCE`, `QUIZ`, `LIVE_SESSION`.
- [x] `EXAM_STATUS`, `EXAM_QUESTION_TYPE`, `EXAM_ATTEMPT_STATUS` implemented in constants/schema.
- [x] `ASSIGNMENT_SUBMISSION_STATUS` implemented.
- [x] `CERTIFICATE_STATUS` implemented.
- [x] `NOTIFICATION_TYPE` implemented.

## Next Suggested Work

1. Wire production SMTP credentials (`EMAIL_PROVIDER=SMTP`, `SMTP_*`, `EMAIL_FROM`, `APP_PUBLIC_URL`). Reuse Supabase Auth custom SMTP settings when possible.
2. Add per-lesson progress weights in schema (optional enhancement).
3. Add append-only audit hardening and wider grade/admin audit coverage.
4. Queue certificate PDF generation (move off request thread).
5. [x] Assignment direct upload picker on course learn page (Supabase storage + optional URL fallback).
