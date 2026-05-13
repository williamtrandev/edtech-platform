import cors from "cors";
import express from "express";
import { errorHandler } from "./common/middleware/error-handler";
import { requestContextMiddleware } from "./common/middleware/request-context";
import { authRouter } from "./modules/auth/auth.route";
import { courseRouter } from "./modules/course/course.route";
import { enrollmentRouter } from "./modules/enrollment/enrollment.route";
import { lessonRouter } from "./modules/lesson/lesson.route";
import { progressRouter } from "./modules/progress/progress.route";
import { userRouter } from "./modules/user/user.route";

export function createApp() {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/auth-sessions", authRouter);
  app.use("/users", userRouter);
  app.use("/courses", courseRouter);
  app.use("/enrollments", enrollmentRouter);
  app.use("/lessons", lessonRouter);
  app.use("/lesson-progress", progressRouter);

  app.use(errorHandler);

  return app;
}
