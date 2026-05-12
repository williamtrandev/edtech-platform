import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, CheckCircle2, ListOrdered } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
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
import { COURSE_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import { useCourseDetail, useCourseLessons, useCreateLesson } from "../features/course/hooks/use-courses";
import { useCompleteLesson, useCourseProgress } from "../features/progress/hooks/use-progress";
import { createLessonFormSchema, CreateLessonFormValues } from "../schemas/course.schema";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const courseQuery = useCourseDetail(courseId);
  const lessonQuery = useCourseLessons(courseId);
  const progressQuery = useCourseProgress(courseId);
  const createLessonMutation = useCreateLesson(courseId);
  const completeLessonMutation = useCompleteLesson(courseId);

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

  const loadingMetrics = courseQuery.isLoading || lessonQuery.isLoading || progressQuery.isLoading;

  return (
    <AppShell
      title={courseQuery.data?.title ?? "Course"}
      subtitle="Add lessons, then mark completion to drive learner progress."
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 shadow-sm">
          <Link to="/courses">
            <ArrowLeft className="size-4" />
            Courses
          </Link>
        </Button>
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
              <MetricCard icon={CheckCircle2} label="Completion" value={`${progressQuery.data?.percentage ?? 0}%`} hint="Based on lessons marked complete" />
              <MetricCard icon={BookOpenText} label="Course" value={courseQuery.data?.status ?? "—"} hint="Publication state" />
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
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

          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-7">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Curriculum</CardTitle>
              <CardDescription className="text-sm">Lessons for this course. Mark items complete to update progress.</CardDescription>
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
