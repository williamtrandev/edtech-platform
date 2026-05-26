import { Request, Response } from "express";
import { AssignmentSubmissionService } from "./assignment-submission.service";

export class AssignmentSubmissionController {
  constructor(private readonly assignmentSubmissionService: AssignmentSubmissionService) {}

  listAssignmentSubmissions = async (req: Request, res: Response): Promise<void> => {
    const submissions = await this.assignmentSubmissionService.listAssignmentSubmissions(
      req.user,
      req.params.assignmentId,
      Number(req.query.page ?? 1),
      Number(req.query.limit ?? 20)
    );
    res.status(200).json({ success: true, data: submissions });
  };

  submitAssignment = async (req: Request, res: Response): Promise<void> => {
    const submission = await this.assignmentSubmissionService.submitAssignment(req.user, req.params.assignmentId, req.body);
    res.status(200).json({ success: true, data: submission });
  };

  gradeSubmission = async (req: Request, res: Response): Promise<void> => {
    const submission = await this.assignmentSubmissionService.gradeSubmission(req.user, req.params.submissionId, req.body);
    res.status(200).json({ success: true, data: submission });
  };
}
