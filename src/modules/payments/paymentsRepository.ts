import { Pool, PoolClient } from "pg";
import { AppError } from "../../utils/appError";

class PaymentsRepository {
  db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createPendingPayment(data: any) {
    const query = `
      INSERT INTO payments(
        job_assignment_id, payer_id, payee_id, amount_bigint, currency, provider, provider_reference, provider_status, status, admin_approval_status, employer_approval_status, commission_seller_percent, commission_buyer_percent, pending_admin_review_at, created_at, updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const params = [
      data.job_assignment_id, // ✅ Fixed: was assignment_id
      data.payer_id,
      data.payee_id,
      data.amount_bigint,
      data.currency,
      data.provider,
      data.provider_reference,
      data.provider_status,
      'pending_payment', // ✅ New: Initial payment status
      'pending', // ✅ New: Admin approval starts as pending
      'pending_review', // ✅ New: Employer satisfaction approval starts as pending
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

  async updatePaymentStatus(reference: string, status: string, adminApprovalStatus?: string, pendingAdminReviewAt?: Date) {
    /**
     * ✅ Updated to handle new payment state machine (Phase 4 MVP)
     * Updates: status, admin_approval_status if provided, pending_admin_review_at for webhook time
     */
    let query = `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [status];
    let paramIndex = 2;

    if (adminApprovalStatus) {
      query += `, admin_approval_status = $${paramIndex}`;
      params.push(adminApprovalStatus);
      paramIndex++;
    }

    if (pendingAdminReviewAt) {
      query += `, pending_admin_review_at = $${paramIndex}`;
      params.push(pendingAdminReviewAt);
      paramIndex++;
    }

    query += ` WHERE provider_reference = $${paramIndex} RETURNING *`;
    params.push(reference);
    const res = await this.db.query(query, params);
    return res.rows[0];
  }

  async persistWebhook(payload: { provider: string; event_type: string; payload: any; provider_reference?: string }) {
    const q = `INSERT INTO payment_webhooks(provider, event_type, payload, provider_reference, received_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP) RETURNING *`;
    const res = await this.db.query(q, [payload.provider, payload.event_type, payload.payload, payload.provider_reference || null]);
    return res.rows[0];
  }

  async updateAssignmentPaymentStatus(assignmentId: number, paymentStatus: string) {
    /**
     * ✅ Updated to use new payment_status field from migration 005
     * paymentStatus should be one of: pending|pending_approval|funded|released|refunded
     * 
     * NOTE: This should NOT be called at webhook time.
     * Only call when:
     * - Admin approves payment (→ funded)
     * - Employer approves satisfaction (→ released)
     * - Payment rejected (→ refunded)
     */
    if (!assignmentId) return null;
    const res = await this.db.query(
      `UPDATE job_assignments SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [paymentStatus, assignmentId]
    );
    return res.rows[0];
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

  async updateSatisfactionStatus(assignmentId: number, satisfactionStatus: string) {
    /**
     * ✅ New method for Phase C (employer satisfaction approval)
     * satisfactionStatus should be one of: pending_review|satisfied|disputed
     */
    if (!assignmentId) return null;
    const res = await this.db.query(
      `UPDATE job_assignments SET satisfaction_status = $1, employer_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [satisfactionStatus, assignmentId]
    );
    return res.rows[0];
  }

  async getPaymentWithAssignment(paymentId: number) {
    /**
     * ✅ Helper to fetch payment with related assignment for validation
     */
    const q = `
      SELECT p.*, ja.payment_status, ja.satisfaction_status
      FROM payments p
      LEFT JOIN job_assignments ja ON p.job_assignment_id = ja.id
      WHERE p.id = $1
    `;
    const res = await this.db.query(q, [paymentId]);
    return res.rows[0] || null;
  }

  async findPendingAdminApprovals(limit: number, offset: number) {
    const q = `
      SELECT
        p.*,
        ja.status AS assignment_status,
        ja.payment_status AS assignment_payment_status,
        employer.id AS employer_id,
        employer.first_name AS employer_first_name,
        employer.last_name AS employer_last_name,
        employer.email AS employer_email,
        professional_user.id AS professional_user_id,
        professional_user.first_name AS professional_first_name,
        professional_user.last_name AS professional_last_name,
        professional_user.email AS professional_email,
        professional_profile.avg_rating AS professional_avg_rating,
        professional_profile.total_reviews AS professional_total_reviews
      FROM payments p
      LEFT JOIN job_assignments ja ON ja.id = p.job_assignment_id
      LEFT JOIN users employer ON employer.id = p.payer_id
      LEFT JOIN professional_profiles professional_profile ON professional_profile.id = ja.professional_id
      LEFT JOIN users professional_user ON professional_user.id = professional_profile.user_id
      WHERE p.status = 'pending_admin_approval'
        AND p.admin_approval_status = 'pending'
      ORDER BY p.pending_admin_review_at ASC NULLS LAST, p.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    const res = await this.db.query(q, [limit, offset]);
    return res.rows;
  }

  async countPendingAdminApprovals() {
    const q = `
      SELECT COUNT(*)::int AS count
      FROM payments
      WHERE status = 'pending_admin_approval'
        AND admin_approval_status = 'pending'
    `;
    const res = await this.db.query(q);
    return parseInt(res.rows[0].count, 10) || 0;
  }

  async approvePaymentByAdmin(paymentId: number, adminId: number, notes?: string) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");

      const payment = await this.lockPendingAdminPayment(client, paymentId);

      const updatedPaymentResult = await client.query(
        `
          UPDATE payments
          SET status = 'held_in_escrow',
              admin_approval_status = 'approved',
              admin_approved_at = CURRENT_TIMESTAMP,
              admin_approved_by = $2,
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'admin_approval_notes', $3::text
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `,
        [paymentId, adminId, notes || null]
      );

      await client.query(
        `
          UPDATE job_assignments
          SET payment_status = 'funded',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [payment.job_assignment_id]
      );

      await client.query("COMMIT");
      return updatedPaymentResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectPaymentByAdmin(paymentId: number, adminId: number, reason: string, notes?: string) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");

      const payment = await this.lockPendingAdminPayment(client, paymentId);

      const updatedPaymentResult = await client.query(
        `
          UPDATE payments
          SET status = 'payment_rejected',
              admin_approval_status = 'rejected',
              admin_rejected_at = CURRENT_TIMESTAMP,
              admin_rejected_by = $2,
              admin_rejection_reason = $3,
              refunded_at = CURRENT_TIMESTAMP,
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'admin_rejection_notes', $4::text,
                'refund_status', 'queued'
              ),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `,
        [paymentId, adminId, reason, notes || null]
      );

      await client.query(
        `
          UPDATE job_assignments
          SET payment_status = 'refunded',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [payment.job_assignment_id]
      );

      await client.query("COMMIT");
      return updatedPaymentResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockPendingAdminPayment(client: PoolClient, paymentId: number) {
    const paymentResult = await client.query(
      `
        SELECT *
        FROM payments
        WHERE id = $1
        FOR UPDATE
      `,
      [paymentId]
    );

    const payment = paymentResult.rows[0];
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== "pending_admin_approval" || payment.admin_approval_status !== "pending") {
      throw new AppError("Payment is not pending admin approval", 409);
    }

    return payment;
  }
}

export default PaymentsRepository;
