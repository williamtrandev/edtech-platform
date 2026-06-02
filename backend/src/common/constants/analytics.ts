export const COURSE_ANALYTICS = {
  inactivityDays: 14,
  stalledEnrollmentDays: 7,
  lowProgressPercent: 25,
  maxLearnerInsights: 25,
  maxCertificateHistory: 50
} as const;

export const LEARNER_INSIGHT_STATUS = {
  inactive: "INACTIVE",
  stalled: "STALLED",
  lowProgress: "LOW_PROGRESS"
} as const;

export type LearnerInsightStatus = (typeof LEARNER_INSIGHT_STATUS)[keyof typeof LEARNER_INSIGHT_STATUS];

export { COURSE_COMPLETION_CRITERIA_TYPE } from "./progress";

export const AUDIT_ACTION = {
  certificateIssued: "CERTIFICATE_ISSUED",
  certificateRevoked: "CERTIFICATE_REVOKED",
  certificateRestored: "CERTIFICATE_RESTORED"
} as const;

export const CERTIFICATE_HISTORY_EVENT = {
  issued: "ISSUED",
  revoked: "REVOKED",
  restored: "RESTORED"
} as const;
