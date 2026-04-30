import { Pool } from "pg";

class PaymentsRepository {
  db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createPendingPayment(data: any) {
    const query = `
      INSERT INTO payments(
        assignment_id, payer_id, payee_id, amount_bigint, currency, provider, provider_reference, provider_status, commission_seller_percent, commission_buyer_percent, created_at, updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const params = [
      data.assignment_id,
      data.payer_id,
      data.payee_id,
      data.amount_bigint,
      data.currency,
      data.provider,
      data.provider_reference,
      data.provider_status,
      data.commission_seller_percent || 15.0,
      data.commission_buyer_percent || 1.0,
    ];

    const res = await this.db.query(query, params);
    return res.rows[0];
  }

  async findByReference(reference: string) {
    const res = await this.db.query(`SELECT * FROM payments WHERE provider_reference = $1 LIMIT 1`, [reference]);
    return res.rows[0] || null;
  }

  async updateStatus(reference: string, status: string, paidAt?: Date) {
    const res = await this.db.query(
      `UPDATE payments SET provider_status = $1, paid_at = $2, updated_at = CURRENT_TIMESTAMP WHERE provider_reference = $3 RETURNING *`,
      [status, paidAt || null, reference]
    );
    return res.rows[0];
  }

  async persistWebhook(payload: { provider: string; event_type: string; payload: any; provider_reference?: string }) {
    const q = `INSERT INTO payment_webhooks(provider, event_type, payload, provider_reference, received_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP) RETURNING *`;
    const res = await this.db.query(q, [payload.provider, payload.event_type, payload.payload, payload.provider_reference || null]);
    return res.rows[0];
  }

  async markAssignmentPaid(assignmentId: number) {
    if (!assignmentId) return;
    await this.db.query(`UPDATE job_assignments SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [assignmentId]);
  }

  async findByUser(userId: number, limit: number, offset: number) {
    const q = `SELECT * FROM payments WHERE payer_id = $1 OR payee_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    const res = await this.db.query(q, [userId, limit, offset]);
    return res.rows;
  }

  async countByUser(userId: number) {
    const q = `SELECT COUNT(*)::int as count FROM payments WHERE payer_id = $1 OR payee_id = $1`;
    const res = await this.db.query(q, [userId]);
    return parseInt(res.rows[0].count, 10) || 0;
  }
}

export default PaymentsRepository;
