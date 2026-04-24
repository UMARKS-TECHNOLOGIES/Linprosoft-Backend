import { z } from "zod";

// Shared enum so create and update validation accept the same proficiency values.
const proficiencySchema = z.enum(["beginner", "intermediate", "expert"]);

// Payload for linking a catalog skill to a profile.
export const addSkillSchema = z.object({
  skillId: z.coerce.number().int().positive(),
  proficiencyLevel: proficiencySchema.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(80).optional(),
  isPrimary: z.boolean().optional(),
});

// Update payload is intentionally partial but cannot be empty.
export const updateSkillSchema = z
  .object({
    proficiencyLevel: proficiencySchema.optional(),
    yearsOfExperience: z.coerce.number().int().min(0).max(80).optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

// Param validator for skill-specific update and delete routes.
export const skillIdParamSchema = z.object({
  skillId: z.coerce.number().int().positive(),
});

// Param validator for public reads of another user's profile skills.
export const userIdSkillParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

// Query validator for paginating the master skills catalog.
export const getAllSkillsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type AddSkillBody = z.infer<typeof addSkillSchema>;
export type UpdateSkillBody = z.infer<typeof updateSkillSchema>;
export type GetAllSkillsQuery = z.infer<typeof getAllSkillsQuerySchema>;
