import { BookOpen, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AppShell } from "../components/app-shell";
import { CourseCatalogCard } from "../components/course-catalog-card";
import { CourseEnrollButton } from "../components/course-enroll-button";
import { EmptyState } from "../components/empty-state";
import { CourseCardGridSkeleton } from "../components/skeleton";
import { COURSE_STATUS } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourseFacets, useInfiniteCourses } from "../hooks/use-courses";
import { useCurrentUser } from "../hooks/use-current-user";
import { useMyEnrollments } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { canSelfEnrollInCourse } from "../lib/enrollment-access";
import { formatMoney, isPaidCourse } from "../lib/course-pricing";
import { getCourseLearnPath } from "../lib/course-learn-path";
import { STUDIO_FORM_SHELL, STUDIO_NOTICE } from "../lib/studio-ui";

const COURSE_PAGE_SIZE = 12;
const ALL_FILTER_VALUE = "all";

const FILTER_SELECT_TRIGGER =
  "h-10 w-full rounded-lg border-0 bg-background shadow-none ring-1 ring-foreground/10 focus:ring-foreground/20";

type ExploreFilterFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

function ExploreFilterField({ label, children, className }: ExploreFilterFieldProps) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

type ActiveFilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

export function ExploreCoursesPage() {
  const { t, formatError } = useI18n();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const myEnrollmentsQuery = useMyEnrollments(isAuthenticated && !isBootstrapping);
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
  const facets = facetsQuery.data ?? { categories: [], levels: [], languages: [], instructors: [] };
  const enrolledCourseIds = useMemo(
    () => new Set((myEnrollmentsQuery.data ?? []).map((item) => item.courseId)),
    [myEnrollmentsQuery.data]
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

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];

    if (query.trim()) {
      chips.push({
        key: "query",
        label: `"${query.trim()}"`,
        onClear: () => setQuery("")
      });
    }
    if (category !== ALL_FILTER_VALUE) {
      chips.push({
        key: "category",
        label: category,
        onClear: () => setCategory(ALL_FILTER_VALUE)
      });
    }
    if (level !== ALL_FILTER_VALUE) {
      chips.push({
        key: "level",
        label: level,
        onClear: () => setLevel(ALL_FILTER_VALUE)
      });
    }
    if (language !== ALL_FILTER_VALUE) {
      chips.push({
        key: "language",
        label: language,
        onClear: () => setLanguage(ALL_FILTER_VALUE)
      });
    }
    if (instructorId !== ALL_FILTER_VALUE) {
      const instructorEmail = facets.instructors.find((item) => item.id === instructorId)?.email ?? instructorId;
      chips.push({
        key: "instructor",
        label: instructorEmail,
        onClear: () => setInstructorId(ALL_FILTER_VALUE)
      });
    }
    if (isAuthenticated && enrollment !== ALL_FILTER_VALUE) {
      chips.push({
        key: "enrollment",
        label:
          enrollment === "enrolled" ? t("explore.enrollmentEnrolled") : t("explore.enrollmentNotEnrolled"),
        onClear: () => setEnrollment(ALL_FILTER_VALUE)
      });
    }
    if (sort !== "newest") {
      const sortLabel =
        sort === "oldest"
          ? t("explore.sortOldest")
          : sort === "popular"
            ? t("explore.sortPopular")
            : sort === "highest-rated"
              ? t("explore.sortHighestRated")
              : t("explore.sortTitle");
      chips.push({
        key: "sort",
        label: sortLabel,
        onClear: () => setSort("newest")
      });
    }

    return chips;
  }, [category, enrollment, facets.instructors, instructorId, isAuthenticated, language, level, query, sort, t]);

  const hasActiveFilters = activeFilterChips.length > 0;

  return (
    <AppShell title={t("explore.title")} subtitle={t("explore.subtitle")}>
      <div className="space-y-6">
        <section className={cn(STUDIO_FORM_SHELL, "space-y-4")}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("explore.searchPlaceholder")}
              className="h-11 rounded-xl border-0 bg-background pl-10 shadow-none ring-1 ring-foreground/10 focus-visible:ring-foreground/20"
              type="search"
              aria-label={t("explore.searchPlaceholder")}
            />
          </div>

          {!isAuthenticated ? <p className={cn(STUDIO_NOTICE, "text-sm leading-6 text-muted-foreground")}>{t("explore.guestHint")}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <ExploreFilterField label={t("explore.categoryPlaceholder")}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.categoryPlaceholder")}>
                  <SelectValue placeholder={t("explore.categoryAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>{t("explore.categoryAll")}</SelectItem>
                  {facets.categories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExploreFilterField>

            <ExploreFilterField label={t("explore.levelPlaceholder")}>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.levelPlaceholder")}>
                  <SelectValue placeholder={t("explore.levelAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>{t("explore.levelAll")}</SelectItem>
                  {facets.levels.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExploreFilterField>

            <ExploreFilterField label={t("explore.languagePlaceholder")}>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.languagePlaceholder")}>
                  <SelectValue placeholder={t("explore.languageAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>{t("explore.languageAll")}</SelectItem>
                  {facets.languages.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExploreFilterField>

            <ExploreFilterField label={t("explore.instructorPlaceholder")}>
              <Select value={instructorId} onValueChange={setInstructorId}>
                <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.instructorPlaceholder")}>
                  <SelectValue placeholder={t("explore.instructorAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>{t("explore.instructorAll")}</SelectItem>
                  {facets.instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExploreFilterField>

            {isAuthenticated ? (
              <ExploreFilterField label={t("explore.enrollmentFilter")}>
                <Select value={enrollment} onValueChange={(value) => setEnrollment(value as typeof enrollment)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.enrollmentFilter")}>
                    <SelectValue placeholder={t("explore.enrollmentAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("explore.enrollmentAll")}</SelectItem>
                    <SelectItem value="enrolled">{t("explore.enrollmentEnrolled")}</SelectItem>
                    <SelectItem value="not-enrolled">{t("explore.enrollmentNotEnrolled")}</SelectItem>
                  </SelectContent>
                </Select>
              </ExploreFilterField>
            ) : null}

            <ExploreFilterField label={t("explore.sort")} className={isAuthenticated ? undefined : "sm:col-span-2 xl:col-span-1"}>
              <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
                <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label={t("explore.sort")}>
                  <SelectValue placeholder={t("explore.sortNewest")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("explore.sortNewest")}</SelectItem>
                  <SelectItem value="oldest">{t("explore.sortOldest")}</SelectItem>
                  <SelectItem value="popular">{t("explore.sortPopular")}</SelectItem>
                  <SelectItem value="highest-rated">{t("explore.sortHighestRated")}</SelectItem>
                  <SelectItem value="title">{t("explore.sortTitle")}</SelectItem>
                </SelectContent>
              </Select>
            </ExploreFilterField>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              {activeFilterChips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="h-8 max-w-full gap-1 rounded-full bg-background pl-3 pr-1.5 font-normal ring-1 ring-foreground/10"
                >
                  <span className="truncate">{chip.label}</span>
                  <button
                    type="button"
                    className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("explore.removeFilter")}
                    onClick={chip.onClear}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={clearFilters}>
                {t("explore.clearFilters")}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("explore.catalogTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("explore.showingResults")} {items.length} / {total}
              </p>
            </div>
          </div>

          {isLoading ? <CourseCardGridSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(error, "errors.unexpected")}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((course) => {
                  const isEnrolled = enrolledCourseIds.has(course.id);
                  const showEnroll = canSelfEnrollInCourse({
                    userId: meQuery.data?.id,
                    instructorId: course.instructorId,
                    courseStatus: course.status,
                    isEnrolled
                  });
                  const priceLabel = isPaidCourse(course.priceCents)
                    ? formatMoney(course.priceCents ?? 0, course.currency ?? "USD")
                    : null;

                  return (
                    <CourseCatalogCard
                      key={course.id}
                      course={course}
                      href={`/courses/${course.id}`}
                      viewLabel={t("explore.viewCourse")}
                      noDescriptionLabel={t("explore.noDescription")}
                      enrolledLearnersLabel={t("explore.enrolledLearners")}
                      durationUnitLabel={t("courseStudio.courseDurationUnit")}
                      metaSlot={
                        priceLabel ? (
                          <span className="text-xs font-semibold text-foreground">{priceLabel}</span>
                        ) : undefined
                      }
                      secondaryAction={
                        isAuthenticated && isEnrolled ? (
                          <Button asChild variant="secondary" size="sm" className="h-10 flex-1 rounded-lg px-4">
                            <Link to={getCourseLearnPath(course.id)}>{t("explore.continueLearning")}</Link>
                          </Button>
                        ) : showEnroll ? (
                          <CourseEnrollButton
                            courseId={course.id}
                            priceCents={course.priceCents}
                            currency={course.currency}
                            className="h-10 flex-1 rounded-lg px-4"
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
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
                      {t("explore.clearFilters")}
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
