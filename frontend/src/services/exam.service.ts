import type { ExamAttemptStatus, ExamQuestionType, ExamStatus } from "../constants/business";
import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Exam = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  status: ExamStatus;
  durationMinutes?: number | null;
  passingScore?: number | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
};

export type ExamQuestionOption = {
  id: string;
  text: string;
};

export type ExamQuestion = {
  id: string;
  examId: string;
  type: ExamQuestionType;
  prompt: string;
  options?: ExamQuestionOption[] | null;
  correctAnswers?: string[] | null;
  explanation?: string | null;
  points: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicExamQuestion = Omit<ExamQuestion, "correctAnswers" | "explanation" | "createdAt" | "updatedAt">;

export type ExamAttemptAnswer = {
  id: string;
  questionId: string;
  answer?: string | string[] | null;
  updatedAt: string;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  userId: string;
  status: ExamAttemptStatus;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string | null;
  gradedAt?: string | null;
  score?: number | null;
  createdAt: string;
  updatedAt: string;
  answers: ExamAttemptAnswer[];
};

export type ExamAttemptSession = {
  exam: {
    id: string;
    courseId: string;
    title: string;
    description?: string | null;
    status: ExamStatus;
    durationMinutes?: number | null;
    passingScore?: number | null;
    questions: PublicExamQuestion[];
  };
  attempt: ExamAttempt;
};

export type CreateExamPayload = {
  title: string;
  description?: string | null;
  status: ExamStatus;
  durationMinutes?: number | null;
  passingScore?: number | null;
};

export type UpdateExamPayload = Partial<CreateExamPayload>;

export type CreateExamQuestionPayload = {
  type: ExamQuestionType;
  prompt: string;
  options: ExamQuestionOption[];
  correctAnswers: string[];
  explanation?: string | null;
  points: number;
  sortOrder: number;
};

export type UpdateExamQuestionPayload = Partial<CreateExamQuestionPayload>;

export type SubmitExamAttemptPayload = {
  answers: Array<{
    questionId: string;
    answer: string | string[] | null;
  }>;
};

export const examService = {
  async getCourseExams(courseId: string): Promise<Exam[]> {
    const response = await httpClient.get<ApiResponse<Exam[]>>(`/courses/${courseId}/exams`);
    return response.data.data;
  },
  async createCourseExam(courseId: string, payload: CreateExamPayload): Promise<Exam> {
    const response = await httpClient.post<ApiResponse<Exam>>(`/courses/${courseId}/exams`, payload);
    return response.data.data;
  },
  async updateExam(examId: string, payload: UpdateExamPayload): Promise<Exam> {
    const response = await httpClient.patch<ApiResponse<Exam>>(`/exams/${examId}`, payload);
    return response.data.data;
  },
  async archiveExam(examId: string): Promise<Exam> {
    const response = await httpClient.delete<ApiResponse<Exam>>(`/exams/${examId}`);
    return response.data.data;
  },
  async getExamQuestions(examId: string): Promise<ExamQuestion[]> {
    const response = await httpClient.get<ApiResponse<ExamQuestion[]>>(`/exams/${examId}/questions`);
    return response.data.data;
  },
  async createExamQuestion(examId: string, payload: CreateExamQuestionPayload): Promise<ExamQuestion> {
    const response = await httpClient.post<ApiResponse<ExamQuestion>>(`/exams/${examId}/questions`, payload);
    return response.data.data;
  },
  async updateExamQuestion(questionId: string, payload: UpdateExamQuestionPayload): Promise<ExamQuestion> {
    const response = await httpClient.patch<ApiResponse<ExamQuestion>>(`/exam-questions/${questionId}`, payload);
    return response.data.data;
  },
  async deleteExamQuestion(questionId: string): Promise<ExamQuestion> {
    const response = await httpClient.delete<ApiResponse<ExamQuestion>>(`/exam-questions/${questionId}`);
    return response.data.data;
  },
  async startExamAttempt(examId: string): Promise<ExamAttemptSession> {
    const response = await httpClient.post<ApiResponse<ExamAttemptSession>>(`/exams/${examId}/attempts`);
    return response.data.data;
  },
  async getExamAttempt(attemptId: string): Promise<ExamAttemptSession> {
    const response = await httpClient.get<ApiResponse<ExamAttemptSession>>(`/exam-attempts/${attemptId}`);
    return response.data.data;
  },
  async saveExamAttemptAnswers(attemptId: string, payload: SubmitExamAttemptPayload): Promise<{ attempt: ExamAttempt }> {
    const response = await httpClient.patch<ApiResponse<{ attempt: ExamAttempt }>>(`/exam-attempts/${attemptId}/answers`, payload);
    return response.data.data;
  },
  async submitExamAttempt(attemptId: string, payload: SubmitExamAttemptPayload): Promise<{ attempt: ExamAttempt }> {
    const idempotencyKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const response = await httpClient.post<ApiResponse<{ attempt: ExamAttempt }>>(`/exam-attempts/${attemptId}/submissions`, payload, {
      headers: {
        "Idempotency-Key": idempotencyKey
      }
    });
    return response.data.data;
  }
};
