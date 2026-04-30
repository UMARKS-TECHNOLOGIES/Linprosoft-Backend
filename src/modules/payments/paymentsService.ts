import PaymentsRepository from "./paymentsRepository";
import pool from "../../config/db";
import { AppError } from "../../utils/appError";

type InitiateInput = {
  assignmentId: number;
  amount: number; // smallest currency unit
  currency?: string;
  payerId?: number;
};

class PaymentsService {
  repo: PaymentsRepository;

  constructor() {
    this.repo = new PaymentsRepository(pool);
  }

  async initiatePayment(input: InitiateInput) {
    // Basic validation
    if (!input.assignmentId || !input.amount) throw new AppError("assignmentId and amount are required", 400);

    const providerReference = `payref_${Date.now()}`;

    const payment = await this.repo.createPendingPayment({
      assignment_id: input.assignmentId,
      payer_id: input.payerId || null,
      payee_id: null,
      amount_bigint: input.amount,
      currency: input.currency || 'NGN',
      provider: 'paystack',
      provider_reference: providerReference,
      provider_status: 'pending',
    });

    // In a real implementation, call provider to create checkout and return link
    const checkoutUrl = `https://sandbox.paystack.co/checkout/${providerReference}`;

    return { payment, checkoutUrl };
  }

  async verifyPayment(reference: string) {
    const payment = await this.repo.findByReference(reference);
    if (!payment) throw new AppError('Payment not found', 404);

    // Placeholder: call provider verify API if needed (omitted for skeleton)
    return payment;
  }

  async handleWebhook(payload: any) {
    // Persist webhook audit and perform idempotent processing
    await this.repo.persistWebhook({
      provider: 'paystack',
      event_type: payload.event || 'unknown',
      payload: payload,
      provider_reference: payload?.data?.reference || null,
    });

    // Simple example: if event is charge.success, mark payment paid
    if (payload?.event === 'charge.success') {
      const reference = payload.data.reference;
      const payment = await this.repo.findByReference(reference);
      if (payment && payment.provider_status !== 'paid') {
        await this.repo.updateStatus(reference, 'paid', new Date());
        // Update related job assignment payment_status is responsibility of repo
        await this.repo.markAssignmentPaid(payment.assignment_id);
      }
    }
  }

  async getHistory(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const items = await this.repo.findByUser(userId, limit, offset);
    const total = await this.repo.countByUser(userId);
    return { items, total };
  }
}

export default PaymentsService;
