import type { NotificationType } from "../constants/business";
import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  metadata?: unknown;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: Notification[];
  unreadTotal: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type NotificationPreferences = {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  enrollmentSuccess: boolean;
  assignmentGraded: boolean;
  certificateIssued: boolean;
  coursePublished: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateNotificationPreferencesPayload = Partial<
  Pick<
    NotificationPreferences,
    | "inAppEnabled"
    | "emailEnabled"
    | "enrollmentSuccess"
    | "assignmentGraded"
    | "certificateIssued"
    | "coursePublished"
    | "system"
  >
>;

export const notificationService = {
  async getNotifications(): Promise<NotificationListResponse> {
    const response = await httpClient.get<ApiResponse<NotificationListResponse>>("/notifications", {
      params: {
        page: 1,
        limit: 10
      }
    });
    return response.data.data;
  },
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await httpClient.get<ApiResponse<NotificationPreferences>>("/notifications/preferences");
    return response.data.data;
  },
  async updatePreferences(payload: UpdateNotificationPreferencesPayload): Promise<NotificationPreferences> {
    const response = await httpClient.patch<ApiResponse<NotificationPreferences>>("/notifications/preferences", payload);
    return response.data.data;
  },
  async markRead(id: string): Promise<Notification> {
    const response = await httpClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data.data;
  },
  async markAllRead(): Promise<{ updatedCount: number }> {
    const response = await httpClient.patch<ApiResponse<{ updatedCount: number }>>("/notifications/read-all");
    return response.data.data;
  }
};
