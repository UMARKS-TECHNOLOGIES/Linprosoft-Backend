import { Router } from "express";
import paymentsController from "./paymentsController";
import catchAsync from "../../utils/catchAsync";
import { authorize, protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import {
  approvePaymentSchema,
  listPendingAdminPaymentsSchema,
  paymentIdParamSchema,
  rejectPaymentSchema,
  resolveDisputeSchema,
} from "./paymentsValidation";

const router = Router();

router.use(protect, authorize("admin"));

router.get(
  "/pending-admin-approval",
  validate(listPendingAdminPaymentsSchema, { source: "query" }),
  catchAsync(paymentsController.listPendingAdminApprovals)
);

router.get(
  '/pending-disputes',
  validate(listPendingAdminPaymentsSchema, { source: 'query' }),
  catchAsync(paymentsController.listPendingDisputes)
);

router.post(
  "/:paymentId/approve-payment",
  validate(paymentIdParamSchema, { source: "params" }),
  validate(approvePaymentSchema),
  catchAsync(paymentsController.approvePaymentByAdmin)
);

router.post(
  "/:paymentId/reject-payment",
  validate(paymentIdParamSchema, { source: "params" }),
  validate(rejectPaymentSchema),
  catchAsync(paymentsController.rejectPaymentByAdmin)
);

router.get('/:disputeId', catchAsync(paymentsController.getDisputeById));

router.post(
  '/disputes/:disputeId/resolve',
  validate(paymentIdParamSchema, { source: 'params' }),
  validate(resolveDisputeSchema),
  catchAsync(paymentsController.resolveDisputeByAdmin)
);

export default router;
