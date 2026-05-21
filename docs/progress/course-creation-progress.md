# Course Creation Progress

Last updated: 2026-05-16

## Source Scope

- `Features.md` section 2: Course module.
- Current implementation focus: instructor/admin course creation and course lifecycle management.

## Done

- Backend course CRUD endpoints exist:
  - `GET /courses`
  - `POST /courses`
  - `GET /courses/:id`
  - `PUT /courses/:id`
  - `DELETE /courses/:id` as soft archive
  - `GET /courses/:id/enrollments`
- Backend business rules exist:
  - Course creation limited to `INSTRUCTOR` and `ADMIN`.
  - Learners only see published courses.
  - Course owner/admin can manage unpublished courses.
  - Archive uses `ARCHIVED` status and `archivedAt`.
- Frontend course studio exists at `/courses`.
- Frontend course detail exists at `/courses/:courseId`.
- Course creation form exists for instructors/admins.
- Course archive button exists on course detail.
- Enrollment listing exists for course managers.
- Lesson creation exists on course detail.
- Frontend course update service/hook exists.
- Course detail has a Course settings form for title, description, and status.
- Course managers can publish drafts or move courses between lifecycle states from detail page.
- Backend local upload endpoint exists for course media and lesson files.
- Course has persisted cover image URL via `coverImageUrl`.
- Course create/settings UI supports cover image upload and preview.
- Course studio UI was rebuilt into a compact create panel plus course table with thumbnails and status.
- Course creation UX now creates drafts only, removes lifecycle choice from initial setup, and uses the same cover preview frame as detail/settings.
- Course detail UI was cleaned up with flatter cards, readable status labels, cover preview, settings, learner list, authoring, and curriculum sections.
- Course detail UI now uses tabbed sections: overview, curriculum, learners, settings.
- Curriculum list is compact and scroll-contained, with move up/down and delete actions for course managers.
- Enrolled learners list is search-enabled and scroll-contained so large classes do not stretch the page.
- Enrolled learners API now supports server-side pagination and email search.
- Course studio/detail strings now use the i18n dictionaries for English and Vietnamese.
- Lesson order is now assigned automatically from the next available position; manual order input was removed from lesson creation.
- Backend supports lesson reorder and delete via authenticated lesson endpoints.
- Lesson authoring supports text documents, resource uploads/links, and video uploads/links.
- Lesson rendering supports text blocks, downloadable resource links, and video playback.
- Lesson creation handles duplicate order with a 409 instead of a 500.
- Lesson form now suggests the next available lesson order and blocks duplicate order before submit.
- Reset password flow was reimplemented separately and committed in `fix(auth): update reset password flow`.

## In Progress

- Improve content authoring UX and storage hardening.

## Next Work

- Add course list filters by status for instructors/admins.
- Add inline edit/archive actions from course studio list.
- Localize course studio/detail strings.
- Replace local upload storage with Supabase Storage before production deployment.
- Add upload size/type policy by role and file category.

## Later

- Add richer course fields if needed: thumbnail, level, category, estimated duration.
- Add tests for course update/archive permissions.
