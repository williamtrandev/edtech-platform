import type { LessonProgressItem } from "../services/progress.service";

export type LessonUnlockMeta = {
  isUnlocked: boolean;
  lockedByLessonId: string | null;
  lockedByLessonTitle: string | null;
};

export function buildLessonUnlockById(items: LessonProgressItem[]): Map<string, LessonUnlockMeta> {
  const map = new Map<string, LessonUnlockMeta>();

  for (const item of items) {
    map.set(item.lessonId, {
      isUnlocked: item.isUnlocked,
      lockedByLessonId: item.lockedByLessonId,
      lockedByLessonTitle: item.lockedByLessonTitle
    });
  }

  return map;
}

export function buildFreshLearnerUnlockById(
  lessons: Array<{ id: string; title: string; prerequisiteLessonId: string | null }>
): Map<string, LessonUnlockMeta> {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const unlockByLessonId = new Map<string, LessonUnlockMeta>();

  for (const lesson of lessons) {
    const prerequisiteLessonId = lesson.prerequisiteLessonId;

    if (!prerequisiteLessonId) {
      unlockByLessonId.set(lesson.id, {
        isUnlocked: true,
        lockedByLessonId: null,
        lockedByLessonTitle: null
      });
      continue;
    }

    const prerequisite = lessonById.get(prerequisiteLessonId);
    unlockByLessonId.set(lesson.id, {
      isUnlocked: false,
      lockedByLessonId: prerequisiteLessonId,
      lockedByLessonTitle: prerequisite?.title ?? null
    });
  }

  return unlockByLessonId;
}

export function findFirstUnlockedIncompleteLessonId(
  lessonIdsInOrder: string[],
  progressByLessonId: Map<string, { isCompleted: boolean }>,
  unlockByLessonId: Map<string, LessonUnlockMeta>
): string | undefined {
  return lessonIdsInOrder.find((lessonId) => {
    const unlock = unlockByLessonId.get(lessonId);
    if (unlock && !unlock.isUnlocked) {
      return false;
    }

    return !progressByLessonId.get(lessonId)?.isCompleted;
  });
}
