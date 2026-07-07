import PaymentsRepository from "./paymentsRepository";
import PaystackService from "./paystackService";
import pool from "../../config/db";
import { AppError } from "../../utils/appError";
import { findAssignmentById } from "../assignments/assignmentRepository";
import PaymentDisputesRepository from './paymentDisputesRepository';

type InitiatePaymentInput = {
  assignmentId: number;
  employerId: number; // Employer initiating payment
  currency?: string;
};

type WebhookPayload = {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    customer?: {
      email: string;
    };
    paid_at?: string;
  };
};

const ADMIN_APPROVABLE_STATUS = "pending_admin_approval";

/**
 * Commission Configuration for Phase 4 MVP
 * Deducted from employer payment (payer), added to payee (professional)
 * Example: If job budget = 100,000 NGK (in kobo)
 *   - Employer pays: 100,000 + 1,000 (1% commission) = 101,000
 *   - Professional receives: 100,000 - 15,000 (15% seller fee) = 85,000
 *   - Linkprosoft gets: 1,000 (buyer fee) + 15,000 (seller fee) = 16,000
 */
const COMMISSION_CONFIG = {
  buyer_percent: 1.0, // Percentage added to employer payment
  seller_percent: 15.0, // Percentage deducted from professional payout
};

class PaymentsService {
  repo: PaymentsRepository;

  constructor() {
    this.repo = new PaymentsRepository(pool);
  }

  /**
   * ✅ Phase 4 MVP: Initiate Payment
   *
   * Flow:
   * 1. Validate employer owns the assignment
   * 2. Fetch assignment to get professional_id and budget
   * 3. Calculate commission
   * 4. Call Paystack to initialize transaction
   * 5. Create pending_payment record in DB
   * 6. Return checkout URL
   */
  async initiatePayment(input: InitiatePaymentInput) {
    // 1. Validate input
    if (!input.assignmentId || !input.employerId) {
      throw new AppError("assignmentId and employerId are required", 400);
    }

    // 2. Fetch assignment with validation
    const assignment = await findAssignmentById(input.assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404);
    }

    // 3. Validate employer ownership
    if (assignment.employer_id !== input.employerId) {
      throw new AppError("Only the employer can initiate payment for this assignment", 403);
    }

    // 4. Validate assignment status (must be accepted to allow payment)
    if (!["accepted", "in_progress", "completed"].includes(assignment.status)) {
      throw new AppError(`Cannot create payment for assignment in ${assignment.status} status`, 400);
    }

    // 5. Get budget amount (use accepted_budget if available, else return error)
    const budgetAmount = Number(assignment.accepted_budget);
    if (!budgetAmount || budgetAmount <= 0) {
      throw new AppError("Assignment budget must be set before initiating payment", 400);
    }

    // 6. Fetch employer email for Paystack
    const employerRes = await pool.query("SELECT email FROM users WHERE id = $1", [input.employerId]);
    const employer = employerRes.rows[0];
    if (!employer) {
      throw new AppError("Employer not found", 404);
    }

    const professionalRes = await pool.query(
      "SELECT user_id FROM professional_profiles WHERE id = $1",
      [assignment.professional_id]
    );
    const professional = professionalRes.rows[0];
    if (!professional) {
      throw new AppError("Professional profile not found", 404);
    }

    // 7. Calculate amounts
    const budgetInKobo = Math.round(budgetAmount * 100); // Convert to kobo (smallest unit)
    const buyerCommissionKobo = Math.round(budgetInKobo * (COMMISSION_CONFIG.buyer_percent / 100));
    const totalAmountKobo = budgetInKobo + buyerCommissionKobo;

    // 8. Generate unique reference
    const providerReference = `payref_${Date.now()}_${input.assignmentId}`;

    // 9. Initialize Paystack transaction
    let paystackData;
    try {
      paystackData = await PaystackService.initializeTransaction({
        email: employer.email,
        amount: totalAmountKobo,
        reference: providerReference,
        metadata: {
          assignmentId: input.assignmentId,
          jobAssignmentId: input.assignmentId,
          employerId: input.employerId,
          professionalId: assignment.professional_id,
          budgetAmount,
        },
      });
    } catch (error) {
      throw error; // Paystack errors already wrapped
    }

    // 10. Create payment record in DB
    const payment = await this.repo.createPendingPayment({
      job_assignment_id: input.assignmentId,
      payer_id: input.employerId, // Employer pays
      payee_id: professional.user_id, // Professional user receives
      amount_bigint: totalAmountKobo,
      currency: input.currency || "NGN",
      provider: "paystack",
      provider_reference: providerReference,
      provider_status: "pending",
      commission_seller_percent: COMMISSION_CONFIG.seller_percent,
      commission_buyer_percent: COMMISSION_CONFIG.buyer_percent,
    });

    // 11. Return payment and checkout URL
    return {
      payment,
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
      amount_payable_kobo: totalAmountKobo,
      amount_payable_naira: (totalAmountKobo / 100).toFixed(2),
    };
  }

  /**
   * ✅ Phase 4 MVP: Verify Payment
   *
   * Allows employer/professional to check payment status
   * (Detailed verification happens in webhook for security)
   */
  async verifyPayment(reference: string, userId?: number) {
    const payment = await this.repo.findByReference(reference);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    // Optional: Check if user owns the payment
    if (userId && payment.payer_id !== userId && payment.payee_id !== userId) {
      throw new AppError("You do not have access to this payment", 403);
    }

    return payment;
  }

  /**
   * ✅ Phase 4 MVP: Webhook Handler
   *
   * Flow:
   * 1. Verify webhook signature (x-paystack-signature)
   * 2. Persist webhook payload for audit
   * 3. Verify transaction details with Paystack API
   * 4. Move payment to pending_admin_approval status
   * 5. Set pending_admin_review_at timestamp
   * 6. Return 200 OK immediately (async processing)
   *
   * ⚠️ IMPORTANT:
   * - Do NOT update job_assignments.payment_status yet
   * - Do NOT mark funds as escrow yet
   * - Admin must approve payment first
   * - Professional cannot start work until admin approves
   */
  async handleWebhook(payload: WebhookPayload, signature: string, rawBody: string) {
    // 1. Verify webhook signature
    const isValid = PaystackService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new AppError("Invalid webhook signature", 401);
    }

    // 2. Persist webhook for audit trail
    await this.repo.persistWebhook({
      provider: "paystack",
      event_type: payload.event || "unknown",
      payload: payload,
      provider_reference: payload?.data?.reference,
    });

    // 3. Only process charge.success events
    if (payload?.event !== "charge.success") {
      // Webhook processed but no action taken for non-charge events
      return { processed: true, action: "logged" };
    }

    const reference = payload.data?.reference;
    if (!reference) {
      throw new AppError("Invalid webhook payload: missing reference", 400);
    }

    // 4. Find existing payment
    const payment = await this.repo.findByReference(reference);
    if (!payment) {
      throw new AppError(`Payment not found for reference: ${reference}`, 404);
    }

    // 5. Prevent duplicate processing (idempotency check)
    if (payment.status === "pending_admin_approval" || payment.status === "held_in_escrow") {
      // Already processed this webhook
      return { processed: true, action: "duplicate_prevented" };
    }

    // 6. Verify transaction with Paystack API
    let transactionDetails;
    try {
      transactionDetails = await PaystackService.verifyTransaction(reference);
    } catch (error) {
      // Log error but continue (webhook will retry)
      console.error("Paystack verification failed:", error);
      throw error;
    }

    // 7. Validate transaction status
    if (transactionDetails.status !== "success") {
      // Payment not successful, update to payment_rejected
      await this.repo.updatePaymentStatus(reference, "payment_rejected", "rejected");
      return { processed: true, action: "payment_failed" };
    }

    // 8. Validate amount matches
    if (transactionDetails.amount !== payment.amount_bigint) {
      console.error(
        `Amount mismatch for ${reference}: expected ${payment.amount_bigint}, got ${transactionDetails.amount}`
      );
      await this.repo.updatePaymentStatus(reference, "payment_rejected", "rejected");
      throw new AppError("Payment amount mismatch - payment rejected", 400);
    }

    // 9. ✅ Move to pending_admin_approval (ADMIN GATE - MVP Requirement)
    const updatedPayment = await this.repo.updatePaymentStatus(
      reference,
      "pending_admin_approval", // Waiting for admin approval
      "pending", // admin_approval_status
      new Date() // pending_admin_review_at
    );

    // 10. ⚠️ DO NOT update job_assignments.payment_status yet
    // This is critical for Phase 4 MVP - admin must approve first
    // Professional cannot start work until admin approves

    // 11. Queue notification to admin dashboard (async)
    // TODO: Implement admin notification job

    return {
      processed: true,
      action: "moved_to_pending_approval",
      payment: updatedPayment,
    };
  }

  async getHistory(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const items = await this.repo.findByUser(userId, limit, offset);
    const total = await this.repo.countByUser(userId);
    return { items, total };
  }

  async listPendingAdminApprovals(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const items = await this.repo.findPendingAdminApprovals(limit, offset);
    const total = await this.repo.countPendingAdminApprovals();
    return { items, total };
  }

  async approvePaymentByAdmin(paymentId: number, adminId?: number, notes?: string) {
    if (!paymentId) {
      throw new AppError("paymentId is required", 400);
    }

    if (!adminId) {
      throw new AppError("Admin authentication is required", 401);
    }

    const payment = await this.repo.getPaymentWithAssignment(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== ADMIN_APPROVABLE_STATUS || payment.admin_approval_status !== "pending") {
      throw new AppError("Payment is not pending admin approval", 409);
    }

    const approvedPayment = await this.repo.approvePaymentByAdmin(paymentId, adminId, notes);

    return {
      paymentId: approvedPayment.id,
      status: approvedPayment.status,
      adminApprovalStatus: approvedPayment.admin_approval_status,
      approvedAt: approvedPayment.admin_approved_at,
      approvedBy: approvedPayment.admin_approved_by,
      assignmentId: approvedPayment.job_assignment_id,
      assignmentPaymentStatus: "funded",
    };
  }

  async rejectPaymentByAdmin(paymentId: number, adminId?: number, reason?: string, notes?: string) {
    if (!paymentId) {
      throw new AppError("paymentId is required", 400);
    }

    if (!adminId) {
      throw new AppError("Admin authentication is required", 401);
    }

    if (!reason?.trim()) {
      throw new AppError("Rejection reason is required", 400);
    }

    const payment = await this.repo.getPaymentWithAssignment(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== ADMIN_APPROVABLE_STATUS || payment.admin_approval_status !== "pending") {
      throw new AppError("Payment is not pending admin approval", 409);
    }

    const rejectedPayment = await this.repo.rejectPaymentByAdmin(
      paymentId,
      adminId,
      reason.trim(),
      notes
    );

    // Attempt to perform refund via Paystack (best-effort). If refund fails, it remains queued in metadata.
    let refundQueued = true;
    try {
      if (rejectedPayment && rejectedPayment.provider_reference) {
        await PaystackService.refundTransaction(rejectedPayment.provider_reference, reason.trim());
        refundQueued = true;
      }
    } catch (err: any) {
      // Log the error and keep refund queued status in metadata
      console.error("Failed to perform immediate refund via Paystack:", err?.message || err);
      refundQueued = false;
    }

    return {
      paymentId: rejectedPayment.id,
      status: rejectedPayment.status,
      adminApprovalStatus: rejectedPayment.admin_approval_status,
      rejectedAt: rejectedPayment.admin_rejected_at,
      rejectedBy: rejectedPayment.admin_rejected_by,
      rejectionReason: rejectedPayment.admin_rejection_reason,
      assignmentId: rejectedPayment.job_assignment_id,
      assignmentPaymentStatus: "refunded",
      refundQueued,
    };
  }

  // Disputes: admin listing and resolution
  async listPendingDisputes(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const disputesRepo = new PaymentDisputesRepository(pool);
    const items = await disputesRepo.findPendingDisputes(limit, offset);
    // total not implemented in repo; using items.length as approximation
    const total = items.length;
    return { items, total };
  }

  async getDisputeById(disputeId: number) {
    const disputesRepo = new PaymentDisputesRepository(pool);
    const d = await disputesRepo.getDisputeById(disputeId);
    if (!d) throw new AppError('Dispute not found', 404);
    return d;
  }

  async resolveDisputeByAdmin(disputeId: number, adminId?: number, resolution: 'employer' | 'professional' = 'professional', notes?: string) {
    if (!adminId) throw new AppError('Admin authentication is required', 401);

    const disputesRepo = new PaymentDisputesRepository(pool);
    const dispute = await disputesRepo.getDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found', 404);
    if (dispute.status !== 'pending') throw new AppError('Dispute already processed', 409);

    // If dispute has an associated payment, take action
    if (dispute.payment_id) {
      // If resolution favors employer -> reject payment (refund)
      if (resolution === 'employer') {
        // best-effort: call repository reject flow
        try {
          await this.repo.rejectPaymentByAdmin(dispute.payment_id, adminId, notes || 'Resolved in favor of employer', notes);
        } catch (err) {
          console.error('Error rejecting payment during dispute resolution', err);
        }
      } else {
        // resolution favors professional -> approve payment
        try {
          await this.repo.approvePaymentByAdmin(dispute.payment_id, adminId, notes || 'Resolved in favor of professional');
        } catch (err) {
          console.error('Error approving payment during dispute resolution', err);
        }
      }
    }

    const updated = await disputesRepo.resolveDispute(disputeId, adminId, resolution === 'employer' ? 'resolved' : 'rejected', notes);
    return updated;
  }
}
export default PaymentsService;