import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
import { STUDIO_EDITOR_TITLE, STUDIO_FORM_STACK, STUDIO_LIST, STUDIO_LIST_ITEM, STUDIO_LIST_ITEM_SELECTED } from "../lib/studio-layout";
import { EmptyState } from "./empty-state";
import { FormField } from "./form-field";
import { CourseListSkeleton } from "./skeleton";
import { TextareaField } from "./textarea-field";
import { CODE_QUESTION_LANGUAGES, EXAM_QUESTION_TYPE, EXAM_SCOPE, EXAM_STATUS } from "../constants/business";
import { CodeEditor } from "./code-editor";
import { useCourseLessons } from "../hooks/use-courses";
import { ExamScopeFields } from "./exam-scope-fields";
import {
  useCourseExams,
  useCreateExam,
  useCreateExamQuestion,
  useDeleteExamQuestion,
  useExamQuestions,
  useUpdateExam,
  useUpdateExamQuestion
} from "../hooks/use-exams";
import { formatQuestionOptions, parseCorrectAnswers, parseQuestionOptions } from "../lib/exam-question-form";
import { createExamFormSchema, createExamQuestionFormSchema, type ExamFormValues, type ExamQuestionFormValues } from "../schemas/course.schema";
import type { CodeQuestionSecret, CreateExamPayload, CreateExamQuestionPayload, Exam, ExamQuestion } from "../services/exam.service";
import { type I18nKey, useI18n } from "../i18n";

export type PendingExam = {
  id: string;
  payload: CreateExamPayload;
};

function buildQuestionDefaults(sortOrder: number): ExamQuestionFormValues {
  return {
    type: EXAM_QUESTION_TYPE.singleChoice,
    prompt: "",
    optionsText: "",
    correctAnswersText: "",
    explanation: "",
    codeLanguage: "python",
    codeStarter: "",
    codeSolution: "",
    codeInstructions: "",
    codeTests: [],
    points: 1,
    sortOrder
  };
}

type CourseCreateExamsStepProps = {
  courseId: string | null;
  pendingExams: PendingExam[];
  onPendingExamsChange: (exams: PendingExam[]) => void;
};

export function CourseCreateExamsStep({ courseId, pendingExams, onPendingExamsChange }: CourseCreateExamsStepProps) {
  const { t } = useI18n();
  const [selectedSavedExamId, setSelectedSavedExamId] = useState<string | null>(null);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionPendingDelete, setQuestionPendingDelete] = useState<ExamQuestion | null>(null);

  const examsQuery = useCourseExams(courseId ?? "", Boolean(courseId));
  const lessonsQuery = useCourseLessons(courseId ?? "", Boolean(courseId));
  const lessons = lessonsQuery.data ?? [];
  const createExamMutation = useCreateExam(courseId ?? "");
  const updateExamMutation = useUpdateExam(courseId ?? "");
  const examQuestionsQuery = useExamQuestions(courseId ?? "", selectedSavedExamId, Boolean(courseId && selectedSavedExamId));
  const createExamQuestionMutation = useCreateExamQuestion(courseId ?? "", selectedSavedExamId);
  const updateExamQuestionMutation = useUpdateExamQuestion(courseId ?? "", selectedSavedExamId);
  const deleteExamQuestionMutation = useDeleteExamQuestion(courseId ?? "", selectedSavedExamId);

  const examForm = useForm<ExamFormValues>({
    resolver: zodResolver(createExamFormSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      status: EXAM_STATUS.draft,
      scope: EXAM_SCOPE.course,
      lessonId: "",
      durationMinutes: "",
      passingScore: ""
    }
  });

  const questionForm = useForm<ExamQuestionFormValues>({
    resolver: zodResolver(createExamQuestionFormSchema(t)),
    defaultValues: buildQuestionDefaults(1)
  });

  const codeTestsField = useFieldArray({ control: questionForm.control, name: "codeTests" });
  const questionType = questionForm.watch("type");
  const codeLanguage = questionForm.watch("codeLanguage");
  const savedExams = examsQuery.data ?? [];
  const examQuestions = examQuestionsQuery.data ?? [];
  const selectedPending = pendingExams.find((exam) => exam.id === selectedPendingId);
  const canManageQuestions = Boolean(courseId && selectedSavedExamId);

  useEffect(() => {
    if (selectedSavedExamId && !savedExams.some((exam) => exam.id === selectedSavedExamId)) {
      resetExamSelection();
    }
  }, [savedExams, selectedSavedExamId]);

  useEffect(() => {
    questionForm.setValue("sortOrder", examQuestions.length + 1, { shouldDirty: false });
  }, [examQuestions.length, questionForm, selectedSavedExamId]);

  const resetExamSelection = () => {
    setSelectedSavedExamId(null);
    setSelectedPendingId(null);
    setSelectedQuestionId(null);
    examForm.reset({
      title: "",
      description: "",
      status: EXAM_STATUS.draft,
      scope: EXAM_SCOPE.course,
      lessonId: "",
      durationMinutes: "",
      passingScore: ""
    });
    questionForm.reset(buildQuestionDefaults(1));
  };

  const onNewExam = () => {
    resetExamSelection();
  };

  const onSelectSavedExam = (exam: Exam) => {
    setSelectedSavedExamId(exam.id);
    setSelectedPendingId(null);
    setSelectedQuestionId(null);
    examForm.reset({
      title: exam.title,
      description: exam.description ?? "",
      status: exam.status,
      scope: exam.scope ?? EXAM_SCOPE.course,
      lessonId: exam.lessonId ?? "",
      durationMinutes: exam.durationMinutes ?? "",
      passingScore: exam.passingScore ?? ""
    });
    questionForm.reset(buildQuestionDefaults((exam.questionCount ?? 0) + 1));
  };

  const onSelectPending = (exam: PendingExam) => {
    setSelectedPendingId(exam.id);
    setSelectedSavedExamId(null);
    setSelectedQuestionId(null);
    examForm.reset({
      title: exam.payload.title,
      description: exam.payload.description ?? "",
      status: exam.payload.status,
      scope: exam.payload.scope ?? EXAM_SCOPE.course,
      lessonId: exam.payload.lessonId ?? "",
      durationMinutes: exam.payload.durationMinutes ?? "",
      passingScore: exam.payload.passingScore ?? ""
    });
  };

  const onDeletePending = (examId: string) => {
    onPendingExamsChange(pendingExams.filter((exam) => exam.id !== examId));
    if (selectedPendingId === examId) {
      resetExamSelection();
    }
  };

  const onSelectQuestion = (question: ExamQuestion) => {
    setSelectedQuestionId(question.id);
    const isCode = question.type === EXAM_QUESTION_TYPE.code;
    const secret =
      isCode && question.correctAnswers && !Array.isArray(question.correctAnswers)
        ? (question.correctAnswers as CodeQuestionSecret)
        : null;
    questionForm.reset({
      ...buildQuestionDefaults(question.sortOrder),
      type: question.type,
      prompt: question.prompt,
      optionsText: formatQuestionOptions(question.options),
      correctAnswersText: Array.isArray(question.correctAnswers) ? question.correctAnswers.join(", ") : "",
      explanation: question.explanation ?? "",
      points: question.points,
      sortOrder: question.sortOrder,
      ...(isCode
        ? {
            codeLanguage: question.codeConfig?.language ?? "python",
            codeStarter: question.codeConfig?.starterCode ?? "",
            codeSolution: secret?.solutionCode ?? "",
            codeInstructions: question.codeConfig?.instructions ?? "",
            codeTests: secret?.tests ?? []
          }
        : {})
    });
  };

  const onNewQuestion = () => {
    setSelectedQuestionId(null);
    questionForm.reset(buildQuestionDefaults(examQuestions.length + 1));
  };

  const onSubmitExam = async (values: ExamFormValues) => {
    const payload: CreateExamPayload = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      status: values.status,
      scope: values.scope,
      lessonId: values.scope === EXAM_SCOPE.lesson ? values.lessonId?.trim() || null : null,
      durationMinutes: values.durationMinutes === "" ? null : Number(values.durationMinutes),
      passingScore: values.passingScore === "" ? null : Number(values.passingScore)
    };

    if (courseId) {
      try {
        if (selectedSavedExamId) {
          await updateExamMutation.mutateAsync({ examId: selectedSavedExamId, payload });
          toast.success(t("courseDetail.examUpdated"));
        } else {
          const created = await createExamMutation.mutateAsync(payload);
          setSelectedSavedExamId(created.id);
          setSelectedPendingId(null);
          toast.success(t("courseDetail.examCreated"));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("courseDetail.examSaveFailed"));
      }
      return;
    }

    if (selectedPendingId) {
      onPendingExamsChange(pendingExams.map((exam) => (exam.id === selectedPendingId ? { id: exam.id, payload } : exam)));
    } else {
      onPendingExamsChange([...pendingExams, { id: crypto.randomUUID(), payload }]);
    }
    resetExamSelection();
  };

  const onSubmitQuestion = async (values: ExamQuestionFormValues) => {
    if (!selectedSavedExamId) {
      toast.error(t("courseDetail.selectExamFirst"));
      return;
    }

    let payload: CreateExamQuestionPayload;

    if (values.type === EXAM_QUESTION_TYPE.code) {
      const tests = values.codeTests ?? [];
      if (tests.length < 1) {
        toast.error(t("validation.examQuestionCodeTestsRequired"));
        return;
      }
      payload = {
        type: values.type,
        prompt: values.prompt,
        options: [],
        correctAnswers: [],
        code: {
          language: values.codeLanguage,
          starterCode: values.codeStarter ?? "",
          solutionCode: values.codeSolution ?? "",
          instructions: values.codeInstructions?.trim() || null,
          tests
        },
        explanation: values.explanation || null,
        points: Number(values.points),
        sortOrder: Number(values.sortOrder)
      };
    } else {
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

      payload = {
        type: values.type,
        prompt: values.prompt,
        options,
        correctAnswers,
        explanation: values.explanation || null,
        points: Number(values.points),
        sortOrder: Number(values.sortOrder)
      };
    }

    try {
      if (selectedQuestionId) {
        await updateExamQuestionMutation.mutateAsync({ questionId: selectedQuestionId, payload });
        toast.success(t("courseDetail.questionUpdated"));
      } else {
        await createExamQuestionMutation.mutateAsync(payload);
        toast.success(t("courseDetail.questionCreated"));
        onNewQuestion();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.questionSaveFailed"));
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("courseDetail.questionDeleteFailed"));
    }
  };

  const listCount = courseId ? savedExams.length : pendingExams.length;
  const isExamSubmitPending = createExamMutation.isPending || updateExamMutation.isPending;
  const isQuestionSubmitPending = createExamQuestionMutation.isPending || updateExamQuestionMutation.isPending;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-start">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.tabExams")}</CardTitle>
              <CardDescription>{t("courseStudio.examsStepListDescription")}</CardDescription>
            </div>
            {courseId ? (
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-md shadow-none" onClick={onNewExam}>
                {t("courseDetail.newExam")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="pt-6">
            {courseId && examsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
            {listCount ? (
              <div className={STUDIO_LIST}>
                <div className="grid gap-1">
                  {courseId
                    ? savedExams.map((exam) => {
                        const selected = selectedSavedExamId === exam.id;
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            className={cn(STUDIO_LIST_ITEM, selected ? STUDIO_LIST_ITEM_SELECTED : undefined)}
                            onClick={() => onSelectSavedExam(exam)}
                          >
                            <div className="min-w-0 flex-1 text-left">
                              <p className="truncate text-sm font-medium">{exam.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                                  {t(`examStatus.${exam.status}` as I18nKey)}
                                </Badge>
                                <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                                  {t(`examScope.${exam.scope ?? EXAM_SCOPE.course}` as I18nKey)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {exam.questionCount ?? 0} {t("courseDetail.questions")}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    : pendingExams.map((exam) => {
                        const selected = selectedPendingId === exam.id;
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            className={cn(STUDIO_LIST_ITEM, selected ? STUDIO_LIST_ITEM_SELECTED : undefined)}
                            onClick={() => onSelectPending(exam)}
                          >
                            <div className="min-w-0 flex-1 text-left">
                              <p className="truncate text-sm font-medium">{exam.payload.title}</p>
                              <Badge variant="outline" className="mt-1 h-5 rounded-md px-1.5 text-[10px]">
                                {t(`examStatus.${exam.payload.status}` as I18nKey)}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-8 shrink-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
                              aria-label={t("courseDetail.archiveExam")}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeletePending(exam.id);
                              }}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </button>
                        );
                      })}
                </div>
              </div>
            ) : !courseId || !examsQuery.isLoading ? (
              <div className="rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
                <ClipboardCheck className="mx-auto mb-2 size-8 opacity-60" aria-hidden />
                {t("courseStudio.examsStepEmpty")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card className="min-w-0">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className={STUDIO_EDITOR_TITLE}>
                {selectedSavedExamId || selectedPendingId ? t("courseDetail.editExam") : t("courseDetail.addExam")}
              </CardTitle>
              <CardDescription>{t("courseStudio.examsStepFormDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form className={STUDIO_FORM_STACK} onSubmit={examForm.handleSubmit(onSubmitExam)} noValidate>
                <FormField id="wizard-exam-title" label={t("courseDetail.examTitle")} error={examForm.formState.errors.title?.message}>
                  <Input id="wizard-exam-title" placeholder={t("courseDetail.examTitlePlaceholder")} {...examForm.register("title")} />
                </FormField>
                <FormField id="wizard-exam-description" label={t("courseDetail.examDescription")} hint={t("courseDetail.optional")} error={examForm.formState.errors.description?.message}>
                  <TextareaField id="wizard-exam-description" rows={4} placeholder={t("courseDetail.examDescriptionPlaceholder")} {...examForm.register("description")} />
                </FormField>
                <ExamScopeFields
                  idPrefix="wizard-exam"
                  control={examForm.control}
                  setValue={examForm.setValue}
                  watch={examForm.watch}
                  errors={examForm.formState.errors}
                  lessons={lessons}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="wizard-exam-duration" label={t("courseDetail.examDuration")} hint={t("courseDetail.examMinutes")} error={examForm.formState.errors.durationMinutes?.message}>
                    <Input id="wizard-exam-duration" inputMode="numeric" min={1} type="number" placeholder="45" {...examForm.register("durationMinutes")} />
                  </FormField>
                  <FormField id="wizard-exam-passing" label={t("courseDetail.examPassingScore")} hint="%" error={examForm.formState.errors.passingScore?.message}>
                    <Input id="wizard-exam-passing" inputMode="numeric" min={0} max={100} type="number" placeholder="70" {...examForm.register("passingScore")} />
                  </FormField>
                </div>
                {courseId ? (
                  <FormField id="wizard-exam-status" label={t("courseDetail.status")} error={examForm.formState.errors.status?.message}>
                    <Controller
                      control={examForm.control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="wizard-exam-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
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
                ) : null}
                <div className="flex justify-end gap-2">
                  {selectedSavedExamId || selectedPendingId ? (
                    <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onNewExam}>
                      {t("courseDetail.newExam")}
                    </Button>
                  ) : null}
                  <Button className="h-10 rounded-md font-medium shadow-none" disabled={isExamSubmitPending} type="submit">
                    {isExamSubmitPending
                      ? t("courseDetail.savingExam")
                      : selectedSavedExamId || selectedPendingId
                        ? t("courseDetail.saveExam")
                        : t("courseDetail.createExam")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.examQuestions")}</CardTitle>
                <CardDescription>
                  {canManageQuestions
                    ? t("courseDetail.examQuestionsDescription")
                    : selectedPending
                      ? t("courseStudio.examQuestionsAfterSave")
                      : t("courseDetail.selectExamFirst")}
                </CardDescription>
              </div>
              {canManageQuestions ? (
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-md shadow-none" onClick={onNewQuestion}>
                  {t("courseDetail.newQuestion")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="pt-6">
              {!canManageQuestions ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={selectedPending ? t("courseStudio.examPendingTitle") : t("courseDetail.noExamSelected")}
                  description={selectedPending ? t("courseStudio.examQuestionsAfterSave") : t("courseDetail.noExamSelectedDescription")}
                />
              ) : (
                <div className="grid gap-6">
                  <div className="max-h-[min(40vh,24rem)] min-h-40 overflow-auto rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
                    {examQuestionsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
                    {!examQuestionsQuery.isLoading && examQuestions.length ? (
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
                            </div>
                          );
                        })}
                      </div>
                    ) : !examQuestionsQuery.isLoading ? (
                      <EmptyState icon={ClipboardCheck} title={t("courseDetail.noQuestions")} description={t("courseDetail.noQuestionsDescription")} />
                    ) : null}
                  </div>

                  <form className={cn(STUDIO_FORM_STACK, "rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/10")} onSubmit={questionForm.handleSubmit(onSubmitQuestion)} noValidate>
                    <FormField id="wizard-question-type" label={t("courseDetail.questionType")} error={questionForm.formState.errors.type?.message}>
                      <Controller
                        control={questionForm.control}
                        name="type"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === EXAM_QUESTION_TYPE.freeText || value === EXAM_QUESTION_TYPE.code) {
                                questionForm.setValue("optionsText", "", { shouldDirty: true });
                                questionForm.setValue("correctAnswersText", "", { shouldDirty: true });
                              }
                            }}
                          >
                            <SelectTrigger id="wizard-question-type" className="h-10 w-full rounded-md border-border/80 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EXAM_QUESTION_TYPE.singleChoice}>{t("examQuestionType.SINGLE_CHOICE")}</SelectItem>
                              <SelectItem value={EXAM_QUESTION_TYPE.multipleChoice}>{t("examQuestionType.MULTIPLE_CHOICE")}</SelectItem>
                              <SelectItem value={EXAM_QUESTION_TYPE.freeText}>{t("examQuestionType.FREE_TEXT")}</SelectItem>
                              <SelectItem value={EXAM_QUESTION_TYPE.code}>{t("examQuestionType.CODE")}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                    <FormField id="wizard-question-prompt" label={t("courseDetail.questionPrompt")} error={questionForm.formState.errors.prompt?.message}>
                      <TextareaField id="wizard-question-prompt" rows={4} placeholder={t("courseDetail.questionPromptPlaceholder")} {...questionForm.register("prompt")} />
                    </FormField>
                    {questionType !== EXAM_QUESTION_TYPE.freeText && questionType !== EXAM_QUESTION_TYPE.code ? (
                      <>
                        <FormField id="wizard-question-options" label={t("courseDetail.questionOptions")} hint={t("courseDetail.questionOptionsHint")} error={questionForm.formState.errors.optionsText?.message}>
                          <TextareaField id="wizard-question-options" rows={5} placeholder={t("courseDetail.questionOptionsPlaceholder")} {...questionForm.register("optionsText")} />
                        </FormField>
                        <FormField id="wizard-question-answers" label={t("courseDetail.correctAnswers")} hint={t("courseDetail.correctAnswersHint")} error={questionForm.formState.errors.correctAnswersText?.message}>
                          <Input id="wizard-question-answers" placeholder="A, C" {...questionForm.register("correctAnswersText")} />
                        </FormField>
                      </>
                    ) : null}
                    {questionType === EXAM_QUESTION_TYPE.code ? (
                      <div className="grid gap-4 rounded-lg border border-dashed border-border bg-background/40 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField id="wizard-question-language" label={t("courseDetail.codeLanguage")} error={questionForm.formState.errors.codeLanguage?.message}>
                            <Controller
                              control={questionForm.control}
                              name="codeLanguage"
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger id="wizard-question-language" className="h-10 w-full rounded-md border-border/80 shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CODE_QUESTION_LANGUAGES.map((language) => (
                                      <SelectItem key={language} value={language}>
                                        {t(`codeLanguage.${language}` as I18nKey)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </FormField>
                        </div>
                        <FormField id="wizard-question-code-instructions" label={t("courseDetail.codeInstructions")} hint={t("courseDetail.optional")} error={questionForm.formState.errors.codeInstructions?.message}>
                          <TextareaField id="wizard-question-code-instructions" rows={3} placeholder={t("courseDetail.codeInstructionsPlaceholder")} {...questionForm.register("codeInstructions")} />
                        </FormField>
                        <div className="grid gap-1.5">
                          <span className="text-sm font-medium">{t("courseDetail.codeStarter")}</span>
                          <Controller
                            control={questionForm.control}
                            name="codeStarter"
                            render={({ field }) => (
                              <CodeEditor language={codeLanguage} value={field.value ?? ""} onChange={field.onChange} height={200} ariaLabel={t("courseDetail.codeStarter")} />
                            )}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <span className="text-sm font-medium">{t("courseDetail.codeSolution")}</span>
                          <p className="text-xs text-muted-foreground">{t("courseDetail.codeSolutionHint")}</p>
                          <Controller
                            control={questionForm.control}
                            name="codeSolution"
                            render={({ field }) => (
                              <CodeEditor language={codeLanguage} value={field.value ?? ""} onChange={field.onChange} height={200} ariaLabel={t("courseDetail.codeSolution")} />
                            )}
                          />
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{t("courseDetail.codeTests")}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-md shadow-none"
                              onClick={() => codeTestsField.append({ name: `test_${codeTestsField.fields.length + 1}`, input: "", expectedOutput: "", hidden: false })}
                            >
                              <Plus className="size-4" aria-hidden />
                              {t("courseDetail.codeAddTest")}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{t("courseDetail.codeTestsHint")}</p>
                          {codeTestsField.fields.length === 0 ? (
                            <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground ring-1 ring-foreground/10">{t("courseDetail.codeNoTests")}</p>
                          ) : null}
                          {codeTestsField.fields.map((testField, index) => (
                            <div key={testField.id} className="grid gap-2 rounded-md border border-border bg-background/60 p-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  className="h-9 flex-1"
                                  placeholder={t("courseDetail.codeTestName")}
                                  {...questionForm.register(`codeTests.${index}.name` as const)}
                                />
                                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                                  <input type="checkbox" className="size-3.5 accent-[var(--primary)]" {...questionForm.register(`codeTests.${index}.hidden` as const)} />
                                  {t("courseDetail.codeTestHidden")}
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="size-9 shrink-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
                                  aria-label={t("courseDetail.codeRemoveTest")}
                                  onClick={() => codeTestsField.remove(index)}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <TextareaField
                                  rows={2}
                                  className="font-mono text-xs"
                                  placeholder={t("courseDetail.codeTestInput")}
                                  {...questionForm.register(`codeTests.${index}.input` as const)}
                                />
                                <TextareaField
                                  rows={2}
                                  className="font-mono text-xs"
                                  placeholder={t("courseDetail.codeTestExpected")}
                                  {...questionForm.register(`codeTests.${index}.expectedOutput` as const)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="wizard-question-points" label={t("courseDetail.points")} error={questionForm.formState.errors.points?.message}>
                        <Input id="wizard-question-points" inputMode="numeric" min={1} type="number" {...questionForm.register("points")} />
                      </FormField>
                      <FormField id="wizard-question-order" label={t("courseDetail.order")} error={questionForm.formState.errors.sortOrder?.message}>
                        <Input id="wizard-question-order" inputMode="numeric" min={1} type="number" {...questionForm.register("sortOrder")} />
                      </FormField>
                    </div>
                    <FormField id="wizard-question-explanation" label={t("courseDetail.questionExplanation")} hint={t("courseDetail.optional")} error={questionForm.formState.errors.explanation?.message}>
                      <TextareaField id="wizard-question-explanation" rows={3} placeholder={t("courseDetail.questionExplanationPlaceholder")} {...questionForm.register("explanation")} />
                    </FormField>
                    <div className="flex justify-end gap-2">
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
        </div>
      </div>

      <AlertDialog open={Boolean(questionPendingDelete)} onOpenChange={(open) => !open && setQuestionPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courseDetail.deleteQuestion")}</AlertDialogTitle>
            <AlertDialogDescription>{t("courseDetail.deleteQuestionConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExamQuestionMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteExamQuestionMutation.isPending} onClick={() => void confirmDeleteQuestion()}>
              {deleteExamQuestionMutation.isPending ? t("courseDetail.questionDeletePending") : t("courseDetail.deleteQuestion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
