import { useEffect, useRef } from "react";
import { CheckCircle2, ClipboardCheck, ClipboardList, Lock, Terminal } from "lucide-react";
import { LESSON_CONTENT_TYPE } from "../constants/business";
import { cn } from "@/lib/utils";
import type { LessonUnlockMeta } from "../lib/lesson-unlock";
import type { Lesson } from "../services/course.service";

type CourseLearnCurriculumProps = {
  lessons: Lesson[];
  selectedLessonId?: string;
  lessonProgressById: Map<string, { isCompleted: boolean; watchPositionSeconds: number }>;
  lessonUnlockById: Map<string, LessonUnlockMeta>;
  onSelectLesson: (lessonId: string) => void;
  isNavigationLocked?: boolean;
  assignmentCount?: number;
  lastLessonId?: string;
  assignmentsLabel?: string;
  onOpenAssignments?: () => void;
  className?: string;
};

export function CourseLearnCurriculum({
  lessons,
  selectedLessonId,
  lessonProgressById,
  lessonUnlockById,
  onSelectLesson,
  isNavigationLocked = false,
  assignmentCount = 0,
  lastLessonId,
  assignmentsLabel,
  onOpenAssignments,
  className
}: CourseLearnCurriculumProps) {
  const showAssignmentsEntry = assignmentCount > 0 && lastLessonId && assignmentsLabel && onOpenAssignments;
  const activeRef = useRef<HTMLLIElement | null>(null);

  // Keep the active lesson visible when the selection changes (e.g. via prev/next nav).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedLessonId]);

  return (
    <nav aria-label="Course lessons" className={cn("flex h-full min-h-0 flex-col", className)}>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-2">
        {lessons.map((lesson, index) => {
          const progress = lessonProgressById.get(lesson.id);
          const unlock = lessonUnlockById.get(lesson.id);
          const isSelected = lesson.id === selectedLessonId;
          const isCompleted = Boolean(progress?.isCompleted);
          const isLocked = Boolean(unlock && !unlock.isUnlocked);
          const isLastLesson = lesson.id === lastLessonId;
          const hasAssignmentsOnLesson = isLastLesson && assignmentCount > 0;
          const isQuizLesson = lesson.contentType === LESSON_CONTENT_TYPE.quiz;
          const isCodeLesson = lesson.contentType === LESSON_CONTENT_TYPE.codeExercise;

          return (
            <li key={lesson.id} ref={isSelected ? activeRef : undefined}>
              <button
                type="button"
                title={
                  isLocked && unlock?.lockedByLessonTitle
                    ? `${lesson.title} (${unlock.lockedByLessonTitle})`
                    : lesson.title
                }
                disabled={isLocked || isNavigationLocked}
                aria-disabled={isLocked || isNavigationLocked}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                  isLocked && "cursor-not-allowed opacity-60",
                  isNavigationLocked && "cursor-not-allowed opacity-60",
                  isSelected && !isLocked
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/25"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isLocked && "hover:bg-transparent hover:text-muted-foreground"
                )}
                onClick={() => {
                  if (!isLocked) {
                    onSelectLesson(lesson.id);
                  }
                }}
              >
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold tabular-nums",
                    isCompleted && !isSelected && "text-primary",
                    isSelected && !isLocked && "bg-primary text-primary-foreground"
                  )}
                >
                  {isLocked ? (
                    <Lock className="size-3.5" aria-hidden />
                  ) : isCompleted ? (
                    <CheckCircle2 className="size-3.5" aria-hidden />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-sm leading-5", isSelected && !isLocked && "font-medium text-foreground")}>
                  {lesson.title}
                </span>
                {hasAssignmentsOnLesson ? (
                  <ClipboardList className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : isCodeLesson ? (
                  <Terminal className="size-3.5 shrink-0 text-primary/80" aria-hidden />
                ) : isQuizLesson ? (
                  <ClipboardCheck className="size-3.5 shrink-0 text-primary/80" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {showAssignmentsEntry ? (
        <div className="shrink-0 border-t border-border/60 p-2">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            onClick={onOpenAssignments}
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate">{assignmentsLabel}</span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {assignmentCount}
            </span>
          </button>
        </div>
      ) : null}
    </nav>
  );
}

