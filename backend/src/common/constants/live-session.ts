export const LIVE_SESSION_STATUS = {
  unscheduled: "UNSCHEDULED",
  upcoming: "UPCOMING",
  live: "LIVE",
  ended: "ENDED"
} as const;

export type LiveSessionStatus = (typeof LIVE_SESSION_STATUS)[keyof typeof LIVE_SESSION_STATUS];

export const DEFAULT_LIVE_SESSION_DURATION_MINUTES = 60;
