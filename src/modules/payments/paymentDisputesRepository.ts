import { Pool } from 'pg';

class PaymentDisputesRepository {
  db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createDispute(data: {
    job_assignment_id: number;
    initiator_id: number;
    reason: string;
    notes?: string;
  }) {
    // Try to attach a payment if present for this assignment
    const paymentRes = await this.db.query(`SELECT id, provider_reference FROM payments WHERE job_assignment_id = $1 LIMIT 1`, [data.job_assignment_id]);
    const payment = paymentRes.rows[0] || null;

    const q = `
      INSERT INTO payment_disputes(payment_id, job_assignment_id, initiator_id, reason, notes, status, created_at, updated_at)
      VALUES($1,$2,$3,$4,$5,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const params = [payment ? payment.id : null, data.job_assignment_id, data.initiator_id, data.reason, data.notes || null];
    const res = await this.db.query(q, params);
    return res.rows[0];
  }

  async findPendingDisputes(limit: number, offset: number) {
    const q = `
      SELECT pd.*, p.provider_reference, ja.status AS assignment_status, ja.satisfaction_status
      FROM payment_disputes pd
      LEFT JOIN payments p ON p.id = pd.payment_id
      LEFT JOIN job_assignments ja ON ja.id = pd.job_assignment_id
      WHERE pd.status = 'pending'
      ORDER BY pd.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    const res = await this.db.query(q, [limit, offset]);
    return res.rows;
  }

  async getDisputeById(disputeId: number) {
    const q = `SELECT pd.*, p.provider_reference FROM payment_disputes pd LEFT JOIN payments p ON p.id = pd.payment_id WHERE pd.id = $1 LIMIT 1`;
    const res = await this.db.query(q, [disputeId]);
    return res.rows[0] || null;
  }

  async resolveDispute(disputeId: number, adminId: number, resolution: 'resolved' | 'rejected', notes?: string) {
    const q = `
      UPDATE payment_disputes
      SET status = $2,
          admin_resolved_by = $3,
          admin_resolved_at = CURRENT_TIMESTAMP,
          admin_resolution_notes = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const res = await this.db.query(q, [disputeId, resolution, adminId, notes || null]);
    return res.rows[0];
  }
}

export default PaymentDisputesRepository;
