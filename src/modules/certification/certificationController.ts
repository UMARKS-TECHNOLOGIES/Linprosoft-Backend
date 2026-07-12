import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as certificationService from "./certificationService";

// Lists certifications belonging to the target user's professional profile.
export const listProfileCertifications = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const certifications = await certificationService.listByUserId(userId);

  return ApiResponseHandler.success(res, { certifications }, "Certifications fetched successfully");
});

// Creates a certification record under the authenticated user's profile.
export const createMyCertification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const certification = await certificationService.createForUser(Number(userId), req.body);

  return ApiResponseHandler.created(res, { certification }, "Certification added successfully");
});

// Updates one certification owned by the authenticated user's profile.
export const updateMyCertification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const certificationId = Number(req.params.certificationId);
  const certification = await certificationService.updateForUser(Number(userId), certificationId, req.body);

  return ApiResponseHandler.success(res, { certification }, "Certification updated successfully");
});

// Deletes one certification after the service validates ownership.
export const deleteMyCertification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const certificationId = Number(req.params.certificationId);
  await certificationService.deleteForUser(Number(userId), certificationId);

  return res.status(204).send();
});
