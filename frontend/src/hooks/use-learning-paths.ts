import { useQuery } from "@tanstack/react-query";
import { getLearningPath, listLearningPaths } from "../services/learning-path.service";

export function useLearningPaths(page = 1, limit = 20, enabled = true, status?: string) {
  return useQuery({
    queryKey: ["learning-paths", page, limit, status],
    queryFn: () => listLearningPaths(page, limit, status),
    enabled
  });
}

export function useLearningPath(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["learning-paths", id],
    queryFn: () => getLearningPath(id!),
    enabled: Boolean(id) && enabled
  });
}
