import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class LessonRepository {
  private readonly lessonSelect = {
    id: true,
    courseId: true,
    title: true,
    contentType: true,
    content: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.LessonSelect;

  async findById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      select: this.lessonSelect
    });
  }

  async findByCourseId(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      select: this.lessonSelect,
      orderBy: { sortOrder: "asc" }
    });
  }

  async create(data: Prisma.LessonCreateInput) {
    return prisma.lesson.create({
      data,
      select: this.lessonSelect
    });
  }

  async update(id: string, data: Prisma.LessonUpdateInput) {
    return prisma.lesson.update({
      where: { id },
      data,
      select: this.lessonSelect
    });
  }

  async reorderCourseLessons(courseId: string, lessonIds: string[]) {
    const maxSortOrder = await prisma.lesson.aggregate({
      where: { courseId },
      _max: { sortOrder: true }
    });
    const tempStart = (maxSortOrder._max.sortOrder ?? 0) + 1;

    return prisma.$transaction(async (tx) => {
      for (const [index, lessonId] of lessonIds.entries()) {
        await tx.lesson.update({
          where: { id: lessonId },
          data: { sortOrder: tempStart + index }
        });
      }

      for (const [index, lessonId] of lessonIds.entries()) {
        await tx.lesson.update({
          where: { id: lessonId },
          data: { sortOrder: index + 1 }
        });
      }

      return tx.lesson.findMany({
        where: { courseId },
        select: this.lessonSelect,
        orderBy: { sortOrder: "asc" }
      });
    });
  }

  async moveWithinCourse(lessonId: string, courseId: string, fromSortOrder: number, toSortOrder: number) {
    if (fromSortOrder === toSortOrder) {
      return this.findById(lessonId);
    }

    const maxSortOrder = await prisma.lesson.aggregate({
      where: { courseId },
      _max: { sortOrder: true }
    });
    const tempSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

    const lowSortOrder = Math.min(fromSortOrder, toSortOrder);
    const highSortOrder = Math.max(fromSortOrder, toSortOrder);

    return prisma.$transaction(async (tx) => {
      const affectedLessons = await tx.lesson.findMany({
        where: {
          courseId,
          sortOrder: {
            gte: lowSortOrder,
            lte: highSortOrder
          }
        },
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      });

      await tx.lesson.update({
        where: { id: lessonId },
        data: { sortOrder: tempSortOrder }
      });

      const lessonsToShift = affectedLessons.filter((lesson) => lesson.id !== lessonId);
      for (const [index, lesson] of lessonsToShift.entries()) {
        await tx.lesson.update({
          where: { id: lesson.id },
          data: { sortOrder: tempSortOrder + index + 1 }
        });
      }

      const reorderedLessons = lessonsToShift.map((lesson) => {
        if (toSortOrder < fromSortOrder) {
          return { id: lesson.id, sortOrder: lesson.sortOrder + 1 };
        }
        return { id: lesson.id, sortOrder: lesson.sortOrder - 1 };
      });

      for (const lesson of reorderedLessons) {
        await tx.lesson.update({
          where: { id: lesson.id },
          data: { sortOrder: lesson.sortOrder }
        });
      }

      return tx.lesson.update({
        where: { id: lessonId },
        data: { sortOrder: toSortOrder },
        select: this.lessonSelect
      });
    });
  }

  async delete(id: string, courseId: string, sortOrder: number) {
    return prisma.$transaction(async (tx) => {
      const maxSortOrder = await tx.lesson.aggregate({
        where: { courseId },
        _max: { sortOrder: true }
      });
      const tempSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;
      const lessonsToCompact = await tx.lesson.findMany({
        where: {
          courseId,
          sortOrder: { gt: sortOrder }
        },
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      });

      await tx.lessonProgress.deleteMany({ where: { lessonId: id } });
      const lesson = await tx.lesson.delete({
        where: { id },
        select: this.lessonSelect
      });

      for (const [index, lessonToCompact] of lessonsToCompact.entries()) {
        await tx.lesson.update({
          where: { id: lessonToCompact.id },
          data: { sortOrder: tempSortOrder + index }
        });
      }

      for (const lessonToCompact of lessonsToCompact) {
        await tx.lesson.update({
          where: { id: lessonToCompact.id },
          data: { sortOrder: lessonToCompact.sortOrder - 1 }
        });
      }

      return lesson;
    });
  }
}
