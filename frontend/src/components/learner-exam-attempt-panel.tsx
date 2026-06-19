import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_ATTEMPT_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS, EXAM_SUBMIT_REASON } from "../constants/business";
import { useExamIntegrityMonitor } from "../hooks/use-exam-integrity-monitor";
import { useExamAttempt, useSaveExamAttemptAnswers, useStartExamAttempt, useSubmitExamAttempt } from "../hooks/use-exams";
import { useI18n, type I18nKey } from "../i18n";
import { formatExamRemainingTime } from "../lib/exam-remaining-time";
import { STUDIO_STAT } from "../lib/studio-layout";
import { cn } from "@/lib/utils";
import { examService } from "../services/exam.service";
import type { CodeGradingResult, Exam } from "../services/exam.service";
import type { ExamAttemptSession } from "../services/exam.service";
import { CodeExercise } from "./code-exercise";
import { TextareaField } from "./textarea-field";

type LearnerExamAttemptPanelProps = {
  courseId: string;
  exam: Exam;
  canAttempt: boolean;
  onAttemptGraded?: () => void;
};

export function LearnerExamAttemptPanel({ courseId, exam, canAttempt, onAttemptGraded }: LearnerExamAttemptPanelProps) {
  const { t, formatError } = useI18n();
  const startExamAttemptMutation = useStartExamAttempt(courseId);
  const saveExamAttemptAnswersMutation = useSaveExamAttemptAnswers(courseId);
  const submitExamAttemptMutation = useSubmitExamAttempt(courseId);

  const [activeExamSession, setActiveExamSession] = useState<ExamAttemptSession | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<string, string | string[]>>({});
  const [attemptAnswersDirty, setAttemptAnswersDirty] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [examNow, setExamNow] = useState(() => Date.now());
  const [codeRunResults, setCodeRunResults] = useState<Record<string, CodeGradingResult>>({});
  const [runningQuestionId, setRunningQuestionId] = useState<string | null>(null);

  const attemptAutosaveVersionRef = useRef(0);
  const attemptAutosaveTimerRef = useRef<number | null>(null);
  const attemptTimeoutSubmitRef = useRef<string | null>(null);
  const gradedNotifiedRef = useRef<string | null>(null);

  const pollExamAttempt = activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.submitted;
  const examAttemptQuery = useExamAttempt(activeExamSession?.attempt.id ?? null, Boolean(activeExamSession), pollExamAttempt);
  const isAttemptInProgress = activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.inProgress;

  useExamIntegrityMonitor({
    attemptId: activeExamSession?.attempt.id ?? null,
    enabled: isAttemptInProgress
  });

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
        ? t("courseDetail.examAutosaved")
        : t("courseDetail.examAutosaveReady");

  useEffect(() => {
    const timer = window.setInterval(() => setExamNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!examAttemptQuery.data) {
      return;
    }

    setActiveExamSession(examAttemptQuery.data);
    if (examAttemptQuery.data.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress) {
      setAttemptAnswersDirty(false);
    }
  }, [examAttemptQuery.data]);

  useEffect(() => {
    if (activeExamSession?.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!attemptAnswersDirty) {
        return;
      }

      attemptAutosaveVersionRef.current += 1;
      const version = attemptAutosaveVersionRef.current;
      const answers = activeExamSession.exam.questions.map((question) => ({
        questionId: question.id,
        answer: attemptAnswers[question.id] ?? null
      }));

      void saveExamAttemptAnswersMutation
        .mutateAsync({
          attemptId: activeExamSession.attempt.id,
          answers
        })
        .then(() => {
          if (version === attemptAutosaveVersionRef.current) {
            setAttemptAnswersDirty(false);
            setLastAutosavedAt(new Date());
          }
        })
        .catch(() => {
          // Autosave failures are silent; submit still validates server-side.
        });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [activeExamSession, attemptAnswers, attemptAnswersDirty, saveExamAttemptAnswersMutation]);

  useEffect(() => {
    if (!activeExamSession || activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress || !activeExamSession.exam.durationMinutes) {
      return;
    }

    const deadline = new Date(activeExamSession.attempt.startedAt).getTime() + activeExamSession.exam.durationMinutes * 60 * 1000;
    if (deadline > examNow || attemptTimeoutSubmitRef.current === activeExamSession.attempt.id) {
      return;
    }

    attemptTimeoutSubmitRef.current = activeExamSession.attempt.id;
    const answers = activeExamSession.exam.questions.map((question) => ({
      questionId: question.id,
      answer: attemptAnswers[question.id] ?? null
    }));

    void submitExamAttemptMutation
      .mutateAsync({
        attemptId: activeExamSession.attempt.id,
        answers,
        submitReason: EXAM_SUBMIT_REASON.timer
      })
      .then((submitted) => {
        setActiveExamSession({
          ...activeExamSession,
          attempt: submitted.attempt
        });
        setAttemptAnswersDirty(false);
        toast.message(t("courseDetail.examTimedOut"));
      })
      .catch((error) => {
        toast.error(formatError(error, "courseDetail.examSubmitFailed"));
      });
  }, [activeExamSession, attemptAnswers, examNow, formatError, submitExamAttemptMutation, t]);

  useEffect(() => {
    if (!activeExamSession || activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.graded) {
      return;
    }

    if (gradedNotifiedRef.current === activeExamSession.attempt.id) {
      return;
    }

    gradedNotifiedRef.current = activeExamSession.attempt.id;
    onAttemptGraded?.();
  }, [activeExamSession, onAttemptGraded]);

  useEffect(() => {
    return () => {
      if (attemptAutosaveTimerRef.current) {
        window.clearTimeout(attemptAutosaveTimerRef.current);
      }
    };
  }, []);

  const onStartExam = async () => {
    try {
      const session = await startExamAttemptMutation.mutateAsync(exam.id);
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
      // Seed CODE questions with their starter code so the editor opens ready to edit.
      for (const question of session.exam.questions) {
        if (question.type === EXAM_QUESTION_TYPE.code && nextAnswers[question.id] === undefined) {
          nextAnswers[question.id] = question.codeConfig?.starterCode ?? "";
        }
      }
      setAttemptAnswers(nextAnswers);
    } catch (error) {
      toast.error(formatError(error, "courseDetail.examStartFailed"));
    }
  };

  const onChangeAttemptAnswer = (questionId: string, answer: string | string[]) => {
    setAttemptAnswersDirty(true);
    setAttemptAnswers((current) => ({
      ...current,
      [questionId]: answer
    }));
  };

  const onRunCode = async (questionId: string) => {
    const code = attemptAnswers[questionId];
    if (typeof code !== "string") {
      return;
    }
    setRunningQuestionId(questionId);
    try {
      const result = await examService.runCodeQuestion(questionId, code);
      setCodeRunResults((current) => ({ ...current, [questionId]: result }));
    } catch (error) {
      toast.error(formatError(error, "examAttempt.codeRunFailed"));
    } finally {
      setRunningQuestionId((current) => (current === questionId ? null : current));
    }
  };

  const onToggleAttemptAnswer = (questionId: string, optionId: string) => {
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
      const submitted = await submitExamAttemptMutation.mutateAsync({
        attemptId: activeExamSession.attempt.id,
        answers,
        submitReason: EXAM_SUBMIT_REASON.manual
      });
      setActiveExamSession({
        ...activeExamSession,
        attempt: submitted.attempt
      });
      setAttemptAnswersDirty(false);
      toast.success(t("courseDetail.examSubmitted"));
    } catch (error) {
      toast.error(formatError(error, "courseDetail.examSubmitFailed"));
    }
  };

  const canStart =
    canAttempt && exam.status === EXAM_STATUS.published && (exam.questionCount ?? 0) > 0 && !activeExamSession;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-muted/30 px-4 py-4 ring-1 ring-foreground/10 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">{exam.title}</h3>
            {exam.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{exam.description}</p> : null}
          </div>
          <Badge variant={exam.status === EXAM_STATUS.published ? "default" : "secondary"} className="rounded-md">
            {t(`examStatus.${exam.status}` as I18nKey)}
          </Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className={STUDIO_STAT}>
            <p className="text-xs text-muted-foreground">{t("courseDetail.examDuration")}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {exam.durationMinutes ? `${exam.durationMinutes} ${t("courseDetail.examMinutes")}` : "—"}
            </p>
          </div>
          <div className={STUDIO_STAT}>
            <p className="text-xs text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {exam.passingScore !== null && exam.passingScore !== undefined ? `${exam.passingScore}%` : "—"}
            </p>
          </div>
          <div className={STUDIO_STAT}>
            <p className="text-xs text-muted-foreground">{t("courseDetail.questions")}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{exam.questionCount ?? 0}</p>
          </div>
        </div>
      </div>

      {canStart ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-10 rounded-xl shadow-none"
            disabled={startExamAttemptMutation.isPending}
            onClick={() => void onStartExam()}
          >
            {startExamAttemptMutation.isPending ? t("courseDetail.startingExam") : t("courseLearn.startQuiz")}
          </Button>
        </div>
      ) : null}

      {!canAttempt && !activeExamSession ? (
        <p className="rounded-xl bg-muted/20 px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
          {t("courseLearn.quizPreviewHint")}
        </p>
      ) : null}

      {activeExamSession ? (
        <Card className="shadow-none">
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
            {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded &&
            activeExamSession.attempt.score !== null &&
            activeExamSession.attempt.score !== undefined ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card px-3 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("courseDetail.examScore")}</p>
                  <p className="mt-1 text-lg font-semibold">{activeExamSession.attempt.score}%</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
                  <p className="mt-1 text-lg font-semibold">{activeExamSession.exam.passingScore ?? "—"}%</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("courseDetail.examAttempt")}</p>
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
              <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                {t("courseDetail.examAwaitingManualGrade")}
              </p>
            ) : null}

            {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("courseDetail.examTimeRemaining")}</p>
                <p
                  className={cn(
                    "mt-1 text-lg font-semibold tabular-nums",
                    examRemainingSeconds !== null && examRemainingSeconds <= 60 ? "text-destructive" : undefined
                  )}
                >
                  {examRemainingSeconds === null ? "—" : formatExamRemainingTime(examRemainingSeconds)}
                </p>
              </div>
            ) : null}

            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="text-primary" aria-hidden>
                {">_"}
              </span>{" "}
              questions
            </span>
            <div className="grid gap-3">
              {activeExamSession.exam.questions.map((question, index) => {
                const answer = attemptAnswers[question.id];
                const submitted = activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress;

                return (
                  <article key={question.id} className="rounded-xl border border-border bg-card px-4 py-4">
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
                    {question.type === EXAM_QUESTION_TYPE.code ? (
                      <CodeExercise
                        className="mt-3"
                        language={question.codeConfig?.language ?? "python"}
                        value={typeof answer === "string" ? answer : question.codeConfig?.starterCode ?? ""}
                        onChange={(value) => onChangeAttemptAnswer(question.id, value)}
                        readOnly={submitted}
                        instructions={question.codeConfig?.instructions}
                        sampleTests={question.codeConfig?.sampleTests ?? []}
                        result={activeExamSession.attempt.answers.find((item) => item.questionId === question.id)?.gradingResult ?? null}
                        onRun={() => void onRunCode(question.id)}
                        isRunning={runningQuestionId === question.id}
                        runResult={codeRunResults[question.id] ?? null}
                      />
                    ) : question.type === EXAM_QUESTION_TYPE.freeText ? (
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
                <Button
                  className="h-10 rounded-md shadow-none"
                  disabled={submitExamAttemptMutation.isPending}
                  onClick={() => void onSubmitAttempt()}
                  type="button"
                >
                  {submitExamAttemptMutation.isPending ? t("courseDetail.submittingExam") : t("courseDetail.submitExam")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
