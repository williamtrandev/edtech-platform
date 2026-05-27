import { Activity, AlertTriangle, CheckCircle2, Clock3, DatabaseZap, Loader2, RefreshCw, TimerReset } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton, Skeleton } from "../components/skeleton";
import { useJobQueues } from "../hooks/use-jobs";
import { useI18n } from "../i18n";
import type { JobQueueJob, JobQueueSummary } from "../services/job.service";

function countTotal(queues: JobQueueSummary[], key: keyof JobQueueSummary["counts"]) {
  return queues.reduce((total, queue) => total + queue.counts[key], 0);
}

type QueueHealth = {
  labelKey: "jobs.attention" | "jobs.running" | "jobs.healthy";
  variant: "destructive" | "secondary" | "outline";
  icon: typeof AlertTriangle;
};

const QUEUE_LABEL_KEYS: Record<string, "jobs.queue.examGrading" | "jobs.queue.analyticsProcessing"> = {
  "exam-grading": "jobs.queue.examGrading",
  "analytics-processing": "jobs.queue.analyticsProcessing"
};

function getQueueLabel(queue: JobQueueSummary, t: ReturnType<typeof useI18n>["t"]) {
  const labelKey = QUEUE_LABEL_KEYS[queue.name];
  return labelKey ? t(labelKey) : queue.label;
}

function getHealth(queue: JobQueueSummary): QueueHealth {
  if (queue.counts.failed > 0) {
    return { labelKey: "jobs.attention", variant: "destructive" as const, icon: AlertTriangle };
  }
  if (queue.counts.active > 0 || queue.counts.waiting > 0 || queue.counts.delayed > 0) {
    return { labelKey: "jobs.running", variant: "secondary" as const, icon: Loader2 };
  }
  return { labelKey: "jobs.healthy", variant: "outline" as const, icon: CheckCircle2 };
}

function JobList({ jobs, emptyLabel, showReason }: { jobs: JobQueueJob[]; emptyLabel: string; showReason?: boolean }) {
  const { t } = useI18n();
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    []
  );

  if (!jobs.length) {
    return <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={`${job.name}-${job.id}`} className="rounded-lg border border-border/70 bg-background px-3 py-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">{job.name}</p>
            <Badge variant="outline" className="rounded-md font-mono">
              #{job.id || "-"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t("jobs.attempts")}: <span className="tabular-nums text-foreground">{job.attemptsMade}</span>
            </span>
            {job.timestamp ? <span>{formatter.format(new Date(job.timestamp))}</span> : null}
          </div>
          {showReason && job.failedReason ? (
            <p className="mt-2 line-clamp-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{job.failedReason}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function QueueCard({ queue }: { queue: JobQueueSummary }) {
  const { t } = useI18n();
  const health = getHealth(queue);
  const HealthIcon = health.icon;

  const counts = [
    ["jobs.waiting", queue.counts.waiting],
    ["jobs.active", queue.counts.active],
    ["jobs.failed", queue.counts.failed],
    ["jobs.completed", queue.counts.completed],
    ["jobs.delayed", queue.counts.delayed],
    ["jobs.paused", queue.counts.paused]
  ] as const;

  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{getQueueLabel(queue, t)}</CardTitle>
          <CardDescription className="mt-1 font-mono text-xs">{queue.name}</CardDescription>
        </div>
        <Badge variant={health.variant} className="h-7 rounded-md px-2.5">
          <HealthIcon className="size-3.5" aria-hidden />
          {t(health.labelKey)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {counts.map(([labelKey, value]) => (
            <div key={labelKey} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{t(labelKey)}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t("jobs.failedJobs")}</h2>
            <JobList jobs={queue.failedJobs} emptyLabel={t("jobs.noFailedJobs")} showReason />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t("jobs.waitingJobs")}</h2>
            <JobList jobs={queue.waitingJobs} emptyLabel={t("jobs.noWaitingJobs")} />
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueSkeleton() {
  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="border-b border-border/70 pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function JobsPage() {
  const { t, formatError } = useI18n();
  const { data, isLoading, isError, error, isFetching, refetch } = useJobQueues();
  const queues = data?.items ?? [];

  return (
    <AppShell
      title={t("jobs.title")}
      subtitle={t("jobs.subtitle")}
      actions={
        <Button type="button" variant="outline" size="lg" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} aria-hidden />
          {isFetching ? t("jobs.refreshing") : t("jobs.refresh")}
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("jobs.summary")}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <MetricCardSkeleton key={index} />)
          ) : (
            <>
              <MetricCard icon={Clock3} label={t("jobs.totalWaiting")} value={countTotal(queues, "waiting")} hint={t("jobs.totalWaitingHint")} />
              <MetricCard icon={Activity} label={t("jobs.totalActive")} value={countTotal(queues, "active")} hint={t("jobs.totalActiveHint")} />
              <MetricCard icon={AlertTriangle} label={t("jobs.totalFailed")} value={countTotal(queues, "failed")} hint={t("jobs.totalFailedHint")} />
              <MetricCard icon={TimerReset} label={t("jobs.totalDelayed")} value={countTotal(queues, "delayed")} hint={t("jobs.totalDelayedHint")} />
            </>
          )}
        </section>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formatError(error, "jobs.loadFailed")}
          </div>
        ) : null}

        <section className="space-y-3" aria-label={t("jobs.queues")}>
          {isLoading ? (
            <>
              <QueueSkeleton />
              <QueueSkeleton />
            </>
          ) : null}
          {!isLoading && !isError && queues.length === 0 ? (
            <EmptyState icon={DatabaseZap} title={t("jobs.noQueues")} description={t("jobs.noQueuesDescription")} />
          ) : null}
          {!isLoading && !isError ? queues.map((queue) => <QueueCard key={queue.name} queue={queue} />) : null}
        </section>
      </div>
    </AppShell>
  );
}
