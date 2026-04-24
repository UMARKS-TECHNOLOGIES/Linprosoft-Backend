import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as skillService from "./skillService";

// Returns the global skill catalog with basic pagination metadata.
export const getAllSkills = catchAsync(async (req: Request, res: Response) => {
  const { limit, offset } = req.query;
  const result = await skillService.listAllSkills(
    limit ? Number(limit) : undefined,
    offset ? Number(offset) : undefined
  );

  return ApiResponseHandler.success(
    res,
    {
      skills: result.skills,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        totalPages: Math.ceil(result.total / result.limit),
      },
    },
    "Skills fetched successfully"
  );
});

// Returns the skills attached to a specific user's professional profile.
export const getProfileSkills = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const skills = await skillService.getSkillsByUserId(userId);

  return ApiResponseHandler.success(res, { skills }, "Skills fetched successfully");
});

// Adds an existing catalog skill to the authenticated user's profile.
export const addMyProfileSkill = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const skill = await skillService.addSkillToMyProfile(userId, req.body);

  return ApiResponseHandler.created(res, { skill }, "Skill added successfully");
});

// Updates metadata for one of the authenticated user's linked profile skills.
export const updateMyProfileSkill = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const skillId = Number(req.params.skillId);
  const skill = await skillService.updateMyProfileSkill(userId, skillId, req.body);

  return ApiResponseHandler.success(res, { skill }, "Skill updated successfully");
});

// Removes a skill association from the authenticated user's profile.
export const removeMyProfileSkill = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(res, "authentication_error", "Please login to access this resource", 401);
  }

  const skillId = Number(req.params.skillId);
  await skillService.removeMyProfileSkill(userId, skillId);

  return res.status(204).send();
});
