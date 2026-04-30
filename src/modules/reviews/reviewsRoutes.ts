import { Router } from "express";
import reviewsController from "./reviewsController";
import catchAsync from "../../utils/catchAsync";

const router = Router();

router.post("/", catchAsync(reviewsController.createReview));
router.get("/:professionalId", catchAsync(reviewsController.listReviews));

export default router;
