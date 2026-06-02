const STORAGE_KEY = "edtech.progress-offline-queue";

export type PendingLessonProgressEvent = {
  clientEventId: string;
  lessonId: string;
  isCompleted?: boolean;
  watchPositionSeconds?: number;
  recordedAt: string;
};

type QueueSnapshot = {
  events: PendingLessonProgressEvent[];
};

function readQueue(): QueueSnapshot {
  if (typeof window === "undefined") {
    return { events: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { events: [] };
    }

    const parsed = JSON.parse(raw) as QueueSnapshot;
    if (!Array.isArray(parsed.events)) {
      return { events: [] };
    }

    return { events: parsed.events };
  } catch {
    return { events: [] };
  }
}

function writeQueue(snapshot: QueueSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  if (snapshot.events.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function createClientEventId(lessonId: string, suffix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${lessonId}:${suffix}:${crypto.randomUUID()}`;
  }

  return `${lessonId}:${suffix}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeEvent(existing: PendingLessonProgressEvent, incoming: PendingLessonProgressEvent): PendingLessonProgressEvent {
  return {
    ...existing,
    isCompleted: existing.isCompleted === true || incoming.isCompleted === true ? true : undefined,
    watchPositionSeconds:
      incoming.watchPositionSeconds !== undefined
        ? Math.max(existing.watchPositionSeconds ?? 0, incoming.watchPositionSeconds)
        : existing.watchPositionSeconds,
    recordedAt: incoming.recordedAt
  };
}

export function getPendingLessonProgressCount() {
  return readQueue().events.length;
}

export function getPendingLessonProgressEvents() {
  return readQueue().events;
}

export function enqueueLessonProgressEvent(input: {
  lessonId: string;
  isCompleted?: boolean;
  watchPositionSeconds?: number;
}) {
  const queue = readQueue();
  const recordedAt = new Date().toISOString();
  const suffix = input.isCompleted ? "complete" : "watch";
  const existingIndex = queue.events.findIndex((event) => event.lessonId === input.lessonId);

  if (existingIndex >= 0) {
    queue.events[existingIndex] = mergeEvent(queue.events[existingIndex], {
      clientEventId: queue.events[existingIndex].clientEventId,
      lessonId: input.lessonId,
      isCompleted: input.isCompleted,
      watchPositionSeconds: input.watchPositionSeconds,
      recordedAt
    });
    writeQueue(queue);
    return queue.events[existingIndex];
  }

  const nextEvent: PendingLessonProgressEvent = {
    clientEventId: createClientEventId(input.lessonId, suffix),
    lessonId: input.lessonId,
    isCompleted: input.isCompleted === true ? true : undefined,
    watchPositionSeconds: input.watchPositionSeconds,
    recordedAt
  };

  queue.events.push(nextEvent);
  writeQueue(queue);
  return nextEvent;
}

export function removePendingLessonProgressEvents(clientEventIds: string[]) {
  if (!clientEventIds.length) {
    return;
  }

  const idSet = new Set(clientEventIds);
  const queue = readQueue();
  queue.events = queue.events.filter((event) => !idSet.has(event.clientEventId));
  writeQueue(queue);
}

export function clearPendingLessonProgressQueue() {
  writeQueue({ events: [] });
}

export function coalescePendingLessonProgressEvents(events: PendingLessonProgressEvent[]) {
  const byLesson = new Map<string, PendingLessonProgressEvent>();

  for (const event of events) {
    const existing = byLesson.get(event.lessonId);
    if (!existing) {
      byLesson.set(event.lessonId, { ...event });
      continue;
    }

    byLesson.set(event.lessonId, mergeEvent(existing, event));
  }

  return Array.from(byLesson.values());
}
