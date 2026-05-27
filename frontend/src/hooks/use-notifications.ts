import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService, type UpdateNotificationPreferencesPayload } from "../services/notification.service";

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(),
    enabled,
    refetchInterval: 30000
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => notificationService.getPreferences(),
    enabled
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) => notificationService.updatePreferences(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
