import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class LessonRepository {
  async findByCourseId(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      select: {
        id: true,
        courseId: true,
        title: true,
        contentType: true,
        content: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { sortOrder: "asc" }
    });
  }

  async create(data: Prisma.LessonCreateInput) {
    return prisma.lesson.create({
      data,
      select: {
        id: true,
        courseId: true,
        title: true,
        contentType: true,
        content: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
