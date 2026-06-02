import { useQuery } from "@tanstack/react-query";
import { platformAnalyticsService } from "../services/platform-analytics.service";

export function usePlatformAnalytics(refreshToken = 0) {
  return useQuery({
    queryKey: ["analytics", "platform", refreshToken],
    queryFn: () => platformAnalyticsService.getOverview(refreshToken > 0)
  });
}
