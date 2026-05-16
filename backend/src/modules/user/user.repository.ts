import { Prisma, User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { USER_ROLE } from "../../common/constants/business";

export class UserRepository {
  private readonly userSelect = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.UserSelect;

  async findMany(page: number, limit: number): Promise<User[]> {
    const skip = (page - 1) * limit;

    return prisma.user.findMany({
      select: this.userSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      select: this.userSelect
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
      select: this.userSelect
    });
  }

  async upsertAuthUser(data: { id: string; email: string }): Promise<User> {
    return prisma.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        role: USER_ROLE.user
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

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
      select: this.userSelect
    });
  }
}
