import { Request, Response } from "express";
import { ProblemDifficulty } from "@prisma/client";
import { ProblemService } from "./problem.service";

export class ProblemController {
  constructor(private readonly problemService: ProblemService) {}

  listProblems = async (req: Request, res: Response): Promise<void> => {
    const problems = await this.problemService.listProblems(req.user, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      track: typeof req.query.track === "string" ? req.query.track : undefined,
      difficulty: req.query.difficulty as ProblemDifficulty | undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined
    });
    res.status(200).json({ success: true, data: problems });
  };

  getProblem = async (req: Request, res: Response): Promise<void> => {
    const problem = await this.problemService.getProblem(req.params.slug);
    res.status(200).json({ success: true, data: problem });
  };
}
