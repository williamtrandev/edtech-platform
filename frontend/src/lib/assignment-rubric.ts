export type AssignmentRubricCriterionInput = {
  title: string;
  description?: string | null;
  maxPoints: number;
};

export type AssignmentRubricCriterion = AssignmentRubricCriterionInput & {
  id: string;
  sortOrder: number;
};

export type AssignmentRubricScore = {
  criterionId: string;
  points: number;
  criterion: {
    id: string;
    title: string;
    maxPoints: number;
    sortOrder: number;
  };
};

export function sumRubricMaxPoints(criteria: Array<{ maxPoints: number }>): number {
  return criteria.reduce((total, criterion) => total + criterion.maxPoints, 0);
}

export function sumRubricPoints(scores: Array<{ points: number }>): number {
  return scores.reduce((total, score) => total + score.points, 0);
}

export function toRubricCriterionInputs(criteria: AssignmentRubricCriterion[]): AssignmentRubricCriterionInput[] {
  return criteria.map((criterion) => ({
    title: criterion.title,
    description: criterion.description ?? null,
    maxPoints: criterion.maxPoints
  }));
}

export function buildRubricScoresFromForm(
  criteria: AssignmentRubricCriterion[],
  pointsByCriterionId: Record<string, number | "">
): AssignmentRubricScore[] {
  return criteria.map((criterion) => ({
    criterionId: criterion.id,
    points: Number(pointsByCriterionId[criterion.id] ?? 0),
    criterion: {
      id: criterion.id,
      title: criterion.title,
      maxPoints: criterion.maxPoints,
      sortOrder: criterion.sortOrder
    }
  }));
}
