import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type DiscussionCommentUser = {
  id: string;
  email: string;
};

export type DiscussionComment = {
  id: string;
  courseId: string;
  lessonId: string | null;
  userId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: DiscussionCommentUser;
  replies?: DiscussionComment[];
};

export type DiscussionCommentList = {
  items: DiscussionComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export const discussionService = {
  async listCourseDiscussionComments(courseId: string, params?: { lessonId?: string; page?: number; limit?: number }) {
    const response = await httpClient.get<ApiResponse<DiscussionCommentList>>(`/courses/${courseId}/discussion-comments`, {
      params
    });
    return response.data.data;
  },

  async createCourseDiscussionComment(
    courseId: string,
    payload: { body: string; lessonId?: string | null; parentId?: string | null }
  ) {
    const response = await httpClient.post<ApiResponse<DiscussionComment>>(`/courses/${courseId}/discussion-comments`, payload);
    return response.data.data;
  },

  async deleteCourseDiscussionComment(courseId: string, commentId: string) {
    await httpClient.delete(`/courses/${courseId}/discussion-comments/${commentId}`);
  }
};
