import { Request, Response } from "express";
import { CourseReviewService } from "./course-review.service";

export class CourseReviewController {
  constructor(private readonly courseReviewService: CourseReviewService) {}

  listCourseReviews = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const reviews = await this.courseReviewService.listCourseReviews(req.user, req.params.id, page, limit);
    res.status(200).json({ success: true, data: reviews });
  };

  upsertMyReview = async (req: Request, res: Response): Promise<void> => {
    const review = await this.courseReviewService.upsertMyReview(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: review });
  };

  deleteMyReview = async (req: Request, res: Response): Promise<void> => {
    await this.courseReviewService.deleteMyReview(req.user, req.params.id);
    res.status(204).send();
  };
}
