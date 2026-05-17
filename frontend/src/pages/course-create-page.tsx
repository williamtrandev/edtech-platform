import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, GripVertical, ListOrdered, Paperclip, PlayCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AppShell } from "../components/app-shell";
import { CourseCoverFrame } from "../components/course-cover-frame";
import { CourseStatusBadge } from "../components/course-status-badge";
import { CourseCoverUploader } from "../components/course-cover-uploader";
import { FormField } from "../components/form-field";
import { LessonRichTextEditor } from "../components/lesson-rich-text-editor";
import { LessonUploadField } from "../components/lesson-upload-field";
import { CourseListSkeleton } from "../components/skeleton";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import { useCourseDetail, useCourseLessons, useCreateCourse, useCreateLesson, useDeleteLesson, useReorderLessons, useUpdateCourse, useUpdateLesson } from "../features/course/hooks/use-courses";
import { parseLessonContent, serializeLessonContent } from "../lib/lesson-content";
import { createCourseFormSchema, CreateCourseFormValues, createLessonFormSchema, CreateLessonFormValues } from "../schemas/course.schema";
import type { Lesson } from "../services/course.service";
import { uploadService, type UploadedFile } from "../services/upload.service";
import { type I18nKey, useI18n } from "../i18n";

function getNextLessonSortOrder(lessons: { sortOrder: number }[] | undefined) {
  const maxSortOrder = lessons?.reduce((max, lesson) => Math.max(max, lesson.sortOrder), 0) ?? 0;
  return maxSortOrder + 1;
}

type CourseCreateTab = "curriculum" | "settings";

export function CourseCreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId");
  const createCourseMutation = useCreateCourse();
  const [courseId, setCourseId] = useState<string | null>(courseIdFromUrl);
  const [activeTab, setActiveTab] = useState<CourseCreateTab>(courseIdFromUrl ? "curriculum" : "settings");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLessonFile, setIsUploadingLessonFile] = useState(false);
  const [uploadedLessonFile, setUploadedLessonFile] = useState<UploadedFile | null>(null);
  const [hasSubmittedLessonForm, setHasSubmittedLessonForm] = useState(false);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null);
  const lessonContentReaderRef = useRef<(() => string) | null>(null);
  const reorderSaveTimerRef = useRef<number | null>(null);
  const { t } = useI18n();
  const courseQuery = useCourseDetail(courseId ?? "");
  const lessonsQuery = useCourseLessons(courseId ?? "", Boolean(courseId));
  const createLessonMutation = useCreateLesson(courseId ?? "");
  const updateLessonMutation = useUpdateLesson(courseId ?? "");
  const deleteLessonMutation = useDeleteLesson(courseId ?? "");
  const reorderLessonsMutation = useReorderLessons(courseId ?? "");
  const updateCourseMutation = useUpdateCourse(courseId ?? "");

  const courseForm = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseFormSchema(t)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      status: COURSE_STATUS.draft
    }
  });
  const lessonForm = useForm<CreateLessonFormValues>({
    resolver: zodResolver(createLessonFormSchema(t)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      contentType: LESSON_CONTENT_TYPE.text,
      content: "",
      sortOrder: 1
    }
  });

  const coverImageUrl = courseForm.watch("coverImageUrl");
  const courseStatus = courseForm.watch("status");
  const lessonContentType = lessonForm.watch("contentType");
  const lessonContentValue = lessonForm.watch("content");
  const nextLessonSortOrder = getNextLessonSortOrder(orderedLessons);
  const isRestoringCourse = Boolean(courseId && courseQuery.isLoading);
  const lessons = orderedLessons;
  const isLessonSubmitPending = createLessonMutation.isPending || updateLessonMutation.isPending;
  const lessonSubmitLabel = updateLessonMutation.isPending
    ? t("courseDetail.savingLesson")
    : createLessonMutation.isPending
      ? t("courseDetail.creatingLesson")
      : selectedLessonId
        ? t("courseDetail.saveLesson")
        : t("courseDetail.createLesson");
  const lessonTypeOptions = [
    {
      value: LESSON_CONTENT_TYPE.text,
      icon: BookOpenText,
      label: t("lessonType.TEXT"),
      description: t("courseDetail.documentTypeHint")
    },
    {
      value: LESSON_CONTENT_TYPE.video,
      icon: PlayCircle,
      label: t("lessonType.VIDEO"),
      description: t("courseDetail.videoTypeHint")
    },
    {
      value: LESSON_CONTENT_TYPE.resource,
      icon: Paperclip,
      label: t("lessonType.RESOURCE"),
      description: t("courseDetail.resourceTypeHint")
    }
  ];

  useEffect(() => {
    setCourseId(courseIdFromUrl);
    if (!courseIdFromUrl) {
      setActiveTab("settings");
    }
  }, [courseIdFromUrl]);

  useEffect(() => {
    if (!courseQuery.data) {
      return;
    }

    courseForm.reset({
      title: courseQuery.data.title,
      description: courseQuery.data.description ?? "",
      coverImageUrl: courseQuery.data.coverImageUrl ?? "",
      status: courseQuery.data.status
    });
  }, [courseForm, courseQuery.data]);

  useEffect(() => {
    setOrderedLessons(lessonsQuery.data ?? []);
  }, [lessonsQuery.data]);

  useEffect(() => {
    const nextLessons = lessonsQuery.data ?? [];
    if (selectedLessonId && !nextLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(null);
    }
  }, [lessonsQuery.data, selectedLessonId]);

  useEffect(() => {
    return () => {
      if (reorderSaveTimerRef.current) {
        window.clearTimeout(reorderSaveTimerRef.current);
      }
    };
  }, []);

  const onSaveCourse = async (values: CreateCourseFormValues) => {
    try {
      const payload = {
        ...values,
        description: values.description ?? "",
        coverImageUrl: values.coverImageUrl || null
      };
      const course = courseId
        ? await updateCourseMutation.mutateAsync(payload)
        : await createCourseMutation.mutateAsync(payload);

      setCourseId(course.id);
      setActiveTab("curriculum");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("courseId", course.id);
      setSearchParams(nextParams, { replace: true });
      courseForm.reset({
        title: course.title,
        description: course.description ?? "",
        coverImageUrl: course.coverImageUrl ?? "",
        status: course.status
      });
      toast.success(t(courseId ? "courseDetail.courseUpdated" : "courseStudio.courseCreated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(courseId ? "courseDetail.courseUpdateFailed" : "courseStudio.createFailed"));
    }
  };

  const onCoverImageChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingCover(true);
    courseForm.clearErrors("coverImageUrl");
    try {
      const uploaded = await uploadService.uploadCourseCover(file);
      courseForm.setValue("coverImageUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (uploadError) {
      courseForm.setError("coverImageUrl", {
        message: uploadError instanceof Error ? uploadError.message : t("courseStudio.coverUploadFailed")
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const onLessonFileChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingLessonFile(true);
    lessonForm.clearErrors("content");
    try {
      const uploaded = await uploadService.uploadFile(file);
      setUploadedLessonFile(uploaded);
      lessonForm.setValue("content", uploaded.url, { shouldDirty: true });
    } catch (error) {
      lessonForm.setError("content", {
        message: error instanceof Error ? error.message : t("courseDetail.lessonCreateFailed")
      });
    } finally {
      setIsUploadingLessonFile(false);
    }
  };

  const onSubmitLesson = async (values: CreateLessonFormValues) => {
    if (!courseId) {
      toast.error(t("courseStudio.saveCourseFirst"));
      return;
    }

    const lessonId = selectedLessonId;
    const body = values.content.trim();
    const content =
      values.contentType === LESSON_CONTENT_TYPE.text
        ? serializeLessonContent({
            version: 1,
            kind: values.contentType,
            body
          })
        : serializeLessonContent({
            version: 1,
            kind: values.contentType,
            url: body,
            fileName: uploadedLessonFile?.fileName,
            mimeType: uploadedLessonFile?.mimeType,
            size: uploadedLessonFile?.size
          });

    try {
      if (lessonId) {
        await updateLessonMutation.mutateAsync({
          lessonId,
          payload: {
            title: values.title,
            contentType: values.contentType,
            content
          }
        });
        toast.success(t("courseDetail.lessonUpdated"));
        lessonForm.clearErrors();
        setHasSubmittedLessonForm(false);
      } else {
        await createLessonMutation.mutateAsync({
          ...values,
          sortOrder: nextLessonSortOrder,
          content
        });
        toast.success(t("courseDetail.lessonCreated"));
        lessonForm.reset({
          title: "",
          contentType: LESSON_CONTENT_TYPE.text,
          content: "",
          sortOrder: nextLessonSortOrder + 1
        });
        lessonForm.clearErrors();
        setHasSubmittedLessonForm(false);
        setSelectedLessonId(null);
        setUploadedLessonFile(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t(lessonId ? "courseDetail.lessonSaveFailed" : "courseDetail.lessonCreateFailed"));
    }
  };

  const syncLessonEditorContent = () => {
    if (lessonContentType !== LESSON_CONTENT_TYPE.text) {
      return;
    }

    const content = lessonContentReaderRef.current?.();
    if (typeof content === "string") {
      lessonForm.setValue("content", content, { shouldDirty: true, shouldValidate: false });
    }
  };

  const getLessonError = (message?: string) => (hasSubmittedLessonForm ? message : undefined);

  const scheduleLessonOrderSave = (lessonIds: string[]) => {
    if (reorderSaveTimerRef.current) {
      window.clearTimeout(reorderSaveTimerRef.current);
    }

    reorderSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await reorderLessonsMutation.mutateAsync(lessonIds);
        } catch (error) {
          setOrderedLessons(lessonsQuery.data ?? []);
          toast.error(error instanceof Error ? error.message : t("courseDetail.lessonMoveFailed"));
        }
      })();
    }, 5000);
  };

  const onLessonDragStart = (event: DragEvent<HTMLElement>, lessonId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lessonId);
    setDraggingLessonId(lessonId);
  };

  const onLessonDrop = (event: DragEvent<HTMLElement>, targetLessonId: string) => {
    event.preventDefault();
    const sourceLessonId = event.dataTransfer.getData("text/plain") || draggingLessonId;
    setDraggingLessonId(null);

    if (!sourceLessonId || sourceLessonId === targetLessonId) {
      return;
    }

    const sourceIndex = orderedLessons.findIndex((lesson) => lesson.id === sourceLessonId);
    const targetIndex = orderedLessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextLessons = [...orderedLessons];
    const [movedLesson] = nextLessons.splice(sourceIndex, 1);
    nextLessons.splice(targetIndex, 0, movedLesson);
    setOrderedLessons(nextLessons);
    scheduleLessonOrderSave(nextLessons.map((lesson) => lesson.id));
  };

  const onSelectLesson = (lesson: Lesson) => {
    const parsedContent = parseLessonContent(lesson.content, lesson.contentType);
    setSelectedLessonId(lesson.id);
    setHasSubmittedLessonForm(false);
    setUploadedLessonFile(
      parsedContent.url && parsedContent.fileName
        ? {
            url: parsedContent.url,
            fileName: parsedContent.fileName,
            mimeType: parsedContent.mimeType ?? "application/octet-stream",
            size: parsedContent.size ?? 0
          }
        : null
    );
    lessonForm.clearErrors();
    lessonForm.reset({
      title: lesson.title,
      contentType: lesson.contentType,
      content: parsedContent.kind === LESSON_CONTENT_TYPE.text ? parsedContent.body ?? "" : parsedContent.url ?? "",
      sortOrder: lesson.sortOrder
    });
  };

  const onNewLesson = () => {
    setSelectedLessonId(null);
    setHasSubmittedLessonForm(false);
    setUploadedLessonFile(null);
    lessonForm.clearErrors();
    lessonForm.reset({
      title: "",
      contentType: LESSON_CONTENT_TYPE.text,
      content: "",
      sortOrder: nextLessonSortOrder
    });
  };

  const confirmDeleteLesson = async () => {
    if (!lessonPendingDelete) {
      return;
    }

    if (reorderSaveTimerRef.current) {
      window.clearTimeout(reorderSaveTimerRef.current);
      reorderSaveTimerRef.current = null;
    }

    try {
      await deleteLessonMutation.mutateAsync(lessonPendingDelete.id);
      setOrderedLessons((currentLessons) => currentLessons.filter((lesson) => lesson.id !== lessonPendingDelete.id));
      if (selectedLessonId === lessonPendingDelete.id) {
        onNewLesson();
      }
      setLessonPendingDelete(null);
      toast.success(t("courseDetail.lessonDeleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.lessonDeleteFailed"));
    }
  };

  return (
    <AppShell
      title={t("courseStudio.createCourse")}
      subtitle={t("courseStudio.createDescription")}
      actions={
        <Button asChild variant="outline" size="sm" className="h-9 rounded-lg gap-1.5 px-3 shadow-none">
          <Link to="/courses">
            <ArrowLeft className="size-4" aria-hidden />
            {t("nav.courseStudio")}
          </Link>
        </Button>
      }
    >
      <div className="grid gap-5">
        {courseId ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <CourseCoverFrame src={coverImageUrl} className="min-h-0 max-h-[22rem]" emptyLabel={t("courseDetail.coverEmptyTitle")} />
            <div className="grid gap-3 self-start">
              <div className="rounded-lg border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.status")}</span>
                  <CourseStatusBadge status={courseStatus} label={t(`courseStatus.${courseStatus}` as I18nKey)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-h-24 rounded-lg border border-border/70 bg-card p-3">
                  <ListOrdered className="mb-2 size-4 text-muted-foreground" aria-hidden />
                  <p className="truncate text-xl font-semibold tabular-nums">{lessonsQuery.isLoading ? "..." : lessons.length}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{t("courseDetail.metricLessons")}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {courseId ? (
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/70 bg-muted/20 p-1">
            {[
              { id: "curriculum" as const, label: "courseDetail.tabCurriculum" as I18nKey, count: lessons.length },
              { id: "settings" as const, label: "courseDetail.tabSettings" as I18nKey }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                  activeTab === item.id ? "bg-background text-foreground shadow-none" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                {t(item.label)}
                {typeof item.count === "number" ? <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{item.count}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {!courseId || activeTab === "settings" ? (
        <Card className="rounded-lg border-border/70 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("courseStudio.courseCreation")}</CardTitle>
                <CardDescription>{t("courseStudio.draftHint")}</CardDescription>
              </div>
              {courseId ? <CourseStatusBadge status={courseStatus} label={t(`courseStatus.${courseStatus}` as I18nKey)} /> : null}
            </div>
          </CardHeader>
          <CardContent>
            {isRestoringCourse ? <CourseListSkeleton rows={3} /> : null}
            {courseId && courseQuery.isError ? (
              <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                <p>{t("courseStudio.restoreFailed")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-md border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void courseQuery.refetch()}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}
            {!isRestoringCourse && !courseQuery.isError ? (
            <form className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start" onSubmit={courseForm.handleSubmit(onSaveCourse)} noValidate>
              <CourseCoverUploader
                id="course-cover"
                value={coverImageUrl}
                isUploading={isUploadingCover}
                disabled={isUploadingCover}
                error={courseForm.formState.errors.coverImageUrl?.message}
                replaceLabel={t("courseStudio.replaceCover")}
                removeLabel={t("courseStudio.removeCover")}
                uploadingLabel={t("courseStudio.uploadingCover")}
                emptyTitle={t("courseStudio.coverEmptyTitle")}
                emptyDescription={t("courseStudio.coverEmptyDescription")}
                onFileChange={(file) => void onCoverImageChange(file)}
                onRemove={() => courseForm.setValue("coverImageUrl", "", { shouldDirty: true, shouldValidate: true })}
              />

              <div className="grid gap-4">
                <FormField id="course-title" label={t("courseStudio.courseTitle")} error={courseForm.formState.errors.title?.message}>
                  <Input id="course-title" placeholder={t("courseStudio.courseTitlePlaceholder")} {...courseForm.register("title")} />
                </FormField>

                <FormField id="course-description" label={t("courseStudio.courseDescription")} hint={t("courseStudio.optional")} error={courseForm.formState.errors.description?.message}>
                  <TextareaField id="course-description" placeholder={t("courseStudio.courseDescriptionPlaceholder")} rows={5} {...courseForm.register("description")} />
                </FormField>

                <FormField id="course-status" label={t("courseDetail.status")} error={courseForm.formState.errors.status?.message}>
                  <Controller
                    control={courseForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="course-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={COURSE_STATUS.draft}>{t("courseStatus.DRAFT")}</SelectItem>
                          <SelectItem value={COURSE_STATUS.published}>{t("courseStatus.PUBLISHED")}</SelectItem>
                          <SelectItem value={COURSE_STATUS.archived}>{t("courseStatus.ARCHIVED")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <div className="flex flex-wrap justify-end gap-2">
                  {courseId ? (
                    <Button asChild variant="outline" className="h-10 rounded-md font-medium shadow-none">
                      <Link to={`/courses/${courseId}`}>{t("courseStudio.viewCourse")}</Link>
                    </Button>
                  ) : null}
                  <Button
                    className="h-10 rounded-md font-medium shadow-none"
                    disabled={createCourseMutation.isPending || updateCourseMutation.isPending || isUploadingCover || (Boolean(courseId) && !courseForm.formState.isDirty)}
                    type="submit"
                  >
                    {createCourseMutation.isPending
                      ? t("courseStudio.creating")
                      : updateCourseMutation.isPending
                        ? t("courseDetail.saving")
                        : courseId
                          ? t("common.save")
                          : t("courseStudio.createDraft")}
                  </Button>
                </div>
              </div>
            </form>
            ) : null}
          </CardContent>
        </Card>
        ) : null}

        {courseId && activeTab === "curriculum" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
          <Card className="rounded-lg border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedLessonId ? t("courseDetail.editLesson") : t("courseStudio.addLessons")}</CardTitle>
              <CardDescription>{selectedLessonId ? t("courseDetail.editingSelectedLesson") : courseId ? t("courseStudio.addLessonsDescription") : t("courseStudio.saveCourseFirst")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  setHasSubmittedLessonForm(true);
                  syncLessonEditorContent();
                  void lessonForm.handleSubmit(onSubmitLesson)(event);
                }}
                noValidate
              >
                <FormField id="new-lesson-title" label={t("courseDetail.lessonTitle")} error={getLessonError(lessonForm.formState.errors.title?.message)}>
                  <Input id="new-lesson-title" placeholder={t("courseDetail.lessonTitlePlaceholder")} disabled={!courseId} {...lessonForm.register("title")} />
                </FormField>

                <FormField id="new-lesson-type" label={t("courseDetail.lessonType")} error={getLessonError(lessonForm.formState.errors.contentType?.message)}>
                  <Controller
                    control={lessonForm.control}
                    name="contentType"
                    render={({ field }) => (
                      <div id="new-lesson-type" className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={t("courseDetail.lessonType")}>
                        {lessonTypeOptions.map((option) => {
                          const Icon = option.icon;
                          const active = field.value === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              disabled={!courseId}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background hover:bg-muted/60"
                              )}
                              onClick={() => {
                                field.onChange(option.value);
                                lessonForm.setValue("content", "", { shouldDirty: true });
                                setUploadedLessonFile(null);
                              }}
                            >
                              <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-background" : "text-muted-foreground")} aria-hidden />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{option.label}</span>
                                <span className={cn("mt-0.5 block text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>{option.description}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </FormField>

                {lessonContentType === LESSON_CONTENT_TYPE.text ? (
                  <FormField id="new-lesson-content" label={t("courseDetail.document")} error={getLessonError(lessonForm.formState.errors.content?.message)}>
                    {courseId ? (
                      <Controller
                        control={lessonForm.control}
                        name="content"
                        render={({ field }) => (
                          <LessonRichTextEditor
                            key={selectedLessonId ?? "new-lesson"}
                            value={field.value}
                            placeholder={t("courseDetail.documentPlaceholder")}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            onContentReaderChange={(reader) => {
                              lessonContentReaderRef.current = reader;
                            }}
                          />
                        )}
                      />
                    ) : (
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("courseStudio.saveCourseFirst")}</div>
                    )}
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.resource ? (
                  <FormField id="new-lesson-resource" label={t("courseDetail.resource")} error={getLessonError(lessonForm.formState.errors.content?.message)}>
                    <LessonUploadField
                      id="new-lesson-resource"
                      accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                      disabled={!courseId}
                      isUploading={isUploadingLessonFile}
                      uploadedFileName={uploadedLessonFile?.fileName}
                      title={t("courseDetail.uploadResourceTitle")}
                      description={t("courseDetail.uploadResourceDescription")}
                      chooseLabel={t("courseDetail.chooseResourceFile")}
                      uploadingLabel={t("courseDetail.uploadingResource")}
                      urlLabel={t("courseDetail.pasteResourceUrl")}
                      urlPlaceholder={t("courseDetail.resourceUrlPlaceholder")}
                      previewUrl={lessonContentValue}
                      previewKind="resource"
                      previewFileName={uploadedLessonFile?.fileName}
                      previewMimeType={uploadedLessonFile?.mimeType}
                      previewTitle={t("courseDetail.resourcePreview")}
                      previewDescription={t("courseDetail.resourcePreviewDescription")}
                      openPreviewLabel={t("courseDetail.openResourcePreview")}
                      previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                      previewLoadingLabel={t("courseDetail.previewLoading")}
                      previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                      previewEmptyLabel={t("courseDetail.previewEmpty")}
                      Icon={Paperclip}
                      onFileChange={(file) => void onLessonFileChange(file)}
                      onUrlChange={() => setUploadedLessonFile(null)}
                      urlInputProps={lessonForm.register("content")}
                    />
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.video ? (
                  <FormField id="new-lesson-video" label={t("courseDetail.video")} error={getLessonError(lessonForm.formState.errors.content?.message)}>
                    <LessonUploadField
                      id="new-lesson-video"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={!courseId}
                      isUploading={isUploadingLessonFile}
                      uploadedFileName={uploadedLessonFile?.fileName}
                      title={t("courseDetail.uploadVideoTitle")}
                      description={t("courseDetail.uploadVideoDescription")}
                      chooseLabel={t("courseDetail.chooseVideoFile")}
                      uploadingLabel={t("courseDetail.uploadingVideo")}
                      urlLabel={t("courseDetail.pasteVideoUrl")}
                      urlPlaceholder={t("courseDetail.videoUrlPlaceholder")}
                      previewUrl={lessonContentValue}
                      previewKind="video"
                      previewFileName={uploadedLessonFile?.fileName}
                      previewMimeType={uploadedLessonFile?.mimeType}
                      previewTitle={t("courseDetail.videoPreview")}
                      previewDescription={t("courseDetail.videoPreviewDescription")}
                      openPreviewLabel={t("courseDetail.openVideoPreview")}
                      previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                      previewLoadingLabel={t("courseDetail.previewLoading")}
                      previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                      previewEmptyLabel={t("courseDetail.previewEmpty")}
                      Icon={PlayCircle}
                      onFileChange={(file) => void onLessonFileChange(file)}
                      onUrlChange={() => setUploadedLessonFile(null)}
                      urlInputProps={lessonForm.register("content")}
                    />
                  </FormField>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <span className="text-xs text-muted-foreground">
                    {selectedLessonId ? t("courseDetail.editingSelectedLesson") : courseId ? `${t("courseDetail.nextLessonOrder")} #${nextLessonSortOrder}` : t("courseStudio.saveCourseFirst")}
                  </span>
                  <Button className="h-10 rounded-md font-medium shadow-none" disabled={!courseId || isLessonSubmitPending || isUploadingLessonFile} type="submit">
                    {lessonSubmitLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border/70 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">{t("courseDetail.curriculum")}</CardTitle>
                <CardDescription>{t("courseDetail.curriculumDescription")}</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewLesson}>
                {t("courseDetail.newLesson")}
              </Button>
            </CardHeader>
            <CardContent>
              {courseId && lessonsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
              {courseId && !lessonsQuery.isLoading && lessons.length ? (
                <div className="max-h-[calc(100vh-18rem)] min-h-80 overflow-auto rounded-lg border border-border/70 p-2">
                  <div className="grid gap-1" role="list" aria-label={t("courseDetail.curriculum")}>
                    {lessons.map((lesson, index) => {
                      const selected = selectedLessonId === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          draggable
                          role="listitem"
                          tabIndex={0}
                          className={cn(
                            "group flex cursor-grab items-start gap-2 rounded-md border px-2.5 py-2.5 text-left transition-colors active:cursor-grabbing",
                            selected ? "border-foreground bg-muted/70" : "border-transparent hover:border-border/70 hover:bg-muted/40",
                            draggingLessonId === lesson.id ? "opacity-60" : undefined
                          )}
                          onClick={() => onSelectLesson(lesson)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectLesson(lesson);
                            }
                          }}
                          onDragStart={(event) => onLessonDragStart(event, lesson.id)}
                          onDragEnd={() => setDraggingLessonId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => onLessonDrop(event, lesson.id)}
                        >
                          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
                              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                                {t(`lessonType.${lesson.contentType}` as I18nKey)}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-foreground">{lesson.title}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                            disabled={deleteLessonMutation.isPending}
                            aria-label={t("courseDetail.deleteLesson")}
                            onClick={(event) => {
                              event.stopPropagation();
                              setLessonPendingDelete(lesson);
                            }}
                            type="button"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {(!courseId || (!lessonsQuery.isLoading && !lessons.length)) ? (
                <p className="rounded-lg border border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {courseId ? t("courseDetail.noLessonsDescription") : t("courseStudio.saveCourseFirst")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
        ) : null}
      </div>
      <AlertDialog open={Boolean(lessonPendingDelete)} onOpenChange={(open) => !open && setLessonPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.deleteLesson")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courseDetail.deleteLessonConfirm")}
              {lessonPendingDelete ? <span className="mt-2 block font-medium text-foreground">{lessonPendingDelete.title}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLessonMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              disabled={deleteLessonMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteLesson();
              }}
            >
              {deleteLessonMutation.isPending ? t("courseDetail.lessonDeletePending") : t("courseDetail.deleteLesson")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
