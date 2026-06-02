export const ANALYTICS_JOB = {
  platformOverview: "platform-overview"
} as const;

export const ANALYTICS_CACHE = {
  platformOverviewKey: "analytics:platform-overview",
  ttlSeconds: 300
} as const;

export const ANALYTICS_JOB_OPTIONS = {
  attempts: 3,
  backoffDelayMs: 2000
} as const;
