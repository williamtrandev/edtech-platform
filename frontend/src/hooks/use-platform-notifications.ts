import { useQuery } from "@tanstack/react-query";
import {
  notificationService,
  type PlatformNotificationListParams
} from "../services/notification.service";

export function usePlatformNotifications(params: PlatformNotificationListParams = {}) {
  return useQuery({
    queryKey: ["platform-notifications", params],
    queryFn: () => notificationService.getPlatformNotifications(params)
  });
}

export function usePlatformNotificationSummary() {
  return useQuery({
    queryKey: ["platform-notifications", "summary"],
    queryFn: () => notificationService.getPlatformSummary()
  });
}
