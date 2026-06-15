import { useQuery } from "@tanstack/react-query";
import { liveSessionService } from "../services/live-session.service";
import type { LiveSessionStatus } from "../constants/business";

export function useMyLiveSessions(status: LiveSessionStatus | "ALL" = "ALL", enabled = true) {
  return useQuery({
    queryKey: ["live-sessions", "me", status],
    queryFn: () => liveSessionService.listMyLiveSessions({ status, limit: 20 }),
    enabled
  });
}

export function useCourseLiveSessions(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "live-sessions"],
    queryFn: () => liveSessionService.listCourseLiveSessions(courseId),
    enabled: Boolean(courseId) && enabled
  });
}
