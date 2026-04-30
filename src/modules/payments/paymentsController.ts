import { Request, Response } from "express";
import { ApiResponseHandler } from "../../utils/response";
import PaymentsService from "./paymentsService";

// Controller for handling payment-related endpoints
/**
 * This controller manages payment operations
 *  such as initiating payments, handling webhooks,
 *  verifying payments,
 *  and retrieving payment history. 
 * It interacts with the PaymentsService to perform business logic and returns standardized API responses using ApiResponseHandler.
 */
const service = new PaymentsService();

// Initiate a payment for an assignment
const initiatePayment = async (req: Request, res: Response) => {
  const { assignmentId, amount, currency } = req.body;
  const userId = (req as any).user?.id;

  const result = await service.initiatePayment({ assignmentId, amount, currency, payerId: userId });

  return ApiResponseHandler.created(res, { payment: result.payment, checkoutUrl: result.checkoutUrl }, "Payment initiated");
};

// Handle payment provider webhooks
const webhookHandler = async (req: Request, res: Response) => {
  // Raw body expected; signature verification handled in service
  const payload = req.body;
  await service.handleWebhook(payload);
  return res.status(200).send('OK');
};

// Verify a payment by its reference
const verifyPayment = async (req: Request, res: Response) => {
  const { reference } = req.params;
  const result = await service.verifyPayment(reference);
  return ApiResponseHandler.success(res, { payment: result }, "Payment verification result");
};

// Get payment history for a user with pagination
const getHistory = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { items, total } = await service.getHistory(parseInt(userId), page, limit);
  return ApiResponseHandler.paginated(res, items, total, page, limit, "Payment history");
};

export default {
  initiatePayment,
  webhookHandler,
  verifyPayment,
  getHistory,
};
