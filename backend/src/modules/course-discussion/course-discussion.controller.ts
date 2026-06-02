import { Request, Response } from "express";
import { CourseDiscussionService } from "./course-discussion.service";

export class CourseDiscussionController {
  constructor(private readonly courseDiscussionService: CourseDiscussionService) {}

  listComments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const lessonId = typeof req.query.lessonId === "string" ? req.query.lessonId : undefined;
    const comments = await this.courseDiscussionService.listComments(req.user, req.params.id, lessonId, page, limit);
    res.status(200).json({ success: true, data: comments });
  };

  createComment = async (req: Request, res: Response): Promise<void> => {
    const comment = await this.courseDiscussionService.createComment(req.user, req.params.id, req.body);
    res.status(201).json({ success: true, data: comment });
  };

  deleteComment = async (req: Request, res: Response): Promise<void> => {
    await this.courseDiscussionService.deleteComment(req.user, req.params.id, req.params.commentId);
    res.status(204).send();
  };
}
