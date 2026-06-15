import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CourseStatus } from "../constants/business";
import { courseService, type CourseListParams, type CreateLessonPayload, type Lesson, type UpdateCoursePayload, type UpdateLessonPayload } from "../services/course.service";

export function useCourses(status?: CourseStatus) {
  return useQuery({
    queryKey: ["courses", status],
    queryFn: () => courseService.getCourses({ status })
  });
}

export function useCourseFacets(status?: CourseStatus) {
  return useQuery({
    queryKey: ["courses", "facets", status],
    queryFn: () => courseService.getCourseFacets(status)
  });
}

export function useCourseSearchSuggestions(query: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", "search-suggestions", query],
    queryFn: () => courseService.getCourseSearchSuggestions(query),
    enabled
  });
}

export function useInfiniteCourses(status: CourseStatus | undefined, limit = 12, search = "", filters: Omit<CourseListParams, "status" | "page" | "limit" | "search"> = {}) {
  const normalizedSearch = search.trim();
  const normalizedFilters = {
    category: filters.category?.trim() ?? "",
    level: filters.level?.trim() ?? "",
    language: filters.language?.trim() ?? "",
    instructorId: filters.instructorId?.trim() ?? "",
    enrollment: filters.enrollment ?? "all",
    sort: filters.sort ?? "newest"
  };

  return useInfiniteQuery({
    queryKey: ["courses", "infinite", status, limit, normalizedSearch, normalizedFilters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => courseService.getCourses({ status, page: pageParam, limit, search: normalizedSearch, ...normalizedFilters }),
    getNextPageParam: (lastPage) => {
      const { page, limit: pageSize, total } = lastPage.pagination;
      return page * pageSize < total ? page + 1 : undefined;
    }
  });
}

export function useCourseReviews(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "reviews"],
    queryFn: () => courseService.getCourseReviews(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useUpsertMyCourseReview(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { rating: number; comment?: string | null }) => courseService.upsertMyCourseReview(courseId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "reviews"] });
    }
  });
}

export function useDeleteMyCourseReview(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => courseService.deleteMyCourseReview(courseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "reviews"] });
    }
  });
}

export function useCourseEnrollments(courseId: string, enabled: boolean, page = 1, search = "") {
  return useQuery({
    queryKey: ["courses", courseId, "enrollments", page, search],
    queryFn: () => courseService.getCourseEnrollments(courseId, page, 20, search),
    enabled: Boolean(courseId) && enabled
  });
}

export function useAdminEnrollLearner(courseId: string, page: number, search: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => courseService.adminEnrollLearner(courseId, email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "enrollments", page, search] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });
}

export function useAdminRemoveLearner(courseId: string, page: number, search: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => courseService.adminRemoveLearner(courseId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "enrollments", page, search] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });
}

export function useArchiveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => courseService.archiveCourse(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", id] });
      await queryClient.invalidateQueries({ queryKey: ["courses", id, "enrollments"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useLockCourse(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) => courseService.lockCourse(courseId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
    }
  });
}

export function useUnlockCourse(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => courseService.unlockCourse(courseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
    }
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courseService.createCourse,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCoursePayload) => courseService.updateCourse(courseId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
    }
  });
}

export function useAssignCourseInstructor(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instructorId: string) => courseService.assignCourseInstructor(courseId, instructorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => courseService.getCourseById(courseId),
    enabled: Boolean(courseId)
  });
}

export function useCourseAnalytics(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["courses", courseId, "analytics"],
    queryFn: () => courseService.getCourseAnalytics(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCourseArchiveImpact(courseId: string, enabled = false) {
  return useQuery({
    queryKey: ["courses", courseId, "archive-impact"],
    queryFn: () => courseService.getCourseArchiveImpact(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCourseLessons(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => courseService.getCourseLessons(courseId),
    enabled: Boolean(courseId) && enabled
  });
}

export function useCreateLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<CreateLessonPayload, "courseId">) =>
      courseService.createLesson({ ...payload, courseId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
    }
  });
}

export function useUpdateLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, payload }: { lessonId: string; payload: UpdateLessonPayload }) => courseService.updateLesson(lessonId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
    }
  });
}

export function useReorderLessons(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonIds: string[]) => courseService.reorderCourseLessons(courseId, lessonIds),
    onSuccess: (lessons) => {
      queryClient.setQueryData<Lesson[]>(["lessons", courseId], lessons);
      void queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
    }
  });
}

export function useUpdateLessonOrder(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, sortOrder }: { lessonId: string; sortOrder: number }) =>
      courseService.updateLessonOrder(lessonId, sortOrder),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
    }
  });
}

export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => courseService.deleteLesson(lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] });
    }
  });
}

export function useRestoreLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => courseService.restoreLesson(lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] });
    }
  });
}
