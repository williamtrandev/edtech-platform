import { useEffect, useRef } from "react";
import { EXAM_ATTEMPT_EVENT_TYPE } from "../constants/business";
import { examService, type ExamIntegrityEventInput } from "../services/exam.service";

type UseExamIntegrityMonitorOptions = {
  attemptId: string | null;
  enabled: boolean;
};

function createClientEventId(type: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${type}:${crypto.randomUUID()}`;
  }
  return `${type}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useExamIntegrityMonitor({ attemptId, enabled }: UseExamIntegrityMonitorOptions) {
  const queueRef = useRef<ExamIntegrityEventInput[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const reconnectSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!attemptId || !enabled) {
      return;
    }

    const enqueue = (type: ExamIntegrityEventInput["type"], metadata?: Record<string, unknown>) => {
      queueRef.current.push({
        type,
        clientEventId: createClientEventId(type),
        metadata
      });
    };

    const flush = () => {
      if (!attemptId || queueRef.current.length === 0) {
        return;
      }

      const batch = queueRef.current.splice(0, queueRef.current.length);
      void examService.recordExamIntegrityEvents(attemptId, batch).catch(() => {
        queueRef.current.unshift(...batch);
      });
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(flush, 2000);
    };

    if (reconnectSentRef.current !== attemptId) {
      reconnectSentRef.current = attemptId;
      enqueue(EXAM_ATTEMPT_EVENT_TYPE.reconnect);
      scheduleFlush();
    }

    const onVisibilityChange = () => {
      enqueue(document.hidden ? EXAM_ATTEMPT_EVENT_TYPE.tabHidden : EXAM_ATTEMPT_EVENT_TYPE.tabVisible);
      scheduleFlush();
    };

    const onBlur = () => {
      enqueue(EXAM_ATTEMPT_EVENT_TYPE.windowBlur);
      scheduleFlush();
    };

    const onFocus = () => {
      enqueue(EXAM_ATTEMPT_EVENT_TYPE.windowFocus);
      scheduleFlush();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      flush();
    };
  }, [attemptId, enabled]);
}
