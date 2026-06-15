import { httpClient } from "../lib/http-client";
import type { Enrollment } from "./enrollment.service";
import type { CourseStatus, EditableCourseStatus, LessonContentType, UserRole } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
  coverImageUrl?: string | null;
  ratingAverage: number;
  ratingCount: number;
  priceCents?: number;
  currency?: string;
  status: CourseStatus;
  instructorId: string;
  instructor?: {
    id: string;
    email: string;
  };
  enrollmentCount?: number;
  lockReason?: string | null;
  lockedAt?: string | null;
  lockedById?: string | null;
  statusBeforeLock?: CourseStatus | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseEnrollmentRow = {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};

export type PaginatedCourseEnrollments = {
  items: CourseEnrollmentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type PaginatedCourses = {
  items: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type CourseFacets = {
  categories: string[];
  levels: string[];
  languages: string[];
  instructors: Array<{
    id: string;
    email: string;
  }>;
};

export type CourseSearchSuggestion = {
  term: string;
  score: number;
};

export type LearnerInsightStatus = "INACTIVE" | "STALLED" | "LOW_PROGRESS";

export type CourseLearnerInsight = {
  userId: string;
  email: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  lastActivityAt: string | null;
  status: LearnerInsightStatus;
};

export type CourseCertificateHistoryEvent = {
  id: string;
  certificateId: string;
  type: "ISSUED" | "REVOKED" | "RESTORED";
  occurredAt: string;
  learnerEmail: string;
  actorEmail: string | null;
  verificationCode?: string;
};

export type CourseAnalytics = {
  courseId: string;
  enrollmentCount: number;
  lessonCount: number;
  completedLessonCount: number;
  activeLearnerCount: number;
  completionRate: number;
  engagementRate: number;
  certificatesIssued: number;
  examCount: number;
  examAttemptCount: number;
  gradedExamAttemptCount: number;
  assignmentCount: number;
  assignmentSubmissionCount: number;
  lateAssignmentSubmissionCount: number;
  ratingAverage: number;
  ratingCount: number;
  completionCriteria: {
    type: "ALL_LESSONS_COMPLETED" | "FULL_COURSE_REQUIREMENTS";
    lessonCount: number;
    examCount: number;
    assignmentCount: number;
  };
  learnerInsights: {
    inactiveCount: number;
    stalledCount: number;
    lowProgressCount: number;
    items: CourseLearnerInsight[];
  };
  certificateHistory: CourseCertificateHistoryEvent[];
};

export type CourseArchiveImpactCounts = {
  enrollments: number;
  lessons: number;
  publishedExams: number;
  publishedAssignments: number;
  activeCertificates: number;
  inProgressExamAttempts: number;
  submittedAssignmentSubmissions: number;
};

export type CourseArchiveImpact = {
  courseId: string;
  courseTitle: string;
  courseStatus: CourseStatus;
  impact: CourseArchiveImpactCounts;
};

export type CourseListParams = {
  status?: CourseStatus;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  level?: string;
  language?: string;
  instructorId?: string;
  enrollment?: "all" | "enrolled" | "not-enrolled";
  sort?: "newest" | "oldest" | "popular" | "highest-rated" | "title";
};

export type CourseReview = {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
};

export type PaginatedCourseReviews = {
  items: CourseReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
  progressWeight: number;
  prerequisiteLessonId: string | null;
  archivedAt?: string | null;
};

export type CreateCoursePayload = {
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  durationMinutes: number;
  requirements: string;
  outcomes: string;
  coverImageUrl: string;
  priceCents?: number;
  currency?: string;
  status: EditableCourseStatus;
};

export type UpdateCoursePayload = {
  title?: string;
  description?: string;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
  coverImageUrl?: string | null;
  priceCents?: number;
  currency?: string;
  status?: EditableCourseStatus;
};

export type CreateLessonPayload = {
  courseId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
  progressWeight?: number;
  prerequisiteLessonId?: string | null;
};

export type UpdateLessonPayload = {
  title: string;
  contentType: LessonContentType;
  content: string;
  progressWeight?: number;
  prerequisiteLessonId?: string | null;
};

export const courseService = {
  async getCourses(params: CourseListParams = {}): Promise<PaginatedCourses> {
    const response = await httpClient.get<ApiResponse<PaginatedCourses>>("/courses", {
      params: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.category?.trim() ? { category: params.category.trim() } : {}),
        ...(params.level?.trim() ? { level: params.level.trim() } : {}),
        ...(params.language?.trim() ? { language: params.language.trim() } : {}),
        ...(params.instructorId?.trim() ? { instructorId: params.instructorId.trim() } : {}),
        ...(params.enrollment && params.enrollment !== "all" ? { enrollment: params.enrollment } : {}),
        ...(params.sort ? { sort: params.sort } : {})
      }
    });
    return response.data.data;
  },
  async getCourseFacets(status?: CourseStatus): Promise<CourseFacets> {
    const response = await httpClient.get<ApiResponse<CourseFacets>>("/courses/facets", {
      params: {
        ...(status ? { status } : {})
      }
    });
    return response.data.data;
  },
  async createCourse(payload: CreateCoursePayload) {
    const response = await httpClient.post<ApiResponse<Course>>("/courses", payload);
    return response.data.data;
  },
  async updateCourse(id: string, payload: UpdateCoursePayload) {
    const response = await httpClient.put<ApiResponse<Course>>(`/courses/${id}`, payload);
    return response.data.data;
  },
  async assignCourseInstructor(id: string, instructorId: string): Promise<Course> {
    const response = await httpClient.put<ApiResponse<Course>>(`/courses/${id}/instructors`, { instructorId });
    return response.data.data;
  },
  async getCourseById(id: string): Promise<Course> {
    const response = await httpClient.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
  },

  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    const response = await httpClient.get<ApiResponse<CourseAnalytics>>(`/courses/${courseId}/analytics`);
    return response.data.data;
  },

  async getCourseArchiveImpact(courseId: string): Promise<CourseArchiveImpact> {
    const response = await httpClient.get<ApiResponse<CourseArchiveImpact>>(`/courses/${courseId}/archive-impact`);
    return response.data.data;
  },

  async getCourseEnrollments(courseId: string, page = 1, limit = 20, search = ""): Promise<PaginatedCourseEnrollments> {
    const response = await httpClient.get<ApiResponse<PaginatedCourseEnrollments>>(`/courses/${courseId}/enrollments`, {
      params: {
        page,
        limit,
        ...(search ? { search } : {})
      }
    });
    return response.data.data;
  },

  async adminEnrollLearner(courseId: string, email: string) {
    const response = await httpClient.post<ApiResponse<Enrollment>>(`/courses/${courseId}/enrollments`, { email });
    return response.data.data;
  },

  async adminRemoveLearner(courseId: string, userId: string) {
    const response = await httpClient.delete<ApiResponse<{ id: string; userId: string; courseId: string; enrolledAt: string }>>(
      `/courses/${courseId}/enrollments/${userId}`
    );
    return response.data.data;
  },

  async archiveCourse(id: string): Promise<Course> {
    const response = await httpClient.delete<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data;
  },
  async lockCourse(id: string, reason?: string): Promise<Course> {
    const response = await httpClient.post<ApiResponse<Course>>(`/courses/${id}/locks`, {
      ...(reason?.trim() ? { reason: reason.trim() } : {})
    });
    return response.data.data;
  },
  async unlockCourse(id: string): Promise<Course> {
    const response = await httpClient.delete<ApiResponse<Course>>(`/courses/${id}/locks`);
    return response.data.data;
  },
  async getCourseReviews(courseId: string, page = 1, limit = 20): Promise<PaginatedCourseReviews> {
    const response = await httpClient.get<ApiResponse<PaginatedCourseReviews>>(`/courses/${courseId}/reviews`, {
      params: { page, limit }
    });
    return response.data.data;
  },
  async upsertMyCourseReview(courseId: string, payload: { rating: number; comment?: string | null }): Promise<CourseReview> {
    const response = await httpClient.put<ApiResponse<CourseReview>>(`/courses/${courseId}/reviews/me`, payload);
    return response.data.data;
  },
  async deleteMyCourseReview(courseId: string): Promise<void> {
    await httpClient.delete(`/courses/${courseId}/reviews/me`);
  },
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    const response = await httpClient.get<ApiResponse<Lesson[]>>(`/lessons/courses/${courseId}/lessons`);
    return response.data.data;
  },
  async createLesson(payload: CreateLessonPayload): Promise<Lesson> {
    const response = await httpClient.post<ApiResponse<Lesson>>("/lessons", payload);
    return response.data.data;
  },
  async updateLesson(lessonId: string, payload: UpdateLessonPayload): Promise<Lesson> {
    const response = await httpClient.put<ApiResponse<Lesson>>(`/lessons/${lessonId}`, payload);
    return response.data.data;
  },
  async reorderCourseLessons(courseId: string, lessonIds: string[]): Promise<Lesson[]> {
    const response = await httpClient.patch<ApiResponse<Lesson[]>>(`/lessons/courses/${courseId}/lesson-order`, { lessonIds });
    return response.data.data;
  },
  async updateLessonOrder(lessonId: string, sortOrder: number): Promise<Lesson> {
    const response = await httpClient.patch<ApiResponse<Lesson>>(`/lessons/${lessonId}/sort-order`, { sortOrder });
    return response.data.data;
  },
  async deleteLesson(lessonId: string): Promise<Lesson> {
    const response = await httpClient.delete<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
    return response.data.data;
  },
  async restoreLesson(lessonId: string): Promise<Lesson> {
    const response = await httpClient.post<ApiResponse<Lesson>>(`/lessons/${lessonId}/restore`);
    return response.data.data;
  },
  async getCourseSearchSuggestions(query: string, limit = 8): Promise<CourseSearchSuggestion[]> {
    const response = await httpClient.get<ApiResponse<CourseSearchSuggestion[]>>("/courses/search-suggestions", {
      params: {
        q: query,
        limit
      }
    });
    return response.data.data;
  },
  async trackCourseSearch(term: string): Promise<void> {
    await httpClient.post("/courses/search-events", {
      term
    });
  }
};
