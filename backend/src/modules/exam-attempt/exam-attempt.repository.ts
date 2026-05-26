import { ExamAttemptStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type SubmitExamAnswerInput = {
  questionId: string;
  answer: Prisma.InputJsonValue | null;
};

export class ExamAttemptRepository {
  private readonly publicQuestionSelect = {
    id: true,
    examId: true,
    type: true,
    prompt: true,
    options: true,
    points: true,
    sortOrder: true
  } satisfies Prisma.ExamQuestionSelect;

  private readonly attemptSelect = {
    id: true,
    examId: true,
    userId: true,
    status: true,
    attemptNumber: true,
    startedAt: true,
    submittedAt: true,
    gradedAt: true,
    score: true,
    createdAt: true,
    updatedAt: true,
    answers: {
      select: {
        id: true,
        questionId: true,
        answer: true,
        updatedAt: true
      }
    }
  } satisfies Prisma.ExamAttemptSelect;

  async findExamForAttempt(examId: string) {
    return prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        status: true,
        durationMinutes: true,
        passingScore: true,
        questions: {
          select: this.publicQuestionSelect,
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.examAttempt.findUnique({
      where: { id },
      select: this.attemptSelect
    });
  }

  async findByExamIdForReview(examId: string, page: number, limit: number, status?: ExamAttemptStatus) {
    const where: Prisma.ExamAttemptWhereInput = {
      examId,
      ...(status ? { status } : {})
    };
    const [items, total] = await Promise.all([
      prisma.examAttempt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          examId: true,
          userId: true,
          status: true,
          attemptNumber: true,
          startedAt: true,
          submittedAt: true,
          gradedAt: true,
          score: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          answers: {
            select: {
              id: true,
              questionId: true,
              answer: true,
              updatedAt: true,
              question: {
                select: {
                  id: true,
                  type: true,
                  prompt: true,
                  options: true,
                  correctAnswers: true,
                  points: true,
                  sortOrder: true
                }
              }
            },
            orderBy: {
              question: {
                sortOrder: "asc"
              }
            }
          }
        },
        orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }]
      }),
      prisma.examAttempt.count({ where })
    ]);

    return { items, total };
  }

  async findInProgressAttempt(userId: string, examId: string) {
    return prisma.examAttempt.findFirst({
      where: {
        userId,
        examId,
        status: ExamAttemptStatus.IN_PROGRESS
      },
      select: this.attemptSelect,
      orderBy: { startedAt: "desc" }
    });
  }

  async findLatestAttempt(userId: string, examId: string) {
    return prisma.examAttempt.findFirst({
      where: {
        userId,
        examId
      },
      select: {
        id: true,
        attemptNumber: true
      },
      orderBy: { attemptNumber: "desc" }
    });
  }

  async createAttempt(userId: string, examId: string, attemptNumber: number) {
    return prisma.examAttempt.create({
      data: {
        user: { connect: { id: userId } },
        exam: { connect: { id: examId } },
        attemptNumber
      },
      select: this.attemptSelect
    });
  }

  async upsertAttemptAnswers(attemptId: string, answers: SubmitExamAnswerInput[]) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: {
          id: true,
          status: true
        }
      });

      if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
        return tx.examAttempt.findUniqueOrThrow({
          where: { id: attemptId },
          select: this.attemptSelect
        });
      }

      for (const item of answers) {
        await tx.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: item.questionId
            }
          },
          create: {
            attemptId,
            questionId: item.questionId,
            answer: item.answer ?? Prisma.JsonNull
          },
          update: {
            answer: item.answer ?? Prisma.JsonNull
          }
        });
      }

      return tx.examAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: this.attemptSelect
      });
    });
  }

  async findAttemptForGrading(attemptId: string) {
    return prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examId: true,
        userId: true,
        status: true,
        attemptNumber: true,
        startedAt: true,
        submittedAt: true,
        gradedAt: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        answers: {
          select: {
            questionId: true,
            answer: true
          }
        },
        exam: {
          select: {
            courseId: true,
            passingScore: true,
            questions: {
              select: {
                id: true,
                type: true,
                points: true,
                correctAnswers: true
              },
              orderBy: { sortOrder: "asc" }
            }
          }
        }
      }
    });
  }

  async markAttemptGraded(attemptId: string, score: number) {
    return prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: ExamAttemptStatus.GRADED,
        score,
        gradedAt: new Date()
      },
      select: this.attemptSelect
    });
  }

  async markAttemptManuallyGraded(attemptId: string, score: number) {
    return prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: ExamAttemptStatus.GRADED,
        score,
        gradedAt: new Date()
      },
      select: this.attemptSelect
    });
  }

  async submitAttempt(attemptId: string, answers: SubmitExamAnswerInput[]) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: {
          id: true,
          examId: true,
          status: true
        }
      });

      if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
        return tx.examAttempt.findUniqueOrThrow({
          where: { id: attemptId },
          select: this.attemptSelect
        });
      }

      for (const item of answers) {
        await tx.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: item.questionId
            }
          },
          create: {
            attemptId,
            questionId: item.questionId,
            answer: item.answer ?? Prisma.JsonNull
          },
          update: {
            answer: item.answer ?? Prisma.JsonNull
          }
        });
      }

      return tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: ExamAttemptStatus.SUBMITTED,
          submittedAt: new Date()
        },
        select: this.attemptSelect
      });
    });
  }
}
