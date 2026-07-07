import { Request, Response } from "express";
import { ApiResponseHandler } from "../../utils/response";
import PaymentsService from "./paymentsService";

// Controller for handling payment-related endpoints
/**
 * This controller manages payment operations
 * such as initiating payments, handling webhooks,
 * verifying payments,
 * and retrieving payment history. 
 * It interacts with the PaymentsService to perform business logic and returns standardized API responses using ApiResponseHandler.
 */
const createService = () => new PaymentsService();

/**
 * ✅ Initiate Payment
 * Employer initiates payment for an accepted assignment
 * Validates ownership, derives payer/payee, calculates commission, calls Paystack
 */
const initiatePayment = async (req: Request, res: Response) => {
  const { assignmentId, currency } = req.body;
  const employerId = (req as any).user?.id;

  if (!employerId) {
    return ApiResponseHandler.error(res, "authentication_error", "User not authenticated", 401);
  }

  const result = await createService().initiatePayment({
    assignmentId: Number(assignmentId),
    employerId,
    currency
  });

  return ApiResponseHandler.created(
    res,
    result,
    "Payment initiated - customer can now proceed to checkout"
  );
};

/**
 * ✅ Webhook Handler
 * Paystack calls this endpoint to notify about payment events
 * Verifies signature, verifies transaction, moves payment to pending_admin_approval
 * 
 * Requires:
 * - x-paystack-signature header for verification
 * - Raw body for signature verification
 */
const webhookHandler = async (req: Request, res: Response) => {
  try {
    // Get signature from header
    const signature = req.headers["x-paystack-signature"] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing webhook signature" });
    }

    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const payload = req.body;

    // Process webhook - will verify signature, transaction, move to pending_admin_approval
    await createService().handleWebhook(payload, signature, rawBody);

    // Always return 200 OK immediately (Paystack needs quick response)
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    // Log but always return 200 so Paystack doesn't retry
    console.error("Webhook handler error:", error.message);
    return res.status(200).json({ ok: true, logged_error: error.message });
  }
};

/**
 * ✅ Verify Payment
 * Check payment status by reference
 * Employer/professional can verify their own payments
 */
const verifyPayment = async (req: Request, res: Response) => {
  const { reference } = req.params;
  const authUser = (req as any).user;
  if (!authUser) {
    return ApiResponseHandler.error(res, "authentication_error", "User not authenticated", 401);
  }

  // Allow admins to view any payment; others only their own
  try {
    let result;
    if (authUser.role === "admin") {
      result = await createService().verifyPayment(reference);
    } else {
      result = await createService().verifyPayment(reference, authUser.id);
    }

    return ApiResponseHandler.success(
      res,
      { payment: result },
      "Payment details retrieved"
    );
  } catch (err: any) {
    return ApiResponseHandler.error(res, "internal_error", err.message || "Unauthorized", err.status || 403);
  }
};

/**
 * Get Payment History
 * Returns paginated payment history for the user (payer or payee)
 */
const getHistory = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const authUser = (req as any).user;
  if (!authUser) return ApiResponseHandler.error(res, "authentication_error", "User not authenticated", 401);

  const requestedUserId = parseInt(userId, 10);
  if (isNaN(requestedUserId)) return ApiResponseHandler.error(res, "invalid_input", "Invalid user id", 400);

  // Only admins or the owner may fetch history for a user
  if (authUser.role !== "admin" && authUser.id !== requestedUserId) {
    return ApiResponseHandler.error(res, "forbidden", "Forbidden", 403);
  }

  const { items, total } = await createService().getHistory(requestedUserId, page, limit);
  return ApiResponseHandler.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Payment history retrieved"
  );
};

const listPendingAdminApprovals = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const { items, total } = await createService().listPendingAdminApprovals(page, limit);

  return ApiResponseHandler.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Payments pending admin approval retrieved"
  );
};

const listPendingDisputes = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { items, total } = await createService().listPendingDisputes(page, limit);
  return ApiResponseHandler.paginated(res, items, total, page, limit, 'Pending disputes retrieved');
};

const getDisputeById = async (req: Request, res: Response) => {
  const disputeId = Number(req.params.disputeId || req.params.id);
  const dispute = await createService().getDisputeById(disputeId);
  return ApiResponseHandler.success(res, dispute, 'Dispute retrieved');
};

const resolveDisputeByAdmin = async (req: Request, res: Response) => {
  const disputeId = Number(req.params.disputeId);
  const adminId = (req as any).user?.id;
  const { resolution, notes } = req.body;

  const result = await createService().resolveDisputeByAdmin(disputeId, adminId, resolution, notes);
  return ApiResponseHandler.success(res, result, 'Dispute resolved by admin');
};

const approvePaymentByAdmin = async (req: Request, res: Response) => {
  const paymentId = Number(req.params.paymentId);
  const adminId = (req as any).user?.id;
  const { notes } = req.body;

  const result = await createService().approvePaymentByAdmin(paymentId, adminId, notes);

  return ApiResponseHandler.success(
    res,
    result,
    "Payment approved and moved to escrow"
  );
};

const rejectPaymentByAdmin = async (req: Request, res: Response) => {
  const paymentId = Number(req.params.paymentId);
  const adminId = (req as any).user?.id;
  const { reason, notes } = req.body;

  const result = await createService().rejectPaymentByAdmin(paymentId, adminId, reason, notes);

  return ApiResponseHandler.success(
    res,
    result,
    "Payment rejected and assignment marked refunded"
  );
};

export default {
  initiatePayment,
  webhookHandler,
  verifyPayment,
  getHistory,
  listPendingAdminApprovals,
  listPendingDisputes,
  getDisputeById,
  resolveDisputeByAdmin,
  approvePaymentByAdmin,
  rejectPaymentByAdmin,
};
