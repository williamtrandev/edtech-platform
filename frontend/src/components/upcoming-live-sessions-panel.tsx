import { CalendarDays, ExternalLink, Radio, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIVE_SESSION_STATUS } from "../constants/business";
import { useMyLiveSessions } from "../hooks/use-live-sessions";
import { useI18n, type I18nKey } from "../i18n";
import type { LiveSessionItem } from "../services/live-session.service";

function formatSchedule(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function statusLabel(status: LiveSessionItem["status"], t: (key: I18nKey) => string) {
  switch (status) {
    case LIVE_SESSION_STATUS.live:
      return t("liveSessions.statusLive");
    case LIVE_SESSION_STATUS.upcoming:
      return t("liveSessions.statusUpcoming");
    case LIVE_SESSION_STATUS.ended:
      return t("liveSessions.statusEnded");
    default:
      return t("liveSessions.statusUnscheduled");
  }
}

function statusVariant(status: LiveSessionItem["status"]) {
  if (status === LIVE_SESSION_STATUS.live) {
    return "default" as const;
  }
  if (status === LIVE_SESSION_STATUS.upcoming) {
    return "secondary" as const;
  }
  return "outline" as const;
}

type UpcomingLiveSessionsPanelProps = {
  enabled?: boolean;
};

export function UpcomingLiveSessionsPanel({ enabled = true }: UpcomingLiveSessionsPanelProps) {
  const { t, formatError } = useI18n();
  const sessionsQuery = useMyLiveSessions("ALL", enabled);
  const items = (sessionsQuery.data?.items ?? []).filter(
    (item) => item.status === LIVE_SESSION_STATUS.live || item.status === LIVE_SESSION_STATUS.upcoming
  );

  if (sessionsQuery.isLoading) {
    return (
      <section className="space-y-3" aria-labelledby="live-sessions-heading">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted/50" aria-hidden />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/40" aria-hidden />
          ))}
        </div>
      </section>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3" aria-live="polite">
        <p className="text-sm text-destructive">{formatError(sessionsQuery.error, "errors.unexpected")}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby="live-sessions-heading">
      <div className="flex items-center gap-2">
        <Radio className="size-4 text-primary" aria-hidden />
        <h2 id="live-sessions-heading" className="text-base font-semibold text-foreground">
          {t("liveSessions.title")}
        </h2>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.lessonId} className="rounded-xl border border-border/70 bg-muted/10 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.courseTitle}</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{item.lessonTitle}</h3>
                {item.startsAt ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                    {formatSchedule(item.startsAt)}
                  </p>
                ) : null}
              </div>
              <Badge variant={statusVariant(item.status)} className="h-6 rounded-md px-2 text-[11px] font-medium">
                {statusLabel(item.status, t)}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="h-9 rounded-lg">
                <Link to={item.learnPath}>{t("liveSessions.openLesson")}</Link>
              </Button>
              {item.meetingUrl ? (
                <Button asChild size="sm" className="h-9 rounded-lg shadow-none">
                  <a href={item.meetingUrl} rel="noreferrer" target="_blank">
                    <Video className="mr-1.5 size-4" aria-hidden />
                    {t("liveSessions.join")}
                    <ExternalLink className="ml-1.5 size-3.5 opacity-70" aria-hidden />
                  </a>
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
