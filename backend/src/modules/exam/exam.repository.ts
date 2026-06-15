import { ExamScope, ExamStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type FindExamsByCourseOptions = {
  status?: ExamStatus;
  scope?: ExamScope;
  lessonId?: string;
};

export class ExamRepository {
  private readonly examSelect = {
    id: true,
    courseId: true,
    lessonId: true,
    scope: true,
    title: true,
    description: true,
    status: true,
    durationMinutes: true,
    passingScore: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    lesson: {
      select: {
        id: true,
        title: true,
        sortOrder: true
      }
    }
  } satisfies Prisma.ExamSelect;

  private mapExam<T extends { _count?: { questions: number } }>(exam: T) {
    const { _count, ...data } = exam;
    return {
      ...data,
      questionCount: _count?.questions ?? 0
    };
  }

  async findById(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        ...this.examSelect,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    return exam ? this.mapExam(exam) : null;
  }

  async findByCourseId(courseId: string, options?: FindExamsByCourseOptions) {
    const exams = await prisma.exam.findMany({
      where: {
        courseId,
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.scope ? { scope: options.scope } : {}),
        ...(options?.lessonId ? { lessonId: options.lessonId } : {})
      },
      select: {
        ...this.examSelect,
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return exams.map((exam) => this.mapExam(exam));
  }

  async create(data: Prisma.ExamCreateInput) {
    const exam = await prisma.exam.create({
      data,
      select: {
        ...this.examSelect,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    return this.mapExam(exam);
  }

  async update(id: string, data: Prisma.ExamUpdateInput) {
    const exam = await prisma.exam.update({
      where: { id },
      data,
      select: {
        ...this.examSelect,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    return this.mapExam(exam);
  }

  async archive(id: string) {
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        status: ExamStatus.ARCHIVED,
        archivedAt: new Date()
      },
      select: {
        ...this.examSelect,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    return this.mapExam(exam);
  }
}
