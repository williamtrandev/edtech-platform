export const COURSE_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
  locked: "LOCKED"
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

export type EditableCourseStatus = Exclude<CourseStatus, typeof COURSE_STATUS.locked>;

export function toEditableCourseStatus(status: CourseStatus, statusBeforeLock?: CourseStatus | null): EditableCourseStatus {
  if (status === COURSE_STATUS.locked) {
    const restored = statusBeforeLock ?? COURSE_STATUS.draft;
    return restored === COURSE_STATUS.locked ? COURSE_STATUS.draft : restored;
  }

  return status;
}

export const EXAM_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export const EXAM_QUESTION_TYPE = {
  singleChoice: "SINGLE_CHOICE",
  multipleChoice: "MULTIPLE_CHOICE",
  freeText: "FREE_TEXT"
} as const;

export type ExamQuestionType = (typeof EXAM_QUESTION_TYPE)[keyof typeof EXAM_QUESTION_TYPE];

export const EXAM_ATTEMPT_STATUS = {
  inProgress: "IN_PROGRESS",
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;

export type ExamAttemptStatus = (typeof EXAM_ATTEMPT_STATUS)[keyof typeof EXAM_ATTEMPT_STATUS];

export const EXAM_ATTEMPT_EVENT_TYPE = {
  tabHidden: "TAB_HIDDEN",
  tabVisible: "TAB_VISIBLE",
  windowBlur: "WINDOW_BLUR",
  windowFocus: "WINDOW_FOCUS",
  reconnect: "RECONNECT",
  timerExpired: "TIMER_EXPIRED",
  manualSubmit: "MANUAL_SUBMIT"
} as const;

export type ExamAttemptEventType = (typeof EXAM_ATTEMPT_EVENT_TYPE)[keyof typeof EXAM_ATTEMPT_EVENT_TYPE];

export const EXAM_SUBMIT_REASON = {
  manual: "MANUAL",
  timer: "TIMER"
} as const;

export type ExamSubmitReason = (typeof EXAM_SUBMIT_REASON)[keyof typeof EXAM_SUBMIT_REASON];

export const ASSIGNMENT_STATUS = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED"
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

export const ASSIGNMENT_SUBMISSION_STATUS = {
  submitted: "SUBMITTED",
  graded: "GRADED"
} as const;

export type AssignmentSubmissionStatus = (typeof ASSIGNMENT_SUBMISSION_STATUS)[keyof typeof ASSIGNMENT_SUBMISSION_STATUS];

export const NOTIFICATION_TYPE = {
  enrollmentSuccess: "ENROLLMENT_SUCCESS",
  assignmentGraded: "ASSIGNMENT_GRADED",
  certificateIssued: "CERTIFICATE_ISSUED",
  coursePublished: "COURSE_PUBLISHED",
  system: "SYSTEM"
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const CERTIFICATE_STATUS = {
  active: "ACTIVE",
  revoked: "REVOKED"
} as const;

export type CertificateStatus = (typeof CERTIFICATE_STATUS)[keyof typeof CERTIFICATE_STATUS];

export const USER_ROLE = {
  user: "USER",
  instructor: "INSTRUCTOR",
  admin: "ADMIN"
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_STATUS = {
  active: "ACTIVE",
  suspended: "SUSPENDED"
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const LESSON_CONTENT_TYPE = {
  text: "TEXT",
  video: "VIDEO",
  resource: "RESOURCE",
  quiz: "QUIZ",
  liveSession: "LIVE_SESSION"
} as const;

export type LessonContentType = (typeof LESSON_CONTENT_TYPE)[keyof typeof LESSON_CONTENT_TYPE];

export const LIVE_SESSION_STATUS = {
  unscheduled: "UNSCHEDULED",
  upcoming: "UPCOMING",
  live: "LIVE",
  ended: "ENDED"
} as const;

export type LiveSessionStatus = (typeof LIVE_SESSION_STATUS)[keyof typeof LIVE_SESSION_STATUS];

export const COURSE_PAYMENT_STATUS = {
  pending: "PENDING",
  completed: "COMPLETED",
  failed: "FAILED",
  refunded: "REFUNDED"
} as const;

export type CoursePaymentStatus = (typeof COURSE_PAYMENT_STATUS)[keyof typeof COURSE_PAYMENT_STATUS];
