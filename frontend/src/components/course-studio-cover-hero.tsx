import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CourseCoverFrame } from "./course-cover-frame";
import { CourseStatusBadge } from "./course-status-badge";
import type { CourseStatus } from "../constants/business";

type CourseStudioCoverHeroProps = {
  title: string;
  coverImageUrl?: string | null;
  coverEmptyLabel: string;
  status?: CourseStatus;
  statusLabel?: string;
  stats: ReactNode;
  className?: string;
};

export function CourseStudioCoverHero({
  title,
  coverImageUrl,
  coverEmptyLabel,
  status,
  statusLabel,
  stats,
  className
}: CourseStudioCoverHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/6 via-card to-card ring-1 ring-foreground/10",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_100%_0%,var(--color-primary)/0.12,transparent_58%)]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {status && statusLabel ? <CourseStatusBadge status={status} label={statusLabel} /> : null}
          </div>
          <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats}</div>
        </div>
        <CourseCoverFrame
          src={coverImageUrl}
          alt={title}
          emptyLabel={coverEmptyLabel}
          className="aspect-[4/3] max-h-none rounded-2xl border-0 shadow-[0_20px_60px_-24px_rgb(0_0_0/0.3)] ring-1 ring-foreground/10"
        />
      </div>
    </section>
  );
}
