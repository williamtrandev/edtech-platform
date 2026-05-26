import type { ExamAttemptStatus, ExamQuestionType, ExamStatus } from "../constants/business";
import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
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

export type ExamAttemptAnswerForReview = ExamAttemptAnswer & {
  question: {
    id: string;
    type: ExamQuestionType;
    prompt: string;
    options?: ExamQuestionOption[] | null;
    correctAnswers?: string[] | null;
    points: number;
    sortOrder: number;
  };
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

export type ExamAttemptForReview = Omit<ExamAttempt, "answers"> & {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  answers: ExamAttemptAnswerForReview[];
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

export type GradeExamAttemptPayload = {
  score: number;
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
  async getExamAttempts(examId: string, page = 1, limit = 20, status?: ExamAttemptStatus): Promise<PaginatedResponse<ExamAttemptForReview>> {
    const response = await httpClient.get<ApiResponse<PaginatedResponse<ExamAttemptForReview>>>(`/exams/${examId}/attempts`, {
      params: {
        page,
        limit,
        ...(status ? { status } : {})
      }
    });
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
  },
  async gradeExamAttempt(attemptId: string, payload: GradeExamAttemptPayload): Promise<{ attempt: ExamAttempt }> {
    const response = await httpClient.patch<ApiResponse<{ attempt: ExamAttempt }>>(`/exam-attempts/${attemptId}/grading`, payload);
    return response.data.data;
  }
};
