import { AppError } from "../errors/app-error";
import { USER_ROLE } from "../constants/business";

export function isCourseInstructor(user: Express.UserClaims | undefined, instructorId: string) {
  return Boolean(user?.id && user.role === USER_ROLE.instructor && user.id === instructorId);
}

export function isAdminReviewer(user: Express.UserClaims | undefined) {
  return user?.role === USER_ROLE.admin;
}

export function canViewCourseAsStaff(user: Express.UserClaims | undefined, instructorId: string) {
  return isAdminReviewer(user) || isCourseInstructor(user, instructorId);
}

export function assertCourseInstructor(user: Express.UserClaims | undefined, instructorId: string) {
  if (!user?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (!isCourseInstructor(user, instructorId)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
}
