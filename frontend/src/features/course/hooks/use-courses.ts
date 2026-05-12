import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseService } from "../../../services/course.service";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getCourses
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

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => courseService.getCourseById(courseId)
  });
}

export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => courseService.getCourseLessons(courseId)
  });
}

export function useCreateLesson(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { title: string; contentType: "VIDEO" | "TEXT" | "RESOURCE"; content: string; sortOrder: number }) =>
      courseService.createLesson({ ...payload, courseId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
    }
  });
}
