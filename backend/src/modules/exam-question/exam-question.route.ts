import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { ExamRepository } from "../exam/exam.repository";
import { ExamQuestionController } from "./exam-question.controller";
import { ExamQuestionRepository } from "./exam-question.repository";
import { ExamQuestionService } from "./exam-question.service";
import { examQuestionIdParamSchema, updateExamQuestionSchema } from "./exam-question.schema";

const examQuestionRepository = new ExamQuestionRepository();
const examRepository = new ExamRepository();
const courseRepository = new CourseRepository();
const auditRepository = new AuditRepository();
const examQuestionService = new ExamQuestionService(examQuestionRepository, examRepository, courseRepository, auditRepository);
const examQuestionController = new ExamQuestionController(examQuestionService);

export const examQuestionRouter = Router();

examQuestionRouter.patch("/:questionId", authMiddleware, validateRequest(updateExamQuestionSchema), asyncHandler(examQuestionController.updateExamQuestion));
examQuestionRouter.delete("/:questionId", authMiddleware, validateRequest(examQuestionIdParamSchema), asyncHandler(examQuestionController.deleteExamQuestion));
