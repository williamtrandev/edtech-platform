import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { ProblemController } from "./problem.controller";
import { ProblemRepository } from "./problem.repository";
import { ProblemService } from "./problem.service";
import { CodeGradingService } from "../code-execution/code-grading.service";
import { listProblemsSchema, problemSlugSchema, runProblemSchema } from "./problem.schema";

const problemService = new ProblemService(new ProblemRepository(), new CodeGradingService());
const problemController = new ProblemController(problemService);

export const problemRouter = Router();

// Browsing is deliberately open: the library is the way in for someone who has
// not signed up yet, so it must be readable and shareable without an account.
problemRouter.get("/", optionalAuthMiddleware, validateRequest(listProblemsSchema), asyncHandler(problemController.listProblems));
problemRouter.get("/:slug", optionalAuthMiddleware, validateRequest(problemSlugSchema), asyncHandler(problemController.getProblem));

// Running costs sandbox capacity and a submission needs an owner, so both
// require a session even though reading does not.
problemRouter.post("/:slug/run", authMiddleware, validateRequest(runProblemSchema), asyncHandler(problemController.runProblem));
problemRouter.post("/:slug/submit", authMiddleware, validateRequest(runProblemSchema), asyncHandler(problemController.submitProblem));
problemRouter.get("/:slug/submissions", authMiddleware, validateRequest(problemSlugSchema), asyncHandler(problemController.listSubmissions));
