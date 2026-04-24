import { AppError } from "../../utils/appError";
import { ProfileSkillDTO, SkillDTO, UpdateProfileSkillInput, AddSkillInput } from "../../types/skillTypes";
import * as profileRepository from "../profile/profileRepository";
import * as skillRepository from "./skillRepository";

// Converts a catalog skill row into the API DTO used by list endpoints.
const toSkillDTO = (row: {
  id: number;
  name: string;
  category: string;
  description: string | null;
}): SkillDTO => ({
  id: row.id,
  name: row.name,
  category: row.category,
  description: row.description,
});

// Converts a joined professional-skill row into the richer profile skill response shape.
const toProfileSkillDTO = (row: {
  skill_id: number;
  proficiency_level: "beginner" | "intermediate" | "expert" | null;
  years_of_experience: number | null;
  is_primary: boolean | null;
  skill_name?: string;
  skill_category?: string;
  skill_description?: string | null;
}): ProfileSkillDTO => ({
  skillId: row.skill_id,
  name: row.skill_name ?? "",
  category: row.skill_category ?? "",
  description: row.skill_description ?? null,
  proficiencyLevel: row.proficiency_level,
  yearsOfExperience: row.years_of_experience,
  isPrimary: row.is_primary ?? false,
});

// Skills are attached to professional profiles, so we resolve user id to profile id first.
const getProfessionalIdByUserId = async (userId: number): Promise<number> => {
  const profile = await profileRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return profile.id;
};

// Lists skills from the master skills table with sensible defaults for pagination.
export const listAllSkills = async (limit?: number, offset?: number): Promise<{ skills: SkillDTO[]; total: number; limit: number; offset: number }> => {
  const defaultLimit = 20;
  const finalLimit = limit ?? defaultLimit;
  const finalOffset = offset ?? 0;

  const result = await skillRepository.getAllSkills(finalLimit, finalOffset);

  return {
    skills: result.skills.map(toSkillDTO),
    total: result.total,
    limit: finalLimit,
    offset: finalOffset,
  };
};

// Lists the skills currently attached to a user's professional profile.
export const getSkillsByUserId = async (userId: number): Promise<ProfileSkillDTO[]> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const rows = await skillRepository.getProfileSkills(professionalId);
  return rows.map(toProfileSkillDTO);
};

// Adds a catalog skill to the caller's profile and preserves the single-primary-skill rule.
export const addSkillToMyProfile = async (
  userId: number,
  input: AddSkillInput
): Promise<ProfileSkillDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);

  const skill = await skillRepository.getSkillById(input.skillId);
  if (!skill) {
    throw new AppError("Skill not found", 404);
  }

  // A new primary skill replaces any existing primary flag on this profile.
  if (input.isPrimary) {
    await skillRepository.clearPrimarySkill(professionalId);
  }

  try {
    await skillRepository.addSkillToProfile(professionalId, input.skillId, {
      proficiency_level: input.proficiencyLevel,
      years_of_experience: input.yearsOfExperience,
      is_primary: input.isPrimary,
    });
  } catch (error: unknown) {
    // Unique constraint violations mean the profile already has this skill linked.
    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") {
      throw new AppError("Skill already added to profile", 409);
    }
    throw error;
  }

  const rows = await skillRepository.getProfileSkills(professionalId);
  const inserted = rows.find((row) => row.skill_id === input.skillId);

  if (!inserted) {
    throw new AppError("Failed to add skill", 500);
  }

  return toProfileSkillDTO(inserted);
};

// Updates a linked profile skill while enforcing the same single-primary-skill invariant.
export const updateMyProfileSkill = async (
  userId: number,
  skillId: number,
  input: UpdateProfileSkillInput
): Promise<ProfileSkillDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);

  if (input.isPrimary) {
    await skillRepository.clearPrimarySkill(professionalId);
  }

  const updated = await skillRepository.updateProfileSkill(professionalId, skillId, {
    proficiency_level: input.proficiencyLevel,
    years_of_experience: input.yearsOfExperience,
    is_primary: input.isPrimary,
  });

  if (!updated) {
    throw new AppError("Skill not found on profile", 404);
  }

  const rows = await skillRepository.getProfileSkills(professionalId);
  const row = rows.find((item) => item.skill_id === skillId);

  if (!row) {
    throw new AppError("Failed to update skill", 500);
  }

  return toProfileSkillDTO(row);
};

// Removes a skill from the authenticated user's profile.
export const removeMyProfileSkill = async (
  userId: number,
  skillId: number
): Promise<void> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const removed = await skillRepository.removeSkillFromProfile(professionalId, skillId);

  if (!removed) {
    throw new AppError("Skill not found on profile", 404);
  }
};
