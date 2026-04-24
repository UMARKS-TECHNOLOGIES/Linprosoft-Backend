import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import * as certificationController from "./certificationController";
import {
  certificationIdParamSchema,
  certificationUserIdParamSchema,
  createCertificationSchema,
  updateCertificationSchema,
} from "./certificationValidation";

const router = Router();

// Public read route for a user's certifications.
router.get(
  "/:userId/certifications",
  validate(certificationUserIdParamSchema, { source: "params" }),
  certificationController.listProfileCertifications
);
// Authenticated write routes operate on the caller's own certifications.
router.post(
  "/me/certifications",
  protect,
  validate(createCertificationSchema),
  certificationController.createMyCertification
);
router.put(
  "/me/certifications/:certificationId",
  protect,
  validate(certificationIdParamSchema, { source: "params" }),
  validate(updateCertificationSchema),
  certificationController.updateMyCertification
);
router.delete(
  "/me/certifications/:certificationId",
  protect,
  validate(certificationIdParamSchema, { source: "params" }),
  certificationController.deleteMyCertification
);

export default router;
