import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as portfolioService from "./portfolioService";

// Lists portfolio entries that belong to the target user's professional profile.
export const listProfilePortfolioItems = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const portfolioItems = await portfolioService.listByUserId(userId);

  return ApiResponseHandler.success(res, { portfolioItems }, "Portfolio items fetched successfully");
});

// Creates a portfolio entry under the authenticated user's own profile.
export const createMyPortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const portfolioItem = await portfolioService.createForUser(userId, req.body);

  return ApiResponseHandler.created(res, { portfolioItem }, "Portfolio item created successfully");
});

// Updates one of the authenticated user's existing portfolio entries.
export const updateMyPortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const portfolioItemId = Number(req.params.portfolioItemId);
  const portfolioItem = await portfolioService.updateForUser(userId, portfolioItemId, req.body);

  return ApiResponseHandler.success(res, { portfolioItem }, "Portfolio item updated successfully");
});

// Deletes a portfolio item after ownership has been checked in the service layer.
export const deleteMyPortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const portfolioItemId = Number(req.params.portfolioItemId);
  await portfolioService.deleteForUser(userId, portfolioItemId);

  return res.status(204).send();
});
