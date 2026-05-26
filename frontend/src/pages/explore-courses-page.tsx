import { BookOpen, Compass, Search, Sparkles, Star, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { CourseListSkeleton } from "../components/skeleton";
import { COURSE_STATUS } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourseFacets, useInfiniteCourses } from "../hooks/use-courses";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { toMediaUrl } from "../lib/media-url";

const COURSE_PAGE_SIZE = 12;
const ALL_FILTER_VALUE = "all";

export function ExploreCoursesPage() {
  const { t, formatError } = useI18n();
  const { isAuthenticated } = useAuth();
  const enrollMutation = useEnrollCourse();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState(ALL_FILTER_VALUE);
  const [level, setLevel] = useState(ALL_FILTER_VALUE);
  const [language, setLanguage] = useState(ALL_FILTER_VALUE);
  const [instructorId, setInstructorId] = useState(ALL_FILTER_VALUE);
  const [enrollment, setEnrollment] = useState<"all" | "enrolled" | "not-enrolled">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "popular" | "highest-rated" | "title">("newest");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const facetsQuery = useCourseFacets(COURSE_STATUS.published);
  const { data, isLoading, isFetchingNextPage, isError, error, hasNextPage, fetchNextPage } = useInfiniteCourses(
    COURSE_STATUS.published,
    COURSE_PAGE_SIZE,
    debouncedQuery,
    {
      category: category === ALL_FILTER_VALUE ? "" : category,
      level: level === ALL_FILTER_VALUE ? "" : level,
      language: language === ALL_FILTER_VALUE ? "" : language,
      instructorId: instructorId === ALL_FILTER_VALUE ? "" : instructorId,
      enrollment: isAuthenticated ? enrollment : "all",
      sort
    }
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "360px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items = useMemo(
    () => (data?.pages.flatMap((page) => page.items) ?? []).filter((course) => course.status === COURSE_STATUS.published),
    [data?.pages]
  );
  const total = data?.pages[0]?.pagination.total ?? 0;
  const hasActiveFilters = Boolean(
    query.trim() ||
      category !== ALL_FILTER_VALUE ||
      level !== ALL_FILTER_VALUE ||
      language !== ALL_FILTER_VALUE ||
      instructorId !== ALL_FILTER_VALUE ||
      enrollment !== ALL_FILTER_VALUE ||
      sort !== "newest"
  );
  const clearFilters = () => {
    setQuery("");
    setCategory(ALL_FILTER_VALUE);
    setLevel(ALL_FILTER_VALUE);
    setLanguage(ALL_FILTER_VALUE);
    setInstructorId(ALL_FILTER_VALUE);
    setEnrollment(ALL_FILTER_VALUE);
    setSort("newest");
  };
  const facets = facetsQuery.data ?? { categories: [], levels: [], languages: [], instructors: [] };

  return (
    <AppShell
      title={t("explore.title")}
      subtitle={t("explore.subtitle")}
    >
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm ring-1 ring-border/30 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 size-40 rounded-full bg-muted/60 blur-3xl" />

          <div className="relative z-10 space-y-6">
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

            <div className="grid gap-3">
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

              <div className="grid gap-2 rounded-xl border border-border/60 bg-background/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("explore.filters")}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 w-full rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.categoryPlaceholder")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>{t("explore.categoryAll")}</SelectItem>
                      {facets.categories.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="h-10 w-full rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.levelPlaceholder")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>{t("explore.levelAll")}</SelectItem>
                      {facets.levels.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-10 w-full rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.languagePlaceholder")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>{t("explore.languageAll")}</SelectItem>
                      {facets.languages.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={instructorId} onValueChange={setInstructorId}>
                    <SelectTrigger className="h-10 w-full rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.instructorPlaceholder")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>{t("explore.instructorAll")}</SelectItem>
                      {facets.instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>{instructor.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAuthenticated ? (
                    <Select value={enrollment} onValueChange={(value) => setEnrollment(value as typeof enrollment)}>
                      <SelectTrigger className="h-10 rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.enrollmentFilter")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("explore.enrollmentAll")}</SelectItem>
                        <SelectItem value="enrolled">{t("explore.enrollmentEnrolled")}</SelectItem>
                        <SelectItem value="not-enrolled">{t("explore.enrollmentNotEnrolled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
                    <SelectTrigger className="h-10 rounded-md border-border/80 bg-background shadow-none" aria-label={t("explore.sort")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t("explore.sortNewest")}</SelectItem>
                      <SelectItem value="oldest">{t("explore.sortOldest")}</SelectItem>
                      <SelectItem value="popular">{t("explore.sortPopular")}</SelectItem>
                      <SelectItem value="highest-rated">{t("explore.sortHighestRated")}</SelectItem>
                      <SelectItem value="title">{t("explore.sortTitle")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  {items.length} / {total}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? <CourseListSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(error, "errors.unexpected")}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((course) => (
                  <Card
                    key={course.id}
                    className="group flex flex-col overflow-hidden rounded-lg border-border/70 bg-card py-0 shadow-none transition-colors hover:border-border"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted/40">
                      {course.coverImageUrl ? (
                        <img
                          src={toMediaUrl(course.coverImageUrl)}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <BookOpen className="size-8" aria-hidden />
                        </div>
                      )}
                    </div>

                    <CardHeader className="space-y-2 px-4 pb-2 pt-4">
                      <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">{course.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" aria-hidden />
                          {course.enrollmentCount ?? 0} {t("explore.enrolledLearners")}
                        </span>
                        <span>
                          <Star className="mr-1 inline size-3.5 fill-current" aria-hidden />
                          {course.ratingCount ? course.ratingAverage.toFixed(1) : "—"} ({course.ratingCount})
                        </span>
                      </div>
                      <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                        {course.description ?? t("explore.noDescription")}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="mt-auto flex flex-col gap-2 border-t border-border/60 bg-card px-4 py-4 sm:flex-row">
                      {isAuthenticated ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 w-full rounded-md px-4 sm:flex-1"
                          disabled={enrollMutation.isPending}
                          type="button"
                          onClick={() => void enrollMutation.mutateAsync(course.id)}
                        >
                          {enrollMutation.isPending ? t("explore.enrolling") : t("explore.enroll")}
                        </Button>
                      ) : null}
                      <Button asChild size="sm" className="h-10 w-full rounded-md px-4 shadow-sm sm:flex-1">
                        <Link to={`/courses/${course.id}`}>{t("explore.viewCourse")}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title={hasActiveFilters ? t("explore.emptyNoMatchTitle") : t("explore.emptyNoCoursesTitle")}
                description={
                  hasActiveFilters ? t("explore.emptyNoMatchDescription") : t("explore.emptyNoCoursesDescription")
                }
                action={
                  hasActiveFilters ? (
                    <Button type="button" variant="outline" size="sm" className="h-10 rounded-lg px-4" onClick={clearFilters}>
                      {t("explore.clearSearch")}
                    </Button>
                  ) : null
                }
              />
            )
          ) : null}

          {!isLoading && !isError && hasNextPage ? (
            <div ref={loadMoreRef} className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-lg px-4"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? t("explore.loadingMore") : t("explore.loadMore")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
