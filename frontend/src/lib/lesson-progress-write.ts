import axios from "axios";
import { isApiError } from "./api-error";
import {
  coalescePendingLessonProgressEvents,
  enqueueLessonProgressEvent,
  getPendingLessonProgressEvents,
  removePendingLessonProgressEvents,
  type PendingLessonProgressEvent
} from "./progress-offline-queue";
import { progressService } from "../services/progress.service";

export type LessonProgressWriteInput = {
  lessonId: string;
  isCompleted?: boolean;
  watchPositionSeconds?: number;
};

export type LessonProgressWriteResult = {
  queued: boolean;
};

export function isLessonProgressQueued(result: LessonProgressWriteResult | undefined): result is { queued: true } {
  return Boolean(result?.queued);
}

function isNetworkFailure(error: unknown) {
  if (isApiError(error) && error.code === "NETWORK_ERROR") {
    return true;
  }

  return axios.isAxiosError(error) && !error.response;
}

export async function writeLessonProgress(input: LessonProgressWriteInput): Promise<LessonProgressWriteResult> {
  if (!navigator.onLine) {
    enqueueLessonProgressEvent(input);
    return { queued: true };
  }

  try {
    if (input.isCompleted === true) {
      await progressService.completeLesson(input.lessonId);
      if (input.watchPositionSeconds !== undefined) {
        await progressService.saveWatchPosition(input.lessonId, input.watchPositionSeconds);
      }
      return { queued: false };
    }

    if (input.watchPositionSeconds !== undefined) {
      await progressService.saveWatchPosition(input.lessonId, input.watchPositionSeconds);
      return { queued: false };
    }

    throw new Error("Invalid lesson progress payload");
  } catch (error) {
    if (isNetworkFailure(error)) {
      enqueueLessonProgressEvent(input);
      return { queued: true };
    }

    throw error;
  }
}

export async function flushPendingLessonProgress(): Promise<{ synced: number; remaining: number }> {
  const pending = getPendingLessonProgressEvents();
  if (!pending.length || !navigator.onLine) {
    return { synced: 0, remaining: pending.length };
  }

  const coalesced = coalescePendingLessonProgressEvents(pending);
  const batches: PendingLessonProgressEvent[][] = [];

  for (let index = 0; index < coalesced.length; index += 50) {
    batches.push(coalesced.slice(index, index + 50));
  }

  let synced = 0;

  for (const batch of batches) {
    const result = await progressService.syncLessonProgress(batch);
    synced += result.synced;

    const appliedIds = batch
      .filter((event) => !result.failures.some((failure) => failure.lessonId === event.lessonId))
      .map((event) => event.clientEventId);

    removePendingLessonProgressEvents(appliedIds);
  }

  return { synced, remaining: getPendingLessonProgressEvents().length };
}
