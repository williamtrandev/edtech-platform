import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class ExamQuestionRepository {
  private readonly questionSelect = {
    id: true,
    examId: true,
    type: true,
    prompt: true,
    options: true,
    correctAnswers: true,
    codeConfig: true,
    explanation: true,
    points: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.ExamQuestionSelect;

  async findById(id: string) {
    return prisma.examQuestion.findUnique({
      where: { id },
      select: this.questionSelect
    });
  }

  async findByExamId(examId: string) {
    return prisma.examQuestion.findMany({
      where: { examId },
      select: this.questionSelect,
      orderBy: { sortOrder: "asc" }
    });
  }

  async create(data: Prisma.ExamQuestionCreateInput) {
    return prisma.examQuestion.create({
      data,
      select: this.questionSelect
    });
  }

  async update(id: string, data: Prisma.ExamQuestionUpdateInput) {
    return prisma.examQuestion.update({
      where: { id },
      data,
      select: this.questionSelect
    });
  }

  async delete(id: string, examId: string, sortOrder: number) {
    return prisma.$transaction(async (tx) => {
      const maxSortOrder = await tx.examQuestion.aggregate({
        where: { examId },
        _max: { sortOrder: true }
      });
      const tempSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;
      const questionsToCompact = await tx.examQuestion.findMany({
        where: {
          examId,
          sortOrder: { gt: sortOrder }
        },
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      });

      const question = await tx.examQuestion.delete({
        where: { id },
        select: this.questionSelect
      });

      for (const [index, questionToCompact] of questionsToCompact.entries()) {
        await tx.examQuestion.update({
          where: { id: questionToCompact.id },
          data: { sortOrder: tempSortOrder + index }
        });
      }

      for (const questionToCompact of questionsToCompact) {
        await tx.examQuestion.update({
          where: { id: questionToCompact.id },
          data: { sortOrder: questionToCompact.sortOrder - 1 }
        });
      }

      return question;
    });
  }
}
