import { Router } from "express";
import { optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { ProblemController } from "./problem.controller";
import { ProblemRepository } from "./problem.repository";
import { ProblemService } from "./problem.service";
import { listProblemsSchema, problemSlugSchema } from "./problem.schema";

const problemService = new ProblemService(new ProblemRepository());
const problemController = new ProblemController(problemService);

export const problemRouter = Router();

// Browsing is deliberately open: the library is the way in for someone who has
// not signed up yet, so it must be readable and shareable without an account.
problemRouter.get("/", optionalAuthMiddleware, validateRequest(listProblemsSchema), asyncHandler(problemController.listProblems));
problemRouter.get("/:slug", optionalAuthMiddleware, validateRequest(problemSlugSchema), asyncHandler(problemController.getProblem));
