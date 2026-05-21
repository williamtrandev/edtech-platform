import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Globe2, GripVertical, Layers3, ListOrdered, Paperclip, PlayCircle, Search, Star, Target, Trash2, Users } from "lucide-react";
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
import { COURSE_STATUS, EXAM_ATTEMPT_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS, LESSON_CONTENT_TYPE, USER_ROLE } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import {
  useArchiveCourse,
  useCourseDetail,
  useCourseEnrollments,
  useCourseLessons,
  useCourseReviews,
  useCreateLesson,
  useDeleteMyCourseReview,
  useDeleteLesson,
  useReorderLessons,
  useUpsertMyCourseReview,
  useUpdateLesson,
  useUpdateCourse
} from "../hooks/use-courses";
import { useEnrollCourse, useMyEnrollments } from "../hooks/use-enrollments";
import { useArchiveExam, useCourseExams, useCreateExam, useCreateExamQuestion, useDeleteExamQuestion, useExamAttempt, useExamQuestions, useStartExamAttempt, useSubmitExamAttempt, useUpdateExam, useUpdateExamQuestion } from "../hooks/use-exams";
import { useCurrentUser } from "../hooks/use-current-user";
import { useCompleteLesson, useCourseLessonProgress, useCourseProgress } from "../hooks/use-progress";
import { parseLessonContent, serializeLessonContent } from "../lib/lesson-content";
import { createExamFormSchema, createExamQuestionFormSchema, createLessonFormSchema, CreateLessonFormValues, ExamFormValues, ExamQuestionFormValues, updateCourseFormSchema, UpdateCourseFormValues } from "../schemas/course.schema";
import { uploadService, type UploadedFile } from "../services/upload.service";
import type { Exam, ExamAttemptSession, ExamQuestion, ExamQuestionOption } from "../services/exam.service";
import type { Lesson } from "../services/course.service";
import { type I18nKey, useI18n } from "../i18n";

function getNextLessonSortOrder(lessons: { sortOrder: number }[] | undefined) {
  const maxSortOrder = lessons?.reduce((max, lesson) => Math.max(max, lesson.sortOrder), 0) ?? 0;
  return maxSortOrder + 1;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function toQuestionOptionId(index: number) {
  return String.fromCharCode(65 + index);
}

function parseQuestionOptions(value: string | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const explicitIdMatch = /^([A-Za-z0-9]{1,6})[\).:-]\s+(.+)$/.exec(line);
      return {
        id: explicitIdMatch ? explicitIdMatch[1].toUpperCase() : toQuestionOptionId(index),
        text: explicitIdMatch ? explicitIdMatch[2].trim() : line
      };
    });
}

function formatQuestionOptions(options: ExamQuestionOption[] | null | undefined) {
  return (options ?? []).map((option) => `${option.id}. ${option.text}`).join("\n");
}

function renderLearnerLessonContent(lesson: Lesson) {
  const parsed = parseLessonContent(lesson.content, lesson.contentType);

  if (parsed.kind === LESSON_CONTENT_TYPE.text && parsed.body) {
    return <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: parsed.body }} />;
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.video && parsed.url) {
    return <video controls className="w-full rounded-lg border border-border/70 bg-black" src={parsed.url} />;
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.resource && parsed.url) {
    return (
      <a className="inline-flex h-10 items-center rounded-md border border-border/70 px-4 text-sm font-medium hover:bg-muted/40" href={parsed.url} rel="noreferrer" target="_blank">
        {parsed.fileName ?? parsed.url}
      </a>
    );
  }

  return null;
}

function parseCorrectAnswers(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((answer) => answer.trim().toUpperCase())
    .filter(Boolean);
}

type CourseDetailTab = "curriculum" | "exams" | "reviews" | "learners" | "settings";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const courseQuery = useCourseDetail(courseId);
  const myEnrollmentsQuery = useMyEnrollments(isAuthenticated && !isBootstrapping);
  const enrollMutation = useEnrollCourse();
  const createLessonMutation = useCreateLesson(courseId);
  const updateLessonMutation = useUpdateLesson(courseId);
  const reorderLessonsMutation = useReorderLessons(courseId);
  const deleteLessonMutation = useDeleteLesson(courseId);
  const createExamMutation = useCreateExam(courseId);
  const updateExamMutation = useUpdateExam(courseId);
  const archiveExamMutation = useArchiveExam(courseId);
  const startExamAttemptMutation = useStartExamAttempt(courseId);
  const submitExamAttemptMutation = useSubmitExamAttempt(courseId);
  const completeLessonMutation = useCompleteLesson(courseId);
  const archiveCourseMutation = useArchiveCourse();
  const updateCourseMutation = useUpdateCourse(courseId);
  const upsertReviewMutation = useUpsertMyCourseReview(courseId);
  const deleteReviewMutation = useDeleteMyCourseReview(courseId);
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
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examPendingArchive, setExamPendingArchive] = useState<Exam | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionPendingDelete, setQuestionPendingDelete] = useState<ExamQuestion | null>(null);
  const [activeExamSession, setActiveExamSession] = useState<ExamAttemptSession | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<string, string | string[]>>({});
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const reorderSaveTimerRef = useRef<number | null>(null);
  const lessonContentReaderRef = useRef<(() => string) | null>(null);
  const { t } = useI18n();

  const canManageCourse =
    meQuery.data?.role === USER_ROLE.admin ||
    (meQuery.data?.role === USER_ROLE.instructor && courseQuery.data?.instructorId === meQuery.data.id);

  const isLearner = meQuery.data?.role === USER_ROLE.user;
  const isCoursePublished = courseQuery.data?.status === COURSE_STATUS.published;
  const isEnrolled = myEnrollmentsQuery.data?.some((enrollment) => enrollment.courseId === courseId) ?? false;
  const canReadLessons = Boolean(canManageCourse || isEnrolled);
  const lessonQuery = useCourseLessons(courseId, Boolean(courseQuery.data && canReadLessons));
  const courseReviewsQuery = useCourseReviews(courseId, Boolean(courseQuery.data));
  const courseExamsQuery = useCourseExams(courseId, Boolean(courseQuery.data));
  const examQuestionsQuery = useExamQuestions(courseId, selectedExamId, Boolean(canManageCourse && selectedExamId));
  const createExamQuestionMutation = useCreateExamQuestion(courseId, selectedExamId);
  const updateExamQuestionMutation = useUpdateExamQuestion(courseId, selectedExamId);
  const deleteExamQuestionMutation = useDeleteExamQuestion(courseId, selectedExamId);
  const progressQuery = useCourseProgress(courseId, isAuthenticated && !isBootstrapping && canReadLessons);
  const lessonProgressQuery = useCourseLessonProgress(courseId, isAuthenticated && !isBootstrapping && canReadLessons && !canManageCourse);
  const pollExamAttempt = activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.submitted;
  const examAttemptQuery = useExamAttempt(activeExamSession?.attempt.id ?? null, Boolean(activeExamSession), pollExamAttempt);
  const nextLessonSortOrder = getNextLessonSortOrder(lessonQuery.data);

  const enrollmentsQuery = useCourseEnrollments(courseId, Boolean(canManageCourse && courseQuery.data), enrollmentPage, learnerSearch.trim());
  const enrollments = enrollmentsQuery.data?.items ?? [];
  const enrollmentsTotal = enrollmentsQuery.data?.pagination.total ?? 0;
  const enrollmentsTotalPages = Math.max(1, Math.ceil(enrollmentsTotal / 20));
  const lessons = orderedLessons;
  const selectedLesson = selectedLessonId ? lessons.find((lesson) => lesson.id === selectedLessonId) : undefined;
  const selectedLessonIndex = selectedLesson ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id) : -1;
  const completedLessonIds = new Set(
    (lessonProgressQuery.data?.items ?? []).filter((item) => item.isCompleted).map((item) => item.lessonId)
  );
  const reviews = courseReviewsQuery.data?.items ?? [];
  const myReview = meQuery.data?.id ? reviews.find((review) => review.userId === meQuery.data.id) : undefined;
  const exams = courseExamsQuery.data ?? [];
  const examQuestions = examQuestionsQuery.data ?? [];

  const courseForm = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      level: "",
      language: "",
      durationMinutes: "",
      requirements: "",
      outcomes: "",
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

  const examForm = useForm<ExamFormValues>({
    resolver: zodResolver(createExamFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      status: EXAM_STATUS.draft,
      durationMinutes: "",
      passingScore: ""
    }
  });

  const questionForm = useForm<ExamQuestionFormValues>({
    resolver: zodResolver(createExamQuestionFormSchema(t)),
    defaultValues: {
      type: EXAM_QUESTION_TYPE.singleChoice,
      prompt: "",
      optionsText: "",
      correctAnswersText: "",
      explanation: "",
      points: 1,
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
      category: courseQuery.data.category ?? "",
      level: courseQuery.data.level ?? "",
      language: courseQuery.data.language ?? "",
      durationMinutes: courseQuery.data.durationMinutes ?? "",
      requirements: courseQuery.data.requirements ?? "",
      outcomes: courseQuery.data.outcomes ?? "",
      coverImageUrl: courseQuery.data.coverImageUrl ?? "",
      status: courseQuery.data.status
    });
  }, [courseForm, courseQuery.data]);

  useEffect(() => {
    const nextLessons = lessonQuery.data ?? [];
    setOrderedLessons(nextLessons);
  }, [lessonQuery.data]);

  useEffect(() => {
    if (!myReview) {
      return;
    }
    setReviewRating(String(myReview.rating));
    setReviewComment(myReview.comment ?? "");
  }, [myReview]);

  useEffect(() => {
    const nextLessons = lessonQuery.data ?? [];
    if (selectedLessonId && !nextLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(null);
    }
  }, [lessonQuery.data, selectedLessonId]);

  useEffect(() => {
    if (canManageCourse || !canReadLessons || selectedLessonId || !lessons.length) {
      return;
    }

    setSelectedLessonId(lessons[0]?.id ?? null);
  }, [canManageCourse, canReadLessons, lessons, selectedLessonId]);

  useEffect(() => {
    if (!examAttemptQuery.data) {
      return;
    }

    setActiveExamSession(examAttemptQuery.data);
  }, [examAttemptQuery.data]);

  useEffect(() => {
    const nextExams = courseExamsQuery.data ?? [];
    if (selectedExamId && !nextExams.some((exam) => exam.id === selectedExamId)) {
      setSelectedExamId(null);
      setSelectedQuestionId(null);
      examForm.reset({
        title: "",
        description: "",
        status: EXAM_STATUS.draft,
        durationMinutes: "",
        passingScore: ""
      });
    }
  }, [courseExamsQuery.data, examForm, selectedExamId]);

  useEffect(() => {
    setSelectedQuestionId(null);
    questionForm.clearErrors();
    questionForm.reset({
      type: EXAM_QUESTION_TYPE.singleChoice,
      prompt: "",
      optionsText: "",
      correctAnswersText: "",
      explanation: "",
      points: 1,
      sortOrder: (examQuestionsQuery.data?.length ?? 0) + 1
    });
  }, [examQuestionsQuery.data?.length, questionForm, selectedExamId]);

  useEffect(() => {
    const nextQuestions = examQuestionsQuery.data ?? [];
    if (selectedQuestionId && !nextQuestions.some((question) => question.id === selectedQuestionId)) {
      setSelectedQuestionId(null);
    }
  }, [examQuestionsQuery.data, selectedQuestionId]);

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
    if (values.status === COURSE_STATUS.published && !canPublish) {
      toast.error(t("courseDetail.publishRequirementsMissing"));
      return;
    }

    try {
      await updateCourseMutation.mutateAsync({
        title: values.title,
        description: values.description ?? "",
        category: values.category || null,
        level: values.level || null,
        language: values.language || null,
        durationMinutes: values.durationMinutes === "" ? null : Number(values.durationMinutes),
        requirements: values.requirements || null,
        outcomes: values.outcomes || null,
        coverImageUrl: values.coverImageUrl || null,
        status: values.status
      });
      toast.success(t("courseDetail.courseUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.courseUpdateFailed"));
    }
  };

  const onSaveReview = async () => {
    try {
      await upsertReviewMutation.mutateAsync({
        rating: Number(reviewRating),
        comment: reviewComment.trim() || null
      });
      toast.success(t("courseDetail.reviewSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.reviewSaveFailed"));
    }
  };

  const onSubmitExam = async (values: ExamFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      durationMinutes: values.durationMinutes === "" ? null : Number(values.durationMinutes),
      passingScore: values.passingScore === "" ? null : Number(values.passingScore)
    };

    try {
      if (selectedExamId) {
        await updateExamMutation.mutateAsync({ examId: selectedExamId, payload });
        toast.success(t("courseDetail.examUpdated"));
      } else {
        await createExamMutation.mutateAsync(payload);
        toast.success(t("courseDetail.examCreated"));
        examForm.reset({
          title: "",
          description: "",
          status: EXAM_STATUS.draft,
          durationMinutes: "",
          passingScore: ""
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(selectedExamId ? "courseDetail.examSaveFailed" : "courseDetail.examCreateFailed"));
    }
  };

  const onSelectExam = (exam: Exam) => {
    setSelectedExamId(exam.id);
    setSelectedQuestionId(null);
    examForm.clearErrors();
    questionForm.clearErrors();
    examForm.reset({
      title: exam.title,
      description: exam.description ?? "",
      status: exam.status,
      durationMinutes: exam.durationMinutes ?? "",
      passingScore: exam.passingScore ?? ""
    });
    questionForm.reset({
      type: EXAM_QUESTION_TYPE.singleChoice,
      prompt: "",
      optionsText: "",
      correctAnswersText: "",
      explanation: "",
      points: 1,
      sortOrder: (examQuestionsQuery.data?.length ?? 0) + 1
    });
  };

  const onNewExam = () => {
    setSelectedExamId(null);
    setSelectedQuestionId(null);
    examForm.clearErrors();
    questionForm.clearErrors();
    examForm.reset({
      title: "",
      description: "",
      status: EXAM_STATUS.draft,
      durationMinutes: "",
      passingScore: ""
    });
    questionForm.reset({
      type: EXAM_QUESTION_TYPE.singleChoice,
      prompt: "",
      optionsText: "",
      correctAnswersText: "",
      explanation: "",
      points: 1,
      sortOrder: 1
    });
  };

  const onSelectQuestion = (question: ExamQuestion) => {
    setSelectedQuestionId(question.id);
    questionForm.clearErrors();
    questionForm.reset({
      type: question.type,
      prompt: question.prompt,
      optionsText: formatQuestionOptions(question.options),
      correctAnswersText: (question.correctAnswers ?? []).join(", "),
      explanation: question.explanation ?? "",
      points: question.points,
      sortOrder: question.sortOrder
    });
  };

  const onNewQuestion = () => {
    setSelectedQuestionId(null);
    questionForm.clearErrors();
    questionForm.reset({
      type: EXAM_QUESTION_TYPE.singleChoice,
      prompt: "",
      optionsText: "",
      correctAnswersText: "",
      explanation: "",
      points: 1,
      sortOrder: examQuestions.length + 1
    });
  };

  const onSubmitQuestion = async (values: ExamQuestionFormValues) => {
    if (!selectedExamId) {
      toast.error(t("courseDetail.selectExamFirst"));
      return;
    }

    const options = values.type === EXAM_QUESTION_TYPE.freeText ? [] : parseQuestionOptions(values.optionsText);
    const correctAnswers = values.type === EXAM_QUESTION_TYPE.freeText ? [] : parseCorrectAnswers(values.correctAnswersText);
    if (values.type !== EXAM_QUESTION_TYPE.freeText && options.length < 2) {
      questionForm.setError("optionsText", { message: t("validation.examQuestionOptionsMin") });
      return;
    }
    if (values.type !== EXAM_QUESTION_TYPE.freeText && correctAnswers.length < 1) {
      questionForm.setError("correctAnswersText", { message: t("validation.examQuestionAnswersRequired") });
      return;
    }

    const payload = {
      type: values.type,
      prompt: values.prompt,
      options,
      correctAnswers,
      explanation: values.explanation || null,
      points: Number(values.points),
      sortOrder: Number(values.sortOrder)
    };

    try {
      if (selectedQuestionId) {
        await updateExamQuestionMutation.mutateAsync({ questionId: selectedQuestionId, payload });
        toast.success(t("courseDetail.questionUpdated"));
      } else {
        await createExamQuestionMutation.mutateAsync(payload);
        toast.success(t("courseDetail.questionCreated"));
        onNewQuestion();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(selectedQuestionId ? "courseDetail.questionSaveFailed" : "courseDetail.questionCreateFailed"));
    }
  };

  const confirmArchiveExam = async () => {
    if (!examPendingArchive) {
      return;
    }

    try {
      await archiveExamMutation.mutateAsync(examPendingArchive.id);
      if (selectedExamId === examPendingArchive.id) {
        onNewExam();
      }
      setExamPendingArchive(null);
      toast.success(t("courseDetail.examArchived"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.examArchiveFailed"));
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!questionPendingDelete) {
      return;
    }

    try {
      await deleteExamQuestionMutation.mutateAsync(questionPendingDelete.id);
      if (selectedQuestionId === questionPendingDelete.id) {
        onNewQuestion();
      }
      setQuestionPendingDelete(null);
      toast.success(t("courseDetail.questionDeleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.questionDeleteFailed"));
    }
  };

  const onStartExamAttempt = async (examId: string) => {
    try {
      const session = await startExamAttemptMutation.mutateAsync(examId);
      setActiveExamSession(session);
      const nextAnswers = session.attempt.answers.reduce<Record<string, string | string[]>>((acc, item) => {
        if (typeof item.answer === "string" || Array.isArray(item.answer)) {
          acc[item.questionId] = item.answer;
        }
        return acc;
      }, {});
      setAttemptAnswers(nextAnswers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.examStartFailed"));
    }
  };

  const onChangeAttemptAnswer = (questionId: string, answer: string | string[]) => {
    setAttemptAnswers((current) => ({
      ...current,
      [questionId]: answer
    }));
  };

  const onToggleAttemptAnswer = (questionId: string, optionId: string) => {
    setAttemptAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : [];
      const next = existing.includes(optionId) ? existing.filter((item) => item !== optionId) : [...existing, optionId];
      return {
        ...current,
        [questionId]: next
      };
    });
  };

  const onSubmitAttempt = async () => {
    if (!activeExamSession) {
      return;
    }

    const answers = activeExamSession.exam.questions.map((question) => ({
      questionId: question.id,
      answer: attemptAnswers[question.id] ?? null
    }));

    try {
      const submitted = await submitExamAttemptMutation.mutateAsync({
        attemptId: activeExamSession.attempt.id,
        answers
      });
      setActiveExamSession({
        ...activeExamSession,
        attempt: submitted.attempt
      });
      toast.success(t("courseDetail.examSubmitted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.examSubmitFailed"));
    }
  };

  const onDeleteReview = async () => {
    try {
      await deleteReviewMutation.mutateAsync();
      setReviewRating("5");
      setReviewComment("");
      toast.success(t("courseDetail.reviewDeleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.reviewDeleteFailed"));
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

  const onSelectLessonForLearner = (lesson: Lesson) => {
    setSelectedLessonId(lesson.id);
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
  const courseStatus = courseForm.watch("status");
  const courseTitle = courseForm.watch("title");
  const courseCoverImageUrl = courseForm.watch("coverImageUrl");
  const courseCategory = courseForm.watch("category");
  const courseLevel = courseForm.watch("level");
  const courseLanguage = courseForm.watch("language");
  const courseDurationMinutes = courseForm.watch("durationMinutes");
  const courseRequirements = courseForm.watch("requirements");
  const courseOutcomes = courseForm.watch("outcomes");
  const questionType = questionForm.watch("type");
  const isLessonSubmitPending = createLessonMutation.isPending || updateLessonMutation.isPending;
  const isQuestionSubmitPending = createExamQuestionMutation.isPending || updateExamQuestionMutation.isPending;
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
  const publishChecks = [
    { label: t("courseDetail.publishRequirementTitle"), done: hasText(courseTitle) },
    { label: t("courseDetail.publishRequirementCover"), done: hasText(courseCoverImageUrl) },
    {
      label: t("courseDetail.publishRequirementMetadata"),
      done: hasText(courseCategory) && hasText(courseLevel) && hasText(courseLanguage) && courseDurationMinutes !== "" && Number(courseDurationMinutes) > 0
    },
    { label: t("courseDetail.publishRequirementRequirements"), done: hasText(courseRequirements) },
    { label: t("courseDetail.publishRequirementOutcomes"), done: hasText(courseOutcomes) },
    { label: t("courseDetail.publishRequirementLessons"), done: lessons.length > 0 }
  ];
  const canPublish = publishChecks.every((item) => item.done);

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
    { id: "exams", label: "courseDetail.tabExams", count: exams.length },
    { id: "reviews", label: "courseDetail.reviews", count: courseQuery.data?.ratingCount ?? 0 },
    { id: "learners", label: "courseDetail.tabLearners", count: enrollmentsTotal, managerOnly: true },
    { id: "settings", label: "courseDetail.tabSettings", managerOnly: true }
  ];
  const visibleTabs = tabItems.filter((item) => !item.managerOnly || canManageCourse);
  const loginRedirectTo = `/login?redirect=${encodeURIComponent(`/courses/${courseId}`)}`;
  const courseMetadata = courseQuery.data
    ? [
        { icon: Layers3, label: t("courseDetail.courseCategory"), value: courseQuery.data.category },
        { icon: Target, label: t("courseDetail.courseLevel"), value: courseQuery.data.level },
        { icon: Globe2, label: t("courseDetail.courseLanguage"), value: courseQuery.data.language },
        {
          icon: Clock3,
          label: t("courseDetail.courseDuration"),
          value: courseQuery.data.durationMinutes ? `${courseQuery.data.durationMinutes} ${t("courseDetail.courseDurationUnit")}` : null
        }
      ].filter((item) => Boolean(item.value))
    : [];
  const hasLongMetadata = Boolean(courseQuery.data?.requirements || courseQuery.data?.outcomes);

  return (
    <AppShell
      title={courseQuery.data?.title ?? t("courseDetail.title")}
      subtitle={t("courseDetail.subtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isAuthenticated && isCoursePublished ? (
            <Button asChild size="sm" className="rounded-lg shadow-none">
              <Link to={loginRedirectTo}>{t("courseDetail.signInToEnroll")}</Link>
            </Button>
          ) : null}
          {isAuthenticated && isLearner && isCoursePublished && isEnrolled ? (
            <Button size="sm" className="rounded-lg shadow-none" type="button" onClick={() => setActiveTab("curriculum")}>
              {t("courseDetail.continueLearning")}
            </Button>
          ) : null}
          {isAuthenticated && isLearner && isCoursePublished && !isEnrolled ? (
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
                    setActiveTab("curriculum");
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
                { icon: ListOrdered, label: t("courseDetail.metricLessons"), value: canReadLessons ? lessons.length : "—" },
                { icon: CheckCircle2, label: t("courseDetail.metricCompletion"), value: canReadLessons ? `${progressQuery.data?.percentage ?? 0}%` : isAuthenticated ? "—" : t("courseDetail.signIn") },
                { icon: Users, label: t("courseDetail.metricLearners"), value: enrollmentsTotal },
                { icon: Star, label: t("courseDetail.metricRating"), value: courseQuery.data?.ratingCount ? courseQuery.data.ratingAverage.toFixed(1) : "—" }
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

        {courseMetadata.length || hasLongMetadata ? (
          <section className="grid gap-3 rounded-lg border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t("courseDetail.courseMetadata")}</h2>
              {courseQuery.data?.category ? <Badge variant="secondary">{courseQuery.data.category}</Badge> : null}
            </div>
            {courseMetadata.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {courseMetadata.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-w-0 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {hasLongMetadata ? (
              <div className="grid gap-3 md:grid-cols-2">
                {courseQuery.data?.requirements ? (
                  <div className="rounded-md border border-border/60 bg-background px-3 py-3">
                    <h3 className="text-sm font-semibold">{t("courseDetail.courseRequirements")}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{courseQuery.data.requirements}</p>
                  </div>
                ) : null}
                {courseQuery.data?.outcomes ? (
                  <div className="rounded-md border border-border/60 bg-background px-3 py-3">
                    <h3 className="text-sm font-semibold">{t("courseDetail.courseOutcomes")}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{courseQuery.data.outcomes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

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
          <section
            className={cn(
              "grid gap-4",
              canManageCourse ? "xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start" : canReadLessons ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" : undefined
            )}
          >
            {!canManageCourse && canReadLessons ? (
              <Card className="rounded-lg border-border/70 shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{selectedLesson?.title ?? t("courseDetail.selectLesson")}</CardTitle>
                    <CardDescription>
                      {selectedLesson
                        ? `${progressQuery.data?.completedLessons ?? 0}/${progressQuery.data?.totalLessons ?? lessons.length} ${t("courseDetail.lessonsCompletedLabel")}`
                        : t("courseDetail.selectLessonDescription")}
                    </CardDescription>
                  </div>
                  {selectedLesson && completedLessonIds.has(selectedLesson.id) ? (
                    <Badge variant="default" className="rounded-md">
                      <CheckCircle2 className="mr-1 size-3.5" aria-hidden />
                      {t("courseDetail.lessonCompleted")}
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="grid gap-4">
                  {selectedLesson ? (
                    <>
                      <div className="min-h-48">{renderLearnerLessonContent(selectedLesson)}</div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-md shadow-none"
                            disabled={selectedLessonIndex <= 0}
                            onClick={() => {
                              const previousLesson = lessons[selectedLessonIndex - 1];
                              if (previousLesson) {
                                onSelectLessonForLearner(previousLesson);
                              }
                            }}
                          >
                            <ChevronLeft className="mr-1 size-4" aria-hidden />
                            {t("courseDetail.previousLesson")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-md shadow-none"
                            disabled={selectedLessonIndex < 0 || selectedLessonIndex >= lessons.length - 1}
                            onClick={() => {
                              const nextLesson = lessons[selectedLessonIndex + 1];
                              if (nextLesson) {
                                onSelectLessonForLearner(nextLesson);
                              }
                            }}
                          >
                            {t("courseDetail.nextLesson")}
                            <ChevronRight className="ml-1 size-4" aria-hidden />
                          </Button>
                        </div>
                        {isAuthenticated ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 rounded-md shadow-none"
                            disabled={completeLessonMutation.isPending || completedLessonIds.has(selectedLesson.id)}
                            onClick={() => void completeLessonMutation.mutateAsync(selectedLesson.id)}
                          >
                            {completedLessonIds.has(selectedLesson.id) ? t("courseDetail.lessonCompleted") : t("courseDetail.markComplete")}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <EmptyState icon={BookOpenText} title={t("courseDetail.selectLesson")} description={t("courseDetail.selectLessonDescription")} />
                  )}
                </CardContent>
              </Card>
            ) : null}

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
                {!canReadLessons ? (
                  <EmptyState
                    icon={BookOpenText}
                    title={t("courseDetail.lessonsLockedTitle")}
                    description={isAuthenticated ? t("courseDetail.lessonsLockedEnrollDescription") : t("courseDetail.lessonsLockedSignInDescription")}
                    action={
                      !isAuthenticated ? (
                        <Button asChild className="h-10 rounded-md px-4" size="sm">
                          <Link to={loginRedirectTo}>{t("courseDetail.signInToEnroll")}</Link>
                        </Button>
                      ) : isLearner && isCoursePublished ? (
                        <Button
                          className="h-10 rounded-md px-4"
                          size="sm"
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
                      ) : null
                    }
                  />
                ) : null}
                {canReadLessons && lessonQuery.isLoading ? <CourseListSkeleton rows={5} /> : null}
                {canReadLessons && lessonQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.lessonsLoadFailed")}
                  </div>
                ) : null}
                {canReadLessons && !lessonQuery.isLoading && !lessonQuery.isError ? (
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
                              tabIndex={canReadLessons ? 0 : undefined}
                              className={cn(
                                "group flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2.5 text-left transition-colors",
                                selected ? "border-foreground bg-muted/70" : "border-transparent hover:border-border/70 hover:bg-muted/40",
                                draggingLessonId === lesson.id ? "opacity-60" : undefined,
                                canManageCourse ? "cursor-grab active:cursor-grabbing" : undefined
                              )}
                              onClick={() => {
                                if (canManageCourse) {
                                  onSelectLesson(lesson);
                                  return;
                                }

                                onSelectLessonForLearner(lesson);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  if (canManageCourse) {
                                    onSelectLesson(lesson);
                                    return;
                                  }

                                  onSelectLessonForLearner(lesson);
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
                                {!canManageCourse && completedLessonIds.has(lesson.id) ? (
                                  <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.lessonCompleted")}</p>
                                ) : null}
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

        {activeTab === "exams" ? (
          <section className={cn("grid gap-4", canManageCourse ? "lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start" : undefined)}>
            <Card className="rounded-lg border-border/70 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">{t("courseDetail.exams")}</CardTitle>
                  <CardDescription>{t("courseDetail.examsDescription")}</CardDescription>
                </div>
                {canManageCourse ? (
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewExam}>
                    {t("courseDetail.newExam")}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {courseExamsQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
                {courseExamsQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.examsLoadFailed")}
                  </div>
                ) : null}
                {!courseExamsQuery.isLoading && !courseExamsQuery.isError ? (
                  exams.length ? (
                    <div className="grid gap-3">
                      {exams.map((exam) => {
                        const selected = selectedExamId === exam.id;
                        return (
                          <article
                            key={exam.id}
                            className={cn(
                              "rounded-lg border border-border/70 bg-background px-4 py-3 transition-colors",
                              canManageCourse ? "cursor-pointer hover:bg-muted/30" : undefined,
                              selected ? "border-foreground bg-muted/40" : undefined
                            )}
                            onClick={() => {
                              if (canManageCourse) {
                                onSelectExam(exam);
                              }
                            }}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-semibold">{exam.title}</h3>
                                  <Badge
                                    variant={exam.status === EXAM_STATUS.published ? "default" : exam.status === EXAM_STATUS.archived ? "destructive" : "secondary"}
                                    className="rounded-md"
                                  >
                                    {t(`examStatus.${exam.status}` as I18nKey)}
                                  </Badge>
                                </div>
                                {exam.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{exam.description}</p> : null}
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {exam.durationMinutes ? (
                                    <span className="rounded-md bg-muted px-2 py-1">
                                      {exam.durationMinutes} {t("courseDetail.examMinutes")}
                                    </span>
                                  ) : null}
                                  {exam.passingScore !== null && exam.passingScore !== undefined ? (
                                    <span className="rounded-md bg-muted px-2 py-1">
                                      {t("courseDetail.examPassingScore")}: {exam.passingScore}%
                                    </span>
                                  ) : null}
                                  <span className="rounded-md bg-muted px-2 py-1">
                                    {exam.questionCount ?? 0} {t("courseDetail.questions")}
                                  </span>
                                  <span className="rounded-md bg-muted px-2 py-1">{new Date(exam.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {canManageCourse ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 shrink-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
                                  disabled={archiveExamMutation.isPending || exam.status === EXAM_STATUS.archived}
                                  aria-label={t("courseDetail.archiveExam")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExamPendingArchive(exam);
                                  }}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              ) : isAuthenticated && isLearner && isCoursePublished && isEnrolled ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9 rounded-md shadow-none"
                                  disabled={startExamAttemptMutation.isPending || exam.status !== EXAM_STATUS.published || (exam.questionCount ?? 0) < 1}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onStartExamAttempt(exam.id);
                                  }}
                                >
                                  {startExamAttemptMutation.isPending ? t("courseDetail.startingExam") : t("courseDetail.startExam")}
                                </Button>
                              ) : (
                                <Button asChild type="button" size="sm" className="h-9 rounded-md shadow-none">
                                  <Link to={loginRedirectTo}>{t("courseDetail.signInToEnroll")}</Link>
                                </Button>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={ClipboardCheck} title={t("courseDetail.noExams")} description={t("courseDetail.noExamsDescription")} />
                  )
                ) : null}
              </CardContent>
            </Card>

            {canManageCourse ? (
              <Card className="rounded-lg border-border/70 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{selectedExamId ? t("courseDetail.editExam") : t("courseDetail.addExam")}</CardTitle>
                  <CardDescription>{t("courseDetail.addExamDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={examForm.handleSubmit(onSubmitExam)} noValidate>
                    <FormField id="exam-title" label={t("courseDetail.examTitle")} error={examForm.formState.errors.title?.message}>
                      <Input id="exam-title" placeholder={t("courseDetail.examTitlePlaceholder")} {...examForm.register("title")} />
                    </FormField>
                    <FormField id="exam-description" label={t("courseDetail.examDescription")} hint={t("courseDetail.optional")} error={examForm.formState.errors.description?.message}>
                      <TextareaField id="exam-description" rows={4} placeholder={t("courseDetail.examDescriptionPlaceholder")} {...examForm.register("description")} />
                    </FormField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="exam-duration" label={t("courseDetail.examDuration")} hint={t("courseDetail.examMinutes")} error={examForm.formState.errors.durationMinutes?.message}>
                        <Input id="exam-duration" inputMode="numeric" min={1} type="number" placeholder="45" {...examForm.register("durationMinutes")} />
                      </FormField>
                      <FormField id="exam-passing-score" label={t("courseDetail.examPassingScore")} hint="%" error={examForm.formState.errors.passingScore?.message}>
                        <Input id="exam-passing-score" inputMode="numeric" min={0} max={100} type="number" placeholder="70" {...examForm.register("passingScore")} />
                      </FormField>
                    </div>
                    <FormField id="exam-status" label={t("courseDetail.status")} error={examForm.formState.errors.status?.message}>
                      <Controller
                        control={examForm.control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="exam-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EXAM_STATUS.draft}>{t("examStatus.DRAFT")}</SelectItem>
                              <SelectItem value={EXAM_STATUS.published}>{t("examStatus.PUBLISHED")}</SelectItem>
                              <SelectItem value={EXAM_STATUS.archived}>{t("examStatus.ARCHIVED")}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                    <div className="flex justify-end gap-2 border-t border-border/60 pt-2">
                      {selectedExamId ? (
                        <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onNewExam}>
                          {t("courseDetail.newExam")}
                        </Button>
                      ) : null}
                      <Button className="h-10 rounded-md font-medium shadow-none" disabled={createExamMutation.isPending || updateExamMutation.isPending} type="submit">
                        {createExamMutation.isPending || updateExamMutation.isPending
                          ? t("courseDetail.savingExam")
                          : selectedExamId
                            ? t("courseDetail.saveExam")
                            : t("courseDetail.createExam")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {canManageCourse ? (
              <Card className="rounded-lg border-border/70 shadow-none lg:col-span-2">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div>
                    <CardTitle className="text-base">{t("courseDetail.examQuestions")}</CardTitle>
                    <CardDescription>
                      {selectedExamId ? t("courseDetail.examQuestionsDescription") : t("courseDetail.selectExamFirst")}
                    </CardDescription>
                  </div>
                  {selectedExamId ? (
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewQuestion}>
                      {t("courseDetail.newQuestion")}
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {!selectedExamId ? (
                    <EmptyState icon={ClipboardCheck} title={t("courseDetail.noExamSelected")} description={t("courseDetail.noExamSelectedDescription")} />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
                      <div className="min-h-72 rounded-lg border border-border/70 p-2">
                        {examQuestionsQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
                        {examQuestionsQuery.isError ? (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            {t("courseDetail.questionsLoadFailed")}
                          </div>
                        ) : null}
                        {!examQuestionsQuery.isLoading && !examQuestionsQuery.isError ? (
                          examQuestions.length ? (
                            <div className="grid gap-2" role="list" aria-label={t("courseDetail.examQuestions")}>
                              {examQuestions.map((question, index) => {
                                const selected = selectedQuestionId === question.id;
                                return (
                                  <div
                                    key={question.id}
                                    role="listitem"
                                    tabIndex={0}
                                    className={cn(
                                      "group grid w-full cursor-pointer gap-2 rounded-md border px-3 py-3 text-left transition-colors",
                                      selected ? "border-foreground bg-muted/60" : "border-transparent hover:border-border/70 hover:bg-muted/40"
                                    )}
                                    onClick={() => onSelectQuestion(question)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onSelectQuestion(question);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
                                          <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                                            {t(`examQuestionType.${question.type}` as I18nKey)}
                                          </Badge>
                                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                            {question.points} {t("courseDetail.points")}
                                          </span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{question.prompt}</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        className="size-8 shrink-0 rounded-md p-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                                        disabled={deleteExamQuestionMutation.isPending}
                                        aria-label={t("courseDetail.deleteQuestion")}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setQuestionPendingDelete(question);
                                        }}
                                      >
                                        <Trash2 className="size-4" aria-hidden />
                                      </Button>
                                    </div>
                                    {question.options?.length ? (
                                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                                        {question.options.slice(0, 4).map((option) => (
                                          <span key={option.id} className="truncate rounded bg-muted px-2 py-1">
                                            {option.id}. {option.text}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <EmptyState icon={ClipboardCheck} title={t("courseDetail.noQuestions")} description={t("courseDetail.noQuestionsDescription")} />
                          )
                        ) : null}
                      </div>

                      <form className="grid gap-4 rounded-lg border border-border/70 bg-muted/10 p-4" onSubmit={questionForm.handleSubmit(onSubmitQuestion)} noValidate>
                        <div>
                          <h3 className="text-sm font-semibold">{selectedQuestionId ? t("courseDetail.editQuestion") : t("courseDetail.addQuestion")}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.questionFormDescription")}</p>
                        </div>
                        <FormField id="question-type" label={t("courseDetail.questionType")} error={questionForm.formState.errors.type?.message}>
                          <Controller
                            control={questionForm.control}
                            name="type"
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (value === EXAM_QUESTION_TYPE.freeText) {
                                    questionForm.setValue("optionsText", "", { shouldDirty: true });
                                    questionForm.setValue("correctAnswersText", "", { shouldDirty: true });
                                  }
                                }}
                              >
                                <SelectTrigger id="question-type" className="h-10 w-full rounded-md border-border/80 shadow-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={EXAM_QUESTION_TYPE.singleChoice}>{t("examQuestionType.SINGLE_CHOICE")}</SelectItem>
                                  <SelectItem value={EXAM_QUESTION_TYPE.multipleChoice}>{t("examQuestionType.MULTIPLE_CHOICE")}</SelectItem>
                                  <SelectItem value={EXAM_QUESTION_TYPE.freeText}>{t("examQuestionType.FREE_TEXT")}</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                        <FormField id="question-prompt" label={t("courseDetail.questionPrompt")} error={questionForm.formState.errors.prompt?.message}>
                          <TextareaField id="question-prompt" rows={4} placeholder={t("courseDetail.questionPromptPlaceholder")} {...questionForm.register("prompt")} />
                        </FormField>
                        {questionType !== EXAM_QUESTION_TYPE.freeText ? (
                          <>
                            <FormField id="question-options" label={t("courseDetail.questionOptions")} hint={t("courseDetail.questionOptionsHint")} error={questionForm.formState.errors.optionsText?.message}>
                              <TextareaField id="question-options" rows={5} placeholder={t("courseDetail.questionOptionsPlaceholder")} {...questionForm.register("optionsText")} />
                            </FormField>
                            <FormField id="question-answers" label={t("courseDetail.correctAnswers")} hint={t("courseDetail.correctAnswersHint")} error={questionForm.formState.errors.correctAnswersText?.message}>
                              <Input id="question-answers" placeholder="A, C" {...questionForm.register("correctAnswersText")} />
                            </FormField>
                          </>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField id="question-points" label={t("courseDetail.points")} error={questionForm.formState.errors.points?.message}>
                            <Input id="question-points" inputMode="numeric" min={1} type="number" {...questionForm.register("points")} />
                          </FormField>
                          <FormField id="question-order" label={t("courseDetail.order")} error={questionForm.formState.errors.sortOrder?.message}>
                            <Input id="question-order" inputMode="numeric" min={1} type="number" {...questionForm.register("sortOrder")} />
                          </FormField>
                        </div>
                        <FormField id="question-explanation" label={t("courseDetail.questionExplanation")} hint={t("courseDetail.optional")} error={questionForm.formState.errors.explanation?.message}>
                          <TextareaField id="question-explanation" rows={3} placeholder={t("courseDetail.questionExplanationPlaceholder")} {...questionForm.register("explanation")} />
                        </FormField>
                        <div className="flex justify-end gap-2 border-t border-border/60 pt-2">
                          {selectedQuestionId ? (
                            <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onNewQuestion}>
                              {t("courseDetail.newQuestion")}
                            </Button>
                          ) : null}
                          <Button className="h-10 rounded-md font-medium shadow-none" disabled={isQuestionSubmitPending} type="submit">
                            {isQuestionSubmitPending
                              ? t("courseDetail.savingQuestion")
                              : selectedQuestionId
                                ? t("courseDetail.saveQuestion")
                                : t("courseDetail.createQuestion")}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {!canManageCourse && activeExamSession ? (
              <Card className="rounded-lg border-border/70 shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div>
                    <CardTitle className="text-base">{activeExamSession.exam.title}</CardTitle>
                    <CardDescription>
                      {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded
                        ? t("courseDetail.examGradedDescription")
                        : activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.submitted
                          ? t("courseDetail.examSubmittedDescription")
                          : t("courseDetail.examAttemptDescription")}
                    </CardDescription>
                  </div>
                  <Badge variant={activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? "secondary" : "default"} className="rounded-md">
                    {t(`examAttemptStatus.${activeExamSession.attempt.status}` as I18nKey)}
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded && activeExamSession.attempt.score !== null && activeExamSession.attempt.score !== undefined ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{t("courseDetail.examScore")}</p>
                        <p className="mt-1 text-lg font-semibold">{activeExamSession.attempt.score}%</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
                        <p className="mt-1 text-lg font-semibold">{activeExamSession.exam.passingScore ?? "—"}%</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{t("courseDetail.examAttempt")}</p>
                        <p className="mt-1 text-lg font-semibold">
                          {activeExamSession.exam.passingScore !== null &&
                          activeExamSession.exam.passingScore !== undefined &&
                          activeExamSession.attempt.score >= activeExamSession.exam.passingScore
                            ? t("courseDetail.examPassed")
                            : t("courseDetail.examFailed")}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.submitted ? (
                    <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">{t("courseDetail.examAwaitingManualGrade")}</p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.examAttempt")}</p>
                      <p className="mt-1 text-lg font-semibold">#{activeExamSession.attempt.attemptNumber}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.questions")}</p>
                      <p className="mt-1 text-lg font-semibold">{activeExamSession.exam.questions.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.examDuration")}</p>
                      <p className="mt-1 text-lg font-semibold">
                        {activeExamSession.exam.durationMinutes ? `${activeExamSession.exam.durationMinutes} ${t("courseDetail.examMinutes")}` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {activeExamSession.exam.questions.map((question, index) => {
                      const answer = attemptAnswers[question.id];
                      const submitted = activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress;
                      return (
                        <article key={question.id} className="rounded-lg border border-border/70 bg-background px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                            <Badge variant="outline" className="rounded-md">
                              {t(`examQuestionType.${question.type}` as I18nKey)}
                            </Badge>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {question.points} {t("courseDetail.points")}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold leading-6">{question.prompt}</h3>
                          {question.type === EXAM_QUESTION_TYPE.freeText ? (
                            <TextareaField
                              className="mt-3"
                              rows={5}
                              value={typeof answer === "string" ? answer : ""}
                              disabled={submitted}
                              onChange={(event) => onChangeAttemptAnswer(question.id, event.target.value)}
                              placeholder={t("courseDetail.freeTextAnswerPlaceholder")}
                            />
                          ) : (
                            <div className="mt-3 grid gap-2">
                              {(question.options ?? []).map((option) => {
                                const checked =
                                  question.type === EXAM_QUESTION_TYPE.singleChoice
                                    ? answer === option.id
                                    : Array.isArray(answer) && answer.includes(option.id);
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    disabled={submitted}
                                    className={cn(
                                      "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors disabled:cursor-default",
                                      checked ? "border-foreground bg-muted/70" : "border-border/70 hover:bg-muted/40"
                                    )}
                                    onClick={() => {
                                      if (question.type === EXAM_QUESTION_TYPE.singleChoice) {
                                        onChangeAttemptAnswer(question.id, option.id);
                                      } else {
                                        onToggleAttemptAnswer(question.id, option.id);
                                      }
                                    }}
                                  >
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border border-border text-xs font-medium">
                                      {option.id}
                                    </span>
                                    <span className="leading-6">{option.text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
                    <div className="flex justify-end border-t border-border/60 pt-2">
                      <Button className="h-10 rounded-md shadow-none" disabled={submitExamAttemptMutation.isPending} onClick={() => void onSubmitAttempt()} type="button">
                        {submitExamAttemptMutation.isPending ? t("courseDetail.submittingExam") : t("courseDetail.submitExam")}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </section>
        ) : null}

        {activeTab === "reviews" ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <Card className="rounded-lg border-border/70 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("courseDetail.reviews")}</CardTitle>
                <CardDescription>{t("courseDetail.reviewsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {courseReviewsQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
                {courseReviewsQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.reviewLoadFailed")}
                  </div>
                ) : null}
                {!courseReviewsQuery.isLoading && !courseReviewsQuery.isError ? (
                  reviews.length ? (
                    <div className="grid gap-3">
                      {reviews.map((review) => (
                        <article key={review.id} className="rounded-lg border border-border/70 bg-background px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{review.user.email}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{new Date(review.updatedAt).toLocaleString()}</p>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm font-medium">
                              <Star className="size-4 fill-current" aria-hidden />
                              {review.rating}
                            </div>
                          </div>
                          {review.comment ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Star} title={t("courseDetail.noReviews")} description={t("courseDetail.noReviewsDescription")} />
                  )
                ) : null}
              </CardContent>
            </Card>

            {isAuthenticated && isLearner && isCoursePublished && isEnrolled ? (
              <Card className="rounded-lg border-border/70 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("courseDetail.yourReview")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField id="course-review-rating" label={t("courseDetail.rating")}>
                    <Select value={reviewRating} onValueChange={setReviewRating}>
                      <SelectTrigger id="course-review-rating" className="h-10 w-full rounded-md border-border/80 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((value) => (
                          <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField id="course-review-comment" label={t("courseDetail.comment")}>
                    <TextareaField
                      id="course-review-comment"
                      rows={5}
                      maxLength={1000}
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder={t("courseDetail.commentPlaceholder")}
                    />
                  </FormField>
                  <div className="flex flex-wrap justify-end gap-2">
                    {myReview ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md shadow-none"
                        disabled={deleteReviewMutation.isPending || upsertReviewMutation.isPending}
                        onClick={() => void onDeleteReview()}
                      >
                        {t("courseDetail.deleteReview")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="h-10 rounded-md shadow-none"
                      disabled={upsertReviewMutation.isPending || deleteReviewMutation.isPending}
                      onClick={() => void onSaveReview()}
                    >
                      {upsertReviewMutation.isPending ? t("courseDetail.savingReview") : t("courseDetail.saveReview")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
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

                    <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-4">
                      <div>
                        <h2 className="text-sm font-semibold">{t("courseDetail.courseMetadata")}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.courseSettingsDescription")}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField id="edit-course-category" label={t("courseDetail.courseCategory")} hint={t("courseDetail.optional")} error={courseForm.formState.errors.category?.message}>
                          <Input id="edit-course-category" placeholder={t("courseDetail.courseCategoryPlaceholder")} {...courseForm.register("category")} />
                        </FormField>
                        <FormField id="edit-course-level" label={t("courseDetail.courseLevel")} hint={t("courseDetail.optional")} error={courseForm.formState.errors.level?.message}>
                          <Input id="edit-course-level" placeholder={t("courseDetail.courseLevelPlaceholder")} {...courseForm.register("level")} />
                        </FormField>
                        <FormField id="edit-course-language" label={t("courseDetail.courseLanguage")} hint={t("courseDetail.optional")} error={courseForm.formState.errors.language?.message}>
                          <Input id="edit-course-language" placeholder={t("courseDetail.courseLanguagePlaceholder")} {...courseForm.register("language")} />
                        </FormField>
                        <FormField id="edit-course-duration" label={t("courseDetail.courseDuration")} hint={t("courseDetail.courseDurationUnit")} error={courseForm.formState.errors.durationMinutes?.message}>
                          <Input id="edit-course-duration" inputMode="numeric" min={1} placeholder={t("courseDetail.courseDurationPlaceholder")} type="number" {...courseForm.register("durationMinutes")} />
                        </FormField>
                      </div>
                      <FormField id="edit-course-requirements" label={t("courseDetail.courseRequirements")} hint={t("courseDetail.optional")} error={courseForm.formState.errors.requirements?.message}>
                        <TextareaField id="edit-course-requirements" placeholder={t("courseDetail.courseRequirementsPlaceholder")} rows={4} {...courseForm.register("requirements")} />
                      </FormField>
                      <FormField id="edit-course-outcomes" label={t("courseDetail.courseOutcomes")} hint={t("courseDetail.optional")} error={courseForm.formState.errors.outcomes?.message}>
                        <TextareaField id="edit-course-outcomes" placeholder={t("courseDetail.courseOutcomesPlaceholder")} rows={4} {...courseForm.register("outcomes")} />
                      </FormField>
                    </div>

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

                    {courseStatus === COURSE_STATUS.published ? (
                      <div className="grid gap-3 rounded-lg border border-border/70 bg-background p-4">
                        <div>
                          <h2 className="text-sm font-semibold">{t("courseDetail.publishRequirements")}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.publishRequirementsDescription")}</p>
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
                    ) : null}

                    <div className="flex justify-end">
                      <Button
                        className="h-10 rounded-md font-medium shadow-none"
                        disabled={updateCourseMutation.isPending || (courseStatus === COURSE_STATUS.published && !canPublish) || !courseForm.formState.isDirty}
                        type="submit"
                      >
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
      <AlertDialog open={Boolean(examPendingArchive)} onOpenChange={(open) => !open && setExamPendingArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.archiveExam")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courseDetail.archiveExamConfirm")}
              {examPendingArchive ? <span className="mt-2 block font-medium text-foreground">{examPendingArchive.title}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveExamMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              disabled={archiveExamMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmArchiveExam();
              }}
            >
              {archiveExamMutation.isPending ? t("courseDetail.examArchivePending") : t("courseDetail.archiveExam")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(questionPendingDelete)} onOpenChange={(open) => !open && setQuestionPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.deleteQuestion")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courseDetail.deleteQuestionConfirm")}
              {questionPendingDelete ? <span className="mt-2 block font-medium text-foreground">{questionPendingDelete.prompt}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExamQuestionMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              disabled={deleteExamQuestionMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteQuestion();
              }}
            >
              {deleteExamQuestionMutation.isPending ? t("courseDetail.questionDeletePending") : t("courseDetail.deleteQuestion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
