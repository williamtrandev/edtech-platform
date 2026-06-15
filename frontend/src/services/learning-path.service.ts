import { httpClient } from "../lib/http-client";
import type { CourseStatus } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type LearningPathSummary = {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status: string;
  courseCount: number;
  enrolledCourseCount?: number;
  averageProgress?: number;
  createdAt: string;
  updatedAt: string;
};

export type LearningPathCourseEntry = {
  sortOrder: number;
  isEnrolled: boolean;
  progressPercent: number;
  course: {
    id: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    status: CourseStatus;
    priceCents: number;
    currency: string;
    instructorId: string;
    durationMinutes?: number | null;
    ratingAverage: number;
    ratingCount: number;
  };
};

export type LearningPathDetail = {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status: string;
  courseCount: number;
  enrolledCourseCount: number;
  averageProgress: number;
  createdAt: string;
  updatedAt: string;
  courses: LearningPathCourseEntry[];
};

export type PaginatedLearningPaths = {
  items: LearningPathSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type CreateLearningPathPayload = {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status?: string;
};

export type UpdateLearningPathPayload = {
  title?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status?: string;
};

export async function listLearningPaths(page = 1, limit = 20, status?: string) {
  const response = await httpClient.get<ApiResponse<PaginatedLearningPaths>>("/learning-paths", {
    params: {
      page,
      limit,
      ...(status ? { status } : {})
    }
  });
  return response.data.data;
}

export async function getLearningPath(id: string) {
  const response = await httpClient.get<ApiResponse<LearningPathDetail>>(`/learning-paths/${id}`);
  return response.data.data;
}

export async function createLearningPath(payload: CreateLearningPathPayload) {
  const response = await httpClient.post<ApiResponse<LearningPathSummary>>("/learning-paths", payload);
  return response.data.data;
}

export async function updateLearningPath(id: string, payload: UpdateLearningPathPayload) {
  const response = await httpClient.patch<ApiResponse<LearningPathSummary>>(`/learning-paths/${id}`, payload);
  return response.data.data;
}

export async function addLearningPathCourse(learningPathId: string, courseId: string, sortOrder?: number) {
  const response = await httpClient.post<ApiResponse<{ learningPathId: string; courseId: string; sortOrder: number }>>(
    `/learning-paths/${learningPathId}/courses`,
    {
      courseId,
      ...(sortOrder !== undefined ? { sortOrder } : {})
    }
  );
  return response.data.data;
}

export async function removeLearningPathCourse(learningPathId: string, courseId: string) {
  const response = await httpClient.delete<ApiResponse<{ learningPathId: string; courseId: string }>>(
    `/learning-paths/${learningPathId}/courses/${courseId}`
  );
  return response.data.data;
}
