import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isLessonProgressQueued, writeLessonProgress } from "../lib/lesson-progress-write";
import { progressService, type CourseProgress, type LessonProgressItem } from "../services/progress.service";

export function useCourseProgress(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["progress", courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCourseLessonProgress(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["lesson-progress", courseId],
    queryFn: () => progressService.getMyLessonProgress(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

function patchLessonProgressItems(items: LessonProgressItem[], lessonId: string, patch: Partial<LessonProgressItem>) {
  const existing = items.find((item) => item.lessonId === lessonId);
  const timestamp = new Date().toISOString();
  const isCompleting = patch.isCompleted === true;

  if (existing) {
    return items.map((item) => {
      if (item.lessonId === lessonId) {
        return {
          ...item,
          ...patch,
          completedAt: patch.isCompleted ? timestamp : item.completedAt,
          updatedAt: timestamp
        };
      }

      if (isCompleting && item.lockedByLessonId === lessonId) {
        return {
          ...item,
          isUnlocked: true,
          lockedByLessonId: null,
          lockedByLessonTitle: null,
          updatedAt: timestamp
        };
      }

      return item;
    });
  }

  return [
    ...items,
    {
      lessonId,
      isCompleted: patch.isCompleted ?? false,
      watchPositionSeconds: patch.watchPositionSeconds ?? 0,
      completedAt: patch.isCompleted ? timestamp : null,
      updatedAt: timestamp,
      prerequisiteLessonId: null,
      isUnlocked: true,
      lockedByLessonId: null,
      lockedByLessonTitle: null
    }
  ];
}

function bumpCourseProgress(current: CourseProgress | undefined, wasAlreadyCompleted: boolean): CourseProgress | undefined {
  if (!current || wasAlreadyCompleted) {
    return current;
  }

  const nextCompleted = Math.min(current.totalLessons, current.completedLessons + 1);
  const lessonsPercent =
    current.totalLessons === 0 ? 100 : Math.min(100, Math.round((nextCompleted / current.totalLessons) * 100));
  const weights = current.breakdown.weights;
  const percentage = Math.round(
    (lessonsPercent * weights.lessons +
      current.breakdown.examsPercent * weights.exams +
      current.breakdown.assignmentsPercent * weights.assignments) /
      100
  );

  return {
    ...current,
    completedLessons: nextCompleted,
    percentage,
    breakdown: {
      ...current.breakdown,
      lessonsPercent
    }
  };
}

export function useCompleteLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => writeLessonProgress({ lessonId, isCompleted: true }),
    onMutate: async (lessonId) => {
      await queryClient.cancelQueries({ queryKey: ["lesson-progress", courseId] });
      await queryClient.cancelQueries({ queryKey: ["progress", courseId] });

      const previousLessonProgress = queryClient.getQueryData<{ courseId: string; items: LessonProgressItem[] }>([
        "lesson-progress",
        courseId
      ]);
      const previousCourseProgress = queryClient.getQueryData<CourseProgress>(["progress", courseId]);
      const wasAlreadyCompleted =
        previousLessonProgress?.items.some((item) => item.lessonId === lessonId && item.isCompleted) ?? false;

      queryClient.setQueryData<{ courseId: string; items: LessonProgressItem[] }>(["lesson-progress", courseId], (current) => {
        const items = patchLessonProgressItems(current?.items ?? [], lessonId, { isCompleted: true });
        return { courseId, items };
      });

      queryClient.setQueryData<CourseProgress>(["progress", courseId], (current) => bumpCourseProgress(current, wasAlreadyCompleted));

      return { previousLessonProgress, previousCourseProgress };
    },
    onError: (_error, _lessonId, context) => {
      if (context?.previousLessonProgress) {
        queryClient.setQueryData(["lesson-progress", courseId], context.previousLessonProgress);
      }
      if (context?.previousCourseProgress) {
        queryClient.setQueryData(["progress", courseId], context.previousCourseProgress);
      }
    },
    onSettled: async (data) => {
      if (isLessonProgressQueued(data)) {
        return;
      }

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["progress", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["lessons", courseId] }),
        queryClient.invalidateQueries({ queryKey: ["certificates", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["enrollments", "me"] })
      ]);
    }
  });
}

export function useSaveLessonWatchPosition(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, watchPositionSeconds }: { lessonId: string; watchPositionSeconds: number }) =>
      writeLessonProgress({ lessonId, watchPositionSeconds }),
    onMutate: async ({ lessonId, watchPositionSeconds }) => {
      await queryClient.cancelQueries({ queryKey: ["lesson-progress", courseId] });
      const previousLessonProgress = queryClient.getQueryData<{ courseId: string; items: LessonProgressItem[] }>([
        "lesson-progress",
        courseId
      ]);

      queryClient.setQueryData<{ courseId: string; items: LessonProgressItem[] }>(["lesson-progress", courseId], (current) => {
        const existing = current?.items.find((item) => item.lessonId === lessonId);
        return {
          courseId,
          items: patchLessonProgressItems(current?.items ?? [], lessonId, {
            watchPositionSeconds,
            isCompleted: existing?.isCompleted ?? false
          })
        };
      });

      return { previousLessonProgress };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLessonProgress) {
        queryClient.setQueryData(["lesson-progress", courseId], context.previousLessonProgress);
      }
    },
    onSettled: (data) => {
      if (isLessonProgressQueued(data)) {
        return;
      }
    }
  });
}
