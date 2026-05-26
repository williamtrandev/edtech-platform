import type { AssignmentStatus, AssignmentSubmissionStatus, UserRole } from "../constants/business";
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

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  userId: string;
  content?: string | null;
  attachmentUrl?: string | null;
  status: AssignmentSubmissionStatus;
  submittedAt: string;
  gradedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  instructions?: string | null;
  status: AssignmentStatus;
  dueAt?: string | null;
  maxScore?: number | null;
  attachmentUrl?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  mySubmission?: AssignmentSubmission | null;
};

export type CreateAssignmentPayload = {
  title: string;
  instructions?: string | null;
  status: AssignmentStatus;
  dueAt?: string | null;
  maxScore?: number | null;
  attachmentUrl?: string | null;
};

export type UpdateAssignmentPayload = Partial<CreateAssignmentPayload>;

export type SubmitAssignmentPayload = {
  content?: string | null;
  attachmentUrl?: string | null;
};

export type GradeAssignmentPayload = {
  score: number;
  feedback?: string | null;
};

export const assignmentService = {
  async getCourseAssignments(courseId: string): Promise<Assignment[]> {
    const response = await httpClient.get<ApiResponse<Assignment[]>>(`/courses/${courseId}/assignments`);
    return response.data.data;
  },
  async createCourseAssignment(courseId: string, payload: CreateAssignmentPayload): Promise<Assignment> {
    const response = await httpClient.post<ApiResponse<Assignment>>(`/courses/${courseId}/assignments`, payload);
    return response.data.data;
  },
  async updateAssignment(assignmentId: string, payload: UpdateAssignmentPayload): Promise<Assignment> {
    const response = await httpClient.patch<ApiResponse<Assignment>>(`/assignments/${assignmentId}`, payload);
    return response.data.data;
  },
  async archiveAssignment(assignmentId: string): Promise<Assignment> {
    const response = await httpClient.delete<ApiResponse<Assignment>>(`/assignments/${assignmentId}`);
    return response.data.data;
  },
  async submitAssignment(assignmentId: string, payload: SubmitAssignmentPayload): Promise<AssignmentSubmission> {
    const response = await httpClient.post<ApiResponse<AssignmentSubmission>>(`/assignments/${assignmentId}/submissions`, payload);
    return response.data.data;
  },
  async getAssignmentSubmissions(assignmentId: string, page = 1, limit = 20): Promise<PaginatedResponse<AssignmentSubmission>> {
    const response = await httpClient.get<ApiResponse<PaginatedResponse<AssignmentSubmission>>>(`/assignments/${assignmentId}/submissions`, {
      params: { page, limit }
    });
    return response.data.data;
  },
  async gradeAssignmentSubmission(submissionId: string, payload: GradeAssignmentPayload): Promise<AssignmentSubmission> {
    const response = await httpClient.patch<ApiResponse<AssignmentSubmission>>(`/assignment-submissions/${submissionId}/grading`, payload);
    return response.data.data;
  }
};
