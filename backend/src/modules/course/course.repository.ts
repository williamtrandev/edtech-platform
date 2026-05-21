import { CourseStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type CourseListFilters = {
  category?: string;
  level?: string;
  language?: string;
  instructorId?: string;
  enrollment?: "all" | "enrolled" | "not-enrolled";
  learnerId?: string;
  sort?: "newest" | "oldest" | "popular" | "highest-rated" | "title";
};

export class CourseRepository {
  private readonly courseSelect = {
    id: true,
    title: true,
    description: true,
    category: true,
    level: true,
    language: true,
    durationMinutes: true,
    requirements: true,
    outcomes: true,
    coverImageUrl: true,
    ratingAverage: true,
    ratingCount: true,
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

  async findMany(page: number, limit: number, status?: CourseStatus, search?: string, filters: CourseListFilters = {}) {
    const skip = (page - 1) * limit;
    const q = search?.trim();
    const enrollmentWhere =
      filters.learnerId && filters.enrollment === "enrolled"
        ? { enrollments: { some: { userId: filters.learnerId } } }
        : filters.learnerId && filters.enrollment === "not-enrolled"
          ? { enrollments: { none: { userId: filters.learnerId } } }
          : {};
    const where: Prisma.CourseWhereInput = {
      ...(status ? { status } : {}),
      ...(filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {}),
      ...(filters.level ? { level: { contains: filters.level, mode: "insensitive" } } : {}),
      ...(filters.language ? { language: { contains: filters.language, mode: "insensitive" } } : {}),
      ...(filters.instructorId ? { instructorId: filters.instructorId } : {}),
      ...enrollmentWhere,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      filters.sort === "oldest"
        ? { createdAt: "asc" }
        : filters.sort === "popular"
          ? { enrollments: { _count: "desc" } }
          : filters.sort === "highest-rated"
            ? { ratingAverage: "desc" }
            : filters.sort === "title"
              ? { title: "asc" }
              : { createdAt: "desc" };

    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: this.courseSelect,
        orderBy,
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

  async findFacets(status?: CourseStatus) {
    const where: Prisma.CourseWhereInput = {
      ...(status ? { status } : {})
    };

    const [metadataRows, instructorRows] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: {
          category: true,
          level: true,
          language: true
        },
        distinct: ["category", "level", "language"]
      }),
      prisma.course.findMany({
        where,
        select: {
          instructor: {
            select: {
              id: true,
              email: true
            }
          }
        },
        distinct: ["instructorId"],
        orderBy: { instructorId: "asc" }
      })
    ]);

    const uniqueSorted = (values: Array<string | null>) =>
      Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
        a.localeCompare(b)
      );

    return {
      categories: uniqueSorted(metadataRows.map((course) => course.category)),
      levels: uniqueSorted(metadataRows.map((course) => course.level)),
      languages: uniqueSorted(metadataRows.map((course) => course.language)),
      instructors: instructorRows
        .map((row) => row.instructor)
        .sort((a, b) => a.email.localeCompare(b.email))
    };
  }

  async countLessons(courseId: string) {
    return prisma.lesson.count({
      where: { courseId }
    });
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
