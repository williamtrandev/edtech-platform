import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type PlatformNotificationFilters = {
  search?: string;
  type?: NotificationType;
  unreadOnly?: boolean;
};

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

  async findManyForPlatform(page: number, limit: number, filters: PlatformNotificationFilters = {}) {
    const skip = (page - 1) * limit;
    const q = filters.search?.trim();
    const where: Prisma.NotificationWhereInput = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.unreadOnly ? { readAt: null } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { userId: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const platformSelect = {
      ...this.notificationSelect,
      user: {
        select: {
          id: true,
          email: true
        }
      }
    } satisfies Prisma.NotificationSelect;

    const [items, total, unreadTotal] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        select: platformSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          readAt: null
        }
      })
    ]);

    return { items, total, unreadTotal };
  }

  async getPlatformSummary() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, unreadTotal, last24Hours, byTypeRows] = await prisma.$transaction([
      prisma.notification.count(),
      prisma.notification.count({
        where: {
          readAt: null
        }
      }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: twentyFourHoursAgo
          }
        }
      }),
      prisma.notification.groupBy({
        by: ["type"],
        orderBy: {
          type: "asc"
        },
        _count: {
          id: true
        }
      })
    ]);

    const byType = Object.fromEntries(
      byTypeRows.map((row) => {
        const count =
          typeof row._count === "object" && row._count && "id" in row._count ? row._count.id ?? 0 : 0;
        return [row.type, count];
      })
    );

    return {
      total,
      unreadTotal,
      last24Hours,
      byType
    };
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
