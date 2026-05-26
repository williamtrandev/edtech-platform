import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class NotificationRepository {
  private readonly notificationSelect = {
    id: true,
    userId: true,
    type: true,
    title: true,
    body: true,
    linkUrl: true,
    metadata: true,
    readAt: true,
    createdAt: true
  } satisfies Prisma.NotificationSelect;

  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({
      data,
      select: this.notificationSelect
    });
  }

  async findMany(userId: string, page: number, limit: number, unreadOnly = false) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {})
    };

    const [items, total, unreadTotal] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        select: this.notificationSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null
        }
      })
    ]);

    return { items, total, unreadTotal };
  }

  async findById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
      select: this.notificationSelect
    });
  }

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: this.notificationSelect
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        readAt: null
      },
      data: { readAt: new Date() }
    });
  }
}
