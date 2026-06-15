export const CERTIFICATE_SEARCH = {
  redisKey: "certificate-search:terms",
  maxTrackedTerms: 5000,
  defaultLimit: 8,
  maxLimit: 20,
  minQueryLength: 1
} as const;

