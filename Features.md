# 🚀 EdTech Platform - Feature Specification

This document describes the full functional scope of the EdTech platform.

The system is designed as a scalable Learning Management System (LMS) with exam, assignment, and progress tracking capabilities.

---

# 🧠 1. SYSTEM OVERVIEW

The platform supports 3 main roles:

## 👤 Student
- Enroll courses
- Learn lessons
- Take exams
- Submit assignments
- Track learning progress

## 👨‍🏫 Instructor
- Create courses
- Manage lessons
- Create exams and assignments
- Grade submissions
- View analytics

## 👑 Admin
- Manage users
- Monitor system
- Override permissions
- View platform-wide analytics

---

# 📚 2. COURSE MODULE

## Features

- Create course (draft → published → archived)
- Update course content
- Delete course (soft delete recommended)
- Enroll students into course
- View enrolled students

## Business Rules

- Only instructors can create courses
- Only published courses can be enrolled
- Each student can enroll once per course

---

# 📖 3. LESSON MODULE

## Features

- Create lesson under course
- Support multiple content types:
  - Video
  - Text
  - File resources (PDF, links)
- Mark lesson as completed
- Track progress per user

## Business Rules

- Lesson must belong to a course
- Order of lessons is sequential
- User must be enrolled to access lesson

---

# 🧪 4. EXAM SYSTEM (CORE FEATURE)

## Features

- Create exam under course
- Multiple question types:
  - Multiple choice
  - Essay
  - Coding (optional extension)
- Time-limited exams
- Auto submission on timeout
- Manual grading support

## Exam Lifecycle

- Draft
- Published
- In Progress
- Submitted
- Graded

## Business Rules

- One exam attempt per user (configurable)
- Idempotent submission (no duplicate submit)
- Exam cannot be accessed after expiration
- Score is calculated after submission

---

# ⚙️ 5. EXAM SUBMISSION FLOW

1. Student starts exam
2. System creates attempt session
3. Answers saved periodically (auto-save)
4. User submits exam
5. System validates idempotency
6. Queue grading job (BullMQ)
7. Store result
8. Notify user

---

# 📝 6. ASSIGNMENT MODULE

## Features

- Create assignments per course
- File upload or text submission
- Deadline enforcement
- Late submission detection
- Grading by instructor

## Business Rules

- Assignment must belong to a course
- Submission allowed after deadline but marked late
- One submission per assignment per user (configurable)

---

# 📊 7. PROGRESS TRACKING

## Features

- Course progress percentage
- Lesson completion tracking
- Exam score history
- Assignment submission status

## Business Rules

- Progress updates automatically on lesson completion
- Weighted progress (lesson + exam + assignment)

---

# 👤 8. USER & ENROLLMENT SYSTEM

## Features

- User registration via Supabase Auth
- Role-based access control (RBAC)
- Course enrollment system
- User profile management

## Business Rules

- User identity is Supabase UUID
- Cannot duplicate enrollments
- Role defines access scope

---

# 🔐 9. AUTH SYSTEM

## Features

- Supabase authentication
- JWT-based session validation
- Role injection into backend context

## Flow

1. User logs in via Supabase
2. Receives JWT token
3. Frontend sends token to backend
4. Backend validates token
5. User context injected into request

---

# ⚡ 10. IDENTITY & CONSISTENCY RULES

- Each user has one unique identity (Supabase ID)
- Enrollments are unique per user-course pair
- Exam attempts must be idempotent
- Submission cannot be duplicated

---

# 🔁 11. BACKGROUND JOB SYSTEM

## Use Cases

- Exam grading
- Email notifications
- Analytics processing

## Rules

- Heavy computation must NOT run in request lifecycle
- All async processing goes through queue system (BullMQ)

---

# 📈 12. ANALYTICS MODULE

## Features

- Course completion rate
- Exam average scores
- User engagement tracking
- Drop-off rate per course

---

# 🧠 13. EDGE CASE HANDLING

- Multiple exam submission attempts
- Network failure during exam
- Timer expiration handling
- Concurrent submission protection
- Partial progress recovery

---

# 🏁 14. SYSTEM VALUE

This platform demonstrates:

- Scalable LMS architecture
- Real-world exam system design
- Queue-based backend processing
- Strong consistency & idempotency handling
- Production-ready fullstack design

---

# 🔔 15. NOTIFICATION MODULE

## Features

- In-app notifications for key events:
  - Enrollment success
  - Exam published / exam result ready
  - Assignment graded
- Email notifications via queue workers
- Notification preference settings (email / in-app)
- Read/unread notification state

## Business Rules

- Critical academic events must always create an in-app notification
- Email sending must be asynchronous (queue only)
- Notification delivery failures must be retryable

---

# 🏅 16. CERTIFICATE MODULE

## Features

- Auto-issue certificate when course completion criteria are met
- Certificate verification page via public token
- Download certificate as PDF

## Business Rules

- Certificate can only be issued once per user-course pair
- Revoked certificates must remain auditable
- Completion criteria must be deterministic and versioned

---

# 🛡️ 17. EXAM INTEGRITY & ANTI-CHEAT

## Features

- Question randomization (order + options)
- Exam window constraints (start/end availability)
- Attempt event logging:
  - Tab switch detection
  - Reconnect events
  - Force submit reason
- IP/device fingerprint snapshot (optional)

## Business Rules

- Randomization seed must be stored per attempt for reproducibility
- Suspicious attempts are flagged, never auto-failed by default
- Integrity logs are immutable after submission

---

# 🔎 18. SEARCH & DISCOVERY

## Features

- Search courses by title, category, and instructor
- Filter by level, language, and enrollment status
- Sorting (newest, popular, highest rated)

## Business Rules

- Search endpoints must be paginated
- Frequently queried fields should be indexed
- Anonymous users can only discover published courses

---

# 🧾 19. AUDIT & COMPLIANCE

## Features

- Audit logs for sensitive actions:
  - Role changes
  - Grade overrides
  - Course publish/archive
- Actor + timestamp + before/after snapshot
- Admin-only audit query interface

## Business Rules

- Audit records are append-only
- Sensitive data must be masked in logs
- Logs must not be deletable by non-system actors

---

# 📉 20. OBSERVABILITY & RELIABILITY

## Features

- Structured logging with request correlation ID
- Error tracking and alerting (API + worker failures)
- Health checks for database, Redis, and queue
- Retry + dead-letter strategy for failed jobs

## Business Rules

- Every write operation should log outcome and actor context
- Queue retry policy must be explicit per job type
- Health endpoints should be lightweight and non-blocking

---

# 🚀 END OF SPEC