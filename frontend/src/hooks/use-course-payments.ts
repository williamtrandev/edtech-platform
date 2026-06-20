import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCoursePayment,
  getMyCoursePaymentStatus,
  listCoursePaymentProviders,
  listMyCoursePayments,
  type CoursePaymentProvider
} from "../services/course-payment.service";

export function useCoursePaymentStatus(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["course-payments", "me", courseId],
    queryFn: () => getMyCoursePaymentStatus(courseId!),
    enabled: Boolean(courseId) && enabled
  });
}

export function useMyCoursePayments(page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["course-payments", "history", page, limit],
    queryFn: () => listMyCoursePayments(page, limit),
    enabled
  });
}

export function useCoursePaymentProviders(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["course-payments", "providers", courseId],
    queryFn: () => listCoursePaymentProviders(courseId!),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateCoursePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      provider,
      idempotencyKey
    }: {
      courseId: string;
      provider: CoursePaymentProvider;
      idempotencyKey: string;
    }) => createCoursePayment(courseId, provider, idempotencyKey),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["course-payments", "me", variables.courseId] });
      void queryClient.invalidateQueries({ queryKey: ["course-payments", "history"] });
    }
  });
}
