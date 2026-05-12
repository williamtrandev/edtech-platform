import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { progressService } from "../../../services/progress.service";

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ["progress", courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId)
  });
}

export function useCompleteLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: progressService.completeLesson,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    }
  });
}
