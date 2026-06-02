import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discussionService } from "../services/discussion.service";

export function useCourseDiscussionComments(courseId: string, lessonId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "discussion-comments", lessonId ?? "all"],
    queryFn: () => discussionService.listCourseDiscussionComments(courseId, { lessonId, limit: 50 }),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateDiscussionComment(courseId: string, lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { body: string; parentId?: string | null }) =>
      discussionService.createCourseDiscussionComment(courseId, {
        body: payload.body,
        lessonId: payload.parentId ? undefined : lessonId,
        parentId: payload.parentId
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "discussion-comments"] });
    }
  });
}

export function useDeleteDiscussionComment(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => discussionService.deleteCourseDiscussionComment(courseId, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "discussion-comments"] });
    }
  });
}
