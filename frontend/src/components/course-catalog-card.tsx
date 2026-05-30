import { ArrowUpRight, BookOpen, Clock, Star, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Course } from "../services/course.service";
import { toMediaUrl } from "../lib/media-url";

type CourseCatalogCardProps = {
  course: Course;
  href: string;
  viewLabel: string;
  noDescriptionLabel: string;
  enrolledLearnersLabel: string;
  durationUnitLabel: string;
  statusSlot?: ReactNode;
  metaSlot?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

function CourseCover({ course }: { course: Course }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
      {course.coverImageUrl ? (
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
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/72 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}

function CourseMetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/55">
      {children}
    </span>
  );
}

export function CourseCatalogCard({
  course,
  href,
  viewLabel,
  noDescriptionLabel,
  enrolledLearnersLabel,
  durationUnitLabel,
  statusSlot,
  metaSlot,
  secondaryAction,
  className
}: CourseCatalogCardProps) {
  const details = [course.category, course.level, course.language].filter((value): value is string => Boolean(value));

  return (
    <article
      className={cn(
        "group grid overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-ring/35 hover:shadow-md",
        className
      )}
    >
      <CourseCover course={course} />

      <div className="grid min-h-[15.5rem] grid-rows-[auto_1fr_auto] gap-4 p-4">
        <div className="space-y-3">
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {details.slice(0, 2).map((item) => (
                <CourseMetaPill key={item}>{item}</CourseMetaPill>
              ))}
            </div>
            {statusSlot}
          </div>

          <div>
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">{course.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {course.description || noDescriptionLabel}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {course.enrollmentCount ?? 0} {enrolledLearnersLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5 fill-current" aria-hidden />
            {course.ratingCount ? course.ratingAverage.toFixed(1) : "-"} ({course.ratingCount})
          </span>
          {course.durationMinutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {course.durationMinutes} {durationUnitLabel}
            </span>
          ) : null}
          {metaSlot}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
          {secondaryAction}
          <Button asChild size="sm" className="h-10 flex-1 rounded-md px-4">
            <Link to={href}>
              {viewLabel}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
