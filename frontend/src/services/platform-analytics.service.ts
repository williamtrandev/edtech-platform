import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PlatformAnalyticsOverview = {
  users: {
    total: number;
    byRole: Record<"USER" | "INSTRUCTOR" | "ADMIN", number>;
    byStatus: Record<"ACTIVE" | "SUSPENDED", number>;
  };
  courses: {
    total: number;
    byStatus: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED" | "LOCKED", number>;
  };
  learning: {
    enrollments: number;
    lessons: number;
    completedLessons: number;
    completionSignal: number;
  };
  assessments: {
    examAttempts: number;
    examAttemptsByStatus: Record<"IN_PROGRESS" | "SUBMITTED" | "GRADED", number>;
    assignmentSubmissions: number;
    assignmentSubmissionsByStatus: Record<"SUBMITTED" | "GRADED", number>;
    lateAssignmentSubmissions: number;
  };
  certificates: {
    total: number;
    byStatus: Record<"ACTIVE" | "REVOKED", number>;
  };
  operations: {
    unreadNotifications: number;
    auditLogs: number;
  };
};

export const platformAnalyticsService = {
  async getOverview(): Promise<PlatformAnalyticsOverview> {
    const response = await httpClient.get<ApiResponse<PlatformAnalyticsOverview>>("/analytics/platform-overviews");
    return response.data.data;
  }
};
