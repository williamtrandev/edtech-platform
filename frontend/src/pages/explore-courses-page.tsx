import { BookOpen, Compass, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "../components/app-shell";
import { CourseCatalogCard } from "../components/course-catalog-card";
import { EmptyState } from "../components/empty-state";
import { CourseCardGridSkeleton } from "../components/skeleton";
import { COURSE_STATUS } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourseFacets, useInfiniteCourses } from "../hooks/use-courses";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";

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
        <section className="grid gap-5 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)] lg:items-end">
          <div className="max-w-3xl space-y-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Compass className="size-5" aria-hidden />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("explore.heroTitle")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t("explore.heroDescription")}</p>
            </div>
            {!isAuthenticated ? (
              <p className="max-w-2xl rounded-lg border border-border/70 bg-muted/45 px-3 py-2 text-sm leading-6 text-muted-foreground">
                {t("explore.guestHint")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("explore.searchPlaceholder")}
                className="h-11 rounded-md border-border/80 bg-background pl-10 shadow-none"
                type="search"
                aria-label={t("explore.searchPlaceholder")}
              />
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
              {t("explore.filters")}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 w-full border-border/80 bg-background shadow-none" aria-label={t("explore.categoryPlaceholder")}>
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
                <SelectTrigger className="h-10 w-full border-border/80 bg-background shadow-none" aria-label={t("explore.levelPlaceholder")}>
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
                <SelectTrigger className="h-10 w-full border-border/80 bg-background shadow-none" aria-label={t("explore.languagePlaceholder")}>
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
                <SelectTrigger className="h-10 w-full border-border/80 bg-background shadow-none" aria-label={t("explore.instructorPlaceholder")}>
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
                  <SelectTrigger className="h-10 border-border/80 bg-background shadow-none" aria-label={t("explore.enrollmentFilter")}>
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
                <SelectTrigger className="h-10 border-border/80 bg-background shadow-none" aria-label={t("explore.sort")}>
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

            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" className="h-9 justify-self-start rounded-md px-3" onClick={clearFilters}>
                {t("explore.clearSearch")}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{t("explore.catalogTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {items.length} / {total}
              </p>
            </div>
          </div>

          {isLoading ? <CourseCardGridSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(error, "errors.unexpected")}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((course) => (
                  <CourseCatalogCard
                    key={course.id}
                    course={course}
                    href={`/courses/${course.id}`}
                    viewLabel={t("explore.viewCourse")}
                    noDescriptionLabel={t("explore.noDescription")}
                    enrolledLearnersLabel={t("explore.enrolledLearners")}
                    durationUnitLabel={t("courseStudio.courseDurationUnit")}
                    secondaryAction={
                      isAuthenticated ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 flex-1 rounded-md px-4"
                          disabled={enrollMutation.isPending}
                          type="button"
                          onClick={() => void enrollMutation.mutateAsync(course.id)}
                        >
                          {enrollMutation.isPending ? t("explore.enrolling") : t("explore.enroll")}
                        </Button>
                      ) : undefined
                    }
                  />
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
