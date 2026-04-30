import ReviewsRepository from "./reviewsRepository";
import pool from "../../config/db";
import { AppError } from "../../utils/appError";

type CreateReviewInput = {
  jobAssignmentId: number;
  reviewerId: number;
  rating: number;
  comment?: string;
  isAnonymous?: boolean;
};

class ReviewsService {
  repo: ReviewsRepository;

  constructor() {
    this.repo = new ReviewsRepository(pool);
  }

  async createReview(input: CreateReviewInput) {
    if (!input.jobAssignmentId || !input.reviewerId) throw new AppError('jobAssignmentId and reviewerId required', 400);
    if (input.rating < 1 || input.rating > 5) throw new AppError('rating must be between 1 and 5', 400);

    // Ensure job assignment is completed and reviewer is owner - placeholder checks
    const exists = await this.repo.existsByAssignmentAndReviewer(input.jobAssignmentId, input.reviewerId);
    if (!exists) throw new AppError('Reviewer is not allowed to review this assignment', 403);

    const review = await this.repo.create({
      job_assignment_id: input.jobAssignmentId,
      reviewer_id: input.reviewerId,
      reviewed_professional_id: await this.repo.findProfessionalIdByAssignment(input.jobAssignmentId),
      rating: input.rating,
      comment: input.comment || null,
      is_anonymous: !!input.isAnonymous,
    });

    return review;
  }

  async listReviews(professionalId: number, page = 1, limit = 20) {
    const offset = (page -1) * limit;
    const items = await this.repo.findByProfessional(professionalId, limit, offset);
    const total = await this.repo.countByProfessional(professionalId);
    return { items, total };
  }
}

export default ReviewsService;
