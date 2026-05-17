import { CourseStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CourseRepository {
  async findMany(page: number, limit: number, status?: CourseStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.CourseWhereInput = status ? { status } : {};

    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          coverImageUrl: true,
          status: true,
          instructorId: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.course.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        status: true,
        instructorId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async create(data: Prisma.CourseCreateInput) {
    return prisma.course.create({
      data,
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        status: true,
        instructorId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async update(id: string, data: Prisma.CourseUpdateInput) {
    return prisma.course.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        status: true,
        instructorId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async archiveById(id: string) {
    return prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.ARCHIVED,
        archivedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        status: true,
        instructorId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
