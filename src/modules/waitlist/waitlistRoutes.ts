import { Router } from "express";
import * as controller from "./waitlistController";
import { validate } from "../../middleware/validationMiddleware";
import { joinWaitlistSchema } from "./waitlistValidation";
import { protect, authorize } from "../../middleware/authMiddleware";

const router = Router();

router.post("/", validate(joinWaitlistSchema), controller.joinWaitlist);
router.get("/", protect, authorize("admin"), controller.getWaitlist);

export default router;
