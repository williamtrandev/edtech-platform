import { AssignmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class AssignmentRepository {
  private readonly submissionSelect = {
    id: true,
    assignmentId: true,
    userId: true,
    content: true,
    attachmentUrl: true,
    status: true,
    submittedAt: true,
    isLate: true,
    gradedAt: true,
    score: true,
    feedback: true,
    createdAt: true,
    updatedAt: true,
    rubricScores: {
      select: {
        criterionId: true,
        points: true,
        criterion: {
          select: {
            id: true,
            title: true,
            maxPoints: true,
            sortOrder: true
          }
        }
      },
      orderBy: {
        criterion: {
          sortOrder: "asc"
        }
      }
    },
    user: {
      select: {
        id: true,
        email: true,
        role: true
      }
    }
  } satisfies Prisma.AssignmentSubmissionSelect;

  private readonly rubricCriterionSelect = {
    id: true,
    title: true,
    description: true,
    maxPoints: true,
    sortOrder: true
  } satisfies Prisma.AssignmentRubricCriterionSelect;

  private readonly assignmentSelect = {
    id: true,
    courseId: true,
    title: true,
    instructions: true,
    status: true,
    dueAt: true,
    maxScore: true,
    attachmentUrl: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    rubricCriteria: {
      select: this.rubricCriterionSelect,
      orderBy: { sortOrder: "asc" as const }
    }
  } satisfies Prisma.AssignmentSelect;

  private mapAssignment<T extends { _count?: { submissions: number }; submissions?: unknown[] }>(assignment: T) {
    const { _count, submissions, ...data } = assignment;
    return {
      ...data,
      submissionCount: _count?.submissions ?? 0,
      mySubmission: submissions?.[0] ?? null
    };
  }

  async findById(id: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: {
        ...this.assignmentSelect,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    return assignment ? this.mapAssignment(assignment) : null;
  }

  async findByCourseId(courseId: string, status?: AssignmentStatus, userId?: string) {
    const assignments = await prisma.assignment.findMany({
      where: {
        courseId,
        ...(status ? { status } : {})
      },
      select: {
        ...this.assignmentSelect,
        _count: {
          select: {
            submissions: true
          }
        },
        submissions: userId
          ? {
              where: { userId },
              select: this.submissionSelect,
              take: 1
            }
          : false
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
    });

    return assignments.map((assignment) => this.mapAssignment(assignment));
  }

  async create(data: Prisma.AssignmentCreateInput) {
    const assignment = await prisma.assignment.create({
      data,
      select: {
        ...this.assignmentSelect,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    return this.mapAssignment(assignment);
  }

  async update(id: string, data: Prisma.AssignmentUpdateInput) {
    const assignment = await prisma.assignment.update({
      where: { id },
      data,
      select: {
        ...this.assignmentSelect,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    return this.mapAssignment(assignment);
  }

  async archive(id: string) {
    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.ARCHIVED,
        archivedAt: new Date()
      },
      select: {
        ...this.assignmentSelect,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    return this.mapAssignment(assignment);
  }
}
