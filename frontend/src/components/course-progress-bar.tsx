import { cn } from "@/lib/utils";

type CourseProgressBarProps = {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  passedExams?: number;
  totalExams?: number;
  submittedAssignments?: number;
  totalAssignments?: number;
  showBreakdown?: boolean;
  className?: string;
};

export function CourseProgressBar({
  percentage,
  completedLessons,
  totalLessons,
  passedExams = 0,
  totalExams = 0,
  submittedAssignments = 0,
  totalAssignments = 0,
  showBreakdown = true,
  className
}: CourseProgressBarProps) {
  const value = Math.min(100, Math.max(0, percentage));
  const hasExams = totalExams > 0;
  const hasAssignments = totalAssignments > 0;
  const breakdownLabel = `${completedLessons}/${totalLessons}${hasExams ? ` · ${passedExams}/${totalExams}` : ""}${hasAssignments ? ` · ${submittedAssignments}/${totalAssignments}` : ""}`;

  return (
    <div className={cn("space-y-2", className)}>
      {showBreakdown ? (
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span className="tabular-nums">{value}%</span>
          <span className="truncate tabular-nums">{breakdownLabel}</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
