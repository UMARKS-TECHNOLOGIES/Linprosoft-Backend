import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import * as portfolioController from "./portfolioControllers";
import {
  createPortfolioItemSchema,
  portfolioItemIdParamSchema,
  portfolioUserIdParamSchema,
  updatePortfolioItemSchema,
} from "./portfolioValidation";

const router = Router();

// Public read route for someone's portfolio collection.
router.get(
  "/:userId/portfolio",
  validate(portfolioUserIdParamSchema, { source: "params" }),
  portfolioController.listProfilePortfolioItems
);
// Authenticated write routes operate only on the caller's own portfolio entries.
router.post(
  "/me/portfolio",
  protect,
  validate(createPortfolioItemSchema),
  portfolioController.createMyPortfolioItem
);
router.put(
  "/me/portfolio/:portfolioItemId",
  protect,
  validate(portfolioItemIdParamSchema, { source: "params" }),
  validate(updatePortfolioItemSchema),
  portfolioController.updateMyPortfolioItem
);
router.delete(
  "/me/portfolio/:portfolioItemId",
  protect,
  validate(portfolioItemIdParamSchema, { source: "params" }),
  portfolioController.deleteMyPortfolioItem
);

export default router;
