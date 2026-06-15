import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CourseLearnLessonHeaderProps = {
  lessonNumber: number;
  totalLessons: number;
  title: string;
  isCompleted: boolean;
  completedLabel: string;
  className?: string;
};

export function CourseLearnLessonHeader({
  lessonNumber,
  totalLessons,
  title,
  isCompleted,
  completedLabel,
  className
}: CourseLearnLessonHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
          <span aria-hidden>{">_"}</span>
          lesson
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {String(lessonNumber).padStart(2, "0")} / {String(totalLessons).padStart(2, "0")}
        </span>
        {isCompleted ? (
          <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-[11px] font-medium">
            {completedLabel}
          </Badge>
        ) : null}
      </div>
      <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
    </div>
  );
}
