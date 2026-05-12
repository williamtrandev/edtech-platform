import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseController } from "./course.controller";
import { CourseRepository } from "./course.repository";
import { CourseService } from "./course.service";
import { courseIdParamSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.schema";

const courseRepository = new CourseRepository();
const courseService = new CourseService(courseRepository);
const courseController = new CourseController(courseService);

export const courseRouter = Router();

courseRouter.use(authMiddleware);

courseRouter.get("/", validateRequest(listCoursesSchema), asyncHandler(courseController.listCourses));
courseRouter.get("/:id", validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseById));
courseRouter.post("/", validateRequest(createCourseSchema), asyncHandler(courseController.createCourse));
courseRouter.put("/:id", validateRequest(updateCourseSchema), asyncHandler(courseController.updateCourse));
