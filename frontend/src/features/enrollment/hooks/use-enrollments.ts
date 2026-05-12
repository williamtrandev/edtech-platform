import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enrollmentService } from "../../../services/enrollment.service";

export function useMyEnrollments() {
  return useQuery({
    queryKey: ["enrollments", "me"],
    queryFn: enrollmentService.getMyEnrollments
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollmentService.createEnrollment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });
}
