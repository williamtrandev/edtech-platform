import { httpClient } from "../lib/http-client";
import type { EnrollmentProgress } from "./enrollment.service";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type LearnerActivityType =
  | "ENROLLMENT"
  | "LESSON_COMPLETED"
  | "EXAM_SUBMITTED"
  | "EXAM_GRADED"
  | "ASSIGNMENT_SUBMITTED"
  | "ASSIGNMENT_GRADED";

export type LearnerGradeType = "EXAM" | "ASSIGNMENT";

export type LearnerActivityItem = {
  id: string;
  type: LearnerActivityType;
  title: string;
  courseId: string;
  courseTitle: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type LearnerGradeHistoryItem = {
  id: string;
  type: LearnerGradeType;
  title: string;
  courseId: string;
  courseTitle: string;
  score: number;
  maxScore: number | null;
  occurredAt: string;
  passed: boolean | null;
};

export type LearnerEnrollmentSnapshot = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  progress: EnrollmentProgress;
};

export type LearnerAnalytics = {
  summary: {
    enrollments: number;
    coursesInProgress: number;
    coursesCompleted: number;
    lessonsCompleted: number;
    certificates: number;
    studyStreakDays: number;
  };
  assessments: {
    exams: {
      totalPublished: number;
      passed: number;
      aggregatePassed: number;
      aggregateTotal: number;
      gradedAttempts: number;
      pendingGrades: number;
      averageScore: number | null;
    };
    assignments: {
      submitted: number;
      graded: number;
      pendingGrades: number;
      aggregateSubmitted: number;
      aggregateTotal: number;
      averageScore: number | null;
    };
  };
  enrollments: LearnerEnrollmentSnapshot[];
  recentActivity: LearnerActivityItem[];
  gradeHistory: LearnerGradeHistoryItem[];
};

export type CourseLearnerAnalytics = {
  courseId: string;
  progress: LearnerAnalytics["enrollments"][number]["progress"];
  assessments: {
    exams: {
      passed: number;
      total: number;
      pendingGrades: number;
      averageScore: number | null;
    };
    assignments: {
      submitted: number;
      total: number;
      graded: number;
      pendingGrades: number;
      averageScore: number | null;
    };
  };
  gradeHistory: LearnerGradeHistoryItem[];
  recentActivity: LearnerActivityItem[];
};

export const learnerAnalyticsService = {
  async getMyAnalytics(): Promise<LearnerAnalytics> {
    const response = await httpClient.get<ApiResponse<LearnerAnalytics>>("/learner-analytics/me");
    return response.data.data;
  },

  async getMyCourseAnalytics(courseId: string): Promise<CourseLearnerAnalytics> {
    const response = await httpClient.get<ApiResponse<CourseLearnerAnalytics>>(
      `/learner-analytics/courses/${encodeURIComponent(courseId)}/me`
    );
    return response.data.data;
  }
};
