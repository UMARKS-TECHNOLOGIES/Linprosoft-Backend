import { Request, Response } from "express";
import { ApiResponseHandler } from "../../utils/response";
import ReviewsService from "./reviewsService";

const service = new ReviewsService();

const createReview = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { jobAssignmentId, rating, comment, isAnonymous } = req.body;

  const review = await service.createReview({ jobAssignmentId, reviewerId: userId, rating, comment, isAnonymous });
  return ApiResponseHandler.created(res, { review }, "Review created");
};

const listReviews = async (req: Request, res: Response) => {
  const professionalId = parseInt(req.params.professionalId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { items, total } = await service.listReviews(professionalId, page, limit);
  return ApiResponseHandler.paginated(res, items, total, page, limit, "Reviews list");
};

export default {
  createReview,
  listReviews,
};
