import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type NotificationPreferenceData = Partial<
  Pick<
    Prisma.NotificationPreferenceUncheckedCreateInput,
    | "inAppEnabled"
    | "emailEnabled"
    | "enrollmentSuccess"
    | "assignmentGraded"
    | "certificateIssued"
    | "coursePublished"
    | "system"
  >
>;

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

  private readonly preferenceSelect = {
    id: true,
    userId: true,
    inAppEnabled: true,
    emailEnabled: true,
    enrollmentSuccess: true,
    assignmentGraded: true,
    certificateIssued: true,
    coursePublished: true,
    system: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.NotificationPreferenceSelect;

  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({
      data,
      select: this.notificationSelect
    });
  }

  async findPreferenceByUser(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
      select: this.preferenceSelect
    });
  }

  async upsertPreference(userId: string, data: NotificationPreferenceData) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        ...data
      },
      update: data,
      select: this.preferenceSelect
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

  async findUserEmailById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true
      }
    });

    return user?.email ?? null;
  }
}
