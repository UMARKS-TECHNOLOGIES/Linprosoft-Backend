import { SearchFilterOptions, SearchFilters, SearchProfessionalDTO, SearchResult, SkillDTO } from "../../types/searchTypes";
import * as searchRepository from "./searchRepository";

// Normalizes numeric text returned by Postgres into safe numbers for the API contract.
const parseNumeric = (value: string | null): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Safely converts aggregated JSON skill blobs into typed skill DTOs.
const normalizeSkills = (raw: unknown): SkillDTO[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((skill) => {
      // Guard each JSON element because aggregated DB JSON is still untyped at runtime.
      if (typeof skill !== "object" || skill === null) {
        return null;
      }

      const record = skill as Record<string, unknown>;
      const id = Number(record.id);
      const name = typeof record.name === "string" ? record.name : "";
      const category = typeof record.category === "string" ? record.category : "";
      const description = typeof record.description === "string" ? record.description : null;

      if (!Number.isFinite(id) || !name || !category) {
        return null;
      }

      return {
        id,
        name,
        category,
        description,
      };
    })
    .filter((item): item is SkillDTO => item !== null);
};

// Coordinates the paginated search query and total-count query, then reshapes rows into API DTOs.
export const searchProfessionals = async (filters: SearchFilters): Promise<SearchResult> => {
  const [rows, total] = await Promise.all([
    searchRepository.searchProfessionals(filters),
    searchRepository.countSearchResults(filters),
  ]);

  const professionals: SearchProfessionalDTO[] = rows.map((row) => ({
    id: row.profile_id,
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
    user: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      location: row.location,
    },
    skills: normalizeSkills(row.skills_json),
  }));

  const pages = total === 0 ? 0 : Math.ceil(total / filters.limit);

  return {
    professionals,
    total,
    page: filters.page,
    limit: filters.limit,
    pages,
  };
};

// Returns UI-friendly filter metadata derived from current database contents.
export const getFilterOptions = async (): Promise<SearchFilterOptions> => {
  const options = await searchRepository.getFilterOptions();

  return {
    skills: options.skills,
    availabilityStatuses: ["available", "unavailable", "away"],
    minHourlyRate: options.minRate,
    maxHourlyRate: options.maxRate,
  };
};

// Delegates skill name autocomplete to the repository layer.
export const autocompleteSkills = async (queryText: string, limit: number): Promise<SkillDTO[]> => {
  return searchRepository.autocompleteSkills(queryText, limit);
};
