import { BookOpen, Search } from "lucide-react";
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

export function ExploreCoursesPage() {
  const { data, isLoading, isError, error } = useCourses();
  const { isAuthenticated } = useAuth();
  const enrollMutation = useEnrollCourse();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
  }, [data?.items, query]);

  return (
    <AppShell
      title="Explore courses"
      subtitle="Browse published courses, enroll with one click, then open My learning to continue."
      actions={
        isAuthenticated ? (
          <Button asChild variant="default" size="sm" className="rounded-lg shadow-sm">
            <Link to="/dashboard">My learning</Link>
          </Button>
        ) : (
          <Button asChild variant="default" size="sm" className="rounded-lg shadow-sm">
            <Link to="/login">Sign in to enroll</Link>
          </Button>
        )
      }
    >
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background px-6 py-10 shadow-sm sm:px-10 sm:py-12">
          <div className="relative z-10 max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catalog</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Find your next course</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Same catalog style as a learner marketplace: search titles, preview each card, enroll, then track everything
              from My learning or Progress.
            </p>
            <div className="relative max-w-md pt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or description…"
                className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-sm"
                type="search"
                aria-label="Search courses"
              />
            </div>
          </div>
        </section>

        <section>
          {isLoading ? <CourseListSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {(error as Error).message}
            </div>
          ) : null}
          {!isLoading && !isError ? (
            filtered.length ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course) => (
                  <Card
                    key={course.id}
                    className="flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-sm ring-1 ring-border/30 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="h-28 bg-gradient-to-br from-primary/15 via-muted/40 to-background" />
                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={course.status === COURSE_STATUS.published ? "default" : "outline"} className="rounded-md text-xs">
                          {course.status === COURSE_STATUS.published ? "Open for enrollment" : course.status}
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">{course.title}</CardTitle>
                      {course.description ? (
                        <CardDescription className="line-clamp-3 text-sm leading-relaxed">{course.description}</CardDescription>
                      ) : (
                        <CardDescription className="text-sm text-muted-foreground">No description yet.</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto flex flex-wrap gap-2 border-t border-border/50 bg-muted/10 px-6 py-4">
                      {isAuthenticated ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-lg"
                          disabled={enrollMutation.isPending || course.status !== COURSE_STATUS.published}
                          type="button"
                          onClick={() => void enrollMutation.mutateAsync(course.id)}
                        >
                          Enroll
                        </Button>
                      ) : (
                        <Button asChild variant="secondary" size="sm" className="rounded-lg">
                          <Link to="/login">Sign in to enroll</Link>
                        </Button>
                      )}
                      <Button asChild size="sm" className="rounded-lg shadow-sm">
                        <Link to={`/courses/${course.id}`}>View course</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title={query.trim() ? "No matches" : "No published courses"}
                description={
                  query.trim()
                    ? "Try a different search term or clear the filter."
                    : "When instructors publish courses, they will appear here. You can still open My learning for courses you are already in."
                }
                action={
                  query.trim() ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setQuery("")}>
                      Clear search
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link to={isAuthenticated ? "/dashboard" : "/login"}>{isAuthenticated ? "My learning" : "Sign in"}</Link>
                    </Button>
                  )
                }
              />
            )
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
