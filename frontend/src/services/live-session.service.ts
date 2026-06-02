import { httpClient } from "../lib/http-client";
import type { LiveSessionStatus } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type LiveSessionItem = {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  sortOrder: number;
  meetingUrl: string | null;
  instructions: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationMinutes: number | null;
  status: LiveSessionStatus;
  learnPath: string;
};

export const liveSessionService = {
  async listMyLiveSessions(params?: { status?: LiveSessionStatus | "ALL"; limit?: number }) {
    const response = await httpClient.get<ApiResponse<{ items: LiveSessionItem[] }>>("/live-sessions/me", {
      params
    });
    return response.data.data;
  },

  async listCourseLiveSessions(courseId: string) {
    const response = await httpClient.get<ApiResponse<{ items: LiveSessionItem[] }>>(`/courses/${courseId}/live-sessions`);
    return response.data.data;
  }
};
