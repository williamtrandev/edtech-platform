import { Request, Response } from "express";
import { CodeRunService } from "./code-run.service";

export class CodeRunController {
  constructor(private readonly codeRunService: CodeRunService) {}

  runCode = async (req: Request, res: Response): Promise<void> => {
    const result = await this.codeRunService.runQuestionCode(req.user, req.params.questionId, req.body.code);
    res.status(200).json({ success: true, data: result });
  };

  runLessonCode = async (req: Request, res: Response): Promise<void> => {
    const result = await this.codeRunService.runLessonCode(req.user, req.params.lessonId, req.body.code);
    res.status(200).json({ success: true, data: result });
  };
}
