import ReviewsRepository from '../../modules/reviews/reviewsRepository';
import { Pool } from 'pg';

describe('ReviewsRepository', () => {
  let repo: ReviewsRepository;
  let mockDb: Partial<Pool>;

  beforeEach(() => {
    mockDb = { query: jest.fn() } as any;
    repo = new ReviewsRepository(mockDb as Pool);
  });

  it('creates a review with parameterized query', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const row = await repo.create({ job_assignment_id: 10, reviewer_id: 5, reviewed_professional_id: 7, rating: 5, comment: 'Good', is_anonymous: false });
    expect(row).toEqual({ id: 1 });
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
  });

  it('finds reviews by professional', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const rows = await repo.findByProfessional(7, 10, 0);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('counts reviews for professional', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '3' }] });
    const count = await repo.countByProfessional(7);
    expect(count).toBe(3);
  });

  it('checks existence of reviewer and completed assignment', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 });
    const exists = await repo.existsByAssignmentAndReviewer(10, 5);
    expect(exists).toBe(true);
  });

  it('finds professional id by assignment', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ professional_id: 77 }] });
    const pid = await repo.findProfessionalIdByAssignment(10);
    expect(pid).toBe(77);
  });
});
