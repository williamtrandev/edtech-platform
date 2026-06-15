import { COURSE_STATUS, type CourseStatus } from "../constants/business";

type SelfEnrollContext = {
  userId?: string;
  instructorId?: string;
  courseStatus?: CourseStatus;
  isEnrolled: boolean;
};

export function canSelfEnrollInCourse({ userId, instructorId, courseStatus, isEnrolled }: SelfEnrollContext) {
  if (!userId || isEnrolled) {
    return false;
  }

  if (courseStatus !== COURSE_STATUS.published) {
    return false;
  }

  if (instructorId && instructorId === userId) {
    return false;
  }

  return true;
}

export function isEnrolledStudentExperience({
  isEnrolled,
  canAccessCourseWorkspace
}: {
  isEnrolled: boolean;
  canAccessCourseWorkspace: boolean;
}) {
  return isEnrolled && !canAccessCourseWorkspace;
}

export function showOwnerCannotSelfEnrollHint({
  isAuthenticated,
  isCoursePublished,
  isEnrolled,
  canManageCourse
}: {
  isAuthenticated: boolean;
  isCoursePublished: boolean;
  isEnrolled: boolean;
  canManageCourse: boolean;
}) {
  return isAuthenticated && isCoursePublished && !isEnrolled && canManageCourse;
}
