export const EXAM_ATTEMPT_EVENT_TYPE = {
  tabHidden: "TAB_HIDDEN",
  tabVisible: "TAB_VISIBLE",
  windowBlur: "WINDOW_BLUR",
  windowFocus: "WINDOW_FOCUS",
  reconnect: "RECONNECT",
  timerExpired: "TIMER_EXPIRED",
  manualSubmit: "MANUAL_SUBMIT"
} as const;

export type ExamAttemptEventTypeValue = (typeof EXAM_ATTEMPT_EVENT_TYPE)[keyof typeof EXAM_ATTEMPT_EVENT_TYPE];

export const EXAM_INTEGRITY_SUSPICIOUS_EVENT_TYPES: ExamAttemptEventTypeValue[] = [
  EXAM_ATTEMPT_EVENT_TYPE.tabHidden,
  EXAM_ATTEMPT_EVENT_TYPE.windowBlur
];

export const EXAM_SUBMIT_REASON = {
  manual: "MANUAL",
  timer: "TIMER"
} as const;

export type ExamSubmitReason = (typeof EXAM_SUBMIT_REASON)[keyof typeof EXAM_SUBMIT_REASON];
