export const AUDIT_ACTION = {
  userUpdated: "USER_UPDATED",
  userStatusUpdated: "USER_STATUS_UPDATED",
  coursePublished: "COURSE_PUBLISHED",
  courseArchived: "COURSE_ARCHIVED",
  courseLocked: "COURSE_LOCKED",
  courseUnlocked: "COURSE_UNLOCKED",
  courseStatusUpdated: "COURSE_STATUS_UPDATED",
  courseInstructorAssigned: "COURSE_INSTRUCTOR_ASSIGNED",
  enrollmentCreatedByManager: "ENROLLMENT_CREATED_BY_MANAGER",
  enrollmentRemovedByManager: "ENROLLMENT_REMOVED_BY_MANAGER",
  examCreated: "EXAM_CREATED",
  examUpdated: "EXAM_UPDATED",
  examStatusUpdated: "EXAM_STATUS_UPDATED",
  examArchived: "EXAM_ARCHIVED",
  examQuestionCreated: "EXAM_QUESTION_CREATED",
  examQuestionUpdated: "EXAM_QUESTION_UPDATED",
  examQuestionDeleted: "EXAM_QUESTION_DELETED",
  examAttemptGraded: "EXAM_ATTEMPT_GRADED",
  examAttemptAutoGraded: "EXAM_ATTEMPT_AUTO_GRADED",
  assignmentCreated: "ASSIGNMENT_CREATED",
  assignmentUpdated: "ASSIGNMENT_UPDATED",
  assignmentStatusUpdated: "ASSIGNMENT_STATUS_UPDATED",
  assignmentArchived: "ASSIGNMENT_ARCHIVED",
  assignmentRubricUpdated: "ASSIGNMENT_RUBRIC_UPDATED",
  assignmentSubmissionGraded: "ASSIGNMENT_SUBMISSION_GRADED",
  certificateIssued: "CERTIFICATE_ISSUED",
  certificateRevoked: "CERTIFICATE_REVOKED",
  certificateRestored: "CERTIFICATE_RESTORED"
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_ENTITY_TYPE = {
  user: "User",
  course: "Course",
  enrollment: "Enrollment",
  exam: "Exam",
  examQuestion: "ExamQuestion",
  examAttempt: "ExamAttempt",
  assignment: "Assignment",
  assignmentSubmission: "AssignmentSubmission",
  certificate: "Certificate"
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_GRADING_SOURCE = {
  manual: "MANUAL",
  auto: "AUTO"
} as const;
