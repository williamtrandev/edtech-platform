import type {
  CodeQuestionLanguage,
  ExamAttemptEventType,
  ExamAttemptStatus,
  ExamQuestionType,
  ExamScope,
  ExamStatus,
  ExamSubmitReason
} from "../constants/business";
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

export type ExamLessonSummary = {
  id: string;
  title: string;
  sortOrder: number;
};

export type Exam = {
  id: string;
  courseId: string;
  lessonId?: string | null;
  scope: ExamScope;
  title: string;
  description?: string | null;
  status: ExamStatus;
  durationMinutes?: number | null;
  passingScore?: number | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  lesson?: ExamLessonSummary | null;
};

export type ListCourseExamsParams = {
  scope?: ExamScope;
  lessonId?: string;
};

export type ExamQuestionOption = {
  id: string;
  text: string;
};

export type CodeQuestionTest = {
  name: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

/** Full CODE payload used when authoring (includes solution + hidden tests). */
export type CodeQuestionPayload = {
  language: CodeQuestionLanguage;
  starterCode: string;
  solutionCode: string;
  instructions?: string | null;
  tests: CodeQuestionTest[];
};

/** Public, learner-visible CODE config (no solution, no hidden tests). */
export type CodeQuestionConfig = {
  language: CodeQuestionLanguage;
  starterCode: string;
  instructions?: string | null;
  sampleTests: Array<Pick<CodeQuestionTest, "name" | "input" | "expectedOutput">>;
};

/** Secret slice the author API returns in `correctAnswers` for CODE questions. */
export type CodeQuestionSecret = {
  solutionCode: string;
  tests: CodeQuestionTest[];
};

export type ExamQuestion = {
  id: string;
  examId: string;
  type: ExamQuestionType;
  prompt: string;
  options?: ExamQuestionOption[] | null;
  correctAnswers?: string[] | CodeQuestionSecret | null;
  codeConfig?: CodeQuestionConfig | null;
  explanation?: string | null;
  points: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicExamQuestion = Omit<ExamQuestion, "correctAnswers" | "explanation" | "createdAt" | "updatedAt">;

export type CodeGradingResult = {
  total: number;
  passed: number;
  allPassed: boolean;
  results: Array<{
    name: string;
    passed: boolean;
    hidden: boolean;
    stdout?: string;
    stderr?: string;
    compileError?: string | null;
    timedOut?: boolean;
    input?: string;
    expectedOutput?: string;
  }>;
};

export type ExamAttemptAnswer = {
  id: string;
  questionId: string;
  answer?: string | string[] | null;
  gradingResult?: CodeGradingResult | null;
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
  suspiciousEventCount?: number;
  createdAt: string;
  updatedAt: string;
  answers: ExamAttemptAnswer[];
};

export type ExamIntegrityEvent = {
  id: string;
  attemptId: string;
  type: ExamAttemptEventType;
  clientEventId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type ExamIntegrityEventInput = {
  type: ExamAttemptEventType;
  clientEventId?: string;
  metadata?: Record<string, unknown>;
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
  scope?: ExamScope;
  lessonId?: string | null;
};

export type UpdateExamPayload = Partial<CreateExamPayload>;

export type CreateExamQuestionPayload = {
  type: ExamQuestionType;
  prompt: string;
  options: ExamQuestionOption[];
  correctAnswers: string[];
  code?: CodeQuestionPayload | null;
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
  submitReason?: ExamSubmitReason;
};

export type ExamIntegrityEventsResponse = {
  attemptId: string;
  events: ExamIntegrityEvent[];
  suspiciousEventCount: number;
};

export type GradeExamAttemptPayload = {
  score: number;
};

export const examService = {
  async getCourseExams(courseId: string, params?: ListCourseExamsParams): Promise<Exam[]> {
    const response = await httpClient.get<ApiResponse<Exam[]>>(`/courses/${courseId}/exams`, { params });
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
  },
  async recordExamIntegrityEvents(attemptId: string, events: ExamIntegrityEventInput[]) {
    const response = await httpClient.post<ApiResponse<{ events: ExamIntegrityEvent[] }>>(
      `/exam-attempts/${attemptId}/integrity-events`,
      { events }
    );
    return response.data.data;
  },
  async listExamIntegrityEvents(attemptId: string): Promise<ExamIntegrityEventsResponse> {
    const response = await httpClient.get<ApiResponse<ExamIntegrityEventsResponse>>(
      `/exam-attempts/${attemptId}/integrity-events`
    );
    return response.data.data;
  },
  /** Runs the learner's code for a CODE question against its public sample tests (practice preview). */
  async runCodeQuestion(questionId: string, code: string): Promise<CodeGradingResult> {
    const response = await httpClient.post<ApiResponse<CodeGradingResult>>(`/code-exercises/${questionId}/run`, { code });
    return response.data.data;
  },
  /** Runs a lesson CODE_EXERCISE against its sample tests. */
  async runLessonCode(lessonId: string, code: string): Promise<CodeGradingResult> {
    const response = await httpClient.post<ApiResponse<CodeGradingResult>>(`/code-exercises/lessons/${lessonId}/run`, { code });
    return response.data.data;
  }
};
