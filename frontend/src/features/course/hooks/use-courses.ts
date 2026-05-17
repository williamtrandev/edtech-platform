import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseService, type CreateLessonPayload, type Lesson, type UpdateCoursePayload, type UpdateLessonPayload } from "../../../services/course.service";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getCourses
  });
}

export function useCourseEnrollments(courseId: string, enabled: boolean, page = 1, search = "") {
  return useQuery({
    queryKey: ["courses", courseId, "enrollments", page, search],
    queryFn: () => courseService.getCourseEnrollments(courseId, page, 20, search),
    enabled: Boolean(courseId) && enabled
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

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => courseService.getCourseById(courseId),
    enabled: Boolean(courseId)
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
    }
  });
}
