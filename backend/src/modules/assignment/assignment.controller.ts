import { Request, Response } from "express";
import { AssignmentService } from "./assignment.service";

export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  listCourseAssignments = async (req: Request, res: Response): Promise<void> => {
    const assignments = await this.assignmentService.listCourseAssignments(req.user, req.params.id);
    res.status(200).json({ success: true, data: assignments });
  };

  createCourseAssignment = async (req: Request, res: Response): Promise<void> => {
    const assignment = await this.assignmentService.createCourseAssignment(req.user, req.params.id, req.body);
    res.status(201).json({ success: true, data: assignment });
  };

  updateAssignment = async (req: Request, res: Response): Promise<void> => {
    const assignment = await this.assignmentService.updateAssignment(req.user, req.params.assignmentId, req.body);
    res.status(200).json({ success: true, data: assignment });
  };

  archiveAssignment = async (req: Request, res: Response): Promise<void> => {
    const assignment = await this.assignmentService.archiveAssignment(req.user, req.params.assignmentId);
    res.status(200).json({ success: true, data: assignment });
  };

  replaceAssignmentRubric = async (req: Request, res: Response): Promise<void> => {
    const assignment = await this.assignmentService.replaceAssignmentRubric(req.user, req.params.assignmentId, req.body.criteria);
    res.status(200).json({ success: true, data: assignment });
  };
}
