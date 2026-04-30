import { Router } from "express";
import paymentsController from "./paymentsController";
import catchAsync from "../../utils/catchAsync";

const router = Router();

router.post("/initiate", catchAsync(paymentsController.initiatePayment));
router.post("/webhook", catchAsync(paymentsController.webhookHandler));
router.get("/:reference/verify", catchAsync(paymentsController.verifyPayment));
router.get("/history/:userId", catchAsync(paymentsController.getHistory));

export default router;
