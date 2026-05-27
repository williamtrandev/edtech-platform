import { Prisma, User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { USER_ROLE } from "../../common/constants/business";

export class UserRepository {
  private readonly userSelect = {
    id: true,
    email: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.UserSelect;

  async findMany(
    page: number,
    limit: number,
    search?: string,
    role?: "USER" | "INSTRUCTOR" | "ADMIN",
    status?: "ACTIVE" | "SUSPENDED"
  ): Promise<{ items: User[]; total: number }> {
    const skip = (page - 1) * limit;
    const q = search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { id: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: this.userSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      select: this.userSelect
    });
  }

  async findDetailById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelect,
        _count: {
          select: {
            createdCourses: true,
            enrollments: true,
            lessonProgress: true,
            examAttempts: true,
            assignmentSubmissions: true,
            notifications: true,
            certificates: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    const { _count, ...profile } = user;
    return {
      ...profile,
      summary: {
        createdCourses: _count.createdCourses,
        enrollments: _count.enrollments,
        completedLessons: _count.lessonProgress,
        examAttempts: _count.examAttempts,
        assignmentSubmissions: _count.assignmentSubmissions,
        notifications: _count.notifications,
        certificates: _count.certificates
      }
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive"
        }
      },
      select: this.userSelect
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
      select: this.userSelect
    });
  }

  async upsertAuthUser(data: { id: string; email: string; role?: "USER" | "INSTRUCTOR" }): Promise<User> {
    return prisma.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        role: data.role ?? USER_ROLE.user,
        status: "ACTIVE"
      },
      update: {
        email: data.email
      },
      select: this.userSelect
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
      select: this.userSelect
    });
  }

  async countAdmins(excludeUserId?: string): Promise<number> {
    return prisma.user.count({
      where: {
        role: USER_ROLE.admin,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      }
    });
  }

  async updateWithAudit(
    id: string,
    data: Prisma.UserUpdateInput,
    audit: { actorId: string; action: string; metadata?: Prisma.InputJsonValue }
  ): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: this.userSelect
      });

      await tx.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: audit.action,
          entityType: "User",
          entityId: id,
          metadata: audit.metadata
        }
      });

      return user;
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
      select: this.userSelect
    });
  }
}
