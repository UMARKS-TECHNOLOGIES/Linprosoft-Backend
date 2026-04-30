import ReviewsService from '../../modules/reviews/reviewsService';
import { AppError } from '../../utils/appError';

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(() => {
    service = new ReviewsService();
    service.repo = {
      existsByAssignmentAndReviewer: jest.fn().mockResolvedValue(true),
      findProfessionalIdByAssignment: jest.fn().mockResolvedValue(77),
      create: jest.fn().mockResolvedValue({ id: 1, rating: 5, comment: 'Great', reviewed_professional_id: 77 }),
      findByProfessional: jest.fn().mockResolvedValue([{ id: 1, rating: 5 }]),
      countByProfessional: jest.fn().mockResolvedValue(1),
    } as any;
  });

  it('creates a review when inputs are valid', async () => {
    const review = await service.createReview({ jobAssignmentId: 10, reviewerId: 5, rating: 5, comment: 'Nice', isAnonymous: false });
    expect(review).toBeDefined();
    expect((service.repo.create as jest.Mock).mock.calls.length).toBe(1);
  });

  it('throws when rating is out of range', async () => {
    await expect(service.createReview({ jobAssignmentId: 10, reviewerId: 5, rating: 6, comment: '', isAnonymous: false })).rejects.toThrow(AppError);
    await expect(service.createReview({ jobAssignmentId: 10, reviewerId: 5, rating: 0, comment: '', isAnonymous: false })).rejects.toThrow(AppError);
  });

  it('lists reviews with pagination', async () => {
    const { items, total } = await service.listReviews(77, 1, 10);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
