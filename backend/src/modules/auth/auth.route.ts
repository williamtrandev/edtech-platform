import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { UserRepository } from "../user/user.repository";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { createAuthSessionSchema } from "./auth.schema";
import { AuthService } from "./auth.service";

const userRepository = new UserRepository();
const authRepository = new AuthRepository(userRepository);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.use(authMiddleware);

authRouter.get("/current", asyncHandler(authController.getCurrentSession));
authRouter.post("/", validateRequest(createAuthSessionSchema), asyncHandler(authController.createSession));
