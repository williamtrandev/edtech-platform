import { httpClient } from "../lib/http-client";
import type { Enrollment } from "./enrollment.service";
import type { CourseStatus, EditableCourseStatus, LessonContentType, UserRole } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
  coverImageUrl?: string | null;
  ratingAverage: number;
  ratingCount: number;
  status: CourseStatus;
  instructorId: string;
  enrollmentCount?: number;
  lockReason?: string | null;
  lockedAt?: string | null;
  lockedById?: string | null;
  statusBeforeLock?: CourseStatus | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseEnrollmentRow = {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};

export type PaginatedCourseEnrollments = {
  items: CourseEnrollmentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type PaginatedCourses = {
  items: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type CourseFacets = {
  categories: string[];
  levels: string[];
  languages: string[];
  instructors: Array<{
    id: string;
    email: string;
  }>;
};

export type CourseListParams = {
  status?: CourseStatus;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  level?: string;
  language?: string;
  instructorId?: string;
  enrollment?: "all" | "enrolled" | "not-enrolled";
  sort?: "newest" | "oldest" | "popular" | "highest-rated" | "title";
};

export type CourseReview = {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
};

export type PaginatedCourseReviews = {
  items: CourseReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
};

export type CreateCoursePayload = {
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  durationMinutes: number;
  requirements: string;
  outcomes: string;
  coverImageUrl: string;
  status: EditableCourseStatus;
};

export type UpdateCoursePayload = {
  title?: string;
  description?: string;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
  coverImageUrl?: string | null;
  status?: EditableCourseStatus;
};

export type CreateLessonPayload = {
  courseId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
};

export type UpdateLessonPayload = {
  title: string;
  contentType: LessonContentType;
  content: string;
};

export const courseService = {
  async getCourses(params: CourseListParams = {}): Promise<PaginatedCourses> {
    const response = await httpClient.get<ApiResponse<PaginatedCourses>>("/courses", {
      params: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.category?.trim() ? { category: params.category.trim() } : {}),
        ...(params.level?.trim() ? { level: params.level.trim() } : {}),
        ...(params.language?.trim() ? { language: params.language.trim() } : {}),
        ...(params.instructorId?.trim() ? { instructorId: params.instructorId.trim() } : {}),
        ...(params.enrollment && params.enrollment !== "all" ? { enrollment: params.enrollment } : {}),
        ...(params.sort ? { sort: params.sort } : {})
      }
    });
    return response.data.data;
  },
  async getCourseFacets(status?: CourseStatus): Promise<CourseFacets> {
    const response = await httpClient.get<ApiResponse<CourseFacets>>("/courses/facets", {
      params: {
        ...(status ? { status } : {})
      }
    });
    return response.data.data;
  },
  async createCourse(payload: CreateCoursePayload) {
    const response = await httpClient.post<ApiResponse<Course>>("/courses", payload);
    return response.data.data;
  },
  async updateCourse(id: string, payload: UpdateCoursePayload) {
    const response = await httpClient.put<ApiResponse<Course>>(`/courses/${id}`, payload);
    return response.data.data;
  },
  async getCourseById(id: string): Promise<Course> {
    const response = await httpClient.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
  },

  async getCourseEnrollments(courseId: string, page = 1, limit = 20, search = ""): Promise<PaginatedCourseEnrollments> {
    const response = await httpClient.get<ApiResponse<PaginatedCourseEnrollments>>(`/courses/${courseId}/enrollments`, {
      params: {
        page,
        limit,
        ...(search ? { search } : {})
      }
    });
    return response.data.data;
  },

  async adminEnrollLearner(courseId: string, email: string) {
    const response = await httpClient.post<ApiResponse<Enrollment>>(`/courses/${courseId}/enrollments`, { email });
    return response.data.data;
  },

  async adminRemoveLearner(courseId: string, userId: string) {
    const response = await httpClient.delete<ApiResponse<{ id: string; userId: string; courseId: string; enrolledAt: string }>>(
      `/courses/${courseId}/enrollments/${userId}`
    );
    return response.data.data;
  },

  async archiveCourse(id: string): Promise<Course> {
    const response = await httpClient.delete<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
  },
  async lockCourse(id: string, reason?: string): Promise<Course> {
    const response = await httpClient.post<ApiResponse<Course>>(`/courses/${id}/locks`, {
      ...(reason?.trim() ? { reason: reason.trim() } : {})
    });
    return response.data.data;
  },
  async unlockCourse(id: string): Promise<Course> {
    const response = await httpClient.delete<ApiResponse<Course>>(`/courses/${id}/locks`);
    return response.data.data;
  },
  async getCourseReviews(courseId: string, page = 1, limit = 20): Promise<PaginatedCourseReviews> {
    const response = await httpClient.get<ApiResponse<PaginatedCourseReviews>>(`/courses/${courseId}/reviews`, {
      params: { page, limit }
    });
    return response.data.data;
  },
  async upsertMyCourseReview(courseId: string, payload: { rating: number; comment?: string | null }): Promise<CourseReview> {
    const response = await httpClient.put<ApiResponse<CourseReview>>(`/courses/${courseId}/reviews/me`, payload);
    return response.data.data;
  },
  async deleteMyCourseReview(courseId: string): Promise<void> {
    await httpClient.delete(`/courses/${courseId}/reviews/me`);
  },
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    const response = await httpClient.get<ApiResponse<Lesson[]>>(`/lessons/courses/${courseId}/lessons`);
    return response.data.data;
  },
  async createLesson(payload: CreateLessonPayload): Promise<Lesson> {
    const response = await httpClient.post<ApiResponse<Lesson>>("/lessons", payload);
    return response.data.data;
  },
  async updateLesson(lessonId: string, payload: UpdateLessonPayload): Promise<Lesson> {
    const response = await httpClient.put<ApiResponse<Lesson>>(`/lessons/${lessonId}`, payload);
    return response.data.data;
  },
  async reorderCourseLessons(courseId: string, lessonIds: string[]): Promise<Lesson[]> {
    const response = await httpClient.patch<ApiResponse<Lesson[]>>(`/lessons/courses/${courseId}/lesson-order`, { lessonIds });
    return response.data.data;
  },
  async updateLessonOrder(lessonId: string, sortOrder: number): Promise<Lesson> {
    const response = await httpClient.patch<ApiResponse<Lesson>>(`/lessons/${lessonId}/sort-order`, { sortOrder });
    return response.data.data;
  },
  async deleteLesson(lessonId: string): Promise<Lesson> {
    const response = await httpClient.delete<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
    return response.data.data;
  }
};
