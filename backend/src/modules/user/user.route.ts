import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { createUserSchema, listUsersSchema, updateUserSchema, userIdParamSchema } from "./user.schema";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/me", asyncHandler(userController.getMe));
userRouter.get("/", validateRequest(listUsersSchema), asyncHandler(userController.listUsers));
userRouter.get("/:id", validateRequest(userIdParamSchema), asyncHandler(userController.getUserById));
userRouter.post("/", validateRequest(createUserSchema), asyncHandler(userController.createUser));
userRouter.put("/:id", validateRequest(updateUserSchema), asyncHandler(userController.updateUser));
userRouter.delete("/:id", validateRequest(userIdParamSchema), asyncHandler(userController.deleteUser));
