import { ArrowUpRight, Layers3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseProgressBar } from "../components/course-progress-bar";
import { EmptyState } from "../components/empty-state";
import { CourseCardGridSkeleton } from "../components/skeleton";
import { useAuth } from "../hooks/use-auth";
import { useLearningPaths } from "../hooks/use-learning-paths";
import { useI18n } from "../i18n";
import { toMediaUrl } from "../lib/media-url";
import { STUDIO_FORM_SHELL } from "../lib/studio-ui";

export function LearningPathsPage() {
  const { t, formatError } = useI18n();
  const { isAuthenticated } = useAuth();
  const pathsQuery = useLearningPaths(1, 24);

  return (
    <AppShell title={t("learningPaths.title")} subtitle={t("learningPaths.subtitle")}>
      <section className={STUDIO_FORM_SHELL}>
        {pathsQuery.isLoading ? <CourseCardGridSkeleton rows={6} /> : null}

        {pathsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formatError(pathsQuery.error, "errors.unexpected")}
          </div>
        ) : null}

        {!pathsQuery.isLoading && !pathsQuery.isError && !pathsQuery.data?.items.length ? (
          <EmptyState icon={Layers3} title={t("learningPaths.emptyTitle")} description={t("learningPaths.emptyDescription")} />
        ) : null}

        {!pathsQuery.isLoading && !pathsQuery.isError && pathsQuery.data?.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pathsQuery.data.items.map((path) => (
              <article
                key={path.id}
                className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-ring/35 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {path.coverImageUrl ? (
                    <img
                      src={toMediaUrl(path.coverImageUrl)}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--card)))] text-muted-foreground">
                      <Layers3 className="size-8" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div className="space-y-2">
                    <h2 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{path.title}</h2>
                    {path.description ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{path.description}</p>
                    ) : null}
                  </div>

                  {isAuthenticated && path.enrolledCourseCount !== undefined && path.enrolledCourseCount > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("learningPaths.listProgress")
                          .replace("{{enrolled}}", String(path.enrolledCourseCount))
                          .replace("{{total}}", String(path.courseCount))
                          .replace("{{percent}}", String(path.averageProgress ?? 0))}
                      </p>
                      <CourseProgressBar
                        percentage={path.averageProgress ?? 0}
                        completedLessons={0}
                        totalLessons={0}
                        showBreakdown={false}
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("learningPaths.courseCount").replace("{{count}}", String(path.courseCount))}
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-9 rounded-lg shadow-none">
                      <Link to={`/learning-paths/${path.id}`}>
                        {t("learningPaths.viewPath")}
                        <ArrowUpRight className="ml-1 size-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
