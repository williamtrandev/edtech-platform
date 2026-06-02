import { Prisma } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { notificationEmailQueue, notificationEmailJobOptions } from "../../jobs/notification-email.queue";
import { NotificationRepository } from "./notification.repository";
import { UpdateNotificationPreferencesInput } from "./notification.schema";

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
    const preferences = await this.notificationRepository.findPreferenceByUser(input.userId);
    const preferenceKey = this.resolvePreferenceKey(input.type);
    const shouldSendInApp = !preferences || (preferences.inAppEnabled && preferences[preferenceKey]);
    const shouldQueueEmail = Boolean(preferences?.emailEnabled && preferences[preferenceKey]);

    if (!shouldSendInApp && !shouldQueueEmail) {
      return null;
    }

    const notification = shouldSendInApp
      ? await this.notificationRepository.create({
          user: { connect: { id: input.userId } },
          type: input.type,
          title: input.title,
          body: input.body || null,
          linkUrl: input.linkUrl || null,
          metadata: input.metadata ?? Prisma.JsonNull
        })
      : null;

    if (shouldQueueEmail) {
      const recipientEmail = await this.notificationRepository.findUserEmailById(input.userId);
      if (recipientEmail) {
        await notificationEmailQueue.add(
          "send",
          {
            userId: input.userId,
            email: recipientEmail,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            linkUrl: input.linkUrl ?? null,
            notificationId: notification?.id ?? null
          },
          notificationEmailJobOptions
        );
      }
    }

    return notification;
  }

  async getMyPreferences(user: Express.UserClaims | undefined) {
    const userId = this.requireUserId(user);
    const preferences = await this.notificationRepository.findPreferenceByUser(userId);

    if (preferences) {
      return preferences;
    }

    return this.notificationRepository.upsertPreference(userId, {});
  }

  async updateMyPreferences(user: Express.UserClaims | undefined, input: UpdateNotificationPreferencesInput) {
    const userId = this.requireUserId(user);
    return this.notificationRepository.upsertPreference(userId, input);
  }

  async listMyNotifications(user: Express.UserClaims | undefined, page: number, limit: number, unreadOnly: boolean) {
    const userId = this.requireUserId(user);

    const { items, total, unreadTotal } = await this.notificationRepository.findMany(userId, page, limit, unreadOnly);
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
    const userId = this.requireUserId(user);

    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }
    if (notification.userId !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (notification.readAt) {
      return notification;
    }

    return this.notificationRepository.markRead(id);
  }

  async markAllMyNotificationsRead(user: Express.UserClaims | undefined) {
    const userId = this.requireUserId(user);

    const result = await this.notificationRepository.markAllRead(userId);
    return {
      updatedCount: result.count
    };
  }

  private requireUserId(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return user.id;
  }

  private resolvePreferenceKey(type: CreateNotificationInput["type"]) {
    const preferenceKeyByType = {
      ENROLLMENT_SUCCESS: "enrollmentSuccess",
      ASSIGNMENT_GRADED: "assignmentGraded",
      CERTIFICATE_ISSUED: "certificateIssued",
      COURSE_PUBLISHED: "coursePublished",
      SYSTEM: "system"
    } as const satisfies Record<CreateNotificationInput["type"], keyof UpdateNotificationPreferencesInput>;

    return preferenceKeyByType[type];
  }
}
