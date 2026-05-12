import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  instructorId: string;
  createdAt: string;
  updatedAt: string;
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
  contentType: "VIDEO" | "TEXT" | "RESOURCE";
  content: string;
  sortOrder: number;
};

export const courseService = {
  async getCourses(): Promise<PaginatedCourses> {
    const response = await httpClient.get<ApiResponse<PaginatedCourses>>("/courses");
    return response.data.data;
  },
  async createCourse(payload: { title: string; description?: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
    const response = await httpClient.post<ApiResponse<Course>>("/courses", payload);
    return response.data.data;
  },
  async getCourseById(id: string): Promise<Course> {
    const response = await httpClient.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
  },
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    const response = await httpClient.get<ApiResponse<Lesson[]>>(`/lessons/courses/${courseId}/lessons`);
    return response.data.data;
  },
  async createLesson(payload: {
    courseId: string;
    title: string;
    contentType: "VIDEO" | "TEXT" | "RESOURCE";
    content: string;
    sortOrder: number;
  }): Promise<Lesson> {
    const response = await httpClient.post<ApiResponse<Lesson>>("/lessons", payload);
    return response.data.data;
  }
};
