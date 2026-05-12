import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { FormField } from "../components/form-field";
import { MetricCard } from "../components/metric-card";
import { CourseListSkeleton, MetricCardSkeleton } from "../components/skeleton";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS } from "../constants/business";
import { useCreateCourse, useCourses } from "../features/course/hooks/use-courses";
import { useEnrollCourse } from "../features/enrollment/hooks/use-enrollments";
import { createCourseFormSchema, CreateCourseFormValues } from "../schemas/course.schema";

export function CoursesPage() {
  const { data, isLoading, isError, error } = useCourses();
  const createCourseMutation = useCreateCourse();
  const enrollMutation = useEnrollCourse();

  const form = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: COURSE_STATUS.draft
    }
  });

  const onCreateCourse = async (values: CreateCourseFormValues) => {
    await createCourseMutation.mutateAsync(values);
    form.reset({ title: "", description: "", status: COURSE_STATUS.draft });
  };

  const publishedCount =
    !isLoading && !isError && data ? data.items.filter((c) => c.status === COURSE_STATUS.published).length : 0;

  return (
    <AppShell
      title="Courses"
      subtitle="Create and publish courses, enroll learners, and open a course to manage lessons and progress."
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard icon={BookOpen} label="Total courses" value={data?.items.length ?? 0} hint="Visible on this page" />
              <MetricCard
                icon={GraduationCap}
                label="Published"
                value={publishedCount}
                hint="Eligible for enrollment"
              />
              <MetricCard
                icon={Sparkles}
                label="Catalog health"
                value={isError ? "—" : "Live"}
                hint="Synced with your workspace"
              />
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg font-semibold">New course</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Instructors and admins can create drafts, then publish when ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={form.handleSubmit(onCreateCourse)} noValidate>
                <FormField id="course-title" label="Title" error={form.formState.errors.title?.message}>
                  <Input id="course-title" placeholder="e.g. Advanced TypeScript" {...form.register("title")} />
                </FormField>

                <FormField
                  id="course-description"
                  label="Description"
                  hint="Optional"
                  error={form.formState.errors.description?.message}
                >
                  <TextareaField id="course-description" placeholder="Short summary for learners…" rows={4} {...form.register("description")} />
                </FormField>

                <FormField id="course-status" label="Status" error={form.formState.errors.status?.message}>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="course-status" size="default" className="h-10 w-full rounded-xl border-border/80 shadow-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={COURSE_STATUS.draft}>Draft</SelectItem>
                          <SelectItem value={COURSE_STATUS.published}>Published</SelectItem>
                          <SelectItem value={COURSE_STATUS.archived}>Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <Button
                  className="h-10 rounded-xl font-medium shadow-sm transition-all hover:shadow-md"
                  disabled={createCourseMutation.isPending}
                  type="submit"
                >
                  {createCourseMutation.isPending ? "Creating…" : "Create course"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-7">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Catalog</CardTitle>
                <CardDescription className="mt-1 text-sm">All courses in your workspace.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <CourseListSkeleton rows={5} /> : null}
              {isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {(error as Error).message}
                </div>
              ) : null}
              {!isLoading && !isError ? (
                data?.items.length ? (
                  <ul className="space-y-3">
                    {data.items.map((course) => (
                      <li
                        key={course.id}
                        className="group rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm transition-all duration-200 hover:border-border hover:bg-background hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <p className="truncate text-base font-semibold tracking-tight text-foreground">{course.title}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className="rounded-md font-medium"
                                variant={course.status === COURSE_STATUS.published ? "default" : "outline"}
                              >
                                {course.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">ID · {course.id.slice(0, 8)}…</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              disabled={enrollMutation.isPending || course.status !== COURSE_STATUS.published}
                              onClick={() => void enrollMutation.mutateAsync(course.id)}
                              type="button"
                            >
                              Enroll
                            </Button>
                            <Button asChild size="sm" className="rounded-lg shadow-sm">
                              <Link to={`/courses/${course.id}`}>Open</Link>
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="Create your first course using the form on the left. Published courses appear here and can be enrolled."
                    action={
                      <Button asChild variant="outline" size="sm" className="rounded-lg">
                        <Link to="/my-progress">View progress</Link>
                      </Button>
                    }
                  />
                )
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
