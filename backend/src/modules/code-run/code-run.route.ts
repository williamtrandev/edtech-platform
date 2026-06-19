import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ExamAttemptRepository } from "../exam-attempt/exam-attempt.repository";
import { ExamQuestionRepository } from "../exam-question/exam-question.repository";
import { LessonRepository } from "../lesson/lesson.repository";
import { CodeGradingService } from "../code-execution/code-grading.service";
import { CodeRunController } from "./code-run.controller";
import { CodeRunService } from "./code-run.service";
import { runCodeSchema, runLessonCodeSchema } from "./code-run.schema";

const codeRunService = new CodeRunService(
  new ExamQuestionRepository(),
  new ExamAttemptRepository(),
  new CourseRepository(),
  new EnrollmentRepository(),
  new CodeGradingService(),
  new LessonRepository()
);
const codeRunController = new CodeRunController(codeRunService);

export const codeRunRouter = Router();

codeRunRouter.post(
  "/lessons/:lessonId/run",
  authMiddleware,
  validateRequest(runLessonCodeSchema),
  asyncHandler(codeRunController.runLessonCode)
);

codeRunRouter.post(
  "/:questionId/run",
  authMiddleware,
  validateRequest(runCodeSchema),
  asyncHandler(codeRunController.runCode)
);
