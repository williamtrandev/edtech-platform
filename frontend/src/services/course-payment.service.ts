import { httpClient } from "../lib/http-client";
import type { CoursePaymentStatus } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type CoursePaymentRecord = {
  id: string;
  userId: string;
  courseId: string;
  amountCents: number;
  currency: string;
  status: CoursePaymentStatus;
  provider: string;
  providerRef?: string | null;
  idempotencyKey: string;
  createdAt: string;
  completedAt?: string | null;
};

export type CoursePaymentStatusResponse = {
  courseId: string;
  isFree: boolean;
  priceCents: number;
  currency: string;
  hasCompletedPayment: boolean;
  latestPayment?: CoursePaymentRecord | null;
};

export type CoursePaymentHistoryItem = {
  id: string;
  courseId: string;
  amountCents: number;
  currency: string;
  status: CoursePaymentStatus;
  provider: string;
  completedAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
};

export type CoursePaymentHistoryResponse = {
  items: CoursePaymentHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export async function getMyCoursePaymentStatus(courseId: string) {
  const response = await httpClient.get<ApiResponse<CoursePaymentStatusResponse>>("/course-payments/me", {
    params: { courseId }
  });
  return response.data.data;
}

export async function listMyCoursePayments(page = 1, limit = 20) {
  const response = await httpClient.get<ApiResponse<CoursePaymentHistoryResponse>>("/course-payments/history", {
    params: { page, limit }
  });
  return response.data.data;
}

export async function createCoursePayment(courseId: string, idempotencyKey: string) {
  const response = await httpClient.post<ApiResponse<{ payment: CoursePaymentRecord }>>(
    "/course-payments",
    { courseId },
    {
      headers: {
        "Idempotency-Key": idempotencyKey
      }
    }
  );
  return response.data.data;
}
