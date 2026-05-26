import { Prisma } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { NotificationRepository } from "./notification.repository";

type CreateNotificationInput = {
  userId: string;
  type: "ENROLLMENT_SUCCESS" | "ASSIGNMENT_GRADED" | "CERTIFICATE_ISSUED" | "COURSE_PUBLISHED" | "SYSTEM";
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createNotification(input: CreateNotificationInput) {
    return this.notificationRepository.create({
      user: { connect: { id: input.userId } },
      type: input.type,
      title: input.title,
      body: input.body || null,
      linkUrl: input.linkUrl || null,
      metadata: input.metadata ?? Prisma.JsonNull
    });
  }

  async listMyNotifications(user: Express.UserClaims | undefined, page: number, limit: number, unreadOnly: boolean) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { items, total, unreadTotal } = await this.notificationRepository.findMany(user.id, page, limit, unreadOnly);
    return {
      items,
      unreadTotal,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async markMyNotificationRead(user: Express.UserClaims | undefined, id: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }
    if (notification.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (notification.readAt) {
      return notification;
    }

    return this.notificationRepository.markRead(id);
  }

  async markAllMyNotificationsRead(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const result = await this.notificationRepository.markAllRead(user.id);
    return {
      updatedCount: result.count
    };
  }
}
