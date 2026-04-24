import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import * as profileController from "./profileController";
import { createProfileSchema, updateProfileSchema, userIdParamSchema } from "./profileValidation";

const router = Router();

// `/me` routes operate on the authenticated user's own profile, while `/:userId` routes are public reads.
router.post("/", protect, validate(createProfileSchema), profileController.createProfile);
router.get("/me", protect, profileController.getMyProfile);
router.put("/me", protect, validate(updateProfileSchema), profileController.updateProfile);
router.delete("/me", protect, profileController.deleteProfile);
// The more specific `/detailed` route is declared before `/:userId` so Express does not treat `detailed` as a user id.
router.get("/:userId/detailed", validate(userIdParamSchema, { source: "params" }), profileController.getDetailedProfile);
router.get("/:userId", validate(userIdParamSchema, { source: "params" }), profileController.getProfile);

export default router;
