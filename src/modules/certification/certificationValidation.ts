import { z } from "zod";

// Required and optional fields accepted when creating a certification.
export const createCertificationSchema = z.object({
  title: z.string().trim().min(1).max(255),
  issuer: z.string().trim().max(255).optional(),
  issueDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  credentialUrl: z.string().url().max(1000).optional(),
});

// Update validation allows partial edits but blocks empty payloads.
export const updateCertificationSchema = createCertificationSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required for update" }
);

// Param validator for certification-specific update and delete endpoints.
export const certificationIdParamSchema = z.object({
  certificationId: z.coerce.number().int().positive(),
});

// Param validator for public reads of another user's certifications.
export const certificationUserIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});
