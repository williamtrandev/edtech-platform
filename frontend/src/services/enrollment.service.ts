import { httpClient } from "../lib/http-client";
import type { CourseStatus } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  course?: {
    id: string;
    title: string;
    coverImageUrl?: string | null;
    status: CourseStatus;
  };
};

export const enrollmentService = {
  async createEnrollment(courseId: string): Promise<Enrollment> {
    const response = await httpClient.post<ApiResponse<Enrollment>>("/enrollments", { courseId });
    return response.data.data;
  },
  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await httpClient.get<ApiResponse<Enrollment[]>>("/enrollments/me");
    return response.data.data;
  }
};
