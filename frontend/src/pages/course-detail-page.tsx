import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, CheckCircle2, ListOrdered, Users } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { FormField } from "../components/form-field";
import { MetricCard } from "../components/metric-card";
import { CourseListSkeleton, MetricCardSkeleton } from "../components/skeleton";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS, LESSON_CONTENT_TYPE, USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { useArchiveCourse, useCourseDetail, useCourseEnrollments, useCourseLessons, useCreateLesson } from "../features/course/hooks/use-courses";
import { useEnrollCourse } from "../features/enrollment/hooks/use-enrollments";
import { useCurrentUser } from "../features/user/hooks/use-current-user";
import { useCompleteLesson, useCourseProgress } from "../features/progress/hooks/use-progress";
import { createLessonFormSchema, CreateLessonFormValues } from "../schemas/course.schema";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const courseQuery = useCourseDetail(courseId);
  const lessonQuery = useCourseLessons(courseId, Boolean(courseQuery.data));
  const progressQuery = useCourseProgress(courseId, isAuthenticated && !isBootstrapping);
  const enrollMutation = useEnrollCourse();
  const createLessonMutation = useCreateLesson(courseId);
  const completeLessonMutation = useCompleteLesson(courseId);
  const archiveCourseMutation = useArchiveCourse();

  const canManageCourse =
    meQuery.data?.role === USER_ROLE.admin ||
    (meQuery.data?.role === USER_ROLE.instructor && courseQuery.data?.instructorId === meQuery.data.id);

  const isLearner = meQuery.data?.role === USER_ROLE.user;
  const isCoursePublished = courseQuery.data?.status === COURSE_STATUS.published;

  const enrollmentsQuery = useCourseEnrollments(courseId, Boolean(canManageCourse && courseQuery.data));

  const form = useForm<CreateLessonFormValues>({
    resolver: zodResolver(createLessonFormSchema),
    defaultValues: {
      title: "",
      contentType: LESSON_CONTENT_TYPE.text,
      content: "",
      sortOrder: 1
    }
  });

  const onCreateLesson = async (values: CreateLessonFormValues) => {
    await createLessonMutation.mutateAsync(values);
    form.reset({
      title: "",
      contentType: LESSON_CONTENT_TYPE.text,
      content: "",
      sortOrder: (lessonQuery.data?.length ?? 0) + 1
    });
  };

  const loadingMetrics = courseQuery.isLoading || lessonQuery.isLoading || (isAuthenticated && progressQuery.isLoading);

  return (
    <AppShell
      title={courseQuery.data?.title ?? "Course"}
      subtitle="Add lessons, then mark completion to drive learner progress."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isAuthenticated && isCoursePublished ? (
            <Button asChild size="sm" className="rounded-lg shadow-sm">
              <Link to="/login">Sign in to enroll</Link>
            </Button>
          ) : null}
          {isAuthenticated && isLearner && isCoursePublished ? (
            <Button
              size="sm"
              className="rounded-lg shadow-sm"
              disabled={enrollMutation.isPending}
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await enrollMutation.mutateAsync(courseId);
                    toast.success("Enrolled successfully");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not enroll");
                  }
                })();
              }}
            >
              {enrollMutation.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          ) : null}
          {canManageCourse && courseQuery.data?.status !== COURSE_STATUS.archived ? (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-lg shadow-sm"
              disabled={archiveCourseMutation.isPending}
              type="button"
              onClick={() => {
                if (!window.confirm("Archive this course? Learners can no longer enroll; existing enrollments stay for history.")) {
                  return;
                }
                void (async () => {
                  try {
                    await archiveCourseMutation.mutateAsync(courseId);
                    toast.success("Course archived");
                    navigate("/courses", { replace: true });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not archive course");
                  }
                })();
              }}
            >
              {archiveCourseMutation.isPending ? "Archiving…" : "Archive course"}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 shadow-sm">
            <Link to={canManageCourse ? "/courses" : "/explore"}>
              <ArrowLeft className="size-4" />
              {canManageCourse ? "Course studio" : "Explore"}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="flex flex-wrap items-center gap-2">
          {courseQuery.data ? (
            <Badge
              className="rounded-md px-2.5 py-0.5 text-xs font-medium"
              variant={courseQuery.data.status === COURSE_STATUS.published ? "default" : "outline"}
            >
              {courseQuery.data.status}
            </Badge>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {loadingMetrics ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard icon={ListOrdered} label="Lessons" value={lessonQuery.data?.length ?? 0} />
              <MetricCard
                icon={CheckCircle2}
                label="Completion"
                value={isAuthenticated ? `${progressQuery.data?.percentage ?? 0}%` : "Sign in"}
                hint={isAuthenticated ? "Based on lessons marked complete" : "Track progress after login"}
              />
              <MetricCard icon={BookOpenText} label="Course" value={courseQuery.data?.status ?? "—"} hint="Publication state" />
            </>
          )}
        </section>

        {canManageCourse ? (
          <section>
            <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-muted-foreground" aria-hidden />
                  <div>
                    <CardTitle className="text-lg font-semibold">Enrolled learners</CardTitle>
                    <CardDescription className="text-sm">Students linked to this course (see Features.md, course module).</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {enrollmentsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
                {enrollmentsQuery.isError ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    Could not load enrollments.
                  </div>
                ) : null}
                {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError ? (
                  enrollmentsQuery.data?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Enrolled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollmentsQuery.data.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.user.email}</TableCell>
                            <TableCell>{row.user.role}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {new Date(row.enrolledAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="No enrollments yet"
                      description="Publish the course so students can enroll. Enrolled learners will appear here."
                    />
                  )
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {canManageCourse ? (
            <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-5">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg font-semibold">Add lesson</CardTitle>
                <CardDescription className="text-sm leading-relaxed">Only the course owner or an admin can create lessons.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-5" onSubmit={form.handleSubmit(onCreateLesson)} noValidate>
                  <FormField id="lesson-title" label="Lesson title" error={form.formState.errors.title?.message}>
                    <Input id="lesson-title" placeholder="e.g. Introduction" {...form.register("title")} />
                  </FormField>

                  <FormField id="lesson-content" label="Content" error={form.formState.errors.content?.message}>
                    <TextareaField id="lesson-content" placeholder="Lesson body, embed URL, or notes…" rows={5} {...form.register("content")} />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField id="lesson-type" label="Type" error={form.formState.errors.contentType?.message}>
                      <Controller
                        control={form.control}
                        name="contentType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="lesson-type" className="h-10 w-full rounded-xl border-border/80 shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={LESSON_CONTENT_TYPE.text}>Text</SelectItem>
                              <SelectItem value={LESSON_CONTENT_TYPE.video}>Video</SelectItem>
                              <SelectItem value={LESSON_CONTENT_TYPE.resource}>Resource</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>

                    <FormField id="lesson-order" label="Order" hint="Sequence in course" error={form.formState.errors.sortOrder?.message}>
                      <Input id="lesson-order" type="number" min={1} className="h-10 rounded-xl shadow-sm" {...form.register("sortOrder")} />
                    </FormField>
                  </div>

                  <Button className="h-10 rounded-xl font-medium shadow-sm" disabled={createLessonMutation.isPending} type="submit">
                    {createLessonMutation.isPending ? "Creating…" : "Create lesson"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card className={`rounded-2xl border-border/60 bg-card/90 shadow-sm ${canManageCourse ? "lg:col-span-7" : "lg:col-span-12"}`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Curriculum</CardTitle>
              <CardDescription className="text-sm">
                Lessons for this course. {isAuthenticated ? "Mark items complete to update progress." : "Sign in to track progress."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lessonQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
              {lessonQuery.isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  Could not load lessons.
                </div>
              ) : null}
              {!lessonQuery.isLoading && !lessonQuery.isError ? (
                lessonQuery.data?.length ? (
                  <ul className="space-y-3">
                    {lessonQuery.data.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">#{lesson.sortOrder}</span>
                              <Badge variant="outline" className="rounded-md text-xs font-medium">
                                {lesson.contentType}
                              </Badge>
                            </div>
                            <p className="text-base font-semibold tracking-tight text-foreground">{lesson.title}</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{lesson.content}</p>
                          </div>
                          {isAuthenticated ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="shrink-0 rounded-lg"
                              disabled={completeLessonMutation.isPending}
                              onClick={() => void completeLessonMutation.mutateAsync(lesson.id)}
                              type="button"
                            >
                              Mark complete
                            </Button>
                          ) : (
                            <Button asChild variant="secondary" size="sm" className="shrink-0 rounded-lg">
                              <Link to="/login">Sign in to track</Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={BookOpenText}
                    title="No lessons yet"
                    description="Create the first lesson using the form on the left. Learners will see lessons here after they are added."
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
