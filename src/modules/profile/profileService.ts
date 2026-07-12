import { AppError } from "../../utils/appError";
import { UserRow } from "../../types/userTypes";
import {
  CreateProfileInput,
  ProfessionalProfileDTO,
  ProfessionalProfileDetailDTO,
  ProfessionalProfileFullDTO,
  UpdateProfileInput,
} from "../../types/profileTypes";
import * as profileRepository from "./profileRepository";
import * as skillRepository from "../skill/skillRepository";
import * as certificationRepository from "../certification/certificationRepository";
import * as portfolioRepository from "../portfolio/portfolioRepository";
import pool from "../../config/db";

// Normalizes numeric values that come back from Postgres as strings or nullable text.
const parseNumeric = (value: string | null): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Converts the raw DB row shape into the API's profile DTO contract.
const toProfileDTO = (row: {
  id: number;
  user_id: number;
  hourly_rate: string | null;
  bio: string | null;
  availability_status: "available" | "unavailable" | "away" | null;
  response_time_hours: number | null;
  total_hours_worked: number | null;
  avg_rating: string | null;
  total_reviews: number | null;
  created_at: Date;
  updated_at: Date;
}): ProfessionalProfileDTO => ({
  id: row.id,
  userId: row.user_id,
  hourlyRate: row.hourly_rate === null ? null : Number(row.hourly_rate),
  bio: row.bio,
  availabilityStatus: row.availability_status,
  responseTimeHours: row.response_time_hours,
  totalHoursWorked: row.total_hours_worked,
  avgRating: parseNumeric(row.avg_rating),
  totalReviews: row.total_reviews ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Prevents non-professional accounts from creating professional profile records.
const ensureProfessionalUser = async (userId: number): Promise<void> => {
  const result = await pool.query<UserRow>(
    `
      SELECT id, email, password, first_name, last_name, user_type,
             comp_name, location, phone, is_verified, created_at, updated_at, deleted_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "professional") {
    throw new AppError("Only professionals can create profiles", 403);
  }
};

// Fetches a user's profile together with the minimal user identity fields exposed publicly.
export const getProfileByUserId = async (userId: number): Promise<ProfessionalProfileDetailDTO> => {
  const result = await profileRepository.findByUserIdWithUser(userId);

  if (!result) {
    throw new AppError("Profile not found", 404);
  }

  const profile = toProfileDTO(result);

  return {
    ...profile,
    user: {
      id: result.user_id,
      firstName: result.first_name,
      lastName: result.last_name,
      location: result.location,
    },
  };
};

// Fetches the authenticated user's profile without joining extra related records.
export const getMyProfile = async (userId: number): Promise<ProfessionalProfileDTO> => {
  const profile = await profileRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return toProfileDTO(profile);
};

// Creates exactly one professional profile per eligible user account.
export const createProfile = async (
  userId: number,
  input: CreateProfileInput
): Promise<ProfessionalProfileDTO> => {
  await ensureProfessionalUser(userId);

  const existing = await profileRepository.findByUserId(userId);
  if (existing) {
    throw new AppError("User already has a professional profile", 409);
  }

  const created = await profileRepository.createProfile(userId, {
    hourly_rate: input.hourlyRate,
    bio: input.bio,
    availability_status: input.availabilityStatus,
    response_time_hours: input.responseTimeHours,
  });

  return toProfileDTO(created);
};

// Applies partial profile updates after confirming the profile already exists.
export const updateProfile = async (
  userId: number,
  input: UpdateProfileInput
): Promise<ProfessionalProfileDTO> => {
  const existing = await profileRepository.findByUserId(userId);
  if (!existing) {
    throw new AppError("Profile not found", 404);
  }

  const updated = await profileRepository.updateByUserId(userId, {
    hourly_rate: input.hourlyRate,
    bio: input.bio,
    availability_status: input.availabilityStatus,
    response_time_hours: input.responseTimeHours,
  });

  if (!updated) {
    throw new AppError("Failed to update profile", 500);
  }

  return toProfileDTO(updated);
};

// Removes the profile row owned by the authenticated user.
export const deleteProfile = async (userId: number): Promise<void> => {
  const deleted = await profileRepository.deleteByUserId(userId);

  if (!deleted) {
    throw new AppError("Profile not found", 404);
  }
};

// Builds the phase 2 "full profile" response by aggregating profile, skills, certifications, and portfolio.
export const getDetailedProfile = async (userId: number): Promise<ProfessionalProfileFullDTO> => {
  // Start with the profile row because it also gives us the professional profile id needed downstream.
  const result = await profileRepository.findByUserIdWithUser(userId);

  if (!result) {
    throw new AppError("Profile not found", 404);
  }

  const profile = toProfileDTO(result);
  const professionalId = result.id;

  // Pull related skills and reshape the joined result into the API DTO.
  const skillRows = await skillRepository.getProfileSkills(professionalId);
  const skills = skillRows.map((row) => ({
    skillId: row.skill_id,
    name: row.skill_name ?? "",
    category: row.skill_category ?? "",
    description: row.skill_description ?? null,
    proficiencyLevel: row.proficiency_level,
    yearsOfExperience: row.years_of_experience,
    isPrimary: row.is_primary ?? false,
  }));

  // Pull certifications owned by this professional profile.
  const certRows = await certificationRepository.listByProfessionalId(professionalId);
  const certifications = certRows.map((row) => ({
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    credentialUrl: row.credential_url,
    createdAt: row.created_at,
  }));

  // Pull portfolio entries owned by this professional profile.
  const portfolioRows = await portfolioRepository.listByProfessionalId(professionalId);
  const portfolioItems = portfolioRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    createdAt: row.created_at,
  }));

  return {
    ...profile,
    user: {
      id: result.user_id,
      firstName: result.first_name,
      lastName: result.last_name,
      location: result.location,
    },
    skills,
    certifications,
    portfolioItems,
  };
};
