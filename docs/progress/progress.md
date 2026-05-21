# System Features Progress

Source: `system-feats.md`  
Last updated: 2026-05-21

Legend:

- `[x]` Implemented enough for current product flow
- `[~]` Partial / needs follow-up
- `[ ]` Not implemented

## 1. Product Goal / Roles

- [x] Basic LMS shell exists: course catalog, course detail, lesson content, enrollment, progress.
- [x] Three roles exist: `USER`, `INSTRUCTOR`, `ADMIN`.
- [x] Role-based routing exists for learner explore, instructor/admin course workspace, admin users.
- [x] Course workspace UI now differs by role: instructors see owned-course creation workspace, admins see review/management workspace.
- [x] Frontend data hooks are centralized under `frontend/src/hooks` for easier feature control.
- [~] Product still missing exam attempts/grading, assignments, certificates, notifications, and full analytics.

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
- [ ] Enrollment success notification not implemented.
- [~] Enrollment keeps user on course detail and unlocks curriculum; dedicated learning page still missing.
- [ ] Admin manual enrollment/removal not implemented.
- [ ] Drop/cancel enrollment not implemented.

## 5. Course Learning Flow

- [x] Lessons support `TEXT`, `VIDEO`, `RESOURCE`.
- [x] Rich text lesson authoring exists.
- [x] Video/resource upload and preview exist.
- [x] Lesson completion endpoint exists.
- [x] Course progress percentage from completed lessons exists.
- [x] My Progress page exists.
- [~] Course detail doubles as management/detail/learning page; learner reader + nav added on curriculum tab.
- [x] Learner lesson content panel with previous/next navigation on course detail.
- [~] RESOURCE preview supports images/PDF/markdown/text where possible; unsupported files open externally.
- [ ] Video watch progress/resume not implemented.
- [ ] QUIZ and LIVE_SESSION lesson types not implemented.
- [ ] Locked lesson/prerequisite logic not implemented.
- [ ] Offline progress sync not implemented.
- [ ] Deleted lesson recovery/archive is not implemented; delete is hard delete with reorder.

## 6. Instructor Course Management Flow

- [x] Instructor can open course studio.
- [x] Instructor can create course.
- [x] Instructor can edit own course.
- [x] Instructor can add/edit/delete lessons.
- [x] Instructor can upload cover image, lesson files, lesson videos.
- [x] Instructor can reorder lessons with drag-and-drop.
- [x] Reorder uses debounced/silent update behavior in UI.
- [x] Course status supports `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- [x] Instructor/admin can view enrolled students for course.
- [x] Admin can manage existing courses.
- [x] Instructor workspace list defaults to owned courses; admin workspace can review all courses.
- [~] Admin cannot create course by product decision in current code, while spec permission matrix says admin can.
- [x] Publish validation blocks missing title, cover, required metadata, outcomes, requirements, or lesson.
- [x] Category, level, language, outcomes, requirements can be created/edited.
- [x] Publish is blocked when course has no lessons.
- [ ] Course preview flow not separated.
- [ ] Course analytics are not implemented beyond learner count/progress basics.
- [ ] Course owner assignment not implemented.
- [ ] Archive impact warning/audit not implemented.
- [x] Course review workflow implemented.

- [x] Exam model/schema implemented with course ownership and status lifecycle.
- [x] Exam authoring supports metadata CRUD, archive, and question authoring for single-choice, multi-choice, and free-text questions.
- [x] Exam attempt lifecycle supports start, answer capture, idempotent submit, auto-grading worker, and graded results UI.
- [ ] Exam timer and timeout auto-submit not implemented.
- [x] Answer autosave API (`PATCH /exam-attempts/:attemptId/answers`) implemented; frontend autosave UX not wired yet.
- [x] Auto-grading for single/multi choice via BullMQ `exam-grading` worker.
- [x] Manual grading API (`PATCH /exam-attempts/:attemptId/grading`) for instructor/admin.
- [x] Exam submit requires `Idempotency-Key` and caches duplicate submit response in Redis.
- [ ] Anti-cheat events not implemented.
- [~] Grading worker exists; retry/dead-letter admin UI not implemented.

## 8. Assignment Flow

- [ ] Assignment model/schema not implemented.
- [ ] Assignment creation/publishing not implemented.
- [ ] Student submission flow not implemented.
- [ ] Assignment file upload tied to submissions not implemented.
- [ ] Late submission logic not implemented.
- [ ] Instructor grading/feedback not implemented.
- [ ] Rubric support not implemented.
- [ ] Grade history/audit not implemented.

## 9. Progress Tracking Flow

- [x] Lesson completion stored per user/lesson.
- [x] Course progress percentage is calculated server-side from lesson counts.
- [x] Progress permission checks use enrollment or owner/admin access.
- [~] Progress currently uses lesson completion only.
- [~] Student dashboard exists; per-lesson progress API added (`GET /lesson-progress/courses/:courseId/me/lessons`).
- [ ] Weighted progress not implemented.
- [ ] Course completion criteria not implemented.
- [ ] Exam/assignment inputs not implemented.
- [ ] Instructor analytics for inactive students/drop-off not implemented.
- [ ] Progress recalculation rules for removed lessons/grade changes not implemented.

## 10. Certificate Flow

- [ ] Certificate model/schema not implemented.
- [ ] Auto-issue after completion not implemented.
- [ ] Certificate PDF generation not implemented.
- [ ] Public verification page not implemented.
- [ ] Certificate revoke/restore not implemented.
- [ ] Certificate audit/history not implemented.

## 11. Notification Flow

- [ ] Notification model/schema not implemented.
- [ ] In-app notification center not implemented.
- [ ] Enrollment success notification not implemented.
- [ ] Course/exam/assignment/certificate notifications not implemented.
- [ ] Email notification queue not implemented.
- [ ] User notification preferences not implemented.

## 12. Admin User Management Flow

- [x] Admin-only users page exists.
- [x] Admin can list users.
- [x] Admin can create user rows.
- [x] Admin can assign roles on create.
- [~] Role labels are localized.
- [x] User search/filter exists by email/ID and role.
- [ ] User detail page missing.
- [x] Role update for existing users exists in UI/API flow.
- [x] Suspend/reactivate exists with `ACTIVE`/`SUSPENDED` user status.
- [x] Last admin protection exists for role downgrade/delete.
- [~] Admin role/status updates are audited; full admin action audit UI missing.

## 13. Audit Flow

- [x] Audit log model/schema exists.
- [x] Role/status change audit implemented for admin user updates.
- [x] Course publish/archive audit implemented.
- [ ] Grade/certificate/admin override audit not implemented.
- [ ] Append-only audit rules not implemented.
- [x] Audit UI implemented for admin audit log browsing/filtering.

## 14. Analytics Flow

- [~] Basic learner count appears on course/explore cards.
- [~] Basic course progress appears for current user.
- [~] Analytics queue scaffold exists, but no real aggregation payloads.
- [ ] Student analytics beyond progress not implemented.
- [ ] Instructor course analytics not implemented.
- [ ] Admin platform analytics not implemented.
- [ ] Queue failure rate / analytics dashboard not implemented.

## 15. Background Job Flow

- [x] BullMQ/Redis base queue scaffold exists.
- [x] Analytics worker scaffold exists.
- [~] Worker logging exists but uses console in job files and needs logger alignment.
- [ ] Email sending jobs not implemented.
- [x] Exam grading jobs implemented (`exam-grading` queue + worker).
- [ ] Certificate PDF jobs not implemented.
- [ ] Notification delivery jobs not implemented.
- [ ] File cleanup jobs not implemented.
- [ ] Dead-letter/admin retry UI not implemented.

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
- [x] Edit/archive course: owner/admin.
- [x] View enrolled students: owner/admin.
- [x] Create/edit/reorder/delete lessons: owner/admin.
- [x] View own progress: user.
- [x] Manage users page: admin only.
- [~] Admin create course differs from spec: current product blocks admin creation.
- [x] Lesson access requires enrollment or owner/admin access.
- [x] Exam permissions implemented for metadata/list/archive/questions and learner attempts.
- [ ] Assignments permissions not implemented.
- [ ] Certificate permissions not implemented.
- [ ] Notifications permissions not implemented.
- [ ] Audit/job monitoring permissions not implemented.

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
- [~] Auto-save (API only)
- [x] Submit exam
- [x] Manual grading (API)
- [ ] Assignment creation
- [ ] Assignment submission
- [ ] Assignment grading

### Phase 4 - Progress & Certificate

- [ ] Weighted progress
- [ ] Course completion
- [ ] Certificate auto-issue
- [ ] Certificate PDF
- [ ] Certificate verification page

### Phase 5 - Admin & Reliability

- [~] User management
- [x] Role change
- [x] Audit logs
- [ ] Queue dashboard
- [ ] Notification management
- [ ] Platform analytics

### Phase 6 - Advanced Features

- [ ] Anti-cheat logs
- [x] Course review workflow
- [ ] Live session
- [ ] Discussion/comments
- [x] Rating/review
- [ ] Learning path
- [ ] Payment support

## 19. Constants / Domain Model

- [x] `USER_ROLE`: `USER`, `INSTRUCTOR`, `ADMIN`.
- [x] `COURSE_STATUS`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- [~] `LESSON_CONTENT_TYPE`: `TEXT`, `VIDEO`, `RESOURCE`; missing `QUIZ`, `LIVE_SESSION`.
- [x] `EXAM_STATUS`, `EXAM_QUESTION_TYPE`, `EXAM_ATTEMPT_STATUS` implemented in constants/schema.
- [ ] `ASSIGNMENT_SUBMISSION_STATUS` not implemented.
- [ ] `CERTIFICATE_STATUS` not implemented.
- [ ] `NOTIFICATION_TYPE` not implemented.

## Next Suggested Work

1. Wire exam answer autosave in UI; add exam timer + timeout auto-submit.
2. Instructor UI for manual grading of free-text attempts.
3. Greenfield assignment module (schema + API + learner/instructor UI).
4. Notification model + delivery queue hooked to enroll/grade events.
5. Add append-only audit hardening and wider audit coverage.
