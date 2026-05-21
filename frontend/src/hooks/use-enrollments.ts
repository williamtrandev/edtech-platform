import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enrollmentService } from "../services/enrollment.service";

export function useMyEnrollments(enabled = true) {
  return useQuery({
    queryKey: ["enrollments", "me"],
    queryFn: enrollmentService.getMyEnrollments,
    enabled
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollmentService.createEnrollment,
    onSuccess: async (_data, courseId) => {
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] });
    }
  });
}
