import { ArrowUpRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseProgressBar } from "./course-progress-bar";
import { toMediaUrl } from "../lib/media-url";
import { getCourseLearnPath } from "../lib/course-learn-path";
import type { Enrollment } from "../services/enrollment.service";

type MyLearningCourseCardProps = {
  enrollment: Enrollment;
  continueLabel: string;
  viewProgressLabel: string;
  dropLabel: string;
  enrolledOnLabel: string;
  lessonsProgressLabel: string;
  completeLabel: string;
  onDrop: () => void;
  dropDisabled?: boolean;
  secondaryAction?: ReactNode;
  className?: string;
};

export function MyLearningCourseCard({
  enrollment,
  continueLabel,
  viewProgressLabel,
  dropLabel,
  enrolledOnLabel,
  lessonsProgressLabel,
  completeLabel,
  onDrop,
  dropDisabled,
  secondaryAction,
  className
}: MyLearningCourseCardProps) {
  const course = enrollment.course;
  const title = course?.title ?? enrollment.courseId;
  const progress = enrollment.progress;
  const isComplete = progress ? progress.percentage >= 100 && progress.totalLessons > 0 : false;

  return (
    <article
      className={cn(
        "group grid overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-ring/35 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {course?.coverImageUrl ? (
          <img
            src={toMediaUrl(course.coverImageUrl)}
            alt=""
            className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--card)))] text-muted-foreground">
            <BookOpen className="size-8" aria-hidden />
          </div>
        )}
        {isComplete ? (
          <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground ring-1 ring-foreground/10 backdrop-blur-sm">
            {completeLabel}
          </span>
        ) : null}
      </div>

      <div className="grid min-h-[14rem] grid-rows-[auto_1fr_auto] gap-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {enrolledOnLabel} {new Date(enrollment.enrolledAt).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-3">
          {progress ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">{lessonsProgressLabel}</p>
              <CourseProgressBar
                percentage={progress.percentage}
                completedLessons={progress.completedLessons}
                totalLessons={progress.totalLessons}
                passedExams={progress.passedExams}
                totalExams={progress.totalExams}
                submittedAssignments={progress.submittedAssignments}
                totalAssignments={progress.totalAssignments}
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {secondaryAction}
            <Button asChild size="sm" className="h-10 flex-1 rounded-md px-4">
              <Link to={getCourseLearnPath(enrollment.courseId)}>
                {continueLabel}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-md">
              <Link to="/my-progress">{viewProgressLabel}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-md text-destructive hover:text-destructive"
              disabled={dropDisabled}
              onClick={onDrop}
            >
              {dropLabel}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
