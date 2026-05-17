import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, CheckCircle2, GripVertical, ListOrdered, Paperclip, PlayCircle, Search, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AppShell } from "../components/app-shell";
import { LessonRichTextEditor } from "../components/lesson-rich-text-editor";
import { CourseCoverFrame } from "../components/course-cover-frame";
import { CourseStatusBadge } from "../components/course-status-badge";
import { CourseCoverUploader } from "../components/course-cover-uploader";
import { EmptyState } from "../components/empty-state";
import { FormField } from "../components/form-field";
import { CourseListSkeleton } from "../components/skeleton";
import { LessonUploadField } from "../components/lesson-upload-field";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS, LESSON_CONTENT_TYPE, USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import {
  useArchiveCourse,
  useCourseDetail,
  useCourseEnrollments,
  useCourseLessons,
  useCreateLesson,
  useDeleteLesson,
  useReorderLessons,
  useUpdateLesson,
  useUpdateCourse
} from "../features/course/hooks/use-courses";
import { useEnrollCourse } from "../features/enrollment/hooks/use-enrollments";
import { useCurrentUser } from "../features/user/hooks/use-current-user";
import { useCompleteLesson, useCourseProgress } from "../features/progress/hooks/use-progress";
import { parseLessonContent, serializeLessonContent } from "../lib/lesson-content";
import { createLessonFormSchema, CreateLessonFormValues, updateCourseFormSchema, UpdateCourseFormValues } from "../schemas/course.schema";
import { uploadService, type UploadedFile } from "../services/upload.service";
import type { Lesson } from "../services/course.service";
import { type I18nKey, useI18n } from "../i18n";

function getNextLessonSortOrder(lessons: { sortOrder: number }[] | undefined) {
  const maxSortOrder = lessons?.reduce((max, lesson) => Math.max(max, lesson.sortOrder), 0) ?? 0;
  return maxSortOrder + 1;
}

type CourseDetailTab = "curriculum" | "learners" | "settings";

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
  const updateLessonMutation = useUpdateLesson(courseId);
  const reorderLessonsMutation = useReorderLessons(courseId);
  const deleteLessonMutation = useDeleteLesson(courseId);
  const completeLessonMutation = useCompleteLesson(courseId);
  const archiveCourseMutation = useArchiveCourse();
  const updateCourseMutation = useUpdateCourse(courseId);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLessonFile, setIsUploadingLessonFile] = useState(false);
  const [uploadedLessonFile, setUploadedLessonFile] = useState<UploadedFile | null>(null);
  const [activeTab, setActiveTab] = useState<CourseDetailTab>("curriculum");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
  const [hasSubmittedLessonForm, setHasSubmittedLessonForm] = useState(false);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null);
  const reorderSaveTimerRef = useRef<number | null>(null);
  const lessonContentReaderRef = useRef<(() => string) | null>(null);
  const { t } = useI18n();

  const canManageCourse =
    meQuery.data?.role === USER_ROLE.admin ||
    (meQuery.data?.role === USER_ROLE.instructor && courseQuery.data?.instructorId === meQuery.data.id);

  const isLearner = meQuery.data?.role === USER_ROLE.user;
  const isCoursePublished = courseQuery.data?.status === COURSE_STATUS.published;
  const nextLessonSortOrder = getNextLessonSortOrder(lessonQuery.data);

  const enrollmentsQuery = useCourseEnrollments(courseId, Boolean(canManageCourse && courseQuery.data), enrollmentPage, learnerSearch.trim());
  const enrollments = enrollmentsQuery.data?.items ?? [];
  const enrollmentsTotal = enrollmentsQuery.data?.pagination.total ?? 0;
  const enrollmentsTotalPages = Math.max(1, Math.ceil(enrollmentsTotal / 20));
  const lessons = orderedLessons;

  const courseForm = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      status: COURSE_STATUS.draft
    }
  });

  const form = useForm<CreateLessonFormValues>({
    resolver: zodResolver(createLessonFormSchema(t)),
    defaultValues: {
      title: "",
      contentType: LESSON_CONTENT_TYPE.text,
      content: "",
      sortOrder: 1
    }
  });

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
    const nextLessons = lessonQuery.data ?? [];
    setOrderedLessons(nextLessons);
  }, [lessonQuery.data]);

  useEffect(() => {
    const nextLessons = lessonQuery.data ?? [];
    if (selectedLessonId && !nextLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(null);
    }
  }, [lessonQuery.data, selectedLessonId]);

  useEffect(() => {
    return () => {
      if (reorderSaveTimerRef.current) {
        window.clearTimeout(reorderSaveTimerRef.current);
      }
    };
  }, []);

  const onSubmitLesson = async (values: CreateLessonFormValues) => {
    const lessonId = selectedLessonId;
    const sortOrder = nextLessonSortOrder;
    const hasSortOrderConflict = !lessonId && lessonQuery.data?.some((lesson) => lesson.sortOrder === sortOrder);
    if (hasSortOrderConflict) {
      form.setError("sortOrder", {
        message: `Order ${sortOrder} is already used. Refresh course lessons and try again.`
      });
      toast.error("Lesson order already exists");
      return;
    }

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
        form.clearErrors();
        setHasSubmittedLessonForm(false);
      } else {
        await createLessonMutation.mutateAsync({ ...values, sortOrder, content });
        toast.success(t("courseDetail.lessonCreated"));
        form.reset({
          title: "",
          contentType: LESSON_CONTENT_TYPE.text,
          content: "",
          sortOrder: sortOrder + 1
        });
        form.clearErrors();
        setHasSubmittedLessonForm(false);
        setSelectedLessonId(null);
        setUploadedLessonFile(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lessonId ? "courseDetail.lessonSaveFailed" : "courseDetail.lessonCreateFailed"));
    }
  };

  const onUpdateCourse = async (values: UpdateCourseFormValues) => {
    try {
      await updateCourseMutation.mutateAsync({
        title: values.title,
        description: values.description ?? "",
        coverImageUrl: values.coverImageUrl || null,
        status: values.status
      });
      toast.success(t("courseDetail.courseUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.courseUpdateFailed"));
    }
  };

  const onCourseCoverChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingCover(true);
    courseForm.clearErrors("coverImageUrl");
    try {
      const uploaded = await uploadService.uploadCourseCover(file);
      courseForm.setValue("coverImageUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (e) {
      courseForm.setError("coverImageUrl", {
        message: e instanceof Error ? e.message : t("courseDetail.coverUploadFailed")
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
    form.clearErrors("content");
    try {
      const uploaded = await uploadService.uploadFile(file);
      setUploadedLessonFile(uploaded);
      form.setValue("content", uploaded.url, { shouldDirty: true });
    } catch (e) {
      form.setError("content", {
        message: e instanceof Error ? e.message : "Could not upload file"
      });
    } finally {
      setIsUploadingLessonFile(false);
    }
  };

  const scheduleLessonOrderSave = (lessonIds: string[]) => {
    if (reorderSaveTimerRef.current) {
      window.clearTimeout(reorderSaveTimerRef.current);
    }

    reorderSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await reorderLessonsMutation.mutateAsync(lessonIds);
        } catch (e) {
          setOrderedLessons(lessonQuery.data ?? []);
          toast.error(e instanceof Error ? e.message : t("courseDetail.lessonMoveFailed"));
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
    form.clearErrors();
    form.reset({
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
    form.clearErrors();
    form.reset({
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
      if (selectedLessonId === lessonPendingDelete.id) {
        onNewLesson();
      }
      setLessonPendingDelete(null);
      toast.success(t("courseDetail.lessonDeleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.lessonDeleteFailed"));
    }
  };

  const loadingMetrics = courseQuery.isLoading || lessonQuery.isLoading || (isAuthenticated && progressQuery.isLoading);
  const lessonContentType = form.watch("contentType");
  const lessonContentValue = form.watch("content");
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

  const syncLessonEditorContent = () => {
    if (lessonContentType !== LESSON_CONTENT_TYPE.text) {
      return;
    }

    const content = lessonContentReaderRef.current?.();
    if (typeof content === "string") {
      form.setValue("content", content, { shouldDirty: true, shouldValidate: false });
    }
  };
  const getLessonError = (message?: string) => (hasSubmittedLessonForm ? message : undefined);
  const tabItems: { id: CourseDetailTab; label: I18nKey; count?: number; managerOnly?: boolean }[] = [
    { id: "curriculum", label: "courseDetail.tabCurriculum", count: lessons.length },
    { id: "learners", label: "courseDetail.tabLearners", count: enrollmentsTotal, managerOnly: true },
    { id: "settings", label: "courseDetail.tabSettings", managerOnly: true }
  ];
  const visibleTabs = tabItems.filter((item) => !item.managerOnly || canManageCourse);

  return (
    <AppShell
      title={courseQuery.data?.title ?? t("courseDetail.title")}
      subtitle={t("courseDetail.subtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isAuthenticated && isCoursePublished ? (
            <Button asChild size="sm" className="rounded-lg shadow-none">
              <Link to="/login">{t("courseDetail.signInToEnroll")}</Link>
            </Button>
          ) : null}
          {isAuthenticated && isLearner && isCoursePublished ? (
            <Button
              size="sm"
              className="rounded-lg shadow-none"
              disabled={enrollMutation.isPending}
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await enrollMutation.mutateAsync(courseId);
                    toast.success(t("courseDetail.enrolled"));
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : t("courseDetail.enrollFailed"));
                  }
                })();
              }}
            >
              {enrollMutation.isPending ? t("courseDetail.enrolling") : t("courseDetail.enroll")}
            </Button>
          ) : null}
          {canManageCourse && courseQuery.data?.status !== COURSE_STATUS.archived ? (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-lg shadow-none"
              disabled={archiveCourseMutation.isPending}
              type="button"
              onClick={() => {
                if (!window.confirm(t("courseDetail.archiveConfirm"))) {
                  return;
                }
                void (async () => {
                  try {
                    await archiveCourseMutation.mutateAsync(courseId);
                    toast.success(t("courseDetail.courseArchived"));
                    navigate("/courses", { replace: true });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : t("courseDetail.archiveFailed"));
                  }
                })();
              }}
            >
              {archiveCourseMutation.isPending ? t("courseDetail.archiving") : t("courseDetail.archiveCourse")}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg gap-1.5 px-3 shadow-none">
            <Link to={canManageCourse ? "/courses" : "/explore"}>
              <ArrowLeft className="size-4" />
              {canManageCourse ? t("nav.courseStudio") : t("nav.explore")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <CourseCoverFrame src={courseQuery.data?.coverImageUrl} className="min-h-0 max-h-[22rem]" emptyLabel={t("courseDetail.coverEmptyTitle")} />
          <div className="grid gap-3 self-start">
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.status")}</span>
                {courseQuery.data ? (
                  <CourseStatusBadge status={courseQuery.data.status} label={t(`courseStatus.${courseQuery.data.status}` as I18nKey)} />
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ListOrdered, label: t("courseDetail.metricLessons"), value: lessons.length },
                { icon: CheckCircle2, label: t("courseDetail.metricCompletion"), value: isAuthenticated ? `${progressQuery.data?.percentage ?? 0}%` : t("courseDetail.signIn") },
                { icon: Users, label: t("courseDetail.metricLearners"), value: enrollmentsTotal }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-h-24 rounded-lg border border-border/70 bg-card p-3">
                    <Icon className="mb-2 size-4 text-muted-foreground" aria-hidden />
                    <p className="truncate text-xl font-semibold tabular-nums">{loadingMetrics ? "..." : item.value}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/70 bg-muted/20 p-1">
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                activeTab === item.id ? "bg-background text-foreground shadow-none" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              {t(item.label)}
              {typeof item.count === "number" ? <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{item.count}</span> : null}
            </button>
          ))}
        </div>

        {activeTab === "curriculum" ? (
          <section className={cn("grid gap-4", canManageCourse ? "xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start" : undefined)}>
            {canManageCourse ? (
              <Card className="rounded-lg border-border/70 shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div>
                    <CardTitle className="text-base">{selectedLessonId ? t("courseDetail.editLesson") : t("courseDetail.addLesson")}</CardTitle>
                    <CardDescription>{t("courseDetail.addLessonDescription")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                      setHasSubmittedLessonForm(true);
                      syncLessonEditorContent();
                      void form.handleSubmit(onSubmitLesson)(event);
                    }}
                    noValidate
                  >
                    <FormField id="lesson-title" label={t("courseDetail.lessonTitle")} error={getLessonError(form.formState.errors.title?.message)}>
                      <Input id="lesson-title" placeholder={t("courseDetail.lessonTitlePlaceholder")} {...form.register("title")} />
                    </FormField>

                    <FormField id="lesson-type" label={t("courseDetail.lessonType")} error={getLessonError(form.formState.errors.contentType?.message)}>
                      <Controller
                        control={form.control}
                        name="contentType"
                        render={({ field }) => (
                          <div id="lesson-type" className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={t("courseDetail.lessonType")}>
                            {lessonTypeOptions.map((option) => {
                              const Icon = option.icon;
                              const active = field.value === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  className={cn(
                                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                                    active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background hover:bg-muted/60"
                                  )}
                                  onClick={() => {
                                    field.onChange(option.value);
                                    form.setValue("content", "", { shouldDirty: true });
                                    setUploadedLessonFile(null);
                                  }}
                                >
                                  <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-background" : "text-muted-foreground")} aria-hidden />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium">{option.label}</span>
                                    <span className={cn("mt-0.5 block text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>
                                      {option.description}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      />
                    </FormField>

                    {lessonContentType === LESSON_CONTENT_TYPE.text ? (
                      <FormField id="lesson-content" label={t("courseDetail.document")} error={getLessonError(form.formState.errors.content?.message)}>
                        <Controller
                          control={form.control}
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
                      </FormField>
                    ) : null}

                    {lessonContentType === LESSON_CONTENT_TYPE.resource ? (
                      <FormField id="lesson-resource" label={t("courseDetail.resource")} error={getLessonError(form.formState.errors.content?.message)}>
                        <LessonUploadField
                          id="lesson-resource"
                          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
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
                          urlInputProps={form.register("content")}
                        />
                      </FormField>
                    ) : null}

                    {lessonContentType === LESSON_CONTENT_TYPE.video ? (
                      <FormField id="lesson-video" label={t("courseDetail.video")} error={getLessonError(form.formState.errors.content?.message)}>
                        <LessonUploadField
                          id="lesson-video"
                          accept="video/mp4,video/webm,video/quicktime"
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
                          urlInputProps={form.register("content")}
                        />
                      </FormField>
                    ) : null}

                    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedLessonId ? t("courseDetail.editingSelectedLesson") : `${t("courseDetail.nextLessonOrder")} #${nextLessonSortOrder}`}
                      </span>
                      <Button
                        className="h-10 rounded-md font-medium shadow-none"
                        disabled={isLessonSubmitPending}
                        type="submit"
                      >
                        {lessonSubmitLabel}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-lg border-border/70 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">{t("courseDetail.curriculum")}</CardTitle>
                  <CardDescription>{t("courseDetail.curriculumDescription")}</CardDescription>
                </div>
                {canManageCourse ? (
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewLesson}>
                    {t("courseDetail.newLesson")}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {lessonQuery.isLoading ? <CourseListSkeleton rows={5} /> : null}
                {lessonQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.lessonsLoadFailed")}
                  </div>
                ) : null}
                {!lessonQuery.isLoading && !lessonQuery.isError ? (
                  lessons.length ? (
                    <div className="max-h-[calc(100vh-18rem)] min-h-80 overflow-auto rounded-lg border border-border/70 p-2">
                      <div className="grid gap-1" role="list" aria-label={t("courseDetail.curriculum")}>
                        {lessons.map((lesson, index) => {
                          const selected = selectedLessonId === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              draggable={canManageCourse}
                              role="listitem"
                              tabIndex={canManageCourse ? 0 : undefined}
                              className={cn(
                                "group flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2.5 text-left transition-colors",
                                selected ? "border-foreground bg-muted/70" : "border-transparent hover:border-border/70 hover:bg-muted/40",
                                draggingLessonId === lesson.id ? "opacity-60" : undefined,
                                canManageCourse ? "cursor-grab active:cursor-grabbing" : undefined
                              )}
                              onClick={() => {
                                if (canManageCourse) {
                                  onSelectLesson(lesson);
                                }
                              }}
                              onKeyDown={(event) => {
                                if (!canManageCourse) {
                                  return;
                                }
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onSelectLesson(lesson);
                                }
                              }}
                              onDragStart={(event) => {
                                if (canManageCourse) {
                                  onLessonDragStart(event, lesson.id);
                                }
                              }}
                              onDragEnd={() => setDraggingLessonId(null)}
                              onDragOver={(event) => {
                                if (canManageCourse) {
                                  event.preventDefault();
                                }
                              }}
                              onDrop={(event) => {
                                if (canManageCourse) {
                                  onLessonDrop(event, lesson.id);
                                }
                              }}
                            >
                              {canManageCourse ? <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
                                  <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                                    {t(`lessonType.${lesson.contentType}` as I18nKey)}
                                  </Badge>
                                </div>
                                <p className="mt-1 truncate text-sm font-medium text-foreground">{lesson.title}</p>
                              </div>
                              {canManageCourse ? (
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
                              ) : isAuthenticated ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 shrink-0 rounded-md"
                                  disabled={completeLessonMutation.isPending}
                                  onClick={() => void completeLessonMutation.mutateAsync(lesson.id)}
                                  type="button"
                                >
                                  {t("courseDetail.markComplete")}
                                </Button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={BookOpenText} title={t("courseDetail.noLessons")} description={t("courseDetail.noLessonsDescription")} />
                  )
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {activeTab === "learners" && canManageCourse ? (
          <Card className="rounded-lg border-border/70 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">{t("courseDetail.enrolledLearners")}</CardTitle>
                <CardDescription>{t("courseDetail.enrolledLearnersDescription")}</CardDescription>
              </div>
              <div className="relative w-72 max-w-full">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden />
                <Input
                  className="h-9 rounded-md pl-9"
                  placeholder={t("courseDetail.searchLearners")}
                  value={learnerSearch}
                  onChange={(event) => {
                    setLearnerSearch(event.target.value);
                    setEnrollmentPage(1);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {enrollmentsQuery.isLoading ? <CourseListSkeleton rows={5} /> : null}
              {enrollmentsQuery.isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {t("courseDetail.enrollmentsLoadFailed")}
                </div>
              ) : null}
              {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError ? (
                enrollments.length ? (
                  <div className="space-y-3">
                    <div className="max-h-[520px] overflow-auto rounded-lg border border-border/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("common.email")}</TableHead>
                            <TableHead className="w-40">{t("common.role")}</TableHead>
                            <TableHead className="w-56 text-right">{t("courseDetail.enrolledAt")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.user.email}</TableCell>
                              <TableCell>{t(`role.${row.user.role}` as I18nKey)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{new Date(row.enrolledAt).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>
                        {t("courseDetail.page")} {enrollmentPage} / {enrollmentsTotalPages} · {enrollmentsTotal} {t("courseDetail.learners")}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          disabled={enrollmentPage <= 1}
                          onClick={() => setEnrollmentPage((page) => Math.max(1, page - 1))}
                          type="button"
                        >
                          {t("courseDetail.previous")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          disabled={enrollmentPage >= enrollmentsTotalPages}
                          onClick={() => setEnrollmentPage((page) => Math.min(enrollmentsTotalPages, page + 1))}
                          type="button"
                        >
                          {t("courseDetail.next")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Users} title={t("courseDetail.noEnrollments")} description={t("courseDetail.noEnrollmentsDescription")} />
                )
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "settings" && canManageCourse ? (
          <Card className="rounded-lg border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("courseDetail.courseSettings")}</CardTitle>
              <CardDescription>{t("courseDetail.courseSettingsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {courseQuery.isLoading ? (
                <CourseListSkeleton rows={3} />
              ) : (
                <form className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]" onSubmit={courseForm.handleSubmit(onUpdateCourse)} noValidate>
                  <div className="grid gap-3 self-start">
                    <CourseCoverUploader
                      id="edit-course-cover"
                      value={courseForm.watch("coverImageUrl")}
                      isUploading={isUploadingCover}
                      disabled={isUploadingCover}
                      error={courseForm.formState.errors.coverImageUrl?.message}
                      replaceLabel={t("courseDetail.replaceCover")}
                      removeLabel={t("courseDetail.removeCover")}
                      uploadingLabel={t("courseDetail.uploadingCover")}
                      emptyTitle={t("courseDetail.coverEmptyTitle")}
                      emptyDescription={t("courseDetail.coverEmptyDescription")}
                      onFileChange={(file) => void onCourseCoverChange(file)}
                      onRemove={() => courseForm.setValue("coverImageUrl", "", { shouldDirty: true, shouldValidate: true })}
                    />
                  </div>

                  <div className="grid gap-4">
                    <FormField id="edit-course-title" label={t("courseDetail.courseTitle")} error={courseForm.formState.errors.title?.message}>
                      <Input id="edit-course-title" placeholder={t("courseDetail.courseTitlePlaceholder")} {...courseForm.register("title")} />
                    </FormField>

                    <FormField
                      id="edit-course-description"
                      label={t("courseDetail.courseDescription")}
                      hint={t("courseDetail.optional")}
                      error={courseForm.formState.errors.description?.message}
                    >
                      <TextareaField id="edit-course-description" placeholder={t("courseDetail.courseDescriptionPlaceholder")} rows={5} {...courseForm.register("description")} />
                    </FormField>

                    <FormField id="edit-course-status" label={t("courseDetail.status")} error={courseForm.formState.errors.status?.message}>
                      <Controller
                        control={courseForm.control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="edit-course-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
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

                    <div className="flex justify-end">
                      <Button className="h-10 rounded-md font-medium shadow-none" disabled={updateCourseMutation.isPending || !courseForm.formState.isDirty} type="submit">
                        {updateCourseMutation.isPending ? t("courseDetail.saving") : t("common.save")}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
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
