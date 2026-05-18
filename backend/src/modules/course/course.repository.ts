import { CourseStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CourseRepository {
  private readonly courseSelect = {
    id: true,
    title: true,
    description: true,
    coverImageUrl: true,
    status: true,
    instructorId: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        enrollments: true
      }
    }
  } satisfies Prisma.CourseSelect;

  private mapCourse<T extends { _count: { enrollments: number } }>(course: T) {
    const { _count, ...data } = course;
    return {
      ...data,
      enrollmentCount: _count.enrollments
    };
  }

  async findMany(page: number, limit: number, status?: CourseStatus, search?: string) {
    const skip = (page - 1) * limit;
    const q = search?.trim();
    const where: Prisma.CourseWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: this.courseSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.course.count({ where })
    ]);

    return { items: items.map((course) => this.mapCourse(course)), total };
  }

  async findById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      select: this.courseSelect
    });
    return course ? this.mapCourse(course) : null;
  }

  async create(data: Prisma.CourseCreateInput) {
    const course = await prisma.course.create({
      data,
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async update(id: string, data: Prisma.CourseUpdateInput) {
    const course = await prisma.course.update({
      where: { id },
      data,
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async archiveById(id: string) {
    const course = await prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.ARCHIVED,
        archivedAt: new Date()
      },
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }
}
