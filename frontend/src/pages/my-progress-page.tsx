import { Link } from "react-router-dom";
import { BookOpenCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { EnrollmentListSkeleton, MetricCardSkeleton } from "../components/skeleton";
import { useMyEnrollments } from "../features/enrollment/hooks/use-enrollments";

export function MyProgressPage() {
  const { data, isLoading, isError } = useMyEnrollments();

  return (
    <AppShell
      title="Progress"
      subtitle="Courses you are enrolled in. Open a course to update lesson completion and sync metrics."
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
              <MetricCard icon={BookOpenCheck} label="Enrollments" value={data?.length ?? 0} hint="Active workspace enrollments" />
              <MetricCard icon={CheckCircle2} label="Sync" value={isError ? "Issue" : "Healthy"} hint="Latest fetch status" />
            </>
          )}
        </section>

        <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Your courses</CardTitle>
            <CardDescription className="text-sm">Jump back into learning or review completion state.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <EnrollmentListSkeleton rows={4} /> : null}
            {isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Could not load enrollments.
              </div>
            ) : null}
            {!isLoading && !isError ? (
              data?.length ? (
                <ul className="space-y-3">
                  {data.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <p className="truncate text-base font-semibold tracking-tight text-foreground">
                            {enrollment.course?.title ?? enrollment.courseId}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="rounded-md font-medium">
                              {enrollment.course?.status ?? "UNKNOWN"}
                            </Badge>
                            <span>Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button asChild size="sm" className="shrink-0 rounded-lg shadow-sm">
                          <Link to={`/courses/${enrollment.courseId}`}>Continue</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={BookOpenCheck}
                  title="No enrollments yet"
                  description="Head to Courses and enroll in a published course. Your enrollments will show up here automatically."
                  action={
                    <Button asChild className="rounded-lg" size="sm">
                      <Link to="/courses">Browse courses</Link>
                    </Button>
                  }
                />
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
