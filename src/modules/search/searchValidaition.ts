import { z } from "zod";

// Accepts `skills` as either a repeated query param array or a comma-separated string and normalizes both.
const skillsParser = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return value;
}, z.array(z.coerce.number().int().positive()).optional());

// Validation for the main professional search endpoint.
export const searchQuerySchema = z
  .object({
    skills: skillsParser,
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    minRate: z.coerce.number().min(0).optional(),
    maxRate: z.coerce.number().min(0).optional(),
    availabilityStatus: z.enum(["available", "unavailable", "away"]).optional(),
    sortBy: z.enum(["rating_desc", "rate_asc", "recent_desc"]).default("rating_desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  // Range validation lives here so impossible filter combinations are rejected before hitting SQL.
  .refine((data) => data.minRate === undefined || data.maxRate === undefined || data.minRate <= data.maxRate, {
    message: "minRate cannot be greater than maxRate",
    path: ["minRate"],
  })
  .refine(
    (data) => data.minRating === undefined || data.maxRating === undefined || data.minRating <= data.maxRating,
    {
      message: "minRating cannot be greater than maxRating",
      path: ["minRating"],
    }
  );

// Validation for the lightweight skill autocomplete endpoint.
export const skillAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const nlpSearchBodySchema = z.object({
  query: z.string().trim().min(1).max(500),
  location: z.string().trim().max(100).optional(),
  rating: z.string().regex(/^[0-5]\+?\s*Stars?$/i).optional(),
  budget: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SkillAutocompleteQueryInput = z.infer<typeof skillAutocompleteQuerySchema>;
