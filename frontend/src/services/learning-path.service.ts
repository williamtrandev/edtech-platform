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

export async function listLearningPaths(page = 1, limit = 20) {
  const response = await httpClient.get<ApiResponse<PaginatedLearningPaths>>("/learning-paths", {
    params: { page, limit }
  });
  return response.data.data;
}

export async function getLearningPath(id: string) {
  const response = await httpClient.get<ApiResponse<LearningPathDetail>>(`/learning-paths/${id}`);
  return response.data.data;
}
