import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, CheckCircle2, ClipboardCheck, GripVertical, ListOrdered, Paperclip, PlayCircle, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
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
import {
  STUDIO_CARD_HEADER,
  STUDIO_CHOICE,
  STUDIO_CHOICE_ACTIVE,
  STUDIO_DIVIDER,
  STUDIO_EDITOR_TITLE,
  STUDIO_FORM_STACK,
  STUDIO_LIST,
  STUDIO_LIST_ITEM,
  STUDIO_LIST_ITEM_SELECTED,
  STUDIO_LIST_STICKY,
  STUDIO_PANEL,
  STUDIO_SETTINGS_GRID,
  STUDIO_WORKSPACE_GRID
} from "../lib/studio-layout";
import { AppShell } from "../components/app-shell";
import { CourseArchivedLessonsPanel } from "../components/course-archived-lessons-panel";
import { CourseCreateAssignmentsStep, type PendingAssignment } from "../components/course-create-assignments-step";
import { CourseCreateExamsStep, type PendingExam } from "../components/course-create-exams-step";
import { CourseCreateStepper } from "../components/course-create-stepper";
import { CourseCreateWizardFooter } from "../components/course-create-wizard-footer";
import { CourseCoverFrame } from "../components/course-cover-frame";
import { CourseStatusBadge } from "../components/course-status-badge";
import { CourseCoverUploader } from "../components/course-cover-uploader";
import { FormField } from "../components/form-field";
import { LessonRichTextEditor } from "../components/lesson-rich-text-editor";
import { LessonUploadField } from "../components/lesson-upload-field";
import { CourseListSkeleton } from "../components/skeleton";
import { TextareaField } from "../components/textarea-field";
import { COURSE_STATUS, EXAM_STATUS, LESSON_CONTENT_TYPE, type LessonContentType, toEditableCourseStatus } from "../constants/business";
import { useCourseAssignments } from "../hooks/use-assignments";
import { useCourseDetail, useCourseLessons, useCreateCourse, useCreateLesson, useDeleteLesson, useReorderLessons, useRestoreLesson, useUpdateCourse, useUpdateLesson } from "../hooks/use-courses";
import { useCourseExams } from "../hooks/use-exams";
import {
  COURSE_CREATE_STEP,
  COURSE_CREATE_STEPS,
  getCourseCreateStepIndex,
  getNextCourseCreateStep,
  getPreviousCourseCreateStep,
  isCourseCreateStepId,
  type CourseCreateStepId
} from "../lib/course-create-wizard";
import { buildLessonContentForSubmit, parseLessonContent } from "../lib/lesson-content";
import { assignmentService } from "../services/assignment.service";
import { examService } from "../services/exam.service";
import { createCourseFormSchema, CreateCourseFormValues, createLessonFormSchema, CreateLessonFormValues } from "../schemas/course.schema";
import { courseService, type Course, type Lesson } from "../services/course.service";
import { uploadService, type UploadedFile } from "../services/upload.service";
import { type I18nKey, useI18n } from "../i18n";

function getNextLessonSortOrder(lessons: { sortOrder: number; archivedAt?: string | null }[] | undefined) {
  const activeLessons = (lessons ?? []).filter((lesson) => !lesson.archivedAt);
  const maxSortOrder = activeLessons.reduce((max, lesson) => Math.max(max, lesson.sortOrder), 0);
  return maxSortOrder + 1;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

type PendingLesson = {
  id: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
  progressWeight: number;
  prerequisiteLessonId: string | null;
};

export function CourseCreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId");
  const stepFromUrl = searchParams.get("step");
  const createCourseMutation = useCreateCourse();
  const [courseId, setCourseId] = useState<string | null>(courseIdFromUrl);
  const [activeStep, setActiveStep] = useState<CourseCreateStepId>(() => {
    if (isCourseCreateStepId(stepFromUrl)) {
      return stepFromUrl;
    }
    return COURSE_CREATE_STEP.details;
  });
  const [maxReachedStepIndex, setMaxReachedStepIndex] = useState(
    courseIdFromUrl ? COURSE_CREATE_STEPS.length - 1 : 0
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLessonFile, setIsUploadingLessonFile] = useState(false);
  const [uploadedLessonFile, setUploadedLessonFile] = useState<UploadedFile | null>(null);
  const [hasSubmittedLessonForm, setHasSubmittedLessonForm] = useState(false);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null);
  const [pendingLessons, setPendingLessons] = useState<PendingLesson[]>([]);
  const [pendingExams, setPendingExams] = useState<PendingExam[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const lessonContentReaderRef = useRef<(() => string) | null>(null);
  const reorderSaveTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const courseQuery = useCourseDetail(courseId ?? "");
  const lessonsQuery = useCourseLessons(courseId ?? "", Boolean(courseId));
  const examsQuery = useCourseExams(courseId ?? "", Boolean(courseId));
  const assignmentsQuery = useCourseAssignments(courseId ?? "", Boolean(courseId));
  const createLessonMutation = useCreateLesson(courseId ?? "");
  const updateLessonMutation = useUpdateLesson(courseId ?? "");
  const deleteLessonMutation = useDeleteLesson(courseId ?? "");
  const restoreLessonMutation = useRestoreLesson(courseId ?? "");
  const reorderLessonsMutation = useReorderLessons(courseId ?? "");
  const updateCourseMutation = useUpdateCourse(courseId ?? "");

  const courseForm = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseFormSchema(t)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      level: "",
      language: "",
      durationMinutes: undefined,
      requirements: "",
      outcomes: "",
      coverImageUrl: "",
      priceCents: "",
      currency: "USD",
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
      quizExamId: "",
      liveMeetingUrl: "",
      liveStartsAt: "",
      liveInstructions: "",
      liveDurationMinutes: "",
      sortOrder: 1,
      progressWeight: 1,
      prerequisiteLessonId: null
    }
  });

  const coverImageUrl = courseForm.watch("coverImageUrl");
  const courseStatus = courseForm.watch("status");
  const courseTitle = courseForm.watch("title");
  const courseDescription = courseForm.watch("description");
  const courseCategory = courseForm.watch("category");
  const courseLevel = courseForm.watch("level");
  const courseLanguage = courseForm.watch("language");
  const courseDurationMinutes = courseForm.watch("durationMinutes");
  const courseRequirements = courseForm.watch("requirements");
  const courseOutcomes = courseForm.watch("outcomes");
  const lessonContentType = lessonForm.watch("contentType");
  const lessonContentValue = lessonForm.watch("content");
  const curriculumLessons: Lesson[] = courseId
    ? orderedLessons
    : pendingLessons.map((lesson) => ({
        id: lesson.id,
        courseId: "",
        title: lesson.title,
        contentType: lesson.contentType,
        content: lesson.content,
        sortOrder: lesson.sortOrder,
        progressWeight: lesson.progressWeight ?? 1,
        prerequisiteLessonId: lesson.prerequisiteLessonId ?? null
      }));
  const nextLessonSortOrder = getNextLessonSortOrder(curriculumLessons);
  const isRestoringCourse = Boolean(courseId && courseQuery.isLoading);
  const lessons = curriculumLessons;
  const archivedLessons = (lessonsQuery.data ?? []).filter((lesson) => lesson.archivedAt);
  const editingLessonSortOrder = selectedLessonId
    ? (lessons.find((lesson) => lesson.id === selectedLessonId)?.sortOrder ?? nextLessonSortOrder)
    : nextLessonSortOrder;
  const prerequisiteLessonOptions = lessons.filter(
    (lesson) => lesson.id !== selectedLessonId && lesson.sortOrder < editingLessonSortOrder
  );
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
    },
    {
      value: LESSON_CONTENT_TYPE.quiz,
      icon: ClipboardCheck,
      label: t("lessonType.QUIZ"),
      description: t("courseDetail.quizTypeHint")
    },
    {
      value: LESSON_CONTENT_TYPE.liveSession,
      icon: Video,
      label: t("lessonType.LIVE_SESSION"),
      description: t("courseDetail.liveSessionTypeHint")
    }
  ];
  const publishedExamOptions = useMemo(() => {
    const saved = (examsQuery.data ?? []).filter((exam) => exam.status === EXAM_STATUS.published);
    const pending = pendingExams
      .filter((exam) => exam.payload.status === EXAM_STATUS.published)
      .map((exam) => ({ id: exam.id, title: exam.payload.title }));
    return [...pending, ...saved];
  }, [examsQuery.data, pendingExams]);
  const publishChecks = [
    { label: t("courseDetail.publishRequirementTitle"), done: hasText(courseTitle) },
    { label: t("courseDetail.publishRequirementDescription"), done: hasText(courseDescription) && courseDescription.trim().length >= 10 },
    { label: t("courseDetail.publishRequirementCover"), done: hasText(coverImageUrl) },
    {
      label: t("courseDetail.publishRequirementMetadata"),
      done: hasText(courseCategory) && hasText(courseLevel) && hasText(courseLanguage) && Number(courseDurationMinutes) > 0
    },
    { label: t("courseDetail.publishRequirementRequirements"), done: hasText(courseRequirements) },
    { label: t("courseDetail.publishRequirementOutcomes"), done: hasText(courseOutcomes) },
    { label: t("courseDetail.publishRequirementLessons"), done: lessons.length > 0 }
  ];
  const canPublish = publishChecks.every((item) => item.done);
  const examCount = courseId ? (examsQuery.data?.length ?? 0) : pendingExams.length;
  const assignmentCount = courseId ? (assignmentsQuery.data?.length ?? 0) : pendingAssignments.length;

  const syncWizardParams = (nextCourseId: string | null, stepId: CourseCreateStepId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextCourseId) {
      nextParams.set("courseId", nextCourseId);
      nextParams.set("step", stepId);
    } else {
      nextParams.delete("courseId");
      nextParams.delete("step");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setWizardStep = (stepId: CourseCreateStepId) => {
    setActiveStep(stepId);
    if (courseId) {
      syncWizardParams(courseId, stepId);
    }
  };

  useEffect(() => {
    setCourseId(courseIdFromUrl);
    if (!courseIdFromUrl) {
      setActiveStep(COURSE_CREATE_STEP.details);
      setMaxReachedStepIndex(0);
      return;
    }

    setMaxReachedStepIndex(COURSE_CREATE_STEPS.length - 1);
    if (isCourseCreateStepId(stepFromUrl)) {
      setActiveStep(stepFromUrl);
    }
  }, [courseIdFromUrl, stepFromUrl]);

  useEffect(() => {
    if (!courseQuery.data) {
      return;
    }

    courseForm.reset({
      title: courseQuery.data.title,
      description: courseQuery.data.description ?? "",
      category: courseQuery.data.category ?? "",
      level: courseQuery.data.level ?? "",
      language: courseQuery.data.language ?? "",
      durationMinutes: courseQuery.data.durationMinutes ?? undefined,
      requirements: courseQuery.data.requirements ?? "",
      outcomes: courseQuery.data.outcomes ?? "",
      coverImageUrl: courseQuery.data.coverImageUrl ?? "",
      status: toEditableCourseStatus(courseQuery.data.status)
    });
  }, [courseForm, courseQuery.data]);

  useEffect(() => {
    const activeLessons = (lessonsQuery.data ?? []).filter((lesson) => !lesson.archivedAt);
    setOrderedLessons(activeLessons);
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

  const buildCoursePayload = (values: CreateCourseFormValues) => ({
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    level: values.level.trim(),
    language: values.language.trim(),
    durationMinutes: Number(values.durationMinutes),
    requirements: values.requirements.trim(),
    outcomes: values.outcomes.trim(),
    coverImageUrl: values.coverImageUrl.trim(),
    priceCents: values.priceCents === "" ? 0 : Number(values.priceCents),
    currency: (values.currency ?? "USD").trim().toUpperCase(),
    status: values.status
  });

  const resetCourseFormFromCourse = (course: Course) => {
    courseForm.reset({
      title: course.title,
      description: course.description ?? "",
      category: course.category ?? "",
      level: course.level ?? "",
      language: course.language ?? "",
      durationMinutes: course.durationMinutes ?? undefined,
      requirements: course.requirements ?? "",
      outcomes: course.outcomes ?? "",
      coverImageUrl: course.coverImageUrl ?? "",
      priceCents: course.priceCents ?? 0,
      currency: (course.currency ?? "USD").toUpperCase(),
      status: toEditableCourseStatus(course.status)
    });
  };

  const bindCourseToWizard = (course: Course) => {
    setCourseId(course.id);
    resetCourseFormFromCourse(course);
    syncWizardParams(course.id, activeStep);
  };

  const createCourseDraftFromForm = async (values: CreateCourseFormValues) => {
    const course = await createCourseMutation.mutateAsync({
      ...buildCoursePayload(values),
      status: COURSE_STATUS.draft
    });
    bindCourseToWizard(course);
    return course.id;
  };

  const ensureCourseDraft = async () => {
    if (courseId) {
      return courseId;
    }

    const valid = await courseForm.trigger();
    if (!valid) {
      throw new Error(t("courseStudio.detailsIncomplete"));
    }

    return createCourseDraftFromForm(courseForm.getValues());
  };

  const persistPendingLessonsForCourse = async (targetCourseId: string) => {
    if (pendingLessons.length === 0) {
      return false;
    }

    for (const lesson of pendingLessons) {
      await courseService.createLesson({
        courseId: targetCourseId,
        title: lesson.title,
        contentType: lesson.contentType,
        content: lesson.content,
        sortOrder: lesson.sortOrder,
        progressWeight: lesson.progressWeight,
        prerequisiteLessonId: lesson.prerequisiteLessonId
      });
    }

    setPendingLessons([]);
    await queryClient.invalidateQueries({ queryKey: ["lessons", targetCourseId] });
    await queryClient.invalidateQueries({ queryKey: ["courses", targetCourseId] });
    return true;
  };

  const persistPendingExamsForCourse = async (targetCourseId: string) => {
    if (pendingExams.length === 0) {
      return false;
    }

    for (const exam of pendingExams) {
      await examService.createCourseExam(targetCourseId, exam.payload);
    }

    setPendingExams([]);
    await queryClient.invalidateQueries({ queryKey: ["courses", targetCourseId, "exams"] });
    return true;
  };

  const persistPendingAssignmentsForCourse = async (targetCourseId: string) => {
    if (pendingAssignments.length === 0) {
      return false;
    }

    for (const assignment of pendingAssignments) {
      await assignmentService.createCourseAssignment(targetCourseId, assignment.payload);
    }

    setPendingAssignments([]);
    await queryClient.invalidateQueries({ queryKey: ["courses", targetCourseId, "assignments"] });
    return true;
  };

  const saveCourseDetailsIfNeeded = async () => {
    if (!courseId || !courseForm.formState.isDirty) {
      return false;
    }

    const values = courseForm.getValues();
    const valid = await courseForm.trigger();
    if (!valid) {
      throw new Error(t("courseStudio.detailsIncomplete"));
    }

    const course = await updateCourseMutation.mutateAsync({
      ...buildCoursePayload(values),
      category: values.category.trim() || null,
      level: values.level.trim() || null,
      language: values.language.trim() || null,
      durationMinutes: Number(values.durationMinutes),
      requirements: values.requirements.trim() || null,
      outcomes: values.outcomes.trim() || null,
      coverImageUrl: values.coverImageUrl.trim() || null
    });
    resetCourseFormFromCourse(course);
    return true;
  };

  const persistCurrentStep = async () => {
    if (activeStep === COURSE_CREATE_STEP.details) {
      if (!courseId) {
        const valid = await courseForm.trigger();
        if (!valid) {
          throw new Error(t("courseStudio.detailsIncomplete"));
        }

        await createCourseDraftFromForm(courseForm.getValues());
        return true;
      }

      return saveCourseDetailsIfNeeded();
    }

    if (activeStep === COURSE_CREATE_STEP.lessons) {
      const targetCourseId = await ensureCourseDraft();
      const savedLessons = await persistPendingLessonsForCourse(targetCourseId);
      const savedDetails = courseId ? await saveCourseDetailsIfNeeded() : false;
      return savedLessons || savedDetails;
    }

    if (activeStep === COURSE_CREATE_STEP.exams) {
      const targetCourseId = await ensureCourseDraft();
      return persistPendingExamsForCourse(targetCourseId);
    }

    if (activeStep === COURSE_CREATE_STEP.assignments) {
      const targetCourseId = await ensureCourseDraft();
      return persistPendingAssignmentsForCourse(targetCourseId);
    }

    return false;
  };

  const validateCurrentStep = async () => {
    if (activeStep === COURSE_CREATE_STEP.details) {
      return courseForm.trigger();
    }
    if (activeStep === COURSE_CREATE_STEP.lessons) {
      if (lessons.length < 1) {
        toast.error(t("courseStudio.lessonsRequired"));
        return false;
      }
      return true;
    }
    return true;
  };

  const goToStep = (stepId: CourseCreateStepId) => {
    const index = getCourseCreateStepIndex(stepId);
    if (index <= maxReachedStepIndex) {
      setWizardStep(stepId);
    }
  };

  const goToNextStep = async () => {
    const valid = await validateCurrentStep();
    if (!valid) {
      return;
    }

    setIsSavingStep(true);
    try {
      const saved = await persistCurrentStep();
      if (saved) {
        toast.success(t("courseStudio.stepSaved"));
      }

      const nextStep = getNextCourseCreateStep(activeStep);
      if (!nextStep) {
        return;
      }

      const nextIndex = getCourseCreateStepIndex(nextStep);
      setMaxReachedStepIndex((current) => Math.max(current, nextIndex));
      setWizardStep(nextStep);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseStudio.stepSaveFailed"));
    } finally {
      setIsSavingStep(false);
    }
  };

  const goToPreviousStep = () => {
    const previousStep = getPreviousCourseCreateStep(activeStep);
    if (previousStep) {
      setWizardStep(previousStep);
    }
  };

  const onSaveCourse = async (values: CreateCourseFormValues) => {
    if (!courseId) {
      toast.error(t("courseStudio.detailsIncomplete"));
      setWizardStep(COURSE_CREATE_STEP.details);
      return;
    }

    if (values.status === COURSE_STATUS.published && !canPublish) {
      toast.error(t("courseDetail.publishRequirementsMissing"));
      return;
    }

    setIsSavingStep(true);
    try {
      await persistPendingLessonsForCourse(courseId);
      await persistPendingExamsForCourse(courseId);
      await persistPendingAssignmentsForCourse(courseId);

      const nextStatus =
        values.status === COURSE_STATUS.published && canPublish ? COURSE_STATUS.published : values.status;

      const course = await updateCourseMutation.mutateAsync({
        ...buildCoursePayload(values),
        status: nextStatus,
        category: values.category.trim() || null,
        level: values.level.trim() || null,
        language: values.language.trim() || null,
        durationMinutes: Number(values.durationMinutes),
        requirements: values.requirements.trim() || null,
        outcomes: values.outcomes.trim() || null,
        coverImageUrl: values.coverImageUrl.trim() || null
      });
      resetCourseFormFromCourse(course);
      toast.success(
        nextStatus === COURSE_STATUS.published ? t("courseStudio.courseCreated") : t("courseDetail.courseUpdated")
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.courseUpdateFailed"));
    } finally {
      setIsSavingStep(false);
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
    const lessonId = selectedLessonId;
    const content = buildLessonContentForSubmit(values, uploadedLessonFile);

    if (!courseId) {
      if (lessonId) {
        setPendingLessons((currentLessons) =>
          currentLessons.map((lesson) =>
            lesson.id === lessonId
              ? {
                  ...lesson,
                  title: values.title,
                  contentType: values.contentType,
                  content,
                  progressWeight: values.progressWeight,
                  prerequisiteLessonId: values.prerequisiteLessonId ?? null
                }
              : lesson
          )
        );
        toast.success(t("courseDetail.lessonUpdated"));
      } else {
        setPendingLessons((currentLessons) => [
          ...currentLessons,
          {
            id: crypto.randomUUID(),
            title: values.title,
            contentType: values.contentType,
            content,
            sortOrder: nextLessonSortOrder,
            progressWeight: values.progressWeight,
            prerequisiteLessonId: values.prerequisiteLessonId ?? null
          }
        ]);
        toast.success(t("courseDetail.lessonCreated"));
        lessonForm.reset({
          title: "",
          contentType: LESSON_CONTENT_TYPE.text,
          content: "",
          quizExamId: "",
          liveMeetingUrl: "",
          liveStartsAt: "",
          liveInstructions: "",
          liveDurationMinutes: "",
          sortOrder: nextLessonSortOrder + 1,
          progressWeight: 1,
          prerequisiteLessonId: null
        });
        setSelectedLessonId(null);
        setUploadedLessonFile(null);
      }

      lessonForm.clearErrors();
      setHasSubmittedLessonForm(false);
      return;
    }

    try {
      if (lessonId) {
        await updateLessonMutation.mutateAsync({
          lessonId,
          payload: {
            title: values.title,
            contentType: values.contentType,
            content,
            progressWeight: values.progressWeight,
            prerequisiteLessonId: values.prerequisiteLessonId ?? null
          }
        });
        toast.success(t("courseDetail.lessonUpdated"));
        lessonForm.clearErrors();
        setHasSubmittedLessonForm(false);
      } else {
        await createLessonMutation.mutateAsync({
          ...values,
          sortOrder: nextLessonSortOrder,
          content,
          progressWeight: values.progressWeight,
          prerequisiteLessonId: values.prerequisiteLessonId ?? null
        });
        toast.success(t("courseDetail.lessonCreated"));
        lessonForm.reset({
          title: "",
          contentType: LESSON_CONTENT_TYPE.text,
          content: "",
          quizExamId: "",
          liveMeetingUrl: "",
          liveStartsAt: "",
          liveInstructions: "",
          liveDurationMinutes: "",
          sortOrder: nextLessonSortOrder + 1,
          progressWeight: 1,
          prerequisiteLessonId: null
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

    const content = lessonContentReaderRef.current?.() ?? lessonForm.getValues("content");
    if (typeof content === "string") {
      lessonForm.setValue("content", content, { shouldDirty: true, shouldValidate: true });
    }
  };

  const onLessonFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmittedLessonForm(true);
    syncLessonEditorContent();
    void lessonForm.handleSubmit(onSubmitLesson)();
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

    const sourceIndex = lessons.findIndex((lesson) => lesson.id === sourceLessonId);
    const targetIndex = lessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextLessons = [...lessons];
    const [movedLesson] = nextLessons.splice(sourceIndex, 1);
    nextLessons.splice(targetIndex, 0, movedLesson);

    if (!courseId) {
      setPendingLessons((currentLessons) => {
        const pendingSourceIndex = currentLessons.findIndex((lesson) => lesson.id === sourceLessonId);
        const pendingTargetIndex = currentLessons.findIndex((lesson) => lesson.id === targetLessonId);
        if (pendingSourceIndex < 0 || pendingTargetIndex < 0) {
          return currentLessons;
        }

        const reordered = [...currentLessons];
        const [movedPendingLesson] = reordered.splice(pendingSourceIndex, 1);
        reordered.splice(pendingTargetIndex, 0, movedPendingLesson);
        return reordered.map((lesson, index) => ({ ...lesson, sortOrder: index + 1 }));
      });
      return;
    }

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
      quizExamId: parsedContent.examId ?? "",
      liveMeetingUrl: parsedContent.meetingUrl ?? "",
      liveStartsAt: parsedContent.startsAt ? parsedContent.startsAt.slice(0, 16) : "",
      liveInstructions: parsedContent.instructions ?? "",
      liveDurationMinutes: parsedContent.durationMinutes ?? "",
      sortOrder: lesson.sortOrder,
      progressWeight: lesson.progressWeight ?? 1,
      prerequisiteLessonId: lesson.prerequisiteLessonId ?? null
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
      quizExamId: "",
      liveMeetingUrl: "",
      liveStartsAt: "",
      liveInstructions: "",
      liveDurationMinutes: "",
      sortOrder: nextLessonSortOrder,
      progressWeight: 1,
      prerequisiteLessonId: null
    });
  };

  const confirmDeleteLesson = async () => {
    if (!lessonPendingDelete) {
      return;
    }

    if (!courseId) {
      setPendingLessons((currentLessons) => currentLessons.filter((lesson) => lesson.id !== lessonPendingDelete.id));
      if (selectedLessonId === lessonPendingDelete.id) {
        onNewLesson();
      }
      setLessonPendingDelete(null);
      toast.success(t("courseDetail.lessonArchived"));
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
      toast.success(t("courseDetail.lessonArchived"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.lessonArchiveFailed"));
    }
  };

  const onRestoreArchivedLesson = async (lessonId: string) => {
    if (!courseId) {
      return;
    }

    try {
      await restoreLessonMutation.mutateAsync(lessonId);
      toast.success(t("courseDetail.lessonRestored"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.lessonRestoreFailed"));
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
              <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.status")}</span>
                  <CourseStatusBadge status={courseStatus} label={t(`courseStatus.${courseStatus}` as I18nKey)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-h-24 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
                  <ListOrdered className="mb-2 size-4 text-muted-foreground" aria-hidden />
                  <p className="truncate text-xl font-semibold tabular-nums">{lessonsQuery.isLoading ? "..." : lessons.length}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{t("courseDetail.metricLessons")}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <CourseCreateStepper
          steps={COURSE_CREATE_STEPS}
          currentStep={activeStep}
          maxReachedIndex={maxReachedStepIndex}
          onStepSelect={(stepId) => void goToStep(stepId)}
        />

        {activeStep === COURSE_CREATE_STEP.details ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("courseStudio.courseCreation")}</CardTitle>
                <CardDescription>{courseId ? t("courseStudio.createHint") : t("courseStudio.createDescription")}</CardDescription>
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
            <form
              className={STUDIO_SETTINGS_GRID}
              onSubmit={(event) => {
                event.preventDefault();
                void goToNextStep();
              }}
              noValidate
            >
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

              <div className="grid gap-5">
                <FormField id="course-title" label={t("courseStudio.courseTitle")} error={courseForm.formState.errors.title?.message}>
                  <Input id="course-title" placeholder={t("courseStudio.courseTitlePlaceholder")} {...courseForm.register("title")} />
                </FormField>

                <FormField id="course-description" label={t("courseStudio.courseDescription")} error={courseForm.formState.errors.description?.message}>
                  <TextareaField id="course-description" placeholder={t("courseStudio.courseDescriptionPlaceholder")} rows={5} {...courseForm.register("description")} />
                </FormField>

                <div className={cn(STUDIO_PANEL, "grid gap-3")}>
                  <div>
                    <h2 className="text-sm font-semibold">{t("courseStudio.courseMetadata")}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t("courseStudio.createHint")}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField id="course-category" label={t("courseStudio.courseCategory")} error={courseForm.formState.errors.category?.message}>
                      <Input id="course-category" placeholder={t("courseStudio.courseCategoryPlaceholder")} {...courseForm.register("category")} />
                    </FormField>
                    <FormField id="course-level" label={t("courseStudio.courseLevel")} error={courseForm.formState.errors.level?.message}>
                      <Input id="course-level" placeholder={t("courseStudio.courseLevelPlaceholder")} {...courseForm.register("level")} />
                    </FormField>
                    <FormField id="course-language" label={t("courseStudio.courseLanguage")} error={courseForm.formState.errors.language?.message}>
                      <Input id="course-language" placeholder={t("courseStudio.courseLanguagePlaceholder")} {...courseForm.register("language")} />
                    </FormField>
                    <FormField id="course-duration" label={t("courseStudio.courseDuration")} hint={t("courseStudio.courseDurationUnit")} error={courseForm.formState.errors.durationMinutes?.message}>
                      <Input
                        id="course-duration"
                        inputMode="numeric"
                        min={1}
                        placeholder={t("courseStudio.courseDurationPlaceholder")}
                        type="number"
                        {...courseForm.register("durationMinutes", { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                  <FormField id="course-requirements" label={t("courseStudio.courseRequirements")} error={courseForm.formState.errors.requirements?.message}>
                    <TextareaField id="course-requirements" placeholder={t("courseStudio.courseRequirementsPlaceholder")} rows={4} {...courseForm.register("requirements")} />
                  </FormField>
                  <FormField id="course-outcomes" label={t("courseStudio.courseOutcomes")} error={courseForm.formState.errors.outcomes?.message}>
                    <TextareaField id="course-outcomes" placeholder={t("courseStudio.courseOutcomesPlaceholder")} rows={4} {...courseForm.register("outcomes")} />
                  </FormField>
                </div>

                <div className={cn(STUDIO_PANEL, "grid gap-3")}>
                  <div>
                    <h2 className="text-sm font-semibold">{t("courseDetail.coursePricing")}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.coursePricingDescription")}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      id="course-price"
                      label={t("courseDetail.coursePriceCents")}
                      hint={t("courseDetail.coursePriceCentsHint")}
                      error={courseForm.formState.errors.priceCents?.message}
                    >
                      <Input id="course-price" inputMode="numeric" min={0} type="number" placeholder="0" {...courseForm.register("priceCents")} />
                    </FormField>
                    <FormField
                      id="course-currency"
                      label={t("courseDetail.courseCurrency")}
                      hint={t("courseDetail.courseCurrencyHint")}
                      error={courseForm.formState.errors.currency?.message}
                    >
                      <Input id="course-currency" maxLength={3} placeholder="USD" {...courseForm.register("currency")} />
                    </FormField>
                  </div>
                </div>

                {courseId ? (
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
                ) : null}

                <CourseCreateWizardFooter
                  showBack={false}
                  continueLabel={t("courseStudio.wizardContinue")}
                  continueDisabled={isUploadingCover}
                  continueLoading={isSavingStep || createCourseMutation.isPending || updateCourseMutation.isPending}
                  onBack={goToPreviousStep}
                  onContinue={() => void goToNextStep()}
                />
              </div>
            </form>
            ) : null}
          </CardContent>
        </Card>
        ) : null}

        {activeStep === COURSE_CREATE_STEP.lessons ? (
        <section className="grid gap-4">
        <section className={STUDIO_WORKSPACE_GRID}>
          <Card className="order-2 min-w-0 w-full">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className={STUDIO_EDITOR_TITLE}>{selectedLessonId ? t("courseDetail.editLesson") : t("courseStudio.addLessons")}</CardTitle>
              <CardDescription>{selectedLessonId ? t("courseDetail.editingSelectedLesson") : t("courseStudio.addLessonsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form className={STUDIO_FORM_STACK} onSubmit={onLessonFormSubmit} noValidate>
                <FormField id="new-lesson-title" label={t("courseDetail.lessonTitle")} error={getLessonError(lessonForm.formState.errors.title?.message)}>
                  <Input id="new-lesson-title" placeholder={t("courseDetail.lessonTitlePlaceholder")} {...lessonForm.register("title")} />
                </FormField>

                {prerequisiteLessonOptions.length > 0 ? (
                  <FormField
                    id="new-lesson-prerequisite"
                    label={t("courseDetail.prerequisiteLesson")}
                    hint={t("courseDetail.prerequisiteHint")}
                  >
                    <Controller
                      control={lessonForm.control}
                      name="prerequisiteLessonId"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? "__none__"}
                          onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                        >
                          <SelectTrigger id="new-lesson-prerequisite" className="w-full">
                            <SelectValue placeholder={t("courseDetail.prerequisiteNone")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t("courseDetail.prerequisiteNone")}</SelectItem>
                            {prerequisiteLessonOptions.map((lesson) => (
                              <SelectItem key={lesson.id} value={lesson.id}>
                                {lesson.sortOrder}. {lesson.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                ) : null}

                <FormField
                  id="new-lesson-progress-weight"
                  label={t("courseDetail.progressWeight")}
                  hint={t("courseDetail.progressWeightHint")}
                  error={getLessonError(lessonForm.formState.errors.progressWeight?.message)}
                >
                  <Input
                    id="new-lesson-progress-weight"
                    type="number"
                    min={1}
                    max={100}
                    className="max-w-[8rem]"
                    {...lessonForm.register("progressWeight", { valueAsNumber: true })}
                  />
                </FormField>

                <FormField id="new-lesson-type" label={t("courseDetail.lessonType")} error={getLessonError(lessonForm.formState.errors.contentType?.message)}>
                  <Controller
                    control={lessonForm.control}
                    name="contentType"
                    render={({ field }) => (
                      <div id="new-lesson-type" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label={t("courseDetail.lessonType")}>
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
                                STUDIO_CHOICE,
                                active ? STUDIO_CHOICE_ACTIVE : undefined
                              )}
                              onClick={() => {
                                field.onChange(option.value);
                                lessonForm.setValue("content", "", { shouldDirty: true });
                                lessonForm.setValue("quizExamId", "", { shouldDirty: true });
                                lessonForm.setValue("liveMeetingUrl", "", { shouldDirty: true });
                                lessonForm.setValue("liveStartsAt", "", { shouldDirty: true });
                                lessonForm.setValue("liveInstructions", "", { shouldDirty: true });
                                lessonForm.setValue("liveDurationMinutes", "", { shouldDirty: true });
                                setUploadedLessonFile(null);
                              }}
                            >
                              <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} aria-hidden />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{option.label}</span>
                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>
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
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.resource ? (
                  <FormField id="new-lesson-resource" label={t("courseDetail.resource")} error={getLessonError(lessonForm.formState.errors.content?.message)}>
                    <LessonUploadField
                      id="new-lesson-resource"
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
                      urlInputProps={lessonForm.register("content")}
                    />
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.video ? (
                  <FormField id="new-lesson-video" label={t("courseDetail.video")} error={getLessonError(lessonForm.formState.errors.content?.message)}>
                    <LessonUploadField
                      id="new-lesson-video"
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
                      urlInputProps={lessonForm.register("content")}
                    />
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.quiz ? (
                  <FormField
                    id="new-lesson-quiz-exam"
                    label={t("courseDetail.quizLinkedExam")}
                    hint={t("courseDetail.quizLinkedExamHint")}
                    error={getLessonError(lessonForm.formState.errors.quizExamId?.message)}
                  >
                    <Controller
                      control={lessonForm.control}
                      name="quizExamId"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="new-lesson-quiz-exam" className="h-10 w-full rounded-md border-border/80 shadow-none">
                            <SelectValue placeholder={t("courseDetail.quizLinkedExamPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {publishedExamOptions.length ? (
                              publishedExamOptions.map((exam) => (
                                <SelectItem key={exam.id} value={exam.id}>
                                  {exam.title}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none" disabled>
                                {t("courseDetail.quizNoPublishedExams")}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                ) : null}

                {lessonContentType === LESSON_CONTENT_TYPE.liveSession ? (
                  <>
                    <FormField
                      id="new-lesson-live-url"
                      label={t("courseDetail.liveSessionMeetingUrl")}
                      hint={t("courseDetail.optional")}
                      error={getLessonError(lessonForm.formState.errors.liveMeetingUrl?.message)}
                    >
                      <Input id="new-lesson-live-url" type="url" placeholder={t("courseDetail.liveSessionMeetingUrlPlaceholder")} {...lessonForm.register("liveMeetingUrl")} />
                    </FormField>
                    <FormField
                      id="new-lesson-live-starts"
                      label={t("courseDetail.liveSessionStartsAt")}
                      hint={t("courseDetail.optional")}
                      error={getLessonError(lessonForm.formState.errors.liveStartsAt?.message)}
                    >
                      <Input id="new-lesson-live-starts" type="datetime-local" {...lessonForm.register("liveStartsAt")} />
                    </FormField>
                    <FormField
                      id="new-lesson-live-duration"
                      label={t("courseDetail.liveSessionDurationMinutes")}
                      hint={t("courseDetail.liveSessionDurationHint")}
                      error={getLessonError(lessonForm.formState.errors.liveDurationMinutes?.message)}
                    >
                      <Input
                        id="new-lesson-live-duration"
                        inputMode="numeric"
                        min={5}
                        max={480}
                        type="number"
                        placeholder={t("courseDetail.liveSessionDurationPlaceholder")}
                        {...lessonForm.register("liveDurationMinutes")}
                      />
                    </FormField>
                    <FormField
                      id="new-lesson-live-instructions"
                      label={t("courseDetail.liveSessionInstructions")}
                      hint={t("courseDetail.liveSessionInstructionsHint")}
                      error={getLessonError(lessonForm.formState.errors.liveInstructions?.message)}
                    >
                      <TextareaField id="new-lesson-live-instructions" rows={5} placeholder={t("courseDetail.liveSessionInstructionsPlaceholder")} {...lessonForm.register("liveInstructions")} />
                    </FormField>
                  </>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {selectedLessonId
                      ? t("courseDetail.editingSelectedLesson")
                      : `${t("courseDetail.nextLessonOrder")} #${nextLessonSortOrder}`}
                  </span>
                  <Button className="h-10 rounded-md font-medium shadow-none" disabled={isLessonSubmitPending || isUploadingLessonFile} type="submit">
                    {lessonSubmitLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className={cn("order-1", STUDIO_LIST_STICKY)}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.curriculum")}</CardTitle>
                <CardDescription>{t("courseDetail.curriculumDescription")}</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewLesson}>
                {t("courseDetail.newLesson")}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {courseId && lessonsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
              {(!courseId || !lessonsQuery.isLoading) && lessons.length ? (
                <div className="max-h-[calc(100vh-18rem)] min-h-80 overflow-auto rounded-xl bg-muted/40 p-1.5 ring-1 ring-foreground/10">
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
                              STUDIO_LIST_ITEM,
                              "group cursor-grab active:cursor-grabbing",
                              selected ? STUDIO_LIST_ITEM_SELECTED : undefined,
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
                            aria-label={t("courseDetail.archiveLesson")}
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
              {(!courseId || !lessonsQuery.isLoading) && !lessons.length ? (
                <p className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  {courseId ? t("courseDetail.noLessonsDescription") : t("courseStudio.addFirstLessonHint")}
                </p>
              ) : null}
              {courseId ? (
                <CourseArchivedLessonsPanel
                  lessons={archivedLessons}
                  isRestoring={restoreLessonMutation.isPending}
                  restoringLessonId={restoreLessonMutation.variables ?? null}
                  onRestore={(lessonId) => {
                    void onRestoreArchivedLesson(lessonId);
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        </section>
        <CourseCreateWizardFooter
          showBack
          continueLabel={t("courseStudio.wizardContinue")}
          continueLoading={isSavingStep || createCourseMutation.isPending || updateCourseMutation.isPending}
          onBack={goToPreviousStep}
          onContinue={() => void goToNextStep()}
        />
        </section>
        ) : null}

        {activeStep === COURSE_CREATE_STEP.exams ? (
          <section className="grid gap-4">
            <CourseCreateExamsStep courseId={courseId} pendingExams={pendingExams} onPendingExamsChange={setPendingExams} />
            <CourseCreateWizardFooter
              showBack
              continueLabel={t("courseStudio.wizardContinue")}
              continueLoading={isSavingStep || createCourseMutation.isPending || updateCourseMutation.isPending}
              onBack={goToPreviousStep}
              onContinue={() => void goToNextStep()}
            />
          </section>
        ) : null}

        {activeStep === COURSE_CREATE_STEP.assignments ? (
          <section className="grid gap-4">
            <CourseCreateAssignmentsStep
              courseId={courseId}
              pendingAssignments={pendingAssignments}
              onPendingAssignmentsChange={setPendingAssignments}
            />
            <CourseCreateWizardFooter
              showBack
              continueLabel={t("courseStudio.wizardContinue")}
              continueLoading={isSavingStep || createCourseMutation.isPending || updateCourseMutation.isPending}
              onBack={goToPreviousStep}
              onContinue={() => void goToNextStep()}
            />
          </section>
        ) : null}

        {activeStep === COURSE_CREATE_STEP.review ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("courseStudio.stepReview")}</CardTitle>
              <CardDescription>{t("courseStudio.reviewStepDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseStudio.courseTitle")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{courseTitle || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.metricLessons")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{lessons.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.tabExams")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{examCount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.tabAssignments")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{assignmentCount}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-muted/30 ring-1 ring-foreground/10 p-4">
                <div>
                  <h2 className="text-sm font-semibold">{t("courseDetail.publishRequirements")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("courseStudio.reviewChecklistDescription")}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {publishChecks.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={cn("size-4 shrink-0", item.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/45")} aria-hidden />
                      <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {courseId ? (
                <FormField id="course-status-review" label={t("courseDetail.status")} error={courseForm.formState.errors.status?.message}>
                  <Controller
                    control={courseForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="course-status-review" className="h-10 w-full rounded-md border-border/80 shadow-none">
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
              ) : null}

              <CourseCreateWizardFooter
                showBack
                continueLabel={t("common.save")}
                continueDisabled={
                  isSavingStep ||
                  updateCourseMutation.isPending ||
                  (courseStatus === COURSE_STATUS.published && !canPublish)
                }
                continueLoading={isSavingStep || updateCourseMutation.isPending}
                onBack={goToPreviousStep}
                onContinue={() => void courseForm.handleSubmit(onSaveCourse)()}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
      <AlertDialog open={Boolean(lessonPendingDelete)} onOpenChange={(open) => !open && setLessonPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.archiveLesson")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courseDetail.archiveLessonConfirm")}
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
              {deleteLessonMutation.isPending ? t("courseDetail.lessonArchivePending") : t("courseDetail.archiveLesson")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
