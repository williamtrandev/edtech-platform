import { ArrowLeft, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseProgressBar } from "./course-progress-bar";
import { cn } from "@/lib/utils";

type CourseLearnTopBarProps = {
  courseTitle: string;
  backHref: string;
  backLabel: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  passedExams: number;
  totalExams: number;
  submittedAssignments: number;
  totalAssignments: number;
  isMobileCurriculumOpen: boolean;
  onToggleMobileCurriculum: () => void;
  mobileCurriculumLabel: string;
  closeCurriculumLabel: string;
  className?: string;
};

export function CourseLearnTopBar({
  courseTitle,
  backHref,
  backLabel,
  progressPercentage,
  completedLessons,
  totalLessons,
  passedExams,
  totalExams,
  submittedAssignments,
  totalAssignments,
  isMobileCurriculumOpen,
  onToggleMobileCurriculum,
  mobileCurriculumLabel,
  closeCurriculumLabel,
  className
}: CourseLearnTopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-xl lg:hidden"
          aria-expanded={isMobileCurriculumOpen}
          aria-label={isMobileCurriculumOpen ? closeCurriculumLabel : mobileCurriculumLabel}
          onClick={onToggleMobileCurriculum}
        >
          {isMobileCurriculumOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        </Button>

        <Button asChild variant="ghost" size="sm" className="hidden h-9 shrink-0 rounded-xl px-3 lg:inline-flex">
          <Link to={backHref}>
            <ArrowLeft className="mr-1.5 size-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>

        <span
          className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-semibold text-primary-foreground sm:inline-flex"
          aria-hidden
        >
          {">_"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">{courseTitle}</p>
        </div>

        <div className="hidden w-44 shrink-0 items-center gap-2 sm:flex md:w-60">
          <span className="shrink-0 font-mono text-xs tabular-nums text-primary">{progressPercentage}%</span>
          <CourseProgressBar
            percentage={progressPercentage}
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            passedExams={passedExams}
            totalExams={totalExams}
            submittedAssignments={submittedAssignments}
            totalAssignments={totalAssignments}
            showBreakdown={false}
            className="flex-1"
          />
        </div>
      </div>
    </header>
  );
}
