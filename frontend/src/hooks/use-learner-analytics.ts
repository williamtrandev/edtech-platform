import { useQuery } from "@tanstack/react-query";
import { learnerAnalyticsService } from "../services/learner-analytics.service";

export function useLearnerAnalytics() {
  return useQuery({
    queryKey: ["learner-analytics", "me"],
    queryFn: () => learnerAnalyticsService.getMyAnalytics()
  });
}
