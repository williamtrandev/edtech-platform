import { AppError } from "../errors/app-error";
import { USER_STATUS } from "../constants/business";

type EnrollmentActor = {
  id: string;
  status?: string;
};

type EnrollmentCourse = {
  instructorId: string;
};

export function assertCanSelfEnroll(user: EnrollmentActor, course: EnrollmentCourse) {
  if (user.status === USER_STATUS.suspended) {
    throw new AppError("User is suspended", 403, "USER_SUSPENDED");
  }

  if (course.instructorId === user.id) {
    throw new AppError("Course owners cannot enroll in their own course", 409, "COURSE_OWNER_CANNOT_ENROLL");
  }
}

export function assertCanBeEnrolledByManager(learner: EnrollmentActor, course: EnrollmentCourse) {
  if (learner.status === USER_STATUS.suspended) {
    throw new AppError("User is suspended", 409, "USER_SUSPENDED");
  }

  if (learner.id === course.instructorId) {
    throw new AppError("Course owner cannot be enrolled", 409, "COURSE_OWNER_CANNOT_ENROLL");
  }
}
