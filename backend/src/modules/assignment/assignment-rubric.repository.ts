import { prisma } from "../../config/prisma";
import { sumRubricMaxPoints } from "../../common/assignment-rubric/assignment-rubric";

export type ReplaceRubricCriterionInput = {
  title: string;
  description?: string | null;
  maxPoints: number;
};

const rubricCriterionSelect = {
  id: true,
  assignmentId: true,
  title: true,
  description: true,
  maxPoints: true,
  sortOrder: true
} as const;

export class AssignmentRubricRepository {
  async findByAssignmentId(assignmentId: string) {
    return prisma.assignmentRubricCriterion.findMany({
      where: { assignmentId },
      select: rubricCriterionSelect,
      orderBy: { sortOrder: "asc" }
    });
  }

  async replaceCriteria(assignmentId: string, criteria: ReplaceRubricCriterionInput[]) {
    return prisma.$transaction(async (tx) => {
      await tx.assignmentRubricCriterion.deleteMany({
        where: { assignmentId }
      });

      if (criteria.length > 0) {
        await tx.assignmentRubricCriterion.createMany({
          data: criteria.map((criterion, index) => ({
            assignmentId,
            title: criterion.title,
            description: criterion.description ?? null,
            maxPoints: criterion.maxPoints,
            sortOrder: index
          }))
        });
      }

      const maxScore = criteria.length > 0 ? sumRubricMaxPoints(criteria) : undefined;
      if (maxScore !== undefined) {
        await tx.assignment.update({
          where: { id: assignmentId },
          data: { maxScore }
        });
      }

      return tx.assignmentRubricCriterion.findMany({
        where: { assignmentId },
        select: rubricCriterionSelect,
        orderBy: { sortOrder: "asc" }
      });
    });
  }
}
