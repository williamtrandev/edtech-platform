import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonUnlockMeta } from "../lib/lesson-unlock";
import type { Lesson } from "../services/course.service";

type CourseLearnCurriculumProps = {
  lessons: Lesson[];
  selectedLessonId?: string;
  lessonProgressById: Map<string, { isCompleted: boolean; watchPositionSeconds: number }>;
  lessonUnlockById: Map<string, LessonUnlockMeta>;
  onSelectLesson: (lessonId: string) => void;
  className?: string;
};

export function CourseLearnCurriculum({
  lessons,
  selectedLessonId,
  lessonProgressById,
  lessonUnlockById,
  onSelectLesson,
  className
}: CourseLearnCurriculumProps) {
  return (
    <nav aria-label="Course lessons" className={cn("flex h-full min-h-0 flex-col", className)}>
      <ol className="min-h-0 flex-1 space-y-px overflow-y-auto">
        {lessons.map((lesson, index) => {
          const progress = lessonProgressById.get(lesson.id);
          const unlock = lessonUnlockById.get(lesson.id);
          const isSelected = lesson.id === selectedLessonId;
          const isCompleted = Boolean(progress?.isCompleted);
          const isLocked = Boolean(unlock && !unlock.isUnlocked);

          return (
            <li key={lesson.id}>
              <button
                type="button"
                title={
                  isLocked && unlock?.lockedByLessonTitle
                    ? `${lesson.title} (${unlock.lockedByLessonTitle})`
                    : lesson.title
                }
                disabled={isLocked}
                aria-disabled={isLocked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
                  isLocked && "cursor-not-allowed opacity-60",
                  isSelected && !isLocked
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
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
                    "inline-flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums",
                    isCompleted && "text-primary",
                    isSelected && !isLocked && "bg-primary text-primary-foreground"
                  )}
                >
                  {isLocked ? (
                    <Lock className="size-3" aria-hidden />
                  ) : isCompleted ? (
                    <CheckCircle2 className="size-3" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-xs leading-4", isSelected && !isLocked && "font-medium text-foreground")}>
                  {lesson.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
