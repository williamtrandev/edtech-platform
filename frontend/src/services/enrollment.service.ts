import { httpClient } from "../lib/http-client";
import type { CourseStatus } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type EnrollmentProgress = {
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

export type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  progress?: EnrollmentProgress;
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
  },
  async dropEnrollment(enrollmentId: string): Promise<Enrollment> {
    const response = await httpClient.delete<ApiResponse<Enrollment>>(`/enrollments/${enrollmentId}`);
    return response.data.data;
  }
};
