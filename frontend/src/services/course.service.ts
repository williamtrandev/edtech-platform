import { httpClient } from "../lib/http-client";
import type { CourseStatus, LessonContentType, UserRole } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  status: CourseStatus;
  instructorId: string;
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
  description?: string;
  coverImageUrl?: string | null;
  status: CourseStatus;
};

export type UpdateCoursePayload = {
  title?: string;
  description?: string;
  coverImageUrl?: string | null;
  status?: CourseStatus;
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
  async getCourses(): Promise<PaginatedCourses> {
    const response = await httpClient.get<ApiResponse<PaginatedCourses>>("/courses");
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

  async archiveCourse(id: string): Promise<Course> {
    const response = await httpClient.delete<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
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
