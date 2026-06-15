import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addLearningPathCourse,
  createLearningPath,
  removeLearningPathCourse,
  updateLearningPath,
  type CreateLearningPathPayload,
  type UpdateLearningPathPayload
} from "../services/learning-path.service";

export function useCreateLearningPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLearningPathPayload) => createLearningPath(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
    }
  });
}

export function useUpdateLearningPath(pathId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLearningPathPayload) => updateLearningPath(pathId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      void queryClient.invalidateQueries({ queryKey: ["learning-paths", pathId] });
    }
  });
}

export function useAddLearningPathCourse(pathId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, sortOrder }: { courseId: string; sortOrder?: number }) =>
      addLearningPathCourse(pathId, courseId, sortOrder),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      void queryClient.invalidateQueries({ queryKey: ["learning-paths", pathId] });
    }
  });
}

export function useRemoveLearningPathCourse(pathId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => removeLearningPathCourse(pathId, courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      void queryClient.invalidateQueries({ queryKey: ["learning-paths", pathId] });
    }
  });
}
