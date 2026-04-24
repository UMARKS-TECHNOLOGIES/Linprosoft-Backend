import { AppError } from "../../utils/appError";
import {
  CreatePortfolioItemInput,
  PortfolioItemDTO,
  UpdatePortfolioItemInput,
} from "../../types/portfolioTypes";
import * as profileRepository from "../profile/profileRepository";
import * as portfolioRepository from "./portfolioRepository";

// Maps the raw portfolio row into the response contract expected by API consumers.
const toPortfolioItemDTO = (row: {
  id: number;
  professional_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at: Date;
}): PortfolioItemDTO => ({
  id: row.id,
  professionalId: row.professional_id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  linkUrl: row.link_url,
  createdAt: row.created_at,
});

// Every portfolio operation is anchored to a professional profile, not directly to the users table.
const getProfessionalIdByUserId = async (userId: number): Promise<number> => {
  const profile = await profileRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return profile.id;
};

// Lists all portfolio entries for the supplied user by first resolving their professional profile id.
export const listByUserId = async (userId: number): Promise<PortfolioItemDTO[]> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const rows = await portfolioRepository.listByProfessionalId(professionalId);
  return rows.map(toPortfolioItemDTO);
};

// Creates a portfolio record owned by the authenticated user's professional profile.
export const createForUser = async (
  userId: number,
  input: CreatePortfolioItemInput
): Promise<PortfolioItemDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const created = await portfolioRepository.createPortfolioItem(professionalId, {
    title: input.title,
    description: input.description,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
  });

  return toPortfolioItemDTO(created);
};

// Ensures users can only update portfolio entries that belong to their own profile.
export const updateForUser = async (
  userId: number,
  portfolioItemId: number,
  input: UpdatePortfolioItemInput
): Promise<PortfolioItemDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const existing = await portfolioRepository.getById(portfolioItemId);

  if (!existing || existing.professional_id !== professionalId) {
    throw new AppError("Portfolio item not found", 404);
  }

  const updated = await portfolioRepository.updateById(portfolioItemId, {
    title: input.title,
    description: input.description,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
  });

  if (!updated) {
    throw new AppError("Failed to update portfolio item", 500);
  }

  return toPortfolioItemDTO(updated);
};

// Applies the same ownership check used by updates before deleting a portfolio entry.
export const deleteForUser = async (userId: number, portfolioItemId: number): Promise<void> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const existing = await portfolioRepository.getById(portfolioItemId);

  if (!existing || existing.professional_id !== professionalId) {
    throw new AppError("Portfolio item not found", 404);
  }

  const deleted = await portfolioRepository.deleteById(portfolioItemId);

  if (!deleted) {
    throw new AppError("Portfolio item not found", 404);
  }
};
