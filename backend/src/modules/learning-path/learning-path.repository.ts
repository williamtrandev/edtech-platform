import { LearningPathStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const learningPathSelect = {
  id: true,
  title: true,
  description: true,
  coverImageUrl: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  _count: {
    select: {
      courses: true
    }
  }
} satisfies Prisma.LearningPathSelect;

const learningPathCourseSelect = {
  id: true,
  sortOrder: true,
  course: {
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      status: true,
      priceCents: true,
      currency: true,
      instructorId: true,
      durationMinutes: true,
      ratingAverage: true,
      ratingCount: true
    }
  }
} satisfies Prisma.LearningPathCourseSelect;

export class LearningPathRepository {
  async findMany(page: number, limit: number, status?: LearningPathStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.LearningPathWhereInput = {
      archivedAt: null,
      ...(status ? { status } : {})
    };

    const [items, total] = await Promise.all([
      prisma.learningPath.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: learningPathSelect
      }),
      prisma.learningPath.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        courseCount: item._count.courses
      })),
      total
    };
  }

  async findById(id: string) {
    const path = await prisma.learningPath.findUnique({
      where: { id },
      select: {
        ...learningPathSelect,
        courses: {
          orderBy: { sortOrder: "asc" },
          select: learningPathCourseSelect
        }
      }
    });

    if (!path) {
      return null;
    }

    const { _count, courses, ...data } = path;
    return {
      ...data,
      courseCount: _count.courses,
      courses: courses.map((entry) => ({
        id: entry.id,
        sortOrder: entry.sortOrder,
        course: entry.course
      }))
    };
  }

  async create(data: {
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    status: LearningPathStatus;
    createdById: string;
  }) {
    return prisma.learningPath.create({
      data,
      select: learningPathSelect
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      coverImageUrl: string | null;
      status: LearningPathStatus;
      archivedAt: Date | null;
    }>
  ) {
    return prisma.learningPath.update({
      where: { id },
      data,
      select: learningPathSelect
    });
  }

  async addCourse(learningPathId: string, courseId: string, sortOrder: number) {
    return prisma.learningPathCourse.create({
      data: {
        learningPathId,
        courseId,
        sortOrder
      },
      select: learningPathCourseSelect
    });
  }

  async removeCourse(learningPathId: string, courseId: string) {
    return prisma.learningPathCourse.deleteMany({
      where: {
        learningPathId,
        courseId
      }
    });
  }

  async getNextSortOrder(learningPathId: string) {
    const last = await prisma.learningPathCourse.findFirst({
      where: { learningPathId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  async findCourseLink(learningPathId: string, courseId: string) {
    return prisma.learningPathCourse.findFirst({
      where: {
        learningPathId,
        courseId
      }
    });
  }
}
