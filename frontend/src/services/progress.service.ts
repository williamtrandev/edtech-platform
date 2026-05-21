import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type CourseProgress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
};

export type LessonProgressItem = {
  lessonId: string;
  isCompleted: boolean;
  completedAt: string;
  updatedAt: string;
};

export const progressService = {
  async completeLesson(lessonId: string) {
    const response = await httpClient.post<ApiResponse<{ lessonId: string; isCompleted: boolean }>>("/lesson-progress", {
      lessonId,
      isCompleted: true
    });
    return response.data.data;
  },
  async getMyCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await httpClient.get<ApiResponse<CourseProgress>>(`/lesson-progress/courses/${courseId}/me`);
    return response.data.data;
  },
  async getMyLessonProgress(courseId: string): Promise<{ courseId: string; items: LessonProgressItem[] }> {
    const response = await httpClient.get<ApiResponse<{ courseId: string; items: LessonProgressItem[] }>>(
      `/lesson-progress/courses/${courseId}/me/lessons`
    );
    return response.data.data;
  }
};
