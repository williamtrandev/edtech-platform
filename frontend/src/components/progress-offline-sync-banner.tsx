import { CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n";

type ProgressOfflineSyncBannerProps = {
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
};

export function ProgressOfflineSyncBanner({ pendingCount, isSyncing, onSyncNow }: ProgressOfflineSyncBannerProps) {
  const { t } = useI18n();

  if (pendingCount <= 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-2">
        <CloudOff className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t("courseLearn.offlineProgressPendingTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("courseLearn.offlineProgressPendingDescription").replace("{{count}}", String(pendingCount))}
          </p>
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-md" disabled={isSyncing || !navigator.onLine} onClick={onSyncNow}>
        {isSyncing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {isSyncing ? t("courseLearn.offlineProgressSyncing") : t("courseLearn.offlineProgressSyncNow")}
      </Button>
    </div>
  );
}
