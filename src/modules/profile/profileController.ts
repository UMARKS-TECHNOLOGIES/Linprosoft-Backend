import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as profileService from "./profileService";

// Creates the authenticated professional's profile from validated request body data.
export const createProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  // `protect` should populate `req.user`, but we guard again so this controller is safe on its own.
  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const profile = await profileService.createProfile(userId, req.body);

  return ApiResponseHandler.created(res, { profile }, "Professional profile created successfully");
});

// Returns the public-facing profile summary for the requested user id.
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const profile = await profileService.getProfileByUserId(userId);

  return ApiResponseHandler.success(res, { profile }, "Profile fetched successfully");
});

// Returns an aggregated profile view that includes profile basics plus related phase 2 data.
export const getDetailedProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const profile = await profileService.getDetailedProfile(userId);

  return ApiResponseHandler.success(res, { profile }, "Detailed profile fetched successfully");
});

// Returns the currently authenticated user's own professional profile.
export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const profile = await profileService.getMyProfile(userId);

  return ApiResponseHandler.success(res, { profile }, "Profile fetched successfully");
});

// Updates the authenticated user's profile with the validated fields provided in the request body.
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const profile = await profileService.updateProfile(userId, req.body);

  return ApiResponseHandler.success(res, { profile }, "Profile updated successfully");
});

// Deletes the authenticated user's professional profile.
export const deleteProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  await profileService.deleteProfile(userId);

  return res.status(204).send();
});
