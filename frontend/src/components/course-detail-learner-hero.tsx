import { type ReactNode } from "react";
import { BookOpen, CheckCircle2, Clock3, Globe2, Layers3, ListOrdered, Star, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseCoverFrame } from "./course-cover-frame";
import { CourseEnrollButton } from "./course-enroll-button";
import { formatMoney, isPaidCourse } from "../lib/course-pricing";
import { getCourseLearnPath } from "../lib/course-learn-path";

type StatPillProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  loading?: boolean;
};

function StatPill({ label, value, icon, loading }: StatPillProps) {
  return (
    <div className="flex min-w-[8.5rem] flex-1 items-center gap-3 rounded-xl bg-background/80 px-4 py-3 ring-1 ring-foreground/10 backdrop-blur-sm">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">{loading ? "..." : value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type MetaChipProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function MetaChip({ icon, label, value }: MetaChipProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-background/70 px-3 py-2 ring-1 ring-foreground/10">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export type CourseDetailLearnerHeroProps = {
  courseId: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  instructorEmail?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  lessonCount: number | string;
  completionPercent: number | string;
  learnerCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  loadingMetrics?: boolean;
  isAuthenticated: boolean;
  isCoursePublished: boolean;
  isEnrolledStudent: boolean;
  canSelfEnroll: boolean;
  showOwnerCannotEnrollHint: boolean;
  loginRedirectTo: string;
  coverEmptyLabel: string;
  taughtByLabel: string;
  freeCourseLabel: string;
  noDescriptionLabel: string;
  metricLessonsLabel: string;
  metricCompletionLabel: string;
  metricLearnersLabel: string;
  metricRatingLabel: string;
  signInToEnrollLabel: string;
  continueLearningLabel: string;
  ownerCannotEnrollLabel: string;
  categoryLabel: string;
  levelLabel: string;
  languageLabel: string;
  durationLabel: string;
  durationUnitLabel: string;
  onEnrolled: () => void;
};

export function CourseDetailLearnerHero({
  courseId,
  title,
  description,
  coverImageUrl,
  category,
  level,
  language,
  durationMinutes,
  instructorEmail,
  priceCents,
  currency,
  lessonCount,
  completionPercent,
  learnerCount,
  ratingAverage,
  ratingCount,
  loadingMetrics,
  isAuthenticated,
  isCoursePublished,
  isEnrolledStudent,
  canSelfEnroll,
  showOwnerCannotEnrollHint,
  loginRedirectTo,
  coverEmptyLabel,
  taughtByLabel,
  freeCourseLabel,
  noDescriptionLabel,
  metricLessonsLabel,
  metricCompletionLabel,
  metricLearnersLabel,
  metricRatingLabel,
  signInToEnrollLabel,
  continueLearningLabel,
  ownerCannotEnrollLabel,
  categoryLabel,
  levelLabel,
  languageLabel,
  durationLabel,
  durationUnitLabel,
  onEnrolled
}: CourseDetailLearnerHeroProps) {
  const instructorDisplay = instructorEmail?.split("@")[0] ?? null;
  const paid = isPaidCourse(priceCents);
  const priceLabel =
    paid && priceCents != null && currency ? formatMoney(priceCents, currency) : freeCourseLabel;
  const ratingValue = ratingCount > 0 && ratingAverage != null ? ratingAverage.toFixed(1) : "-";
  const metaChips: MetaChipProps[] = [];
  if (category) {
    metaChips.push({ icon: <Layers3 className="size-4 shrink-0" aria-hidden />, label: categoryLabel, value: category });
  }
  if (level) {
    metaChips.push({ icon: <Target className="size-4 shrink-0" aria-hidden />, label: levelLabel, value: level });
  }
  if (language) {
    metaChips.push({ icon: <Globe2 className="size-4 shrink-0" aria-hidden />, label: languageLabel, value: language });
  }
  if (durationMinutes) {
    metaChips.push({
      icon: <Clock3 className="size-4 shrink-0" aria-hidden />,
      label: durationLabel,
      value: `${durationMinutes} ${durationUnitLabel}`
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-card to-card ring-1 ring-foreground/10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_100%_0%,var(--color-primary)/0.16,transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      <div className="relative grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10 lg:p-8">
        <div
          className={cn(
            "flex flex-col gap-5",
            "animate-in fade-in-0 slide-in-from-left-4 duration-700 motion-reduce:animate-none"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {priceLabel}
            </Badge>
            {ratingCount > 0 ? (
              <Badge variant="outline" className="gap-1 rounded-full px-3 py-1 text-xs font-medium">
                <Star className="size-3.5 fill-current text-primary" aria-hidden />
                {ratingValue}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]">
              {title}
            </h1>
            {instructorDisplay ? (
              <p className="text-sm font-medium text-muted-foreground">{taughtByLabel.replace("{{name}}", instructorDisplay)}</p>
            ) : null}
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description?.trim() ? description : noDescriptionLabel}
            </p>
          </div>

          {metaChips.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {metaChips.map((chip) => (
                <MetaChip key={chip.label} {...chip} />
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            {!isAuthenticated && isCoursePublished ? (
              <Button asChild size="lg" className="h-11 rounded-xl px-6 shadow-none active:scale-[0.98]">
                <Link to={loginRedirectTo}>{signInToEnrollLabel}</Link>
              </Button>
            ) : null}
            {isAuthenticated && isEnrolledStudent && isCoursePublished ? (
              <Button asChild size="lg" className="h-11 rounded-xl px-6 shadow-none active:scale-[0.98]">
                <Link to={getCourseLearnPath(courseId)}>
                  <BookOpen className="size-4" aria-hidden />
                  {continueLearningLabel}
                </Link>
              </Button>
            ) : null}
            {canSelfEnroll ? (
              <CourseEnrollButton
                courseId={courseId}
                priceCents={priceCents ?? undefined}
                currency={currency ?? undefined}
                className="h-11 rounded-xl px-6 shadow-none active:scale-[0.98]"
                onEnrolled={onEnrolled}
              />
            ) : null}
          </div>

          {showOwnerCannotEnrollHint ? (
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{ownerCannotEnrollLabel}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "relative mx-auto w-full max-w-xl lg:max-w-none",
            "animate-in fade-in-0 slide-in-from-right-4 duration-700 motion-reduce:animate-none"
          )}
        >
          <div aria-hidden className="pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-primary/10 blur-2xl dark:bg-primary/20" />
          <CourseCoverFrame
            src={coverImageUrl}
            alt={title}
            emptyLabel={coverEmptyLabel}
            className="relative aspect-[4/3] max-h-none rounded-2xl border-0 shadow-[0_24px_80px_-28px_rgb(0_0_0/0.35)] ring-1 ring-foreground/10 dark:shadow-[0_24px_80px_-28px_rgb(0_0_0/0.55)]"
          />
        </div>
      </div>

      <div className="relative border-t border-foreground/10 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <StatPill
            label={metricLessonsLabel}
            value={lessonCount}
            loading={loadingMetrics}
            icon={<ListOrdered className="size-5" aria-hidden />}
          />
          <StatPill
            label={metricCompletionLabel}
            value={typeof completionPercent === "number" ? `${completionPercent}%` : completionPercent}
            loading={loadingMetrics}
            icon={<CheckCircle2 className="size-5" aria-hidden />}
          />
          <StatPill
            label={metricLearnersLabel}
            value={learnerCount}
            loading={loadingMetrics}
            icon={<Users className="size-5" aria-hidden />}
          />
          <StatPill
            label={metricRatingLabel}
            value={ratingValue}
            loading={loadingMetrics}
            icon={<Star className="size-5" aria-hidden />}
          />
        </div>
      </div>
    </section>
  );
}
