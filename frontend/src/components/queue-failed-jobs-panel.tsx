import { Archive, ChevronLeft, ChevronRight, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useDiscardFailedJob,
  useFailedJobs,
  useMoveFailedJobToDeadLetter,
  useRetryAllFailedJobs,
  useRetryFailedJob
} from "../hooks/use-jobs";
import { useI18n } from "../i18n";
import type { JobQueueJob } from "../services/job.service";

function FailedJobRow({
  job,
  queueName,
  retryingJobId,
  onRetry,
  onDiscard,
  onMoveToDlq
}: {
  job: JobQueueJob;
  queueName: string;
  retryingJobId?: string;
  onRetry: (jobId: string) => void;
  onDiscard: (jobId: string) => void;
  onMoveToDlq: (jobId: string) => void;
}) {
  const { t } = useI18n();
  const isBusy = retryingJobId === job.id;

  return (
    <li className="rounded-lg border border-border/70 bg-background px-3 py-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{job.name}</p>
        <BadgeMono id={job.id} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={!job.id || isBusy} onClick={() => onRetry(job.id)}>
          {isBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />}
          {isBusy ? t("jobs.retrying") : t("jobs.retry")}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={!job.id || isBusy} onClick={() => onMoveToDlq(job.id)}>
          <Archive className="size-3.5" aria-hidden />
          {t("jobs.moveToDlq")}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-destructive" disabled={!job.id || isBusy} onClick={() => onDiscard(job.id)}>
          <Trash2 className="size-3.5" aria-hidden />
          {t("jobs.discard")}
        </Button>
      </div>
      {job.failedReason ? (
        <p className="mt-2 line-clamp-3 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{job.failedReason}</p>
      ) : null}
    </li>
  );
}

function BadgeMono({ id }: { id: string }) {
  return (
    <span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      #{id || "-"}
    </span>
  );
}

type QueueFailedJobsPanelProps = {
  queueName: string;
  failedCount: number;
};

export function QueueFailedJobsPanel({ queueName, failedCount }: QueueFailedJobsPanelProps) {
  const { t, formatError } = useI18n();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const failedJobsQuery = useFailedJobs(queueName, page, open && failedCount > 0);
  const retryMutation = useRetryFailedJob();
  const retryAllMutation = useRetryAllFailedJobs();
  const discardMutation = useDiscardFailedJob();
  const dlqMutation = useMoveFailedJobToDeadLetter();

  const retryingJobId = retryMutation.isPending ? retryMutation.variables?.jobId : undefined;
  const jobs = failedJobsQuery.data?.items ?? [];
  const pagination = failedJobsQuery.data?.pagination;

  const invalidate = () => {
    void failedJobsQuery.refetch();
  };

  if (failedCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("jobs.failedInbox")}</h3>
          <p className="text-xs text-muted-foreground">{t("jobs.failedInboxDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setOpen((value) => !value)}>
            {open ? t("jobs.hideInbox") : t("jobs.openInbox")}
          </Button>
          {open ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={retryAllMutation.isPending}
              onClick={() => {
                retryAllMutation.mutate(
                  { queueName },
                  {
                    onSuccess: (result) => {
                      toast.success(t("jobs.retryAllQueued").replace("{count}", String(result.retriedCount)));
                      invalidate();
                    },
                    onError: (error) => toast.error(formatError(error, "jobs.retryAllFailed"))
                  }
                );
              }}
            >
              {retryAllMutation.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {t("jobs.retryAll")}
            </Button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          {failedJobsQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("common.loading")}
            </p>
          ) : null}
          {failedJobsQuery.isError ? (
            <p className="text-sm text-destructive">{t("jobs.failedInboxLoadFailed")}</p>
          ) : null}
          {!failedJobsQuery.isLoading && !failedJobsQuery.isError ? (
            jobs.length ? (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <FailedJobRow
                    key={`${job.name}-${job.id}`}
                    job={job}
                    queueName={queueName}
                    retryingJobId={retryingJobId}
                    onRetry={(jobId) => {
                      retryMutation.mutate(
                        { queueName, jobId },
                        {
                          onSuccess: () => {
                            toast.success(t("jobs.retryQueued"));
                            invalidate();
                          },
                          onError: (error) => toast.error(formatError(error, "jobs.retryFailed"))
                        }
                      );
                    }}
                    onDiscard={(jobId) => {
                      discardMutation.mutate(
                        { queueName, jobId },
                        {
                          onSuccess: () => {
                            toast.success(t("jobs.discardSuccess"));
                            invalidate();
                          },
                          onError: (error) => toast.error(formatError(error, "jobs.discardFailed"))
                        }
                      );
                    }}
                    onMoveToDlq={(jobId) => {
                      dlqMutation.mutate(
                        { queueName, jobId },
                        {
                          onSuccess: () => {
                            toast.success(t("jobs.dlqSuccess"));
                            invalidate();
                          },
                          onError: (error) => toast.error(formatError(error, "jobs.dlqFailed"))
                        }
                      );
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("jobs.noFailedJobs")}</p>
            )
          ) : null}
          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t("jobs.pageStatus")
                  .replace("{page}", String(pagination.page))
                  .replace("{totalPages}", String(pagination.totalPages))}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  aria-label={t("jobs.previousPage")}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  aria-label={t("jobs.nextPage")}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
