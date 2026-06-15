import { ASSIGNMENT_ERROR_CODE } from "../constants/assignment";
import { AppError } from "../errors/app-error";

export type RubricCriterionRef = {
  id: string;
  maxPoints: number;
};

export type RubricScoreInput = {
  criterionId: string;
  points: number;
};

export function sumRubricMaxPoints(criteria: Array<{ maxPoints: number }>): number {
  return criteria.reduce((total, criterion) => total + criterion.maxPoints, 0);
}

export function resolveGradeScore(
  criteria: RubricCriterionRef[],
  payload: { score?: number; rubricScores?: RubricScoreInput[] }
): { score: number; rubricScores: RubricScoreInput[] } {
  if (criteria.length === 0) {
    if (payload.score === undefined || payload.score === null) {
      throw new AppError("Score is required", 422, ASSIGNMENT_ERROR_CODE.scoreRequired);
    }

    return { score: payload.score, rubricScores: [] };
  }

  if (!payload.rubricScores?.length) {
    throw new AppError("Rubric scores are required for this assignment", 422, ASSIGNMENT_ERROR_CODE.rubricScoresRequired);
  }

  if (payload.rubricScores.length !== criteria.length) {
    throw new AppError("Rubric scores must cover every criterion", 422, ASSIGNMENT_ERROR_CODE.rubricScoresInvalid);
  }

  const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const seenCriterionIds = new Set<string>();

  for (const entry of payload.rubricScores) {
    if (seenCriterionIds.has(entry.criterionId)) {
      throw new AppError("Duplicate rubric criterion score", 422, ASSIGNMENT_ERROR_CODE.rubricScoresInvalid);
    }

    seenCriterionIds.add(entry.criterionId);
    const criterion = criteriaById.get(entry.criterionId);
    if (!criterion) {
      throw new AppError("Rubric criterion not found for this assignment", 422, ASSIGNMENT_ERROR_CODE.rubricCriterionNotFound);
    }

    if (entry.points > criterion.maxPoints) {
      throw new AppError("Rubric points exceed criterion maximum", 422, ASSIGNMENT_ERROR_CODE.rubricPointsExceedMax);
    }
  }

  if (seenCriterionIds.size !== criteria.length) {
    throw new AppError("Rubric scores must cover every criterion", 422, ASSIGNMENT_ERROR_CODE.rubricScoresInvalid);
  }

  const score = payload.rubricScores.reduce((total, entry) => total + entry.points, 0);
  return { score, rubricScores: payload.rubricScores };
}

export function assertScoreWithinAssignmentMax(score: number, maxScore: number | null | undefined) {
  if (maxScore !== null && maxScore !== undefined && score > maxScore) {
    throw new AppError("Score exceeds assignment maximum", 422, ASSIGNMENT_ERROR_CODE.scoreExceedsMax);
  }
}
