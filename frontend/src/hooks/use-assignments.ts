import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignmentService,
  type CreateAssignmentPayload,
  type GradeAssignmentPayload,
  type ReplaceAssignmentRubricPayload,
  type SubmitAssignmentPayload,
  type UpdateAssignmentPayload
} from "../services/assignment.service";

export function useCourseAssignments(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "assignments"],
    queryFn: () => assignmentService.getCourseAssignments(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => assignmentService.createCourseAssignment(courseId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useUpdateAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: UpdateAssignmentPayload }) => assignmentService.updateAssignment(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useArchiveAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => assignmentService.archiveAssignment(assignmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useSubmitAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: SubmitAssignmentPayload }) => assignmentService.submitAssignment(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
    }
  });
}

export function useAssignmentSubmissions(courseId: string, assignmentId: string | null, page: number, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "assignments", assignmentId, "submissions", page],
    queryFn: () => assignmentService.getAssignmentSubmissions(assignmentId!, page),
    enabled: Boolean(courseId && assignmentId) && enabled
  });
}

export function useReplaceAssignmentRubric(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: ReplaceAssignmentRubricPayload }) =>
      assignmentService.replaceAssignmentRubric(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useGradeAssignmentSubmission(courseId: string, assignmentId: string | null, page: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, payload }: { submissionId: string; payload: GradeAssignmentPayload }) => assignmentService.gradeAssignmentSubmission(submissionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "assignments", assignmentId, "submissions", page] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}
