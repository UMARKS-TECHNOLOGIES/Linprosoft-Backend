import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import * as skillController from "./skillController";
import {
  addSkillSchema,
  skillIdParamSchema,
  updateSkillSchema,
  userIdSkillParamSchema,
  getAllSkillsQuerySchema,
} from "./skillValidation";

const router = Router();

// Public read routes for the skill catalog and a user's visible profile skills.
router.get("/", validate(getAllSkillsQuerySchema, { source: "query" }), skillController.getAllSkills);
router.get("/:userId/skills", validate(userIdSkillParamSchema, { source: "params" }), skillController.getProfileSkills);
// Authenticated write routes manage only the caller's own profile skills.
router.post("/me/skills", protect, validate(addSkillSchema), skillController.addMyProfileSkill);
router.put(
  "/me/skills/:skillId",
  protect,
  validate(skillIdParamSchema, { source: "params" }),
  validate(updateSkillSchema),
  skillController.updateMyProfileSkill
);
router.delete(
  "/me/skills/:skillId",
  protect,
  validate(skillIdParamSchema, { source: "params" }),
  skillController.removeMyProfileSkill
);

export default router;
