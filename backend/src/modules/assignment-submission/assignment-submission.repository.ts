import { AssignmentSubmissionStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class AssignmentSubmissionRepository {
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
    user: {
      select: {
        id: true,
        email: true,
        role: true
      }
    },
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
    assignment: {
      select: {
        id: true,
        courseId: true,
        title: true,
        maxScore: true,
        rubricCriteria: {
          select: {
            id: true,
            title: true,
            maxPoints: true,
            sortOrder: true
          },
          orderBy: { sortOrder: "asc" }
        }
      }
    }
  } satisfies Prisma.AssignmentSubmissionSelect;

  async findAssignmentForSubmission(assignmentId: string) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        courseId: true,
        title: true,
        status: true,
        dueAt: true,
        maxScore: true
      }
    });
  }

  async findById(id: string) {
    return prisma.assignmentSubmission.findUnique({
      where: { id },
      select: this.submissionSelect
    });
  }

  async findByAssignmentId(assignmentId: string, page: number, limit: number) {
    const where = { assignmentId };
    const [items, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.submissionSelect,
        orderBy: { submittedAt: "desc" }
      }),
      prisma.assignmentSubmission.count({ where })
    ]);

    return { items, total };
  }

  async upsertSubmission(userId: string, assignmentId: string, data: { content?: string | null; attachmentUrl?: string | null; isLate?: boolean }) {
    return prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId
        }
      },
      create: {
        assignment: { connect: { id: assignmentId } },
        user: { connect: { id: userId } },
        content: data.content || null,
        attachmentUrl: data.attachmentUrl || null,
        isLate: data.isLate ?? false
      },
      update: {
        content: data.content || null,
        attachmentUrl: data.attachmentUrl || null,
        status: AssignmentSubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        isLate: data.isLate ?? false,
        gradedAt: null,
        score: null,
        feedback: null,
        rubricScores: {
          deleteMany: {}
        }
      },
      select: this.submissionSelect
    });
  }

  async gradeSubmission(
    id: string,
    data: { score: number; feedback?: string | null; rubricScores?: Array<{ criterionId: string; points: number }> }
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.rubricScores?.length) {
        await tx.assignmentRubricScore.deleteMany({
          where: { submissionId: id }
        });
        await tx.assignmentRubricScore.createMany({
          data: data.rubricScores.map((entry) => ({
            submissionId: id,
            criterionId: entry.criterionId,
            points: entry.points
          }))
        });
      }

      return tx.assignmentSubmission.update({
        where: { id },
        data: {
          status: AssignmentSubmissionStatus.GRADED,
          score: data.score,
          feedback: data.feedback || null,
          gradedAt: new Date()
        },
        select: this.submissionSelect
      });
    });
  }
}
