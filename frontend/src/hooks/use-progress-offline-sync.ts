import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { flushPendingLessonProgress } from "../lib/lesson-progress-write";
import { getPendingLessonProgressCount } from "../lib/progress-offline-queue";

type UseProgressOfflineSyncOptions = {
  courseId: string;
  enabled?: boolean;
};

export function useProgressOfflineSync({ courseId, enabled = true }: UseProgressOfflineSyncOptions) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(() => getPendingLessonProgressCount());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingLessonProgressCount());
  }, []);

  const flush = useCallback(async () => {
    if (!enabled || !navigator.onLine || getPendingLessonProgressCount() === 0) {
      refreshPendingCount();
      return { synced: 0, remaining: getPendingLessonProgressCount() };
    }

    setIsSyncing(true);
    try {
      const result = await flushPendingLessonProgress();
      if (result.synced > 0) {
        await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
        await queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] });
        await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
        await queryClient.invalidateQueries({ queryKey: ["certificates", "me"] });
        await queryClient.invalidateQueries({ queryKey: ["enrollments", "me"] });
      }

      refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [courseId, enabled, queryClient, refreshPendingCount]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onOnline = () => {
      void flush();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled, flush]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    refreshPendingCount();
    void flush();
  }, [enabled, flush, refreshPendingCount]);

  return {
    pendingCount,
    isSyncing,
    flush
  };
}
