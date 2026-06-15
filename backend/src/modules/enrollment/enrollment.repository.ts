import { prisma } from "../../config/prisma";

export class EnrollmentRepository {
  async findEnrolledCourseIds(userId: string, courseIds: string[]) {
    if (courseIds.length === 0) {
      return [];
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        courseId: {
          in: courseIds
        }
      },
      select: {
        courseId: true
      }
    });

    return enrollments.map((entry) => entry.courseId);
  }

  async findByUserAndCourse(userId: string, courseId: string) {
    return prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true
      }
    });
  }

  async findByUser(userId: string) {
    return prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true,
        course: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            status: true
          }
        }
      },
      orderBy: {
        enrolledAt: "desc"
      }
    });
  }

  async findByCourseId(courseId: string, page: number, limit: number, search?: string) {
    const where = {
      courseId,
      ...(search
        ? {
            user: {
              email: {
                contains: search,
                mode: "insensitive" as const
              }
            }
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          userId: true,
          courseId: true,
          enrolledAt: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { enrolledAt: "desc" }
      }),
      prisma.enrollment.count({ where })
    ]);

    return { items, total };
  }

  async findAllByCourseId(courseId: string) {
    return prisma.enrollment.findMany({
      where: {
        courseId
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { enrolledAt: "desc" }
    });
  }

  async create(userId: string, courseId: string) {
    return prisma.enrollment.create({
      data: {
        user: { connect: { id: userId } },
        course: { connect: { id: courseId } }
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true
      }
    });
  }

  async findById(id: string) {
    return prisma.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true
      }
    });
  }

  async deleteByUserAndCourse(userId: string, courseId: string) {
    return prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        enrolledAt: true
      }
    });
  }
}
