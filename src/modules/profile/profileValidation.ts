import { z } from "zod";

// Reused enum so request validation stays aligned anywhere availability is accepted.
export const availabilityStatusSchema = z.enum(["available", "unavailable", "away"]);

// Input allowed when creating a profile. Every field is optional because the profile can start minimal.
export const createProfileSchema = z.object({
  hourlyRate: z.number().positive().max(1000000).optional(),
  bio: z.string().trim().max(2000).optional(),
  availabilityStatus: availabilityStatusSchema.optional(),
  responseTimeHours: z.number().int().min(1).max(720).optional(),
});

// Updates are partial, but at least one field must be present so empty PUT requests fail fast.
export const updateProfileSchema = createProfileSchema.refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required for update" }
);

// Shared param validator for routes that identify a profile by user id.
export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export type CreateProfileBody = z.infer<typeof createProfileSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
