import { prisma } from "../../config/prisma";

export class EnrollmentRepository {
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
            status: true
          }
        }
      },
      orderBy: {
        enrolledAt: "desc"
      }
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
}
