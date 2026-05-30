import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, Award, BookOpenText, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, Eye, FileCheck2, Globe2, GripVertical, Layers3, ListOrdered, Lock, LockOpen, Paperclip, PlayCircle, Search, Send, ShieldCheck, Star, Target, Trash2, Users } from "lucide-react";
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
import {
  STUDIO_CARD_HEADER,
  STUDIO_CHOICE,
  STUDIO_CHOICE_ACTIVE,
  STUDIO_DIVIDER,
  STUDIO_EDITOR_TITLE,
  STUDIO_FORM_SHELL,
  STUDIO_FORM_STACK,
  STUDIO_LIST,
  STUDIO_LIST_ITEM,
  STUDIO_LIST_ITEM_SELECTED,
  STUDIO_LIST_STICKY,
  STUDIO_NOTICE,
  STUDIO_PANEL,
  STUDIO_ROW,
  STUDIO_ROW_SELECTED,
  STUDIO_SETTINGS_GRID,
  STUDIO_STAT,
  STUDIO_TAB,
  STUDIO_TAB_ACTIVE,
  STUDIO_TAB_BAR,
  STUDIO_TAB_COUNT_ACTIVE,
  STUDIO_TAB_COUNT_IDLE,
  STUDIO_TAB_IDLE,
  STUDIO_WORKSPACE_GRID
} from "../lib/studio-layout";
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
import { ASSIGNMENT_STATUS, ASSIGNMENT_SUBMISSION_STATUS, CERTIFICATE_STATUS, COURSE_STATUS, EXAM_ATTEMPT_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS, LESSON_CONTENT_TYPE, USER_ROLE, USER_STATUS } from "../constants/business";
import { useArchiveAssignment, useAssignmentSubmissions, useCourseAssignments, useCreateAssignment, useGradeAssignmentSubmission, useSubmitAssignment, useUpdateAssignment } from "../hooks/use-assignments";
import { useAuth } from "../hooks/use-auth";
import {
  useArchiveCourse,
  useAdminEnrollLearner,
  useAdminRemoveLearner,
  useAssignCourseInstructor,
  useCourseAnalytics,
  useCourseDetail,
  useCourseEnrollments,
  useCourseLessons,
  useCourseReviews,
  useCreateLesson,
  useDeleteMyCourseReview,
  useDeleteLesson,
  useLockCourse,
  useReorderLessons,
  useUnlockCourse,
  useUpsertMyCourseReview,
  useUpdateLesson,
  useUpdateCourse
} from "../hooks/use-courses";
import { useEnrollCourse, useMyEnrollments } from "../hooks/use-enrollments";
import { useArchiveExam, useCourseExams, useCreateExam, useCreateExamQuestion, useDeleteExamQuestion, useExamAttempt, useExamAttempts, useExamQuestions, useGradeExamAttempt, useSaveExamAttemptAnswers, useStartExamAttempt, useSubmitExamAttempt, useUpdateExam, useUpdateExamQuestion } from "../hooks/use-exams";
import { useCourseCertificates, useRestoreCertificate, useRevokeCertificate } from "../hooks/use-certificates";
import { useCurrentUser } from "../hooks/use-current-user";
import { useCompleteLesson, useCourseLessonProgress, useCourseProgress } from "../hooks/use-progress";
import { useUsers } from "../hooks/use-users";
import { parseLessonContent, serializeLessonContent } from "../lib/lesson-content";
import { downloadBlob } from "../lib/download-file";
import { certificateService } from "../services/certificate.service";
import { createAssignmentFormSchema, createAssignmentGradeFormSchema, createAssignmentSubmissionFormSchema, createExamAttemptGradeFormSchema, createExamFormSchema, createExamQuestionFormSchema, createLessonFormSchema, AssignmentFormValues, AssignmentGradeFormValues, AssignmentSubmissionFormValues, CreateLessonFormValues, ExamAttemptGradeFormValues, ExamFormValues, ExamQuestionFormValues, updateCourseFormSchema, UpdateCourseFormValues } from "../schemas/course.schema";
import { uploadService, type UploadedFile } from "../services/upload.service";
import type { Exam, ExamAttemptForReview, ExamAttemptSession, ExamQuestion, ExamQuestionOption } from "../services/exam.service";
import type { Assignment, AssignmentSubmission } from "../services/assignment.service";
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
    return <video controls className="w-full rounded-lg ring-1 ring-foreground/10 bg-black" src={parsed.url} />;
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.resource && parsed.url) {
    return (
      <a className="inline-flex h-10 items-center rounded-md ring-1 ring-foreground/10 px-4 text-sm font-medium hover:bg-muted/40" href={parsed.url} rel="noreferrer" target="_blank">
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

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatAttemptAnswer(answer: string | string[] | null | undefined) {
  if (Array.isArray(answer)) {
    return answer.length ? answer.join(", ") : "—";
  }

  return answer?.trim() || "—";
}

type CourseDetailTab = "curriculum" | "exams" | "assignments" | "reviews" | "learners" | "settings";

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
  const saveExamAttemptAnswersMutation = useSaveExamAttemptAnswers(courseId);
  const submitExamAttemptMutation = useSubmitExamAttempt(courseId);
  const createAssignmentMutation = useCreateAssignment(courseId);
  const updateAssignmentMutation = useUpdateAssignment(courseId);
  const archiveAssignmentMutation = useArchiveAssignment(courseId);
  const submitAssignmentMutation = useSubmitAssignment(courseId);
  const completeLessonMutation = useCompleteLesson(courseId);
  const archiveCourseMutation = useArchiveCourse();
  const lockCourseMutation = useLockCourse(courseId);
  const unlockCourseMutation = useUnlockCourse(courseId);
  const updateCourseMutation = useUpdateCourse(courseId);
  const assignCourseInstructorMutation = useAssignCourseInstructor(courseId);
  const upsertReviewMutation = useUpsertMyCourseReview(courseId);
  const deleteReviewMutation = useDeleteMyCourseReview(courseId);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLessonFile, setIsUploadingLessonFile] = useState(false);
  const [uploadedLessonFile, setUploadedLessonFile] = useState<UploadedFile | null>(null);
  const [isUploadingAssignmentFile, setIsUploadingAssignmentFile] = useState(false);
  const [uploadedAssignmentFile, setUploadedAssignmentFile] = useState<UploadedFile | null>(null);
  const [isUploadingSubmissionFile, setIsUploadingSubmissionFile] = useState(false);
  const [uploadedSubmissionFile, setUploadedSubmissionFile] = useState<UploadedFile | null>(null);
  const [activeTab, setActiveTab] = useState<CourseDetailTab>("curriculum");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [certificatePage, setCertificatePage] = useState(1);
  const [certificateStatusFilter, setCertificateStatusFilter] = useState<"ALL" | (typeof CERTIFICATE_STATUS)[keyof typeof CERTIFICATE_STATUS]>("ALL");
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);
  const [adminEnrollEmail, setAdminEnrollEmail] = useState("");
  const [lockReasonInput, setLockReasonInput] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
  const [hasSubmittedLessonForm, setHasSubmittedLessonForm] = useState(false);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examPendingArchive, setExamPendingArchive] = useState<Exam | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionPendingDelete, setQuestionPendingDelete] = useState<ExamQuestion | null>(null);
  const [selectedExamAttemptId, setSelectedExamAttemptId] = useState<string | null>(null);
  const [examAttemptPage, setExamAttemptPage] = useState(1);
  const [examAttemptStatusFilter, setExamAttemptStatusFilter] = useState<"ALL" | (typeof EXAM_ATTEMPT_STATUS)[keyof typeof EXAM_ATTEMPT_STATUS]>(EXAM_ATTEMPT_STATUS.submitted);
  const [activeExamSession, setActiveExamSession] = useState<ExamAttemptSession | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<string, string | string[]>>({});
  const [attemptAnswersDirty, setAttemptAnswersDirty] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);
  const [examNow, setExamNow] = useState(() => Date.now());
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentPendingArchive, setAssignmentPendingArchive] = useState<Assignment | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [assignmentSubmissionPage, setAssignmentSubmissionPage] = useState(1);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const reorderSaveTimerRef = useRef<number | null>(null);
  const attemptAutosaveTimerRef = useRef<number | null>(null);
  const attemptAutosaveVersionRef = useRef(0);
  const attemptTimeoutSubmitRef = useRef<string | null>(null);
  const lessonContentReaderRef = useRef<(() => string) | null>(null);
  const { t, formatError } = useI18n();

  const isCourseOwner =
    meQuery.data?.role === USER_ROLE.instructor && courseQuery.data?.instructorId === meQuery.data.id;
  const isAdminReviewer = meQuery.data?.role === USER_ROLE.admin;
  const instructorUsersQuery = useUsers(
    {
      role: USER_ROLE.instructor,
      status: USER_STATUS.active,
      page: 1,
      limit: 100
    },
    Boolean(isAdminReviewer)
  );
  const canManageCourse = Boolean(isCourseOwner);
  const canReviewCourse = isAdminReviewer;
  const canAccessCourseWorkspace = canManageCourse || canReviewCourse;
  const canViewExamWorkspace = canAccessCourseWorkspace;

  const isLearner = meQuery.data?.role === USER_ROLE.user;
  const isCoursePublished = courseQuery.data?.status === COURSE_STATUS.published;
  const isEnrolled = myEnrollmentsQuery.data?.some((enrollment) => enrollment.courseId === courseId) ?? false;
  const canReadLessons = Boolean(canAccessCourseWorkspace || isEnrolled);
  const isCourseLocked = courseQuery.data?.status === COURSE_STATUS.locked;
  const canEditCourse = canManageCourse && !isCourseLocked;
  const lessonQuery = useCourseLessons(courseId, Boolean(courseQuery.data && canReadLessons));
  const courseReviewsQuery = useCourseReviews(courseId, Boolean(courseQuery.data));
  const courseExamsQuery = useCourseExams(courseId, Boolean(courseQuery.data));
  const courseAssignmentsQuery = useCourseAssignments(courseId, Boolean(courseQuery.data && (canManageCourse || canReviewCourse || isEnrolled)));
  const examQuestionsQuery = useExamQuestions(courseId, selectedExamId, Boolean(canViewExamWorkspace && selectedExamId));
  const createExamQuestionMutation = useCreateExamQuestion(courseId, selectedExamId);
  const updateExamQuestionMutation = useUpdateExamQuestion(courseId, selectedExamId);
  const deleteExamQuestionMutation = useDeleteExamQuestion(courseId, selectedExamId);
  const examAttemptsQuery = useExamAttempts(courseId, selectedExamId, examAttemptPage, examAttemptStatusFilter, Boolean(canManageCourse && selectedExamId));
  const gradeExamAttemptMutation = useGradeExamAttempt(courseId, selectedExamId, examAttemptPage, examAttemptStatusFilter);
  const assignmentSubmissionsQuery = useAssignmentSubmissions(courseId, selectedAssignmentId, assignmentSubmissionPage, Boolean(canManageCourse && selectedAssignmentId));
  const gradeAssignmentSubmissionMutation = useGradeAssignmentSubmission(courseId, selectedAssignmentId, assignmentSubmissionPage);
  const progressQuery = useCourseProgress(courseId, isAuthenticated && !isBootstrapping && canReadLessons);
  const lessonProgressQuery = useCourseLessonProgress(courseId, isAuthenticated && !isBootstrapping && canReadLessons && !canManageCourse);
  const pollExamAttempt = activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.submitted;
  const examAttemptQuery = useExamAttempt(activeExamSession?.attempt.id ?? null, Boolean(activeExamSession), pollExamAttempt);
  const nextLessonSortOrder = getNextLessonSortOrder(lessonQuery.data);

  const enrollmentsQuery = useCourseEnrollments(courseId, Boolean(canAccessCourseWorkspace && courseQuery.data), enrollmentPage, learnerSearch.trim());
  const courseAnalyticsQuery = useCourseAnalytics(courseId, Boolean(canAccessCourseWorkspace && courseQuery.data));
  const certificatesQuery = useCourseCertificates(courseId, certificatePage, certificateStatusFilter, Boolean(canAccessCourseWorkspace && courseQuery.data));
  const revokeCertificateMutation = useRevokeCertificate(courseId, certificatePage, certificateStatusFilter);
  const restoreCertificateMutation = useRestoreCertificate(courseId, certificatePage, certificateStatusFilter);
  const adminEnrollMutation = useAdminEnrollLearner(courseId, enrollmentPage, learnerSearch.trim());
  const adminRemoveEnrollmentMutation = useAdminRemoveLearner(courseId, enrollmentPage, learnerSearch.trim());
  const enrollments = enrollmentsQuery.data?.items ?? [];
  const enrollmentsTotal = enrollmentsQuery.data?.pagination.total ?? 0;
  const enrollmentsTotalPages = Math.max(1, Math.ceil(enrollmentsTotal / 20));
  const certificates = certificatesQuery.data?.items ?? [];
  const certificatesTotal = certificatesQuery.data?.pagination.total ?? 0;
  const certificatesTotalPages = Math.max(1, Math.ceil(certificatesTotal / 20));
  const lessons = orderedLessons;
  const selectedLesson = selectedLessonId ? lessons.find((lesson) => lesson.id === selectedLessonId) : undefined;
  const selectedLessonIndex = selectedLesson ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id) : -1;
  const completedLessonIds = new Set(
    (lessonProgressQuery.data?.items ?? []).filter((item) => item.isCompleted).map((item) => item.lessonId)
  );
  const reviews = courseReviewsQuery.data?.items ?? [];
  const myReview = meQuery.data?.id ? reviews.find((review) => review.userId === meQuery.data.id) : undefined;
  const exams = courseExamsQuery.data ?? [];
  const selectedExam = selectedExamId ? exams.find((exam) => exam.id === selectedExamId) : undefined;
  const examQuestions = examQuestionsQuery.data ?? [];
  const examAttempts = examAttemptsQuery.data?.items ?? [];
  const examAttemptsTotal = examAttemptsQuery.data?.pagination.total ?? 0;
  const examAttemptsTotalPages = Math.max(1, Math.ceil(examAttemptsTotal / 20));
  const selectedExamAttempt = selectedExamAttemptId ? examAttempts.find((attempt) => attempt.id === selectedExamAttemptId) : undefined;
  const assignments = courseAssignmentsQuery.data ?? [];
  const assignmentSubmissions = assignmentSubmissionsQuery.data?.items ?? [];
  const assignmentSubmissionsTotal = assignmentSubmissionsQuery.data?.pagination.total ?? 0;
  const assignmentSubmissionsTotalPages = Math.max(1, Math.ceil(assignmentSubmissionsTotal / 20));
  const selectedAssignment = selectedAssignmentId ? assignments.find((assignment) => assignment.id === selectedAssignmentId) : undefined;
  const selectedSubmission = selectedSubmissionId ? assignmentSubmissions.find((submission) => submission.id === selectedSubmissionId) : undefined;
  const courseAnalytics = courseAnalyticsQuery.data;
  const analyticsLoading = courseAnalyticsQuery.isLoading;
  const activeInstructors = instructorUsersQuery.data?.items ?? [];
  const instructorOptions =
    courseQuery.data?.instructor && !activeInstructors.some((instructor) => instructor.id === courseQuery.data?.instructorId)
      ? [courseQuery.data.instructor, ...activeInstructors]
      : activeInstructors;

  const handleDownloadCertificate = async (certificateId: string) => {
    setDownloadingCertificateId(certificateId);
    try {
      const file = await certificateService.downloadCertificatePdf(certificateId);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast.error(formatError(error, "progress.certificateDownloadFailed"));
    } finally {
      setDownloadingCertificateId(null);
    }
  };

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

  const examAttemptGradeForm = useForm<ExamAttemptGradeFormValues>({
    resolver: zodResolver(createExamAttemptGradeFormSchema(t)),
    defaultValues: {
      score: 0
    }
  });

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(createAssignmentFormSchema(t)),
    defaultValues: {
      title: "",
      instructions: "",
      status: ASSIGNMENT_STATUS.draft,
      dueAt: "",
      maxScore: "",
      attachmentUrl: ""
    }
  });

  const assignmentSubmissionForm = useForm<AssignmentSubmissionFormValues>({
    resolver: zodResolver(createAssignmentSubmissionFormSchema(t)),
    defaultValues: {
      content: "",
      attachmentUrl: ""
    }
  });

  const assignmentGradeForm = useForm<AssignmentGradeFormValues>({
    resolver: zodResolver(createAssignmentGradeFormSchema(t)),
    defaultValues: {
      score: 0,
      feedback: ""
    }
  });

  useEffect(() => {
    if (!courseQuery.data) {
      return;
    }

    setSelectedInstructorId(courseQuery.data.instructorId);
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
    if (activeExamSession?.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress) {
      return;
    }

    setExamNow(Date.now());
    const interval = window.setInterval(() => setExamNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeExamSession?.attempt.id, activeExamSession?.attempt.status]);

  useEffect(() => {
    if (!activeExamSession || activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress || !attemptAnswersDirty) {
      return;
    }

    if (attemptAutosaveTimerRef.current) {
      window.clearTimeout(attemptAutosaveTimerRef.current);
    }

    const version = attemptAutosaveVersionRef.current;
    const answers = activeExamSession.exam.questions.map((question) => ({
      questionId: question.id,
      answer: attemptAnswers[question.id] ?? null
    }));

    attemptAutosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const saved = await saveExamAttemptAnswersMutation.mutateAsync({
            attemptId: activeExamSession.attempt.id,
            answers
          });
          setActiveExamSession((current) =>
            current?.attempt.id === saved.attempt.id
              ? {
                  ...current,
                  attempt: saved.attempt
                }
              : current
          );
          setLastAutosavedAt(new Date().toISOString());
          if (attemptAutosaveVersionRef.current === version) {
            setAttemptAnswersDirty(false);
          }
        } catch (e) {
          toast.error(formatError(e, "courseDetail.examAutosaveFailed"));
        }
      })();
    }, 5000);

    return () => {
      if (attemptAutosaveTimerRef.current) {
        window.clearTimeout(attemptAutosaveTimerRef.current);
      }
    };
  }, [activeExamSession, attemptAnswers, attemptAnswersDirty, saveExamAttemptAnswersMutation, t]);

  useEffect(() => {
    if (!activeExamSession || activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress || !activeExamSession.exam.durationMinutes) {
      return;
    }

    const deadline = new Date(activeExamSession.attempt.startedAt).getTime() + activeExamSession.exam.durationMinutes * 60 * 1000;
    if (deadline > examNow || attemptTimeoutSubmitRef.current === activeExamSession.attempt.id) {
      return;
    }

    attemptTimeoutSubmitRef.current = activeExamSession.attempt.id;
    if (attemptAutosaveTimerRef.current) {
      window.clearTimeout(attemptAutosaveTimerRef.current);
      attemptAutosaveTimerRef.current = null;
    }

    const answers = activeExamSession.exam.questions.map((question) => ({
      questionId: question.id,
      answer: attemptAnswers[question.id] ?? null
    }));

    void (async () => {
      try {
        const submitted = await submitExamAttemptMutation.mutateAsync({
          attemptId: activeExamSession.attempt.id,
          answers
        });
        setActiveExamSession({
          ...activeExamSession,
          attempt: submitted.attempt
        });
        setAttemptAnswersDirty(false);
        toast.success(t("courseDetail.examAutoSubmitted"));
      } catch (e) {
        toast.error(formatError(e, "courseDetail.examSubmitFailed"));
      }
    })();
  }, [activeExamSession, attemptAnswers, examNow, submitExamAttemptMutation, t]);

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
    const nextAssignments = courseAssignmentsQuery.data ?? [];
    if (selectedAssignmentId && !nextAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      setSelectedAssignmentId(null);
      setSelectedSubmissionId(null);
      assignmentForm.reset({
        title: "",
        instructions: "",
        status: ASSIGNMENT_STATUS.draft,
        dueAt: "",
        maxScore: "",
        attachmentUrl: ""
      });
    }
  }, [assignmentForm, courseAssignmentsQuery.data, selectedAssignmentId]);

  useEffect(() => {
    const nextSubmissions = assignmentSubmissionsQuery.data?.items ?? [];
    if (selectedSubmissionId && !nextSubmissions.some((submission) => submission.id === selectedSubmissionId)) {
      setSelectedSubmissionId(null);
    }
  }, [assignmentSubmissionsQuery.data?.items, selectedSubmissionId]);

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
    setExamAttemptPage(1);
    setSelectedExamAttemptId(null);
  }, [selectedExamId, examAttemptStatusFilter]);

  useEffect(() => {
    const nextAttempts = examAttemptsQuery.data?.items ?? [];
    if (selectedExamAttemptId && !nextAttempts.some((attempt) => attempt.id === selectedExamAttemptId)) {
      setSelectedExamAttemptId(null);
    }
  }, [examAttemptsQuery.data?.items, selectedExamAttemptId]);

  useEffect(() => {
    setCertificatePage(1);
  }, [certificateStatusFilter]);

  useEffect(() => {
    if (!selectedExamAttempt) {
      examAttemptGradeForm.reset({ score: 0 });
      return;
    }

    examAttemptGradeForm.reset({
      score: selectedExamAttempt.score ?? 0
    });
  }, [examAttemptGradeForm, selectedExamAttempt]);

  useEffect(() => {
    return () => {
      if (reorderSaveTimerRef.current) {
        window.clearTimeout(reorderSaveTimerRef.current);
      }
      if (attemptAutosaveTimerRef.current) {
        window.clearTimeout(attemptAutosaveTimerRef.current);
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
      toast.error(formatError(e, lessonId ? "courseDetail.lessonSaveFailed" : "courseDetail.lessonCreateFailed"));
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
        ...(values.status === COURSE_STATUS.locked ? {} : { status: values.status })
      });
      toast.success(t("courseDetail.courseUpdated"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.courseUpdateFailed"));
    }
  };

  const onAssignInstructor = async () => {
    if (!selectedInstructorId || selectedInstructorId === courseQuery.data?.instructorId) {
      return;
    }

    try {
      await assignCourseInstructorMutation.mutateAsync(selectedInstructorId);
      toast.success(t("courseDetail.instructorAssigned"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.instructorAssignFailed"));
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
      toast.error(formatError(e, "courseDetail.reviewSaveFailed"));
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
      toast.error(formatError(e, selectedExamId ? "courseDetail.examSaveFailed" : "courseDetail.examCreateFailed"));
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

  const onSelectExamAttempt = (attempt: ExamAttemptForReview) => {
    setSelectedExamAttemptId(attempt.id);
    examAttemptGradeForm.clearErrors();
    examAttemptGradeForm.reset({
      score: attempt.score ?? 0
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
      toast.error(formatError(e, selectedQuestionId ? "courseDetail.questionSaveFailed" : "courseDetail.questionCreateFailed"));
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
      toast.error(formatError(e, "courseDetail.examArchiveFailed"));
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
      toast.error(formatError(e, "courseDetail.questionDeleteFailed"));
    }
  };

  const onGradeExamAttempt = async (values: ExamAttemptGradeFormValues) => {
    if (!selectedExamAttemptId) {
      toast.error(t("courseDetail.selectAttemptFirst"));
      return;
    }

    try {
      await gradeExamAttemptMutation.mutateAsync({
        attemptId: selectedExamAttemptId,
        payload: {
          score: Number(values.score)
        }
      });
      toast.success(t("courseDetail.examAttemptGraded"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.examAttemptGradeFailed"));
    }
  };

  const onSubmitAssignment = async (values: AssignmentFormValues) => {
    const payload = {
      title: values.title,
      instructions: values.instructions || null,
      status: values.status,
      dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      maxScore: values.maxScore === "" ? null : Number(values.maxScore),
      attachmentUrl: values.attachmentUrl || null
    };

    try {
      if (selectedAssignmentId) {
        await updateAssignmentMutation.mutateAsync({ assignmentId: selectedAssignmentId, payload });
        toast.success(t("courseDetail.assignmentUpdated"));
      } else {
        await createAssignmentMutation.mutateAsync(payload);
        toast.success(t("courseDetail.assignmentCreated"));
        onNewAssignment();
      }
    } catch (e) {
      toast.error(formatError(e, selectedAssignmentId ? "courseDetail.assignmentSaveFailed" : "courseDetail.assignmentCreateFailed"));
    }
  };

  const onSelectAssignment = (assignment: Assignment) => {
    setSelectedAssignmentId(assignment.id);
    setSelectedSubmissionId(null);
    setAssignmentSubmissionPage(1);
    setUploadedAssignmentFile(null);
    setUploadedSubmissionFile(null);
    assignmentForm.clearErrors();
    assignmentSubmissionForm.clearErrors();
    assignmentForm.reset({
      title: assignment.title,
      instructions: assignment.instructions ?? "",
      status: assignment.status,
      dueAt: assignment.dueAt ? assignment.dueAt.slice(0, 10) : "",
      maxScore: assignment.maxScore ?? "",
      attachmentUrl: assignment.attachmentUrl ?? ""
    });
    assignmentSubmissionForm.reset({
      content: assignment.mySubmission?.content ?? "",
      attachmentUrl: assignment.mySubmission?.attachmentUrl ?? ""
    });
  };

  const onNewAssignment = () => {
    setSelectedAssignmentId(null);
    setSelectedSubmissionId(null);
    setUploadedAssignmentFile(null);
    setUploadedSubmissionFile(null);
    assignmentForm.clearErrors();
    assignmentSubmissionForm.clearErrors();
    assignmentForm.reset({
      title: "",
      instructions: "",
      status: ASSIGNMENT_STATUS.draft,
      dueAt: "",
      maxScore: "",
      attachmentUrl: ""
    });
    assignmentSubmissionForm.reset({
      content: "",
      attachmentUrl: ""
    });
  };

  const confirmArchiveAssignment = async () => {
    if (!assignmentPendingArchive) {
      return;
    }

    try {
      await archiveAssignmentMutation.mutateAsync(assignmentPendingArchive.id);
      if (selectedAssignmentId === assignmentPendingArchive.id) {
        onNewAssignment();
      }
      setAssignmentPendingArchive(null);
      toast.success(t("courseDetail.assignmentArchived"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.assignmentArchiveFailed"));
    }
  };

  const onSubmitAssignmentSubmission = async (values: AssignmentSubmissionFormValues) => {
    if (!selectedAssignmentId) {
      toast.error(t("courseDetail.selectAssignmentFirst"));
      return;
    }

    try {
      await submitAssignmentMutation.mutateAsync({
        assignmentId: selectedAssignmentId,
        payload: {
          content: values.content || null,
          attachmentUrl: values.attachmentUrl || null
        }
      });
      toast.success(t("courseDetail.assignmentSubmitted"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.assignmentSubmitFailed"));
    }
  };

  const onSelectSubmission = (submission: AssignmentSubmission) => {
    setSelectedSubmissionId(submission.id);
    assignmentGradeForm.clearErrors();
    assignmentGradeForm.reset({
      score: submission.score ?? 0,
      feedback: submission.feedback ?? ""
    });
  };

  const onGradeAssignmentSubmission = async (values: AssignmentGradeFormValues) => {
    if (!selectedSubmissionId) {
      toast.error(t("courseDetail.selectSubmissionFirst"));
      return;
    }

    try {
      await gradeAssignmentSubmissionMutation.mutateAsync({
        submissionId: selectedSubmissionId,
        payload: {
          score: Number(values.score),
          feedback: values.feedback || null
        }
      });
      toast.success(t("courseDetail.assignmentGraded"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.assignmentGradeFailed"));
    }
  };

  const onStartExamAttempt = async (examId: string) => {
    try {
      const session = await startExamAttemptMutation.mutateAsync(examId);
      setActiveExamSession(session);
      setAttemptAnswersDirty(false);
      setLastAutosavedAt(null);
      attemptTimeoutSubmitRef.current = null;
      const nextAnswers = session.attempt.answers.reduce<Record<string, string | string[]>>((acc, item) => {
        if (typeof item.answer === "string" || Array.isArray(item.answer)) {
          acc[item.questionId] = item.answer;
        }
        return acc;
      }, {});
      setAttemptAnswers(nextAnswers);
    } catch (e) {
      toast.error(formatError(e, "courseDetail.examStartFailed"));
    }
  };

  const onChangeAttemptAnswer = (questionId: string, answer: string | string[]) => {
    attemptAutosaveVersionRef.current += 1;
    setAttemptAnswersDirty(true);
    setAttemptAnswers((current) => ({
      ...current,
      [questionId]: answer
    }));
  };

  const onToggleAttemptAnswer = (questionId: string, optionId: string) => {
    attemptAutosaveVersionRef.current += 1;
    setAttemptAnswersDirty(true);
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
      if (attemptAutosaveTimerRef.current) {
        window.clearTimeout(attemptAutosaveTimerRef.current);
        attemptAutosaveTimerRef.current = null;
      }
      const submitted = await submitExamAttemptMutation.mutateAsync({
        attemptId: activeExamSession.attempt.id,
        answers
      });
      setActiveExamSession({
        ...activeExamSession,
        attempt: submitted.attempt
      });
      setAttemptAnswersDirty(false);
      toast.success(t("courseDetail.examSubmitted"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.examSubmitFailed"));
    }
  };

  const onDeleteReview = async () => {
    try {
      await deleteReviewMutation.mutateAsync();
      setReviewRating("5");
      setReviewComment("");
      toast.success(t("courseDetail.reviewDeleted"));
    } catch (e) {
      toast.error(formatError(e, "courseDetail.reviewDeleteFailed"));
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
        message: formatError(e, "courseDetail.coverUploadFailed")
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
        message: formatError(e, "courseStudio.coverUploadFailed")
      });
    } finally {
      setIsUploadingLessonFile(false);
    }
  };

  const onAssignmentFileChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingAssignmentFile(true);
    assignmentForm.clearErrors("attachmentUrl");
    try {
      const uploaded = await uploadService.uploadFile(file, "assignment-files");
      setUploadedAssignmentFile(uploaded);
      assignmentForm.setValue("attachmentUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (e) {
      assignmentForm.setError("attachmentUrl", {
        message: formatError(e, "courseDetail.assignmentFileUploadFailed")
      });
    } finally {
      setIsUploadingAssignmentFile(false);
    }
  };

  const onAssignmentSubmissionFileChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingSubmissionFile(true);
    assignmentSubmissionForm.clearErrors("attachmentUrl");
    try {
      const uploaded = await uploadService.uploadFile(file, "assignment-submissions");
      setUploadedSubmissionFile(uploaded);
      assignmentSubmissionForm.setValue("attachmentUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (e) {
      assignmentSubmissionForm.setError("attachmentUrl", {
        message: formatError(e, "courseDetail.assignmentSubmissionFileUploadFailed")
      });
    } finally {
      setIsUploadingSubmissionFile(false);
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
          toast.error(formatError(e, "courseDetail.lessonMoveFailed"));
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
      toast.error(formatError(e, "courseDetail.lessonDeleteFailed"));
    }
  };

  const loadingMetrics = courseQuery.isLoading || lessonQuery.isLoading || (isAuthenticated && progressQuery.isLoading);
  const examRemainingSeconds =
    activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.inProgress && activeExamSession.exam.durationMinutes
      ? Math.max(
          0,
          Math.ceil(
            (new Date(activeExamSession.attempt.startedAt).getTime() + activeExamSession.exam.durationMinutes * 60 * 1000 - examNow) /
              1000
          )
        )
      : null;
  const examAutosaveLabel = saveExamAttemptAnswersMutation.isPending
    ? t("courseDetail.examAutosaving")
    : attemptAnswersDirty
      ? t("courseDetail.examAutosavePending")
      : lastAutosavedAt
        ? `${t("courseDetail.examAutosaved")} ${new Date(lastAutosavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : t("courseDetail.examAutosaveReady");
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
  const isAssignmentSubmitPending = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;
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
    { id: "assignments", label: "courseDetail.tabAssignments", count: assignments.length },
    { id: "reviews", label: "courseDetail.reviews", count: courseQuery.data?.ratingCount ?? 0 },
    { id: "learners", label: "courseDetail.tabLearners", count: enrollmentsTotal, managerOnly: true },
    { id: "settings", label: "courseDetail.tabSettings", managerOnly: true }
  ];
  const visibleTabs = tabItems.filter((item) => {
    if (item.managerOnly && !canAccessCourseWorkspace) {
      return false;
    }
    if (item.id === "settings" && canReviewCourse && !canManageCourse) {
      return true;
    }
    if (item.id === "assignments" && !canManageCourse && !isEnrolled) {
      return false;
    }
    return true;
  });
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
                    toast.error(formatError(e, "courseDetail.enrollFailed"));
                  }
                })();
              }}
            >
              {enrollMutation.isPending ? t("courseDetail.enrolling") : t("courseDetail.enroll")}
            </Button>
          ) : null}
          {canManageCourse && courseQuery.data?.status !== COURSE_STATUS.archived && !isCourseLocked ? (
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
                    toast.error(formatError(e, "courseDetail.archiveFailed"));
                  }
                })();
              }}
            >
              {archiveCourseMutation.isPending ? t("courseDetail.archiving") : t("courseDetail.archiveCourse")}
            </Button>
          ) : null}
          {isAdminReviewer && courseQuery.data && courseQuery.data.status !== COURSE_STATUS.archived ? (
            isCourseLocked ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1.5 px-3 shadow-none"
                disabled={unlockCourseMutation.isPending}
                type="button"
                onClick={() => {
                  if (!window.confirm(t("courseDetail.unlockConfirm"))) {
                    return;
                  }
                  void (async () => {
                    try {
                      await unlockCourseMutation.mutateAsync();
                      toast.success(t("courseDetail.courseUnlockedSuccess"));
                    } catch (e) {
                      toast.error(formatError(e, "courseDetail.unlockFailed"));
                    }
                  })();
                }}
              >
                <LockOpen className="size-4" aria-hidden />
                {unlockCourseMutation.isPending ? t("courseDetail.unlocking") : t("courseDetail.unlockCourse")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1.5 border-red-300 px-3 text-red-700 shadow-none hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                disabled={lockCourseMutation.isPending}
                type="button"
                onClick={() => {
                  if (!window.confirm(t("courseDetail.lockConfirm"))) {
                    return;
                  }
                  void (async () => {
                    try {
                      await lockCourseMutation.mutateAsync(lockReasonInput.trim() || undefined);
                      toast.success(t("courseDetail.courseLockedSuccess"));
                    } catch (e) {
                      toast.error(formatError(e, "courseDetail.lockFailed"));
                    }
                  })();
                }}
              >
                <Lock className="size-4" aria-hidden />
                {lockCourseMutation.isPending ? t("courseDetail.locking") : t("courseDetail.lockCourse")}
              </Button>
            )
          ) : null}
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg gap-1.5 px-3 shadow-none">
            <Link to={canAccessCourseWorkspace ? "/courses" : "/explore"}>
              <ArrowLeft className="size-4" />
              {canAccessCourseWorkspace ? t("nav.courseStudio") : t("nav.explore")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {isCourseLocked ? (
          <section className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30" role="status">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">{t("courseDetail.courseLockedBanner")}</p>
                {courseQuery.data?.lockReason ? (
                  <p className="mt-1 text-sm leading-6 text-red-700/90 dark:text-red-300/90">{courseQuery.data.lockReason}</p>
                ) : null}
                {!canEditCourse ? (
                  <p className="mt-1 text-sm leading-6 text-red-700/90 dark:text-red-300/90">{t("courseDetail.courseLockedReadOnly")}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
        {canReviewCourse && !canManageCourse ? (
          <section className={STUDIO_NOTICE} role="status">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
                <ShieldCheck className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("courseDetail.adminReviewMode")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("courseDetail.adminReviewModeDescription")}</p>
              </div>
            </div>
          </section>
        ) : null}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <CourseCoverFrame src={courseQuery.data?.coverImageUrl} className="min-h-0 max-h-[22rem]" emptyLabel={t("courseDetail.coverEmptyTitle")} />
          <div className="grid gap-3 self-start">
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
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
                  <div key={item.label} className="min-h-24 rounded-xl bg-card ring-1 ring-foreground/10 p-3">
                    <Icon className="mb-2 size-4 text-muted-foreground" aria-hidden />
                    <p className="truncate text-xl font-semibold tabular-nums">{loadingMetrics ? "..." : item.value}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {canAccessCourseWorkspace ? (
          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">{t("courseDetail.analyticsTitle")}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("courseDetail.analyticsDescription")}</p>
              </div>
              {courseAnalyticsQuery.isFetching ? (
                <Badge variant="outline" className="w-fit rounded-md">
                  {t("common.loading")}
                </Badge>
              ) : null}
            </div>
            {courseAnalyticsQuery.isError ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("courseDetail.analyticsLoadFailed")}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    icon: CheckCircle2,
                    label: t("courseDetail.analyticsCompletionRate"),
                    value: `${courseAnalytics?.completionRate ?? 0}%`,
                    hint: `${courseAnalytics?.completedLessonCount ?? 0}/${(courseAnalytics?.enrollmentCount ?? 0) * (courseAnalytics?.lessonCount ?? 0)} ${t("courseDetail.analyticsCompletionHint")}`
                  },
                  {
                    icon: Users,
                    label: t("courseDetail.analyticsEngagementRate"),
                    value: `${courseAnalytics?.engagementRate ?? 0}%`,
                    hint: `${courseAnalytics?.activeLearnerCount ?? 0}/${courseAnalytics?.enrollmentCount ?? 0} ${t("courseDetail.analyticsEngagementHint")}`
                  },
                  {
                    icon: ClipboardCheck,
                    label: t("courseDetail.analyticsExamAttempts"),
                    value: courseAnalytics?.examAttemptCount ?? 0,
                    hint: `${courseAnalytics?.gradedExamAttemptCount ?? 0} ${t("courseDetail.analyticsExamAttemptsHint")}`
                  },
                  {
                    icon: FileCheck2,
                    label: t("courseDetail.analyticsAssignmentSubmissions"),
                    value: courseAnalytics?.assignmentSubmissionCount ?? 0,
                    hint: `${courseAnalytics?.lateAssignmentSubmissionCount ?? 0} ${t("courseDetail.analyticsAssignmentSubmissionsHint")}`
                  },
                  {
                    icon: Award,
                    label: t("courseDetail.analyticsCertificates"),
                    value: courseAnalytics?.certificatesIssued ?? 0,
                    hint: t("courseDetail.analyticsCertificatesHint")
                  },
                  {
                    icon: Star,
                    label: t("courseDetail.analyticsRating"),
                    value: courseAnalytics?.ratingCount ? courseAnalytics.ratingAverage.toFixed(1) : "—",
                    hint: `${courseAnalytics?.ratingCount ?? 0} ${t("courseDetail.analyticsRatingHint")}`
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-h-28 rounded-lg border border-border/70 bg-background px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{analyticsLoading ? "..." : item.value}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{analyticsLoading ? t("common.loading") : item.hint}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {courseMetadata.length || hasLongMetadata ? (
          <section className="grid gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t("courseDetail.courseMetadata")}</h2>
              {courseQuery.data?.category ? <Badge variant="secondary">{courseQuery.data.category}</Badge> : null}
            </div>
            {courseMetadata.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {courseMetadata.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-w-0 rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
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
                  <div className="rounded-xl bg-background ring-1 ring-foreground/10 px-3 py-3">
                    <h3 className="text-sm font-semibold">{t("courseDetail.courseRequirements")}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{courseQuery.data.requirements}</p>
                  </div>
                ) : null}
                {courseQuery.data?.outcomes ? (
                  <div className="rounded-xl bg-background ring-1 ring-foreground/10 px-3 py-3">
                    <h3 className="text-sm font-semibold">{t("courseDetail.courseOutcomes")}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{courseQuery.data.outcomes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className={STUDIO_TAB_BAR}>
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(STUDIO_TAB, activeTab === item.id ? STUDIO_TAB_ACTIVE : STUDIO_TAB_IDLE)}
              onClick={() => setActiveTab(item.id)}
            >
              {t(item.label)}
              {typeof item.count === "number" ? (
                <span className={cn(activeTab === item.id ? STUDIO_TAB_COUNT_ACTIVE : STUDIO_TAB_COUNT_IDLE)}>{item.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        {activeTab === "curriculum" ? (
          <section
            className={cn(
              canReadLessons && (canManageCourse || canReviewCourse)
                ? STUDIO_WORKSPACE_GRID
                : canReadLessons
                  ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
                  : "grid gap-4"
            )}
          >
            <Card className={cn("", canManageCourse || canReviewCourse ? STUDIO_LIST_STICKY : undefined)}>
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
                                toast.error(formatError(e, "courseDetail.enrollFailed"));
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
                    <div className="max-h-[min(70vh,42rem)] overflow-auto rounded-xl bg-muted/40 p-1.5 ring-1 ring-foreground/10">
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
                                selected ? "bg-background shadow-sm ring-1 ring-foreground/15" : "hover:bg-background/80",
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
                              ) : isAuthenticated && isLearner ? (
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

            {!canManageCourse && canReadLessons ? (
              <Card>
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
                      <div className="min-h-[min(60vh,28rem)]">{renderLearnerLessonContent(selectedLesson)}</div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
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
                        {isAuthenticated && isLearner ? (
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
              <Card className="min-w-0 w-full">
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <CardTitle className={STUDIO_EDITOR_TITLE}>{selectedLessonId ? t("courseDetail.editLesson") : t("courseDetail.addLesson")}</CardTitle>
                    <CardDescription>{t("courseDetail.addLessonDescription")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form
                    className={STUDIO_FORM_STACK}
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
                          <div id="lesson-type" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={t("courseDetail.lessonType")}>
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
                                    active ? "bg-background text-foreground shadow-sm ring-2 ring-foreground/20" : "bg-background hover:bg-accent/40 ring-1 ring-foreground/10"
                                  )}
                                  onClick={() => {
                                    field.onChange(option.value);
                                    form.setValue("content", "", { shouldDirty: true });
                                    setUploadedLessonFile(null);
                                  }}
                                >
                                  <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} aria-hidden />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium">{option.label}</span>
                                    <span className={cn("mt-0.5 block text-xs leading-5", active ? "text-muted-foreground" : "text-muted-foreground")}>
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

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
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

          </section>
        ) : null}

        {activeTab === "exams" ? (
          <section className={cn(canAccessCourseWorkspace ? STUDIO_WORKSPACE_GRID : "grid gap-4")}>
            <Card className={cn("", canAccessCourseWorkspace ? STUDIO_LIST_STICKY : undefined)}>
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
                    <div className="max-h-[min(70vh,42rem)] overflow-auto">
                      <div className="grid gap-3">
                      {exams.map((exam) => {
                        const selected = selectedExamId === exam.id;
                        return (
                          <article
                            key={exam.id}
                            className={cn(
                              "rounded-lg border bg-background px-4 py-3 transition-colors",
                              canViewExamWorkspace || (isAuthenticated && isLearner && isCoursePublished && isEnrolled)
                                ? "cursor-pointer hover:bg-accent/40"
                                : undefined,
                              selected ? "bg-accent/70 ring-foreground/20" : "ring-1 ring-foreground/10"
                            )}
                            onClick={() => {
                              if (canViewExamWorkspace) {
                                onSelectExam(exam);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (!canViewExamWorkspace) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelectExam(exam);
                              }
                            }}
                            role={canViewExamWorkspace ? "button" : undefined}
                            tabIndex={canViewExamWorkspace ? 0 : undefined}
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
                              ) : canReviewCourse ? (
                                <span className="inline-flex h-8 items-center gap-1 rounded-md ring-1 ring-foreground/10 bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground">
                                  <Eye className="size-3.5" aria-hidden />
                                  {t("courseDetail.viewExam")}
                                </span>
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
                    </div>
                  ) : (
                    <EmptyState icon={ClipboardCheck} title={t("courseDetail.noExams")} description={t("courseDetail.noExamsDescription")} />
                  )
                ) : null}
              </CardContent>
            </Card>

            {canManageCourse ? (
              <div className="grid min-w-0 w-full gap-4">
              <Card>
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className={STUDIO_EDITOR_TITLE}>{selectedExamId ? t("courseDetail.editExam") : t("courseDetail.addExam")}</CardTitle>
                  <CardDescription>{t("courseDetail.addExamDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form className={STUDIO_FORM_STACK} onSubmit={examForm.handleSubmit(onSubmitExam)} noValidate>
                    <FormField id="exam-title" label={t("courseDetail.examTitle")} error={examForm.formState.errors.title?.message}>
                      <Input id="exam-title" placeholder={t("courseDetail.examTitlePlaceholder")} {...examForm.register("title")} />
                    </FormField>
                    <FormField id="exam-description" label={t("courseDetail.examDescription")} hint={t("courseDetail.optional")} error={examForm.formState.errors.description?.message}>
                      <TextareaField id="exam-description" rows={6} placeholder={t("courseDetail.examDescriptionPlaceholder")} {...examForm.register("description")} />
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
                    <div className="flex justify-end gap-2 border-t border-border pt-2">
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

              <Card>
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
                    <div className="grid gap-6">
                      <div className="max-h-[min(50vh,28rem)] min-h-48 overflow-auto rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
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
                                      selected ? "bg-background shadow-sm ring-1 ring-foreground/15" : "hover:bg-background/80"
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

                      <form className="grid gap-5 rounded-lg ring-1 ring-foreground/10 bg-muted/10 p-5 md:p-6" onSubmit={questionForm.handleSubmit(onSubmitQuestion)} noValidate>
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
                        <div className="flex justify-end gap-2 border-t border-border pt-2">
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

              {selectedExamId ? (
              <Card>
                <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.examAttempts")}</CardTitle>
                    <CardDescription>{t("courseDetail.examAttemptsDescription")}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {examAttemptsTotal} {t("courseDetail.examAttempt")}
                    </span>
                    <Select
                      value={examAttemptStatusFilter}
                      onValueChange={(value) => setExamAttemptStatusFilter(value as typeof examAttemptStatusFilter)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-md border-border/80 shadow-none sm:w-44" aria-label={t("courseDetail.attemptStatusFilter")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("courseDetail.allAttempts")}</SelectItem>
                        <SelectItem value={EXAM_ATTEMPT_STATUS.submitted}>{t("examAttemptStatus.SUBMITTED")}</SelectItem>
                        <SelectItem value={EXAM_ATTEMPT_STATUS.graded}>{t("examAttemptStatus.GRADED")}</SelectItem>
                        <SelectItem value={EXAM_ATTEMPT_STATUS.inProgress}>{t("examAttemptStatus.IN_PROGRESS")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] xl:items-start">
                  <div className={cn(STUDIO_LIST, "max-h-[min(58vh,34rem)] overflow-auto")}>
                    {examAttemptsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
                    {examAttemptsQuery.isError ? (
                      <div className="m-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {t("courseDetail.examAttemptsLoadFailed")}
                      </div>
                    ) : null}
                    {!examAttemptsQuery.isLoading && !examAttemptsQuery.isError && examAttempts.length ? (
                      <div className="grid gap-2" role="list" aria-label={t("courseDetail.examAttempts")}>
                        {examAttempts.map((attempt) => {
                          const selected = selectedExamAttemptId === attempt.id;
                          return (
                            <button
                              key={attempt.id}
                              type="button"
                              className={cn(STUDIO_ROW, "grid w-full gap-3 text-left", selected ? STUDIO_ROW_SELECTED : undefined)}
                              onClick={() => onSelectExamAttempt(attempt)}
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{attempt.user?.email ?? attempt.userId}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t("courseDetail.examAttempt")} #{attempt.attemptNumber}
                                  </p>
                                </div>
                                <Badge variant={attempt.status === EXAM_ATTEMPT_STATUS.graded ? "default" : "secondary"} className="shrink-0 rounded-md">
                                  {t(`examAttemptStatus.${attempt.status}` as I18nKey)}
                                </Badge>
                              </div>
                              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                                <span className="rounded-md bg-background/70 px-2 py-1">
                                  {t("courseDetail.score")}: {attempt.score ?? "—"}
                                </span>
                                <span className="rounded-md bg-background/70 px-2 py-1">
                                  {t("courseDetail.questions")}: {attempt.answers.length}
                                </span>
                                <span className="rounded-md bg-background/70 px-2 py-1">
                                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "—"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {!examAttemptsQuery.isLoading && !examAttemptsQuery.isError && !examAttempts.length ? (
                      <div className="rounded-lg bg-background p-4 ring-1 ring-foreground/10">
                        <EmptyState icon={FileCheck2} title={t("courseDetail.noExamAttempts")} description={t("courseDetail.noExamAttemptsDescription")} />
                      </div>
                    ) : null}
                  </div>

                  <form className={cn(STUDIO_FORM_SHELL, "grid gap-5")} onSubmit={examAttemptGradeForm.handleSubmit(onGradeExamAttempt)} noValidate>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{t("courseDetail.gradeAttempt")}</h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {selectedExamAttempt ? selectedExamAttempt.user?.email ?? selectedExamAttempt.userId : t("courseDetail.selectAttemptFirst")}
                        </p>
                      </div>
                      {selectedExamAttempt ? (
                        <Badge variant={selectedExamAttempt.status === EXAM_ATTEMPT_STATUS.graded ? "default" : "secondary"} className="shrink-0 rounded-md">
                          {t(`examAttemptStatus.${selectedExamAttempt.status}` as I18nKey)}
                        </Badge>
                      ) : null}
                    </div>
                    {selectedExamAttempt ? (
                      <div className="max-h-[min(54vh,34rem)] space-y-3 overflow-auto pr-1">
                        {selectedExamAttempt.answers.length ? (
                          selectedExamAttempt.answers.map((answer, index) => (
                            <article key={answer.id} className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
                                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                                  {t(`examQuestionType.${answer.question.type}` as I18nKey)}
                                </Badge>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                  {answer.question.points} {t("courseDetail.points")}
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-medium leading-6">{answer.question.prompt}</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 px-3 py-2 text-sm leading-6">
                                {formatAttemptAnswer(answer.answer)}
                              </p>
                              {answer.question.correctAnswers?.length ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {t("courseDetail.correctAnswers")}: {answer.question.correctAnswers.join(", ")}
                                </p>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <p className={STUDIO_NOTICE}>{t("courseDetail.noAttemptAnswers")}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-background p-4 ring-1 ring-foreground/10">
                        <EmptyState icon={FileCheck2} title={t("courseDetail.selectAttemptFirst")} description={t("courseDetail.examAttemptsDescription")} />
                      </div>
                    )}
                    <FormField id="exam-attempt-grade-score" label={t("courseDetail.score")} error={examAttemptGradeForm.formState.errors.score?.message}>
                      <Input id="exam-attempt-grade-score" inputMode="numeric" min={0} max={100} type="number" {...examAttemptGradeForm.register("score")} />
                    </FormField>
                    <Button
                      className="h-10 rounded-md font-medium shadow-none"
                      disabled={!selectedExamAttemptId || selectedExamAttempt?.status === EXAM_ATTEMPT_STATUS.inProgress || gradeExamAttemptMutation.isPending}
                      type="submit"
                    >
                      {gradeExamAttemptMutation.isPending ? t("courseDetail.gradingExamAttempt") : t("courseDetail.saveGrade")}
                    </Button>
                    {examAttemptsTotalPages > 1 ? (
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>
                          {t("courseDetail.page")} {examAttemptPage} / {examAttemptsTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" disabled={examAttemptPage <= 1} onClick={() => setExamAttemptPage((page) => Math.max(1, page - 1))}>
                            {t("courseDetail.previous")}
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" disabled={examAttemptPage >= examAttemptsTotalPages} onClick={() => setExamAttemptPage((page) => Math.min(examAttemptsTotalPages, page + 1))}>
                            {t("courseDetail.next")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
              ) : null}
              </div>
            ) : canReviewCourse ? (
              <div className="grid min-w-0 gap-4">
                {!selectedExam ? (
                  <Card>
                    <CardContent className="py-10">
                      <EmptyState icon={ClipboardCheck} title={t("courseDetail.noExamSelected")} description={t("courseDetail.adminSelectExamDescription")} />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">{selectedExam.title}</CardTitle>
                            {selectedExam.description ? <CardDescription className="mt-1">{selectedExam.description}</CardDescription> : null}
                          </div>
                          <Badge
                            variant={selectedExam.status === EXAM_STATUS.published ? "default" : selectedExam.status === EXAM_STATUS.archived ? "destructive" : "secondary"}
                            className="rounded-md"
                          >
                            {t(`examStatus.${selectedExam.status}` as I18nKey)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                            <p className="text-xs text-muted-foreground">{t("courseDetail.examDuration")}</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">
                              {selectedExam.durationMinutes ? `${selectedExam.durationMinutes} ${t("courseDetail.examMinutes")}` : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                            <p className="text-xs text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">
                              {selectedExam.passingScore !== null && selectedExam.passingScore !== undefined ? `${selectedExam.passingScore}%` : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                            <p className="text-xs text-muted-foreground">{t("courseDetail.questions")}</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">{selectedExam.questionCount ?? examQuestions.length}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground">{t("courseDetail.adminReadOnlyHint")}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t("courseDetail.examQuestions")}</CardTitle>
                        <CardDescription>{t("courseDetail.adminExamQuestionsDescription")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {examQuestionsQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
                        {examQuestionsQuery.isError ? (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            {formatError(examQuestionsQuery.error, "courseDetail.questionsLoadFailed")}
                          </div>
                        ) : null}
                        {!examQuestionsQuery.isLoading && !examQuestionsQuery.isError ? (
                          examQuestions.length ? (
                            <div className="grid gap-3">
                              {examQuestions.map((question, index) => (
                                <article key={question.id} className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
                                    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                                      {t(`examQuestionType.${question.type}` as I18nKey)}
                                    </Badge>
                                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                      {question.points} {t("courseDetail.points")}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm font-medium leading-6">{question.prompt}</p>
                                  {question.options?.length ? (
                                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                      {question.options.map((option) => {
                                        const isCorrect = question.correctAnswers?.includes(option.id);
                                        return (
                                          <li
                                            key={option.id}
                                            className={cn(
                                              "rounded-md border px-2.5 py-2 text-xs",
                                              isCorrect ? "bg-emerald-500/10 text-emerald-900 ring-1 ring-emerald-500/25 dark:text-emerald-100" : "bg-muted/40 text-muted-foreground ring-1 ring-foreground/10"
                                            )}
                                          >
                                            <span className="font-mono">{option.id}.</span> {option.text}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : null}
                                  {question.explanation ? (
                                    <p className="mt-3 rounded-lg bg-muted/40 ring-1 ring-foreground/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
                                      {question.explanation}
                                    </p>
                                  ) : null}
                                </article>
                              ))}
                            </div>
                          ) : (
                            <EmptyState icon={ClipboardCheck} title={t("courseDetail.noQuestions")} description={t("courseDetail.noQuestionsDescription")} />
                          )
                        ) : null}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            ) : null}

            {!canManageCourse && !canReviewCourse && activeExamSession ? (
              <Card>
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
                  <div className="grid justify-items-end gap-1">
                    <Badge variant={activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? "secondary" : "default"} className="rounded-md">
                      {t(`examAttemptStatus.${activeExamSession.attempt.status}` as I18nKey)}
                    </Badge>
                    {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
                      <span className="text-[11px] text-muted-foreground">{examAutosaveLabel}</span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded && activeExamSession.attempt.score !== null && activeExamSession.attempt.score !== undefined ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{t("courseDetail.examScore")}</p>
                        <p className="mt-1 text-lg font-semibold">{activeExamSession.attempt.score}%</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
                        <p className="mt-1 text-lg font-semibold">{activeExamSession.exam.passingScore ?? "—"}%</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
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
                    <p className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3 text-sm text-muted-foreground">{t("courseDetail.examAwaitingManualGrade")}</p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.examAttempt")}</p>
                      <p className="mt-1 text-lg font-semibold">#{activeExamSession.attempt.attemptNumber}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.questions")}</p>
                      <p className="mt-1 text-lg font-semibold">{activeExamSession.exam.questions.length}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.examDuration")}</p>
                      <p className="mt-1 text-lg font-semibold">
                        {activeExamSession.exam.durationMinutes ? `${activeExamSession.exam.durationMinutes} ${t("courseDetail.examMinutes")}` : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.examTimeRemaining")}</p>
                      <p className={cn("mt-1 text-lg font-semibold tabular-nums", examRemainingSeconds !== null && examRemainingSeconds <= 60 ? "text-destructive" : undefined)}>
                        {examRemainingSeconds === null ? "—" : formatRemainingTime(examRemainingSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {activeExamSession.exam.questions.map((question, index) => {
                      const answer = attemptAnswers[question.id];
                      const submitted = activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress;
                      return (
                        <article key={question.id} className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-4 py-4">
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
                                      checked ? "bg-background shadow-sm ring-1 ring-foreground/15" : "hover:bg-background/80"
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
                    <div className="flex justify-end border-t border-border pt-2">
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

        {activeTab === "assignments" ? (
          <section className={cn(canAccessCourseWorkspace || selectedAssignment ? STUDIO_WORKSPACE_GRID : "grid gap-4")}>
            <Card className={cn("", canAccessCourseWorkspace || selectedAssignment ? STUDIO_LIST_STICKY : undefined)}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">{t("courseDetail.assignments")}</CardTitle>
                  <CardDescription>{t("courseDetail.assignmentsDescription")}</CardDescription>
                </div>
                {canManageCourse ? (
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-md shadow-none" onClick={onNewAssignment}>
                    {t("courseDetail.newAssignment")}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {courseAssignmentsQuery.isLoading ? <CourseListSkeleton rows={4} /> : null}
                {courseAssignmentsQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.assignmentsLoadFailed")}
                  </div>
                ) : null}
                {!courseAssignmentsQuery.isLoading && !courseAssignmentsQuery.isError ? (
                  assignments.length ? (
                    <div className="max-h-[min(70vh,42rem)] overflow-auto">
                      <div className="grid gap-3">
                      {assignments.map((assignment) => {
                        const selected = selectedAssignmentId === assignment.id;
                        const submitted = Boolean(assignment.mySubmission);
                        return (
                          <article
                            key={assignment.id}
                            className={cn(
                              "rounded-lg border bg-background px-4 py-3 transition-colors",
                              canAccessCourseWorkspace || isEnrolled ? "cursor-pointer hover:bg-accent/40" : undefined,
                              selected ? "bg-accent/70 ring-foreground/20" : "ring-1 ring-foreground/10"
                            )}
                            onClick={() => onSelectAssignment(assignment)}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-semibold">{assignment.title}</h3>
                                  <Badge
                                    variant={assignment.status === ASSIGNMENT_STATUS.published ? "default" : assignment.status === ASSIGNMENT_STATUS.archived ? "destructive" : "secondary"}
                                    className="rounded-md"
                                  >
                                    {t(`assignmentStatus.${assignment.status}` as I18nKey)}
                                  </Badge>
                                  {!canManageCourse && submitted ? (
                                    <Badge variant={assignment.mySubmission?.status === ASSIGNMENT_SUBMISSION_STATUS.graded ? "default" : "outline"} className="rounded-md">
                                      {t(`assignmentSubmissionStatus.${assignment.mySubmission?.status}` as I18nKey)}
                                    </Badge>
                                  ) : null}
                                  {!canManageCourse && assignment.mySubmission?.isLate ? (
                                    <Badge variant="destructive" className="rounded-md">
                                      {t("courseDetail.assignmentLate")}
                                    </Badge>
                                  ) : null}
                                </div>
                                {assignment.instructions ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{assignment.instructions}</p> : null}
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {assignment.dueAt ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                                      <CalendarDays className="size-3.5" aria-hidden />
                                      {new Date(assignment.dueAt).toLocaleDateString()}
                                    </span>
                                  ) : null}
                                  {assignment.maxScore ? (
                                    <span className="rounded-md bg-muted px-2 py-1">
                                      {assignment.maxScore} {t("courseDetail.points")}
                                    </span>
                                  ) : null}
                                  {canManageCourse ? (
                                    <span className="rounded-md bg-muted px-2 py-1">
                                      {assignment.submissionCount} {t("courseDetail.submissions")}
                                    </span>
                                  ) : null}
                                  {assignment.attachmentUrl ? <span className="rounded-md bg-muted px-2 py-1">{t("courseDetail.attachment")}</span> : null}
                                </div>
                              </div>
                              {canManageCourse ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 shrink-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
                                  disabled={archiveAssignmentMutation.isPending || assignment.status === ASSIGNMENT_STATUS.archived}
                                  aria-label={t("courseDetail.archiveAssignment")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setAssignmentPendingArchive(assignment);
                                  }}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={FileCheck2} title={t("courseDetail.noAssignments")} description={t("courseDetail.noAssignmentsDescription")} />
                  )
                ) : null}
              </CardContent>
            </Card>

            {canManageCourse ? (
              <div className="grid min-w-0 w-full gap-4">
              <Card>
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className={STUDIO_EDITOR_TITLE}>{selectedAssignmentId ? t("courseDetail.editAssignment") : t("courseDetail.addAssignment")}</CardTitle>
                  <CardDescription>{t("courseDetail.addAssignmentDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form className={STUDIO_FORM_STACK} onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} noValidate>
                    <FormField id="assignment-title" label={t("courseDetail.assignmentTitle")} error={assignmentForm.formState.errors.title?.message}>
                      <Input id="assignment-title" placeholder={t("courseDetail.assignmentTitlePlaceholder")} {...assignmentForm.register("title")} />
                    </FormField>
                    <FormField id="assignment-instructions" label={t("courseDetail.assignmentInstructions")} error={assignmentForm.formState.errors.instructions?.message}>
                      <TextareaField id="assignment-instructions" rows={10} placeholder={t("courseDetail.assignmentInstructionsPlaceholder")} {...assignmentForm.register("instructions")} />
                    </FormField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="assignment-due-at" label={t("courseDetail.assignmentDueAt")} hint={t("courseDetail.optional")} error={assignmentForm.formState.errors.dueAt?.message}>
                        <Input id="assignment-due-at" type="date" {...assignmentForm.register("dueAt")} />
                      </FormField>
                      <FormField id="assignment-max-score" label={t("courseDetail.assignmentMaxScore")} error={assignmentForm.formState.errors.maxScore?.message}>
                        <Input id="assignment-max-score" inputMode="numeric" min={1} type="number" placeholder="100" {...assignmentForm.register("maxScore")} />
                      </FormField>
                    </div>
                    <FormField id="assignment-attachment-url" label={t("courseDetail.assignmentAttachmentUrl")} hint={t("courseDetail.optional")} error={assignmentForm.formState.errors.attachmentUrl?.message}>
                      <LessonUploadField
                        id="assignment-attachment-url"
                        accept=".pdf,.txt,.md,.doc,.docx,.zip,application/pdf,text/plain,text/markdown,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        isUploading={isUploadingAssignmentFile}
                        uploadedFileName={uploadedAssignmentFile?.fileName}
                        title={t("courseDetail.uploadAssignmentFileTitle")}
                        description={t("courseDetail.uploadAssignmentFileDescription")}
                        chooseLabel={t("courseDetail.chooseAssignmentFile")}
                        uploadingLabel={t("courseDetail.uploadingAssignmentFile")}
                        urlLabel={t("courseDetail.pasteAssignmentUrl")}
                        urlPlaceholder={t("courseDetail.assignmentUrlPlaceholder")}
                        previewUrl={assignmentForm.watch("attachmentUrl") ?? ""}
                        previewKind="resource"
                        previewFileName={uploadedAssignmentFile?.fileName}
                        previewMimeType={uploadedAssignmentFile?.mimeType}
                        previewTitle={t("courseDetail.assignmentFilePreview")}
                        previewDescription={t("courseDetail.assignmentFilePreviewDescription")}
                        openPreviewLabel={t("courseDetail.viewAssignmentFile")}
                        previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                        previewLoadingLabel={t("courseDetail.previewLoading")}
                        previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                        previewEmptyLabel={t("courseDetail.previewEmpty")}
                        Icon={Paperclip}
                        onFileChange={(file) => void onAssignmentFileChange(file)}
                        onUrlChange={() => setUploadedAssignmentFile(null)}
                        urlInputProps={assignmentForm.register("attachmentUrl")}
                      />
                    </FormField>
                    <FormField id="assignment-status" label={t("courseDetail.status")} error={assignmentForm.formState.errors.status?.message}>
                      <Controller
                        control={assignmentForm.control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="assignment-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ASSIGNMENT_STATUS.draft}>{t("assignmentStatus.DRAFT")}</SelectItem>
                              <SelectItem value={ASSIGNMENT_STATUS.published}>{t("assignmentStatus.PUBLISHED")}</SelectItem>
                              <SelectItem value={ASSIGNMENT_STATUS.archived}>{t("assignmentStatus.ARCHIVED")}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                    <div className="flex justify-end gap-2 border-t border-border pt-2">
                      {selectedAssignmentId ? (
                        <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onNewAssignment}>
                          {t("courseDetail.newAssignment")}
                        </Button>
                      ) : null}
                      <Button className="h-10 rounded-md font-medium shadow-none" disabled={isAssignmentSubmitPending || isUploadingAssignmentFile} type="submit">
                        {isAssignmentSubmitPending
                          ? t("courseDetail.savingAssignment")
                          : selectedAssignmentId
                            ? t("courseDetail.saveAssignment")
                            : t("courseDetail.createAssignment")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              {selectedAssignmentId ? (
              <Card>
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.assignmentSubmissions")}</CardTitle>
                      <CardDescription>{t("courseDetail.assignmentSubmissionsDescription")}</CardDescription>
                    </div>
                    <span className="w-fit rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {assignmentSubmissionsTotal} {t("courseDetail.submissions")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] xl:items-start">
                  <div className={cn(STUDIO_LIST, "max-h-[min(58vh,34rem)] overflow-auto")}>
                    {assignmentSubmissionsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
                    {!assignmentSubmissionsQuery.isLoading && assignmentSubmissions.length ? (
                      <div className="grid gap-2" role="list" aria-label={t("courseDetail.assignmentSubmissions")}>
                        {assignmentSubmissions.map((submission) => {
                          const selected = selectedSubmissionId === submission.id;
                          return (
                            <button
                              key={submission.id}
                              type="button"
                              className={cn(STUDIO_ROW, "grid w-full gap-3 text-left", selected ? STUDIO_ROW_SELECTED : undefined)}
                              onClick={() => onSelectSubmission(submission)}
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{submission.user?.email ?? submission.userId}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <Badge variant={submission.status === ASSIGNMENT_SUBMISSION_STATUS.graded ? "default" : "secondary"} className="shrink-0 rounded-md">
                                  {t(`assignmentSubmissionStatus.${submission.status}` as I18nKey)}
                                </Badge>
                                {submission.isLate ? (
                                  <Badge variant="destructive" className="shrink-0 rounded-md">
                                    {t("courseDetail.assignmentLate")}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                                <span className="rounded-md bg-background/70 px-2 py-1">
                                  {t("courseDetail.score")}: {submission.score ?? "—"}
                                </span>
                                <span className="rounded-md bg-background/70 px-2 py-1">
                                  {submission.content ? t("courseDetail.assignmentSubmissionContent") : t("courseDetail.attachment")}
                                </span>
                                <span className="truncate rounded-md bg-background/70 px-2 py-1">
                                  {submission.attachmentUrl ? t("courseDetail.viewSubmissionFile") : t("courseDetail.noSubmissionFile")}
                                </span>
                                <span className={cn("rounded-md px-2 py-1", submission.isLate ? "bg-destructive/10 text-destructive" : "bg-background/70")}>
                                  {submission.isLate ? t("courseDetail.assignmentLate") : t("courseDetail.assignmentOnTime")}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {!assignmentSubmissionsQuery.isLoading && !assignmentSubmissions.length ? (
                      <div className="rounded-lg bg-background p-4 ring-1 ring-foreground/10">
                        <EmptyState icon={FileCheck2} title={t("courseDetail.noSubmissions")} description={t("courseDetail.noSubmissionsDescription")} />
                      </div>
                    ) : null}
                  </div>
                  <form className={cn(STUDIO_FORM_SHELL, "grid gap-5")} onSubmit={assignmentGradeForm.handleSubmit(onGradeAssignmentSubmission)} noValidate>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{t("courseDetail.gradeSubmission")}</h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{selectedSubmission ? selectedSubmission.user?.email ?? selectedSubmission.userId : t("courseDetail.selectSubmissionFirst")}</p>
                      </div>
                      {selectedSubmission ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant={selectedSubmission.status === ASSIGNMENT_SUBMISSION_STATUS.graded ? "default" : "secondary"} className="shrink-0 rounded-md">
                            {t(`assignmentSubmissionStatus.${selectedSubmission.status}` as I18nKey)}
                          </Badge>
                          {selectedSubmission.isLate ? (
                            <Badge variant="destructive" className="shrink-0 rounded-md">
                              {t("courseDetail.assignmentLate")}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {selectedSubmission ? (
                      <div className="grid gap-3">
                        {selectedSubmission.content ? (
                          <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-6 ring-1 ring-foreground/10">{selectedSubmission.content}</p>
                        ) : (
                          <p className={STUDIO_NOTICE}>{t("courseDetail.noSubmissionContent")}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-background p-4 ring-1 ring-foreground/10">
                        <EmptyState icon={FileCheck2} title={t("courseDetail.selectSubmissionFirst")} description={t("courseDetail.assignmentSubmissionsDescription")} />
                      </div>
                    )}
                    {selectedSubmission?.attachmentUrl ? (
                      <a className="inline-flex h-10 items-center rounded-md ring-1 ring-foreground/10 px-4 text-sm font-medium hover:bg-muted/40" href={selectedSubmission.attachmentUrl} rel="noreferrer" target="_blank">
                        <Paperclip className="mr-2 size-4" aria-hidden />
                        {t("courseDetail.viewSubmissionFile")}
                      </a>
                    ) : null}
                    <FormField id="assignment-grade-score" label={t("courseDetail.score")} error={assignmentGradeForm.formState.errors.score?.message}>
                      <Input id="assignment-grade-score" inputMode="numeric" min={0} max={selectedAssignment?.maxScore ?? 10000} type="number" {...assignmentGradeForm.register("score")} />
                    </FormField>
                    <FormField id="assignment-grade-feedback" label={t("courseDetail.feedback")} hint={t("courseDetail.optional")} error={assignmentGradeForm.formState.errors.feedback?.message}>
                      <TextareaField id="assignment-grade-feedback" rows={4} placeholder={t("courseDetail.feedbackPlaceholder")} {...assignmentGradeForm.register("feedback")} />
                    </FormField>
                    <Button className="h-10 rounded-md font-medium shadow-none" disabled={!selectedSubmissionId || gradeAssignmentSubmissionMutation.isPending} type="submit">
                      {gradeAssignmentSubmissionMutation.isPending ? t("courseDetail.gradingAssignment") : t("courseDetail.saveGrade")}
                    </Button>
                    {assignmentSubmissionsTotalPages > 1 ? (
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>
                          {t("courseDetail.page")} {assignmentSubmissionPage} / {assignmentSubmissionsTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" disabled={assignmentSubmissionPage <= 1} onClick={() => setAssignmentSubmissionPage((page) => Math.max(1, page - 1))}>
                            {t("courseDetail.previous")}
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" disabled={assignmentSubmissionPage >= assignmentSubmissionsTotalPages} onClick={() => setAssignmentSubmissionPage((page) => Math.min(assignmentSubmissionsTotalPages, page + 1))}>
                            {t("courseDetail.next")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
              ) : null}
              </div>
            ) : canReviewCourse && selectedAssignment ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{selectedAssignment.title}</CardTitle>
                      <CardDescription className="mt-1">{t("courseDetail.adminAssignmentDescription")}</CardDescription>
                    </div>
                    <Badge
                      variant={selectedAssignment.status === ASSIGNMENT_STATUS.published ? "default" : selectedAssignment.status === ASSIGNMENT_STATUS.archived ? "destructive" : "secondary"}
                      className="rounded-md"
                    >
                      {t(`assignmentStatus.${selectedAssignment.status}` as I18nKey)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {selectedAssignment.instructions ? (
                    <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-4 py-3">
                      <h3 className="text-sm font-semibold">{t("courseDetail.assignmentInstructions")}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{selectedAssignment.instructions}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.assignmentDueAt")}</p>
                      <p className="mt-1 text-sm font-semibold">{selectedAssignment.dueAt ? new Date(selectedAssignment.dueAt).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.assignmentMaxScore")}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{selectedAssignment.maxScore ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.submissions")}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{selectedAssignment.submissionCount ?? 0}</p>
                    </div>
                  </div>
                  {selectedAssignment.attachmentUrl ? (
                    <a className="inline-flex h-10 w-fit items-center rounded-md ring-1 ring-foreground/10 px-4 text-sm font-medium hover:bg-muted/40" href={selectedAssignment.attachmentUrl} rel="noreferrer" target="_blank">
                      <Paperclip className="mr-2 size-4" aria-hidden />
                      {t("courseDetail.viewAssignmentFile")}
                    </a>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{t("courseDetail.adminReadOnlyHint")}</p>
                </CardContent>
              </Card>
            ) : canReviewCourse ? (
              <Card>
                <CardContent className="py-10">
                  <EmptyState icon={FileCheck2} title={t("courseDetail.noAssignmentSelected")} description={t("courseDetail.adminSelectAssignmentDescription")} />
                </CardContent>
              </Card>
            ) : selectedAssignment ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("courseDetail.submitAssignment")}</CardTitle>
                  <CardDescription>{t("courseDetail.submitAssignmentDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={assignmentSubmissionForm.handleSubmit(onSubmitAssignmentSubmission)} noValidate>
                    {selectedAssignment.attachmentUrl ? (
                      <a className="inline-flex h-10 items-center rounded-md ring-1 ring-foreground/10 px-4 text-sm font-medium hover:bg-muted/40" href={selectedAssignment.attachmentUrl} rel="noreferrer" target="_blank">
                        <Paperclip className="mr-2 size-4" aria-hidden />
                        {t("courseDetail.viewAssignmentFile")}
                      </a>
                    ) : null}
                    {selectedAssignment.dueAt && new Date() > new Date(selectedAssignment.dueAt) ? (
                      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive" role="status">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <p>{t("courseDetail.assignmentLateWarning")}</p>
                      </div>
                    ) : null}
                    <FormField id="assignment-submission-content" label={t("courseDetail.assignmentSubmissionContent")} error={assignmentSubmissionForm.formState.errors.content?.message}>
                      <TextareaField id="assignment-submission-content" rows={12} placeholder={t("courseDetail.assignmentSubmissionPlaceholder")} {...assignmentSubmissionForm.register("content")} />
                    </FormField>
                    <FormField id="assignment-submission-file" label={t("courseDetail.assignmentSubmissionAttachmentUrl")} hint={t("courseDetail.optional")} error={assignmentSubmissionForm.formState.errors.attachmentUrl?.message}>
                      <LessonUploadField
                        id="assignment-submission-file"
                        accept=".pdf,.txt,.md,.doc,.docx,.zip,application/pdf,text/plain,text/markdown,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        isUploading={isUploadingSubmissionFile}
                        uploadedFileName={uploadedSubmissionFile?.fileName}
                        title={t("courseDetail.uploadSubmissionFileTitle")}
                        description={t("courseDetail.uploadSubmissionFileDescription")}
                        chooseLabel={t("courseDetail.chooseSubmissionFile")}
                        uploadingLabel={t("courseDetail.uploadingSubmissionFile")}
                        urlLabel={t("courseDetail.pasteSubmissionUrl")}
                        urlPlaceholder={t("courseDetail.submissionUrlPlaceholder")}
                        previewUrl={assignmentSubmissionForm.watch("attachmentUrl") ?? ""}
                        previewKind="resource"
                        previewFileName={uploadedSubmissionFile?.fileName}
                        previewMimeType={uploadedSubmissionFile?.mimeType}
                        previewTitle={t("courseDetail.submissionFilePreview")}
                        previewDescription={t("courseDetail.submissionFilePreviewDescription")}
                        openPreviewLabel={t("courseDetail.viewSubmissionFile")}
                        previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                        previewLoadingLabel={t("courseDetail.previewLoading")}
                        previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                        previewEmptyLabel={t("courseDetail.previewEmpty")}
                        Icon={Paperclip}
                        onFileChange={(file) => void onAssignmentSubmissionFileChange(file)}
                        onUrlChange={() => setUploadedSubmissionFile(null)}
                        urlInputProps={assignmentSubmissionForm.register("attachmentUrl")}
                      />
                    </FormField>
                    {selectedAssignment.mySubmission?.status === ASSIGNMENT_SUBMISSION_STATUS.graded ? (
                      <div className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-3 py-3 text-sm">
                        <p className="font-medium">
                          {t("courseDetail.assignmentScore")}: {selectedAssignment.mySubmission.score ?? "—"} / {selectedAssignment.maxScore ?? "—"}
                        </p>
                        {selectedAssignment.mySubmission.feedback ? <p className="mt-2 text-muted-foreground">{selectedAssignment.mySubmission.feedback}</p> : null}
                      </div>
                    ) : null}
                    {selectedAssignment.mySubmission?.isLate ? (
                      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <p>{t("courseDetail.assignmentSubmittedLate")}</p>
                      </div>
                    ) : null}
                    <Button className="h-10 rounded-md font-medium shadow-none" disabled={submitAssignmentMutation.isPending || isUploadingSubmissionFile} type="submit">
                      <Send className="mr-2 size-4" aria-hidden />
                      {submitAssignmentMutation.isPending ? t("courseDetail.submittingAssignment") : t("courseDetail.submitAssignment")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </section>
        ) : null}

        {activeTab === "reviews" ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <Card>
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
                        <article key={review.id} className="rounded-xl bg-muted/30 ring-1 ring-foreground/10 px-4 py-3">
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
              <Card>
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

        {activeTab === "learners" && canAccessCourseWorkspace ? (
          <Card>
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
            <CardContent className="grid gap-4">
              {canManageCourse ? (
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  const email = adminEnrollEmail.trim();
                  if (!email) {
                    return;
                  }
                  void (async () => {
                    try {
                      await adminEnrollMutation.mutateAsync(email);
                      setAdminEnrollEmail("");
                      toast.success(t("courseDetail.adminEnrollSuccess"));
                    } catch (e) {
                      toast.error(formatError(e, "courseDetail.adminEnrollFailed"));
                    }
                  })();
                }}
              >
                <FormField id="admin-enroll-email" label={t("courseDetail.adminEnrollLabel")} className="min-w-0 flex-1">
                  <Input
                    id="admin-enroll-email"
                    type="email"
                    autoComplete="off"
                    placeholder={t("courseDetail.adminEnrollPlaceholder")}
                    value={adminEnrollEmail}
                    onChange={(event) => setAdminEnrollEmail(event.target.value)}
                  />
                </FormField>
                <Button type="submit" className="h-10 rounded-md shadow-none" disabled={adminEnrollMutation.isPending || !adminEnrollEmail.trim()}>
                  {adminEnrollMutation.isPending ? t("courseDetail.adminEnrolling") : t("courseDetail.adminEnroll")}
                </Button>
              </form>
              ) : null}
              {enrollmentsQuery.isLoading ? <CourseListSkeleton rows={5} /> : null}
              {enrollmentsQuery.isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {t("courseDetail.enrollmentsLoadFailed")}
                </div>
              ) : null}
              {!enrollmentsQuery.isLoading && !enrollmentsQuery.isError ? (
                enrollments.length ? (
                  <div className="space-y-3">
                    <div className="max-h-[520px] overflow-auto rounded-lg ring-1 ring-foreground/10">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("common.email")}</TableHead>
                            <TableHead className="w-40">{t("common.role")}</TableHead>
                            <TableHead className="w-56 text-right">{t("courseDetail.enrolledAt")}</TableHead>
                            {canManageCourse ? <TableHead className="w-28 text-right">{t("common.actions")}</TableHead> : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.user.email}</TableCell>
                              <TableCell>{t(`role.${row.user.role}` as I18nKey)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{new Date(row.enrolledAt).toLocaleString()}</TableCell>
                              {canManageCourse ? (
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-md text-destructive hover:text-destructive"
                                  disabled={adminRemoveEnrollmentMutation.isPending}
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        await adminRemoveEnrollmentMutation.mutateAsync(row.userId);
                                        toast.success(t("courseDetail.adminRemoveEnrollmentSuccess"));
                                      } catch (e) {
                                        toast.error(formatError(e, "courseDetail.adminRemoveEnrollmentFailed"));
                                      }
                                    })();
                                  }}
                                >
                                  {t("courseDetail.removeLearner")}
                                </Button>
                              </TableCell>
                              ) : null}
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

              <div className="grid gap-4 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">{t("courseDetail.courseCertificates")}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.courseCertificatesDescription")}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="w-fit rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                      {certificatesTotal} {t("progress.certificates")}
                    </span>
                    <Select value={certificateStatusFilter} onValueChange={(value) => setCertificateStatusFilter(value as typeof certificateStatusFilter)}>
                      <SelectTrigger className="h-9 w-full rounded-md border-border/80 bg-background shadow-none sm:w-44" aria-label={t("courseDetail.certificateStatusFilter")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("courseDetail.allCertificates")}</SelectItem>
                        <SelectItem value={CERTIFICATE_STATUS.active}>{t("certificateStatus.ACTIVE")}</SelectItem>
                        <SelectItem value={CERTIFICATE_STATUS.revoked}>{t("certificateStatus.REVOKED")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {certificatesQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
                {certificatesQuery.isError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t("courseDetail.certificatesLoadFailed")}
                  </div>
                ) : null}
                {!certificatesQuery.isLoading && !certificatesQuery.isError ? (
                  certificates.length ? (
                    <div className="grid gap-2">
                      {certificates.map((certificate) => {
                        const revoked = certificate.status === CERTIFICATE_STATUS.revoked;
                        return (
                          <article key={certificate.id} className="grid gap-3 rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{certificate.user.email}</p>
                                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{certificate.verificationCode}</p>
                              </div>
                              <Badge variant={revoked ? "destructive" : "default"} className="w-fit shrink-0 rounded-md">
                                {t(`certificateStatus.${certificate.status}` as I18nKey)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>
                                {t("progress.issued")} {new Date(certificate.issuedAt).toLocaleDateString()}
                              </span>
                              {certificate.revokedAt ? (
                                <span>
                                  {t("courseDetail.revokedAt")} {new Date(certificate.revokedAt).toLocaleDateString()}
                                </span>
                              ) : null}
                              <div className="ml-auto flex flex-wrap gap-2">
                                <Button asChild type="button" variant="outline" size="sm" className="h-8 rounded-md">
                                  <Link to={`/certificates/verify/${certificate.verificationCode}`}>{t("progress.verify")}</Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-md"
                                  disabled={revoked || downloadingCertificateId === certificate.id}
                                  onClick={() => {
                                    void handleDownloadCertificate(certificate.id);
                                  }}
                                >
                                  <Download className="size-3.5" aria-hidden />
                                  {downloadingCertificateId === certificate.id ? t("progress.downloadingCertificate") : t("progress.downloadCertificate")}
                                </Button>
                                {revoked ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-md"
                                    disabled={restoreCertificateMutation.isPending}
                                    onClick={() => {
                                      void (async () => {
                                        try {
                                          await restoreCertificateMutation.mutateAsync(certificate.id);
                                          toast.success(t("courseDetail.certificateRestored"));
                                        } catch (e) {
                                          toast.error(formatError(e, "courseDetail.certificateRestoreFailed"));
                                        }
                                      })();
                                    }}
                                  >
                                    {restoreCertificateMutation.isPending ? t("courseDetail.restoringCertificate") : t("courseDetail.restoreCertificate")}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-md border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                    disabled={revokeCertificateMutation.isPending}
                                    onClick={() => {
                                      void (async () => {
                                        try {
                                          await revokeCertificateMutation.mutateAsync(certificate.id);
                                          toast.success(t("courseDetail.certificateRevoked"));
                                        } catch (e) {
                                          toast.error(formatError(e, "courseDetail.certificateRevokeFailed"));
                                        }
                                      })();
                                    }}
                                  >
                                    {revokeCertificateMutation.isPending ? t("courseDetail.revokingCertificate") : t("courseDetail.revokeCertificate")}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Award} title={t("courseDetail.noCourseCertificates")} description={t("courseDetail.noCourseCertificatesDescription")} />
                  )
                ) : null}
                {certificatesTotalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      {t("courseDetail.page")} {certificatePage} / {certificatesTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-md" disabled={certificatePage <= 1} onClick={() => setCertificatePage((page) => Math.max(1, page - 1))} type="button">
                        {t("courseDetail.previous")}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-md" disabled={certificatePage >= certificatesTotalPages} onClick={() => setCertificatePage((page) => Math.min(certificatesTotalPages, page + 1))} type="button">
                        {t("courseDetail.next")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "settings" && canAccessCourseWorkspace ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("courseDetail.courseSettings")}</CardTitle>
              <CardDescription>{t("courseDetail.courseSettingsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {courseQuery.isLoading ? (
                <CourseListSkeleton rows={3} />
              ) : (
                <div className="grid gap-5">
                  {isAdminReviewer && courseQuery.data?.status !== COURSE_STATUS.archived ? (
                    <div className="grid gap-4 rounded-xl bg-muted/40 ring-1 ring-foreground/10 p-4">
                      <div>
                        <h2 className="text-sm font-semibold">{t("courseDetail.moderation")}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.moderationDescription")}</p>
                      </div>
                      {!isCourseLocked ? (
                        <FormField id="course-lock-reason" label={t("courseDetail.lockReason")} hint={t("courseDetail.optional")}>
                          <TextareaField
                            id="course-lock-reason"
                            placeholder={t("courseDetail.lockReasonPlaceholder")}
                            rows={3}
                            value={lockReasonInput}
                            onChange={(event) => setLockReasonInput(event.target.value)}
                          />
                        </FormField>
                      ) : courseQuery.data?.lockReason ? (
                        <p className="rounded-xl bg-background ring-1 ring-foreground/10 px-3 py-3 text-sm leading-6 text-muted-foreground">{courseQuery.data.lockReason}</p>
                      ) : null}
                      <div className="flex justify-end">
                        {isCourseLocked ? (
                          <Button
                            className="h-10 rounded-md font-medium shadow-none"
                            disabled={unlockCourseMutation.isPending}
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!window.confirm(t("courseDetail.unlockConfirm"))) {
                                return;
                              }
                              void (async () => {
                                try {
                                  await unlockCourseMutation.mutateAsync();
                                  toast.success(t("courseDetail.courseUnlockedSuccess"));
                                } catch (e) {
                                  toast.error(formatError(e, "courseDetail.unlockFailed"));
                                }
                              })();
                            }}
                          >
                            <LockOpen className="size-4" aria-hidden />
                            {unlockCourseMutation.isPending ? t("courseDetail.unlocking") : t("courseDetail.unlockCourse")}
                          </Button>
                        ) : (
                          <Button
                            className="h-10 rounded-md border-red-300 font-medium text-red-700 shadow-none hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            disabled={lockCourseMutation.isPending}
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!window.confirm(t("courseDetail.lockConfirm"))) {
                                return;
                              }
                              void (async () => {
                                try {
                                  await lockCourseMutation.mutateAsync(lockReasonInput.trim() || undefined);
                                  toast.success(t("courseDetail.courseLockedSuccess"));
                                } catch (e) {
                                  toast.error(formatError(e, "courseDetail.lockFailed"));
                                }
                              })();
                            }}
                          >
                            <Lock className="size-4" aria-hidden />
                            {lockCourseMutation.isPending ? t("courseDetail.locking") : t("courseDetail.lockCourse")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {isAdminReviewer ? (
                    <div className="grid gap-4 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
                      <div>
                        <h2 className="text-sm font-semibold">{t("courseDetail.ownerAssignment")}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.ownerAssignmentDescription")}</p>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <FormField id="course-instructor-assignment" label={t("courseDetail.currentInstructor")}>
                          <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId} disabled={instructorUsersQuery.isLoading || assignCourseInstructorMutation.isPending}>
                            <SelectTrigger id="course-instructor-assignment" className="h-10 w-full rounded-md border-border/80 bg-background shadow-none">
                              <SelectValue placeholder={t("courseDetail.instructorPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              {instructorOptions.map((instructor) => (
                                <SelectItem key={instructor.id} value={instructor.id}>
                                  {instructor.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <Button
                          className="h-10 rounded-md font-medium shadow-none"
                          disabled={
                            assignCourseInstructorMutation.isPending ||
                            instructorUsersQuery.isLoading ||
                            !selectedInstructorId ||
                            selectedInstructorId === courseQuery.data?.instructorId
                          }
                          type="button"
                          onClick={() => {
                            void onAssignInstructor();
                          }}
                        >
                          {assignCourseInstructorMutation.isPending ? t("courseDetail.assigningInstructor") : t("courseDetail.assignInstructor")}
                        </Button>
                      </div>
                      {instructorUsersQuery.isError ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                          {t("courseDetail.instructorsLoadFailed")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {canManageCourse ? (
                <form className={STUDIO_SETTINGS_GRID} onSubmit={courseForm.handleSubmit(onUpdateCourse)} noValidate>
                  <div className="grid gap-3 self-start">
                    <CourseCoverUploader
                      id="edit-course-cover"
                      value={courseForm.watch("coverImageUrl")}
                      isUploading={isUploadingCover}
                      disabled={isUploadingCover || !canEditCourse}
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

                    <div className="grid gap-3 rounded-xl bg-muted/40 ring-1 ring-foreground/10 p-4">
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
                      <div className="grid gap-3 rounded-xl bg-muted/30 ring-1 ring-foreground/10 p-4">
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
                        disabled={updateCourseMutation.isPending || !canEditCourse || (courseStatus === COURSE_STATUS.published && !canPublish) || !courseForm.formState.isDirty}
                        type="submit"
                      >
                        {updateCourseMutation.isPending ? t("courseDetail.saving") : t("common.save")}
                      </Button>
                    </div>
                  </div>
                </form>
                  ) : null}
                </div>
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
      <AlertDialog open={Boolean(assignmentPendingArchive)} onOpenChange={(open) => !open && setAssignmentPendingArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.archiveAssignment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courseDetail.archiveAssignmentConfirm")}
              {assignmentPendingArchive ? <span className="mt-2 block font-medium text-foreground">{assignmentPendingArchive.title}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveAssignmentMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              disabled={archiveAssignmentMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmArchiveAssignment();
              }}
            >
              {archiveAssignmentMutation.isPending ? t("courseDetail.assignmentArchivePending") : t("courseDetail.archiveAssignment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
