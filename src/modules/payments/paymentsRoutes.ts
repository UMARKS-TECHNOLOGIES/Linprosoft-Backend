import { Router } from "express";
import paymentsController from "./paymentsController";
import catchAsync from "../../utils/catchAsync";
//Adding protection to the payment routes
import { authorize, protect } from "../../middleware/authMiddleware";

const router = Router();

/**
 * Only employers can initiate payments for assignments


 */
router.post("/initiate", protect, authorize('employer'), catchAsync(paymentsController.initiatePayment)); 
/**
 * Payment providers will send webhooks to this endpoint to notify about payment events (e.g., payment completed, failed, etc.).    
 * Webhooks are called by payment providers, so we don't protect this route with authentication. Instead, the service will verify 
 * the webhook signature to ensure it's from a trusted source.
 */
router.post("/webhook",  catchAsync(paymentsController.webhookHandler)); 


/**
 * //Both employers and professionals can verify payment status, but they must be authenticated to do so.
 *  The service will also check that the user is either the payer or payee of the payment for added security.
 *
 */
router.get("/:reference/verify", protect,  catchAsync(paymentsController.verifyPayment)); 



/**Users and Administrators can view their own payment history, so we protect this route.
 *  The service will ensure that the userId in the params matches the authenticated user's ID 
 * or that the user is involved in the payment history being requested.
 * **/

router.get("/history/:userId", protect,  catchAsync(paymentsController.getHistory));
export default router;
