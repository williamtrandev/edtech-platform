export const ASSIGNMENT_ERROR_CODE = {
  rubricCriterionNotFound: "ASSIGNMENT_RUBRIC_CRITERION_NOT_FOUND",
  rubricScoresRequired: "ASSIGNMENT_RUBRIC_SCORES_REQUIRED",
  rubricScoresInvalid: "ASSIGNMENT_RUBRIC_SCORES_INVALID",
  rubricPointsExceedMax: "ASSIGNMENT_RUBRIC_POINTS_EXCEED_MAX",
  scoreExceedsMax: "ASSIGNMENT_SCORE_EXCEEDS_MAX",
  scoreRequired: "ASSIGNMENT_SCORE_REQUIRED"
} as const;

export const ASSIGNMENT_RUBRIC_LIMITS = {
  maxCriteria: 20,
  minMaxPoints: 1,
  maxMaxPoints: 1000
} as const;
