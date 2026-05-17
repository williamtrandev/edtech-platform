import { BookOpen, CheckCircle2, Compass, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { CourseListSkeleton } from "../components/skeleton";
import { COURSE_STATUS } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { useCourses } from "../features/course/hooks/use-courses";
import { useEnrollCourse } from "../features/enrollment/hooks/use-enrollments";
import { useI18n } from "../i18n";
import { toMediaUrl } from "../lib/media-url";

export function ExploreCoursesPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error } = useCourses();
  const { isAuthenticated } = useAuth();
  const enrollMutation = useEnrollCourse();
  const [query, setQuery] = useState("");

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
  }, [items, query]);

  const openCount = useMemo(
    () => items.filter((course) => course.status === COURSE_STATUS.published).length,
    [items]
  );

  return (
    <AppShell
      title={t("explore.title")}
      subtitle={t("explore.subtitle")}
      actions={
        isAuthenticated ? (
          <Button asChild variant="default" size="sm" className="rounded-lg shadow-sm">
            <Link to="/dashboard">{t("explore.myLearning")}</Link>
          </Button>
        ) : null
      }
    >
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm ring-1 ring-border/30 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 size-40 rounded-full bg-muted/60 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  {t("explore.heroEyebrow")}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("explore.heroTitle")}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("explore.heroDescription")}</p>
                {!isAuthenticated ? (
                  <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {t("explore.guestHint")}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: t("explore.statTotal"), value: items.length },
                  { label: t("explore.statOpen"), value: openCount },
                  { label: t("explore.statShown"), value: filtered.length }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[4.5rem] rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-center shadow-sm"
                  >
                    <p className="text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("explore.searchPlaceholder")}
                className="h-11 rounded-xl border-border/80 bg-background/90 pl-10 shadow-sm"
                type="search"
                aria-label={t("explore.searchPlaceholder")}
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                <Compass className="size-4 text-foreground/80" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("explore.catalogTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} / {items.length}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? <CourseListSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {(error as Error).message}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            filtered.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course) => {
                  const isOpen = course.status === COURSE_STATUS.published;

                  return (
                    <Card
                      key={course.id}
                      className="group flex flex-col overflow-hidden rounded-[1.5rem] border-border/60 bg-card/95 py-0 shadow-sm ring-1 ring-border/30 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative h-32 overflow-hidden bg-muted/40">
                        {course.coverImageUrl ? (
                          <img src={toMediaUrl(course.coverImageUrl)} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <BookOpen className="size-8" aria-hidden />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/80 to-transparent" />
                        <div className="absolute bottom-3 left-4">
                          <Badge variant={isOpen ? "default" : "outline"} className="rounded-md text-xs shadow-sm">
                            {isOpen ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="size-3" aria-hidden />
                                {t("explore.badgeOpen")}
                              </span>
                            ) : (
                              course.status
                            )}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader className="space-y-2 px-5 pb-2 pt-4">
                        <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                          {course.description ?? t("explore.noDescription")}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="mt-auto flex flex-col gap-2 border-t border-border/50 bg-muted/10 px-5 py-4 sm:flex-row">
                        {isAuthenticated ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full rounded-lg sm:flex-1"
                            disabled={enrollMutation.isPending || !isOpen}
                            type="button"
                            onClick={() => void enrollMutation.mutateAsync(course.id)}
                          >
                            {enrollMutation.isPending ? t("explore.enrolling") : t("explore.enroll")}
                          </Button>
                        ) : null}
                        <Button asChild size="sm" className="w-full rounded-lg shadow-sm sm:flex-1">
                          <Link to={`/courses/${course.id}`}>{t("explore.viewCourse")}</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title={query.trim() ? t("explore.emptyNoMatchTitle") : t("explore.emptyNoCoursesTitle")}
                description={
                  query.trim() ? t("explore.emptyNoMatchDescription") : t("explore.emptyNoCoursesDescription")
                }
                action={
                  query.trim() ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setQuery("")}>
                      {t("explore.clearSearch")}
                    </Button>
                  ) : isAuthenticated ? (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link to="/dashboard">{t("explore.myLearning")}</Link>
                    </Button>
                  ) : null
                }
              />
            )
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
