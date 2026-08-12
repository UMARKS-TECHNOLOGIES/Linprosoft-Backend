import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as waitlistService from "./waitlistService";

export const joinWaitlist = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const waitlistEntry = await waitlistService.addWaitlistEntry(email);
  return ApiResponseHandler.created(res, { waitlistEntry }, "Joined waitlist");
});

export const getWaitlist = catchAsync(async (_req: Request, res: Response) => {
  const entries = await waitlistService.listWaitlistEntries();
  return ApiResponseHandler.success(res, { entries }, "Waitlist entries retrieved");
});
