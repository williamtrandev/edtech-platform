import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EXAM_ATTEMPT_EVENT_TYPE } from "../constants/business";
import { useExamIntegrityEvents } from "../hooks/use-exams";
import { useI18n, type I18nKey } from "../i18n";
import { cn } from "@/lib/utils";

type ExamIntegrityEventsPanelProps = {
  attemptId: string | null;
  enabled?: boolean;
  className?: string;
};

const EVENT_I18N_KEY: Record<string, I18nKey> = {
  [EXAM_ATTEMPT_EVENT_TYPE.tabHidden]: "courseDetail.examIntegrityTabHidden",
  [EXAM_ATTEMPT_EVENT_TYPE.tabVisible]: "courseDetail.examIntegrityTabVisible",
  [EXAM_ATTEMPT_EVENT_TYPE.windowBlur]: "courseDetail.examIntegrityWindowBlur",
  [EXAM_ATTEMPT_EVENT_TYPE.windowFocus]: "courseDetail.examIntegrityWindowFocus",
  [EXAM_ATTEMPT_EVENT_TYPE.reconnect]: "courseDetail.examIntegrityReconnect",
  [EXAM_ATTEMPT_EVENT_TYPE.timerExpired]: "courseDetail.examIntegrityTimerExpired",
  [EXAM_ATTEMPT_EVENT_TYPE.manualSubmit]: "courseDetail.examIntegrityManualSubmit"
};

const SUSPICIOUS_TYPES = new Set<string>([EXAM_ATTEMPT_EVENT_TYPE.tabHidden, EXAM_ATTEMPT_EVENT_TYPE.windowBlur]);

export function ExamIntegrityEventsPanel({ attemptId, enabled = true, className }: ExamIntegrityEventsPanelProps) {
  const { t } = useI18n();
  const integrityQuery = useExamIntegrityEvents(attemptId, enabled);

  if (!attemptId) {
    return null;
  }

  if (integrityQuery.isLoading) {
    return <p className={cn("text-xs text-muted-foreground", className)}>{t("courseDetail.examIntegrityLoading")}</p>;
  }

  if (integrityQuery.isError) {
    return <p className={cn("text-xs text-destructive", className)}>{t("courseDetail.examIntegrityLoadFailed")}</p>;
  }

  const events = integrityQuery.data?.events ?? [];
  const suspiciousCount = integrityQuery.data?.suspiciousEventCount ?? 0;

  return (
    <section className={cn("grid gap-3 rounded-lg bg-muted/20 p-3 ring-1 ring-foreground/10", className)} aria-label={t("courseDetail.examIntegrityTitle")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{t("courseDetail.examIntegrityTitle")}</h4>
        {suspiciousCount > 0 ? (
          <Badge variant="destructive" className="gap-1 rounded-md">
            <AlertTriangle className="size-3.5" aria-hidden />
            {t("courseDetail.examIntegritySuspiciousCount").replace("{count}", String(suspiciousCount))}
          </Badge>
        ) : (
          <Badge variant="secondary" className="rounded-md">
            {t("courseDetail.examIntegrityNoFlags")}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("courseDetail.examIntegrityDescription")}</p>
      {events.length ? (
        <ol className="max-h-48 space-y-2 overflow-auto pr-1">
          {events.map((event) => {
            const labelKey = EVENT_I18N_KEY[event.type];
            const suspicious = SUSPICIOUS_TYPES.has(event.type);
            return (
              <li
                key={event.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-md px-2 py-1.5 text-xs",
                  suspicious ? "bg-destructive/10 text-destructive" : "bg-background/80 text-foreground"
                )}
              >
                <span className="font-medium">{labelKey ? t(labelKey) : event.type}</span>
                <time className="shrink-0 tabular-nums text-muted-foreground" dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">{t("courseDetail.examIntegrityEmpty")}</p>
      )}
    </section>
  );
}
