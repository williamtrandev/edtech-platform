export type LessonPrerequisiteNode = {
  id: string;
  title: string;
  prerequisiteLessonId: string | null;
};

export type LessonUnlockState = {
  isUnlocked: boolean;
  prerequisiteLessonId: string | null;
  lockedByLessonId: string | null;
  lockedByLessonTitle: string | null;
};

export function buildLessonUnlockMap(
  lessons: LessonPrerequisiteNode[],
  completedLessonIds: ReadonlySet<string>
): Map<string, LessonUnlockState> {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const unlockByLessonId = new Map<string, LessonUnlockState>();

  for (const lesson of lessons) {
    const prerequisiteLessonId = lesson.prerequisiteLessonId;

    if (!prerequisiteLessonId) {
      unlockByLessonId.set(lesson.id, {
        isUnlocked: true,
        prerequisiteLessonId: null,
        lockedByLessonId: null,
        lockedByLessonTitle: null
      });
      continue;
    }

    const prerequisite = lessonById.get(prerequisiteLessonId);
    const isPrerequisiteComplete = completedLessonIds.has(prerequisiteLessonId);

    unlockByLessonId.set(lesson.id, {
      isUnlocked: isPrerequisiteComplete,
      prerequisiteLessonId,
      lockedByLessonId: isPrerequisiteComplete ? null : prerequisiteLessonId,
      lockedByLessonTitle: isPrerequisiteComplete ? null : (prerequisite?.title ?? null)
    });
  }

  return unlockByLessonId;
}

export function assertNoPrerequisiteCycle(
  lessonId: string,
  prerequisiteLessonId: string,
  lessons: LessonPrerequisiteNode[]
): void {
  if (lessonId === prerequisiteLessonId) {
    throw new Error("LESSON_PREREQUISITE_SELF");
  }

  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const visited = new Set<string>();
  let current: string | null = prerequisiteLessonId;

  while (current) {
    if (current === lessonId) {
      throw new Error("LESSON_PREREQUISITE_CYCLE");
    }

    if (visited.has(current)) {
      break;
    }

    visited.add(current);
    current = lessonById.get(current)?.prerequisiteLessonId ?? null;
  }
}

export function getLessonUnlockState(
  lessonId: string,
  lessons: LessonPrerequisiteNode[],
  completedLessonIds: ReadonlySet<string>
): LessonUnlockState | undefined {
  return buildLessonUnlockMap(lessons, completedLessonIds).get(lessonId);
}
