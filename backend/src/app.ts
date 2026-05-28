import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./common/middleware/error-handler";
import { requestContextMiddleware } from "./common/middleware/request-context";
import { authRouter } from "./modules/auth/auth.route";
import { auditRouter } from "./modules/audit/audit.route";
import { platformAnalyticsRouter } from "./modules/analytics/platform-analytics.route";
import { assignmentRouter } from "./modules/assignment/assignment.route";
import { assignmentSubmissionRouter } from "./modules/assignment-submission/assignment-submission.route";
import { certificateRouter } from "./modules/certificate/certificate.route";
import { courseRouter } from "./modules/course/course.route";
import { enrollmentRouter } from "./modules/enrollment/enrollment.route";
import { examQuestionRouter } from "./modules/exam-question/exam-question.route";
import { examAttemptRouter } from "./modules/exam-attempt/exam-attempt.route";
import { examRouter } from "./modules/exam/exam.route";
import { jobRouter } from "./modules/job/job.route";
import { lessonRouter } from "./modules/lesson/lesson.route";
import { notificationRouter } from "./modules/notification/notification.route";
import { progressRouter } from "./modules/progress/progress.route";
import { uploadRouter } from "./modules/upload/upload.route";
import { userRouter } from "./modules/user/user.route";

export function createApp() {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(cors());
  app.use(express.json({ limit: "80mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/auth-sessions", authRouter);
  app.use("/audit-logs", auditRouter);
  app.use("/analytics", platformAnalyticsRouter);
  app.use("/assignments", assignmentRouter);
  app.use("/assignment-submissions", assignmentSubmissionRouter);
  app.use("/certificates", certificateRouter);
  app.use("/users", userRouter);
  app.use("/courses", courseRouter);
  app.use("/enrollments", enrollmentRouter);
  app.use("/exams", examRouter);
  app.use("/exam-attempts", examAttemptRouter);
  app.use("/exam-questions", examQuestionRouter);
  app.use("/jobs", jobRouter);
  app.use("/lessons", lessonRouter);
  app.use("/notifications", notificationRouter);
  app.use("/lesson-progress", progressRouter);
  app.use("/uploads", uploadRouter);

  app.use(errorHandler);

  return app;
}
