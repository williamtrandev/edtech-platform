import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/use-notifications";
import { useI18n } from "../i18n";
import type { Notification } from "../services/notification.service";

type NotificationCenterProps = {
  enabled: boolean;
  align?: "left" | "right";
  buttonClassName?: string;
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffHours / 24)}d`;
}

export function NotificationCenter({ enabled, align = "right", buttonClassName }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const notificationsQuery = useNotifications(enabled);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const { t } = useI18n();

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadTotal = notificationsQuery.data?.unreadTotal ?? 0;

  const onOpenNotification = (notification: Notification) => {
    if (!notification.readAt) {
      void markReadMutation.mutateAsync(notification.id);
    }
    setOpen(false);
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("relative size-9 rounded-full p-0", buttonClassName)}
        aria-label={t("notifications.title")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-4" aria-hidden />
        {unreadTotal ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border/70 bg-popover p-2 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-2 pb-2">
            <div>
              <p className="text-sm font-semibold">{t("notifications.title")}</p>
              <p className="text-xs text-muted-foreground">
                {unreadTotal ? t("notifications.unreadCount").replace("{count}", String(unreadTotal)) : t("notifications.noneUnread")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2 text-xs"
              disabled={!unreadTotal || markAllReadMutation.isPending}
              onClick={() => void markAllReadMutation.mutateAsync()}
            >
              <CheckCheck className="mr-1 size-3.5" aria-hidden />
              {t("notifications.markAllRead")}
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {notificationsQuery.isLoading ? (
              <div className="grid gap-2 px-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : notifications.length ? (
              <div className="grid gap-1">
                {notifications.map((notification) => {
                  const content = (
                    <div className="flex gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60">
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", notification.readAt ? "bg-muted-foreground/30" : "bg-primary")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-medium">{notification.title}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span>
                        </div>
                        {notification.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.body}</p> : null}
                      </div>
                    </div>
                  );

                  return notification.linkUrl ? (
                    <Link key={notification.id} to={notification.linkUrl} onClick={() => onOpenNotification(notification)}>
                      {content}
                    </Link>
                  ) : (
                    <button key={notification.id} type="button" className="w-full" onClick={() => onOpenNotification(notification)}>
                      {content}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">{t("notifications.empty")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("notifications.emptyDescription")}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
