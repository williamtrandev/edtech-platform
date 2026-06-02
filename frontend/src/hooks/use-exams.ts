import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamAttemptStatus, ExamSubmitReason } from "../constants/business";
import {
  examService,
  type CreateExamPayload,
  type CreateExamQuestionPayload,
  type ExamQuestion,
  type GradeExamAttemptPayload,
  type UpdateExamPayload,
  type UpdateExamQuestionPayload
} from "../services/exam.service";

export function useCourseExams(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "exams"],
    queryFn: () => examService.getCourseExams(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateExam(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExamPayload) => examService.createCourseExam(courseId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useUpdateExam(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamPayload }) => examService.updateExam(examId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useArchiveExam(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examId: string) => examService.archiveExam(examId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useExamQuestions(courseId: string, examId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "exams", examId, "questions"],
    queryFn: () => examService.getExamQuestions(examId!),
    enabled: Boolean(courseId && examId) && enabled
  });
}

export function useCreateExamQuestion(courseId: string, examId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExamQuestionPayload) => examService.createExamQuestion(examId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams", examId, "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useUpdateExamQuestion(courseId: string, examId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; payload: UpdateExamQuestionPayload }) => examService.updateExamQuestion(questionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams", examId, "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useDeleteExamQuestion(courseId: string, examId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: string) => examService.deleteExamQuestion(questionId),
    onSuccess: async (deletedQuestion: ExamQuestion) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams", examId ?? deletedQuestion.examId, "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useStartExamAttempt(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examId: string) => examService.startExamAttempt(examId),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      queryClient.setQueryData(["exam-attempts", session.attempt.id], session);
    }
  });
}

export function useExamAttempt(attemptId: string | null, enabled = true, pollWhileSubmitted = false) {
  return useQuery({
    queryKey: ["exam-attempts", attemptId],
    queryFn: () => examService.getExamAttempt(attemptId!),
    enabled: Boolean(attemptId) && enabled,
    refetchInterval: (query) => {
      if (!pollWhileSubmitted) {
        return false;
      }

      const status = query.state.data?.attempt.status;
      return status === "SUBMITTED" ? 2000 : false;
    }
  });
}

export function useExamAttempts(courseId: string, examId: string | null, page: number, status: ExamAttemptStatus | "ALL", enabled = true) {
  const attemptStatus = status === "ALL" ? undefined : status;

  return useQuery({
    queryKey: ["courses", courseId, "exams", examId, "attempts", page, status],
    queryFn: () => examService.getExamAttempts(examId!, page, 20, attemptStatus),
    enabled: Boolean(courseId && examId) && enabled
  });
}

export function useSaveExamAttemptAnswers(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: Array<{ questionId: string; answer: string | string[] | null }> }) =>
      examService.saveExamAttemptAnswers(attemptId, { answers }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["exam-attempts", data.attempt.id], (current: Awaited<ReturnType<typeof examService.getExamAttempt>> | undefined) =>
        current
          ? {
              ...current,
              attempt: data.attempt
            }
          : undefined
      );
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
    }
  });
}

export function useSubmitExamAttempt(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
      submitReason
    }: {
      attemptId: string;
      answers: Array<{ questionId: string; answer: string | string[] | null }>;
      submitReason?: ExamSubmitReason;
    }) => examService.submitExamAttempt(attemptId, { answers, submitReason }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["exam-attempts", variables.attemptId] });
    }
  });
}

export function useExamIntegrityEvents(attemptId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["exam-integrity-events", attemptId],
    queryFn: () => examService.listExamIntegrityEvents(attemptId!),
    enabled: Boolean(attemptId) && enabled
  });
}

export function useGradeExamAttempt(courseId: string, examId: string | null, page: number, status: ExamAttemptStatus | "ALL") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, payload }: { attemptId: string; payload: GradeExamAttemptPayload }) => examService.gradeExamAttempt(attemptId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "exams", examId, "attempts", page, status] });
      await queryClient.invalidateQueries({ queryKey: ["exam-attempts", variables.attemptId] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}
