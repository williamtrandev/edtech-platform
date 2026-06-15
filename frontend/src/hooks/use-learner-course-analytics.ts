import { useQuery } from "@tanstack/react-query";
import { learnerAnalyticsService } from "../services/learner-analytics.service";

export function useLearnerCourseAnalytics(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["learner-analytics", "course", courseId],
    queryFn: () => learnerAnalyticsService.getMyCourseAnalytics(courseId),
    enabled: Boolean(courseId) && enabled
  });
}
