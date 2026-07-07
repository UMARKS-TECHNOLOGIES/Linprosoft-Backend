import { Router } from "express";
import reviewsController from "./reviewsController";
import catchAsync from "../../utils/catchAsync";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import { createReviewSchema } from "./reviewsValidation";

const router = Router();

router.post("/", protect, validate(createReviewSchema), catchAsync(reviewsController.createReview));
router.get("/:professionalId", catchAsync(reviewsController.listReviews));

export default router;
