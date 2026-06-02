export const AUDIT_FILTER_ACTIONS = [
  "USER_UPDATED",
  "USER_STATUS_UPDATED",
  "COURSE_PUBLISHED",
  "COURSE_ARCHIVED",
  "COURSE_LOCKED",
  "COURSE_UNLOCKED",
  "COURSE_STATUS_UPDATED",
  "COURSE_INSTRUCTOR_ASSIGNED",
  "ENROLLMENT_CREATED_BY_MANAGER",
  "ENROLLMENT_REMOVED_BY_MANAGER",
  "EXAM_CREATED",
  "EXAM_ARCHIVED",
  "EXAM_ATTEMPT_GRADED",
  "EXAM_ATTEMPT_AUTO_GRADED",
  "ASSIGNMENT_SUBMISSION_GRADED",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_REVOKED",
  "CERTIFICATE_RESTORED"
] as const;

export const AUDIT_FILTER_ENTITY_TYPES = [
  "User",
  "Course",
  "Enrollment",
  "Exam",
  "ExamAttempt",
  "Assignment",
  "AssignmentSubmission",
  "Certificate"
] as const;

export type AuditFilterAction = (typeof AUDIT_FILTER_ACTIONS)[number];
export type AuditFilterEntityType = (typeof AUDIT_FILTER_ENTITY_TYPES)[number];
