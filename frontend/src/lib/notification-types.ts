import { NOTIFICATION_TYPE, type NotificationType } from "../constants/business";

export const NOTIFICATION_FILTER_TYPES = [
  NOTIFICATION_TYPE.enrollmentSuccess,
  NOTIFICATION_TYPE.assignmentGraded,
  NOTIFICATION_TYPE.certificateIssued,
  NOTIFICATION_TYPE.coursePublished,
  NOTIFICATION_TYPE.system
] satisfies NotificationType[];
