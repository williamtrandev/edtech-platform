import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Layers3, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseStatusBadge } from "../components/course-status-badge";
import { EmptyState } from "../components/empty-state";
import { FormField } from "../components/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS, LEARNING_PATH_STATUS, type CourseStatus } from "../constants/business";
import { useCourses } from "../hooks/use-courses";
import { useAddLearningPathCourse, useCreateLearningPath, useRemoveLearningPathCourse, useUpdateLearningPath } from "../hooks/use-learning-path-mutations";
import { useLearningPath, useLearningPaths } from "../hooks/use-learning-paths";
import { type I18nKey, useI18n } from "../i18n";
import { cn } from "@/lib/utils";
import { STUDIO_FORM_SHELL } from "../lib/studio-ui";

type PathFilter = "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

function learningPathFormSchema(t: (key: I18nKey) => string) {
  return z.object({
    title: z.string().trim().min(3, t("validation.learningPathTitleMin")).max(200, t("validation.learningPathTitleMax")),
    description: z.string().max(2000, t("validation.learningPathDescriptionMax")).optional(),
    status: z.enum([LEARNING_PATH_STATUS.draft, LEARNING_PATH_STATUS.published, LEARNING_PATH_STATUS.archived])
  });
}

type LearningPathFormValues = z.infer<ReturnType<typeof learningPathFormSchema>>;

function pathStatusLabel(status: string, t: (key: I18nKey) => string) {
  if (status === LEARNING_PATH_STATUS.published) {
    return t("courseStatus.PUBLISHED");
  }
  if (status === LEARNING_PATH_STATUS.archived) {
    return t("courseStatus.ARCHIVED");
  }
  return t("courseStatus.DRAFT");
}

export function LearningPathsStudioPage() {
  const { pathId } = useParams();
  if (pathId) {
    return <LearningPathStudioDetail pathId={pathId} />;
  }
  return <LearningPathStudioList />;
}

function LearningPathStudioList() {
  const { t, formatError } = useI18n();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PathFilter>("all");
  const [isCreating, setIsCreating] = useState(false);
  const createMutation = useCreateLearningPath();
  const statusParam = filter === "all" ? undefined : filter;
  const pathsQuery = useLearningPaths(1, 50, true, statusParam);

  const createForm = useForm<LearningPathFormValues>({
    resolver: zodResolver(learningPathFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      status: LEARNING_PATH_STATUS.draft
    }
  });

  const filters: { id: PathFilter; label: I18nKey }[] = [
    { id: "all", label: "learningPathStudio.filterAll" },
    { id: "DRAFT", label: "learningPathStudio.filterDraft" },
    { id: "PUBLISHED", label: "learningPathStudio.filterPublished" },
    { id: "ARCHIVED", label: "learningPathStudio.filterArchived" }
  ];

  const onCreate = async (values: LearningPathFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.description?.trim() || null,
        status: values.status
      });
      toast.success(t("learningPathStudio.pathCreated"));
      setIsCreating(false);
      createForm.reset();
      navigate(`/courses/learning-paths/${created.id}`);
    } catch (error) {
      toast.error(formatError(error, "learningPathStudio.pathCreateFailed"));
    }
  };

  return (
    <AppShell
      title={t("learningPathStudio.title")}
      subtitle={t("learningPathStudio.subtitle")}
      actions={
        <Button className="h-10 rounded-lg gap-1.5 px-4 shadow-none" size="sm" type="button" onClick={() => setIsCreating((open) => !open)}>
          <Plus className="size-4" aria-hidden />
          {t("learningPathStudio.createPath")}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.id}
              className={cn("h-9 rounded-lg shadow-none", filter === item.id && "bg-primary text-primary-foreground")}
              size="sm"
              type="button"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => setFilter(item.id)}
            >
              {t(item.label)}
            </Button>
          ))}
        </div>

        {isCreating ? (
          <section className={STUDIO_FORM_SHELL}>
            <form className="grid max-w-2xl gap-4" onSubmit={createForm.handleSubmit(onCreate)} noValidate>
              <FormField id="new-path-title" label={t("learningPathStudio.pathTitle")} error={createForm.formState.errors.title?.message}>
                <Input id="new-path-title" placeholder={t("learningPathStudio.pathTitlePlaceholder")} {...createForm.register("title")} />
              </FormField>
              <FormField
                id="new-path-description"
                label={t("learningPathStudio.pathDescription")}
                hint={t("courseDetail.optional")}
                error={createForm.formState.errors.description?.message}
              >
                <TextareaField id="new-path-description" rows={4} placeholder={t("learningPathStudio.pathDescriptionPlaceholder")} {...createForm.register("description")} />
              </FormField>
              <FormField id="new-path-status" label={t("learningPathStudio.pathStatus")} error={createForm.formState.errors.status?.message}>
                <Controller
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="new-path-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LEARNING_PATH_STATUS.draft}>{t("courseStatus.DRAFT")}</SelectItem>
                        <SelectItem value={LEARNING_PATH_STATUS.published}>{t("courseStatus.PUBLISHED")}</SelectItem>
                        <SelectItem value={LEARNING_PATH_STATUS.archived}>{t("courseStatus.ARCHIVED")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button className="h-10 rounded-md shadow-none" type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  {t("common.cancel")}
                </Button>
                <Button className="h-10 rounded-md shadow-none" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? t("learningPathStudio.creating") : t("learningPathStudio.createPath")}
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <section className={STUDIO_FORM_SHELL}>
          {pathsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("common.loading")}
            </div>
          ) : null}

          {pathsQuery.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(pathsQuery.error, "errors.unexpected")}
            </div>
          ) : null}

          {!pathsQuery.isLoading && !pathsQuery.isError && !pathsQuery.data?.items.length ? (
            <EmptyState icon={Layers3} title={t("learningPathStudio.emptyTitle")} description={t("learningPathStudio.emptyDescription")} />
          ) : null}

          {!pathsQuery.isLoading && !pathsQuery.isError && pathsQuery.data?.items.length ? (
            <ul className="divide-y divide-border/70">
              {pathsQuery.data.items.map((path) => (
                <li key={path.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">{path.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("learningPaths.courseCount").replace("{{count}}", String(path.courseCount))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CourseStatusBadge status={path.status as CourseStatus} label={pathStatusLabel(path.status, t)} />
                    <Button asChild className="h-9 rounded-lg shadow-none" size="sm" variant="outline">
                      <Link to={`/courses/learning-paths/${path.id}`}>{t("learningPathStudio.managePath")}</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function LearningPathStudioDetail({ pathId }: { pathId: string }) {
  const { t, formatError } = useI18n();
  const pathQuery = useLearningPath(pathId);
  const publishedCoursesQuery = useCourses(COURSE_STATUS.published);
  const updateMutation = useUpdateLearningPath(pathId);
  const addCourseMutation = useAddLearningPathCourse(pathId);
  const removeCourseMutation = useRemoveLearningPathCourse(pathId);
  const [courseToAdd, setCourseToAdd] = useState("");

  const form = useForm<LearningPathFormValues>({
    resolver: zodResolver(learningPathFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      status: LEARNING_PATH_STATUS.draft
    }
  });

  useEffect(() => {
    if (!pathQuery.data) {
      return;
    }
    form.reset({
      title: pathQuery.data.title,
      description: pathQuery.data.description ?? "",
      status: pathQuery.data.status as LearningPathFormValues["status"]
    });
  }, [form, pathQuery.data]);

  const linkedCourseIds = useMemo(() => new Set((pathQuery.data?.courses ?? []).map((entry) => entry.course.id)), [pathQuery.data?.courses]);

  const availableCourses = useMemo(() => {
    return (publishedCoursesQuery.data?.items ?? []).filter((course) => !linkedCourseIds.has(course.id));
  }, [linkedCourseIds, publishedCoursesQuery.data?.items]);

  const onSave = async (values: LearningPathFormValues) => {
    try {
      await updateMutation.mutateAsync({
        title: values.title,
        description: values.description?.trim() || null,
        status: values.status
      });
      toast.success(t("learningPathStudio.pathUpdated"));
    } catch (error) {
      toast.error(formatError(error, "learningPathStudio.pathUpdateFailed"));
    }
  };

  const onAddCourse = async () => {
    if (!courseToAdd) {
      return;
    }
    try {
      await addCourseMutation.mutateAsync({ courseId: courseToAdd });
      toast.success(t("learningPathStudio.courseAdded"));
      setCourseToAdd("");
    } catch (error) {
      toast.error(formatError(error, "learningPathStudio.courseAddFailed"));
    }
  };

  const onRemoveCourse = async (courseId: string) => {
    try {
      await removeCourseMutation.mutateAsync(courseId);
      toast.success(t("learningPathStudio.courseRemoved"));
    } catch (error) {
      toast.error(formatError(error, "learningPathStudio.courseRemoveFailed"));
    }
  };

  return (
    <AppShell title={pathQuery.data?.title ?? t("learningPathStudio.detailTitle")} subtitle={t("learningPathStudio.detailSubtitle")}>
      <div className="space-y-6">
        <Button asChild className="h-9 w-fit rounded-lg shadow-none" size="sm" variant="ghost">
          <Link to="/courses/learning-paths">
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            {t("learningPathStudio.backToList")}
          </Link>
        </Button>

        {pathQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("common.loading")}
          </div>
        ) : null}

        {pathQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formatError(pathQuery.error, "errors.unexpected")}
          </div>
        ) : null}

        {pathQuery.data ? (
          <>
            <section className={STUDIO_FORM_SHELL}>
              <form className="grid max-w-2xl gap-4" onSubmit={form.handleSubmit(onSave)} noValidate>
                <FormField id="path-title" label={t("learningPathStudio.pathTitle")} error={form.formState.errors.title?.message}>
                  <Input id="path-title" {...form.register("title")} />
                </FormField>
                <FormField
                  id="path-description"
                  label={t("learningPathStudio.pathDescription")}
                  hint={t("courseDetail.optional")}
                  error={form.formState.errors.description?.message}
                >
                  <TextareaField id="path-description" rows={4} {...form.register("description")} />
                </FormField>
                <FormField id="path-status" label={t("learningPathStudio.pathStatus")} error={form.formState.errors.status?.message}>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="path-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={LEARNING_PATH_STATUS.draft}>{t("courseStatus.DRAFT")}</SelectItem>
                          <SelectItem value={LEARNING_PATH_STATUS.published}>{t("courseStatus.PUBLISHED")}</SelectItem>
                          <SelectItem value={LEARNING_PATH_STATUS.archived}>{t("courseStatus.ARCHIVED")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button className="h-10 rounded-md shadow-none" disabled={updateMutation.isPending || !form.formState.isDirty} type="submit">
                    {updateMutation.isPending ? t("courseDetail.saving") : t("common.save")}
                  </Button>
                </div>
              </form>
            </section>

            <section className={STUDIO_FORM_SHELL}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{t("learningPathStudio.coursesSection")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("learningPathStudio.coursesSectionDescription")}</p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <FormField id="add-course" className="min-w-[min(100%,20rem)] flex-1" label={t("learningPathStudio.addCourse")}>
                    <Select value={courseToAdd} onValueChange={setCourseToAdd}>
                      <SelectTrigger id="add-course" className="h-10 w-full rounded-md border-border/80 shadow-none">
                        <SelectValue placeholder={t("learningPathStudio.selectCourse")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <Button
                    className="h-10 rounded-md shadow-none"
                    disabled={!courseToAdd || addCourseMutation.isPending}
                    type="button"
                    onClick={() => void onAddCourse()}
                  >
                    {addCourseMutation.isPending ? t("learningPathStudio.addingCourse") : t("learningPathStudio.addCourseAction")}
                  </Button>
                </div>

                {!pathQuery.data.courses.length ? (
                  <p className="text-sm text-muted-foreground">{t("learningPaths.noCoursesDescription")}</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {pathQuery.data.courses.map((entry) => (
                      <li key={entry.course.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            <span className="text-muted-foreground">#{entry.sortOrder}</span> {entry.course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.course.status}</p>
                        </div>
                        <Button
                          aria-label={t("learningPathStudio.removeCourse")}
                          className="h-9 rounded-md shadow-none"
                          disabled={removeCourseMutation.isPending}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => void onRemoveCourse(entry.course.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
