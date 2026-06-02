import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type CourseProgress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
  totalAssignments: number;
  submittedAssignments: number;
  percentage: number;
  isComplete: boolean;
  completionCriteria: {
    type: "ALL_LESSONS_COMPLETED" | "FULL_COURSE_REQUIREMENTS";
    lessonCount: number;
    examCount: number;
    assignmentCount: number;
  };
  breakdown: {
    lessonsPercent: number;
    examsPercent: number;
    assignmentsPercent: number;
    weights: {
      lessons: number;
      exams: number;
      assignments: number;
    };
  };
};

export type LessonProgressItem = {
  lessonId: string;
  isCompleted: boolean;
  watchPositionSeconds?: number;
  completedAt: string | null;
  updatedAt: string | null;
  prerequisiteLessonId: string | null;
  isUnlocked: boolean;
  lockedByLessonId: string | null;
  lockedByLessonTitle: string | null;
};

export type LessonProgressSyncItem = {
  clientEventId: string;
  lessonId: string;
  isCompleted?: boolean;
  watchPositionSeconds?: number;
  recordedAt: string;
};

export type LessonProgressSyncResult = {
  synced: number;
  skippedDuplicates: number;
  failures: Array<{ lessonId: string; code: string; message: string }>;
};

export const progressService = {
  async completeLesson(lessonId: string) {
    const response = await httpClient.post<ApiResponse<{ lessonId: string; isCompleted: boolean }>>("/lesson-progress", {
      lessonId,
      isCompleted: true
    });
    return response.data.data;
  },
  async saveWatchPosition(lessonId: string, watchPositionSeconds: number) {
    const response = await httpClient.post<ApiResponse<{ lessonId: string; watchPositionSeconds: number }>>("/lesson-progress", {
      lessonId,
      watchPositionSeconds
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
  },
  async syncLessonProgress(items: LessonProgressSyncItem[]): Promise<LessonProgressSyncResult> {
    const response = await httpClient.post<ApiResponse<LessonProgressSyncResult>>("/lesson-progress/sync", { items });
    return response.data.data;
  }
};
