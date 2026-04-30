import { Pool } from "pg";

class ReviewsRepository {
  db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async create(data: any) {
    const q = `
      INSERT INTO reviews(job_assignment_id, reviewer_id, reviewed_professional_id, rating, comment, is_anonymous, created_at, updated_at)
      VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const params = [data.job_assignment_id, data.reviewer_id, data.reviewed_professional_id, data.rating, data.comment, data.is_anonymous];
    const res = await this.db.query(q, params);
    return res.rows[0];
  }

  async findByProfessional(professionalId: number, limit: number, offset: number) {
    const q = `SELECT * FROM reviews WHERE reviewed_professional_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    const res = await this.db.query(q, [professionalId, limit, offset]);
    return res.rows;
  }

  async countByProfessional(professionalId: number) {
    const q = `SELECT COUNT(*)::int AS count FROM reviews WHERE reviewed_professional_id = $1`;
    const res = await this.db.query(q, [professionalId]);
    return parseInt(res.rows[0].count, 10) || 0;
  }

  async existsByAssignmentAndReviewer(assignmentId: number, reviewerId: number) {
    // Check that the reviewer is associated with the assignment and that status = 'completed'
    const q = `SELECT id FROM job_assignments WHERE id = $1 AND (employer_id = $2 OR professional_id = $2) AND status = 'completed' LIMIT 1`;
    const res = await this.db.query(q, [assignmentId, reviewerId]);
    return (res.rowCount || 0) > 0;
  }

  async findProfessionalIdByAssignment(assignmentId: number) {
    const q = `SELECT professional_id FROM job_assignments WHERE id = $1 LIMIT 1`;
    const res = await this.db.query(q, [assignmentId]);
    return res.rows[0]?.professional_id || null;
  }
}

export default ReviewsRepository;
