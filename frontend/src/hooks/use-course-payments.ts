import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCoursePayment, getMyCoursePaymentStatus } from "../services/course-payment.service";

export function useCoursePaymentStatus(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["course-payments", "me", courseId],
    queryFn: () => getMyCoursePaymentStatus(courseId!),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateCoursePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, idempotencyKey }: { courseId: string; idempotencyKey: string }) =>
      createCoursePayment(courseId, idempotencyKey),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["course-payments", "me", variables.courseId] });
    }
  });
}
