import cors from "cors";
import express from "express";
import { errorHandler } from "./common/middleware/error-handler";
import { authRouter } from "./modules/auth/auth.route";
import { userRouter } from "./modules/user/user.route";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/auth-sessions", authRouter);
  app.use("/users", userRouter);

  app.use(errorHandler);

  return app;
}
