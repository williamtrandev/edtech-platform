import { useQuery } from "@tanstack/react-query";
import { platformAnalyticsService } from "../services/platform-analytics.service";

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: () => platformAnalyticsService.getOverview()
  });
}
