import { BookOpen, Compass, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton } from "../components/skeleton";
import { useMyEnrollments } from "../features/enrollment/hooks/use-enrollments";
import { toMediaUrl } from "../lib/media-url";

export function MyLearningPage() {
  const { data, isLoading, isError } = useMyEnrollments();

  return (
    <AppShell
      title="My learning"
      subtitle="Courses you are enrolled in. Open a course to watch lessons and mark progress."
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 shadow-sm">
          <Link to="/explore">
            <Compass className="size-4" aria-hidden />
            Explore catalog
          </Link>
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard icon={BookOpen} label="Enrolled courses" value={data?.length ?? 0} hint="From your dashboard" />
              <MetricCard icon={GraduationCap} label="Progress hub" value="Open below" hint="Or use Progress in the sidebar" />
            </>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="contents">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
                  aria-hidden
                />
              ))}
            </div>
          ) : null}
          {isError ? (
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Could not load your enrollments.
              </div>
            </div>
          ) : null}
          {!isLoading && !isError && data?.length
            ? data.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/95 py-0 shadow-sm ring-1 ring-border/25 transition-all hover:border-border hover:shadow-md"
                >
                  <div className="relative h-32 bg-muted/40">
                    {enrollment.course?.coverImageUrl ? (
                      <img src={toMediaUrl(enrollment.course.coverImageUrl)} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <BookOpen className="size-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <CardHeader className="space-y-2">
                    <Badge variant="outline" className="w-fit rounded-md text-xs font-medium">
                      {enrollment.course?.status ?? "Course"}
                    </Badge>
                    <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">
                      {enrollment.course?.title ?? `Course ${enrollment.courseId.slice(0, 8)}…`}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex flex-wrap gap-2 border-t border-border/50 pt-4">
                    <Button asChild size="sm" className="rounded-lg shadow-sm">
                      <Link to={`/courses/${enrollment.courseId}`}>Continue</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link to="/my-progress">View progress</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            : null}
          {!isLoading && !isError && !data?.length ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={BookOpen}
                title="No enrollments yet"
                description="Explore the catalog, pick a published course, and enroll. Your dashboard will list every course you join."
                action={
                  <Button asChild className="rounded-lg" size="sm">
                    <Link to="/explore">Browse courses</Link>
                  </Button>
                }
              />
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
