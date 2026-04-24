import { AppError } from "../../utils/appError";
import {
  CertificationDTO,
  CreateCertificationInput,
  UpdateCertificationInput,
} from "../../types/certificationTypes";
import * as profileRepository from "../profile/profileRepository";
import * as certificationRepository from "./certificationRepository";

// Converts the raw certification row to the API response shape.
const toCertificationDTO = (row: {
  id: number;
  professional_id: number;
  title: string;
  issuer: string | null;
  issue_date: Date | null;
  expiry_date: Date | null;
  credential_url: string | null;
  created_at: Date;
}): CertificationDTO => ({
  id: row.id,
  professionalId: row.professional_id,
  title: row.title,
  issuer: row.issuer,
  issueDate: row.issue_date,
  expiryDate: row.expiry_date,
  credentialUrl: row.credential_url,
  createdAt: row.created_at,
});

// Certification ownership is tied to professional profiles, so user ids are resolved first.
const getProfessionalIdByUserId = async (userId: number): Promise<number> => {
  const profile = await profileRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return profile.id;
};

// Lists certifications for the supplied user's professional profile.
export const listByUserId = async (userId: number): Promise<CertificationDTO[]> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const rows = await certificationRepository.listByProfessionalId(professionalId);
  return rows.map(toCertificationDTO);
};

// Creates a certification owned by the authenticated user's profile.
export const createForUser = async (
  userId: number,
  input: CreateCertificationInput
): Promise<CertificationDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const created = await certificationRepository.createCertification(professionalId, {
    title: input.title,
    issuer: input.issuer,
    issue_date: input.issueDate,
    expiry_date: input.expiryDate,
    credential_url: input.credentialUrl,
  });

  return toCertificationDTO(created);
};

// Ensures users can only modify certifications attached to their own profile.
export const updateForUser = async (
  userId: number,
  certificationId: number,
  input: UpdateCertificationInput
): Promise<CertificationDTO> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const existing = await certificationRepository.getById(certificationId);

  if (!existing || existing.professional_id !== professionalId) {
    throw new AppError("Certification not found", 404);
  }

  const updated = await certificationRepository.updateById(certificationId, {
    title: input.title,
    issuer: input.issuer,
    issue_date: input.issueDate,
    expiry_date: input.expiryDate,
    credential_url: input.credentialUrl,
  });

  if (!updated) {
    throw new AppError("Failed to update certification", 500);
  }

  return toCertificationDTO(updated);
};

// Applies the same ownership check before removing a certification.
export const deleteForUser = async (userId: number, certificationId: number): Promise<void> => {
  const professionalId = await getProfessionalIdByUserId(userId);
  const existing = await certificationRepository.getById(certificationId);

  if (!existing || existing.professional_id !== professionalId) {
    throw new AppError("Certification not found", 404);
  }

  const deleted = await certificationRepository.deleteById(certificationId);
  if (!deleted) {
    throw new AppError("Certification not found", 404);
  }
};
