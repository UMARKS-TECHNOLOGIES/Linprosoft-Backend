import { z } from "zod";

// Required payload for creating a portfolio item.
export const createPortfolioItemSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional(),
  imageUrl: z.string().url().max(1000).optional(),
  linkUrl: z.string().url().max(1000).optional(),
});

// Update input is partial, but the request must still contain at least one mutable field.
export const updatePortfolioItemSchema = createPortfolioItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required for update" }
);

// Route param validator for item-specific update and delete endpoints.
export const portfolioItemIdParamSchema = z.object({
  portfolioItemId: z.coerce.number().int().positive(),
});

// Route param validator for public portfolio listing by user id.
export const portfolioUserIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});
