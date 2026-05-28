import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ExamAttemptController } from "./exam-attempt.controller";
import { ExamAttemptRepository } from "./exam-attempt.repository";
import { ExamAttemptService } from "./exam-attempt.service";
import { examAttemptParamSchema, gradeExamAttemptSchema, saveExamAttemptAnswersSchema, submitExamAttemptSchema } from "./exam-attempt.schema";

const examAttemptRepository = new ExamAttemptRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const examAttemptService = new ExamAttemptService(examAttemptRepository, courseRepository, enrollmentRepository, auditRepository);
const examAttemptController = new ExamAttemptController(examAttemptService);

export const examAttemptRouter = Router();

examAttemptRouter.get("/:attemptId", authMiddleware, validateRequest(examAttemptParamSchema), asyncHandler(examAttemptController.getAttempt));
examAttemptRouter.patch("/:attemptId/answers", authMiddleware, validateRequest(saveExamAttemptAnswersSchema), asyncHandler(examAttemptController.saveAttemptAnswers));
examAttemptRouter.patch("/:attemptId/grading", authMiddleware, validateRequest(gradeExamAttemptSchema), asyncHandler(examAttemptController.gradeAttempt));
examAttemptRouter.post("/:attemptId/submissions", authMiddleware, validateRequest(submitExamAttemptSchema), asyncHandler(examAttemptController.submitAttempt));
