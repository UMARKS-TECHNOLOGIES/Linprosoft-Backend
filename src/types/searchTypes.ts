import { AvailabilityStatus, ProfessionalProfileDetailDTO } from "./profileTypes";
import { SkillDTO } from "./skillTypes";

export type SearchSortBy = "rating_desc" | "rate_asc" | "recent_desc";

export interface SearchFilters {
  skills?: number[];
  minRating?: number;
  maxRating?: number;
  minRate?: number;
  maxRate?: number;
  availabilityStatus?: AvailabilityStatus;
  sortBy: SearchSortBy;
  page: number;
  limit: number;
}

export interface SearchProfessionalDTO extends ProfessionalProfileDetailDTO {
  skills: SkillDTO[];
}

export interface SearchResult {
  professionals: SearchProfessionalDTO[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SearchFilterOptions {
  skills: SkillDTO[];
  availabilityStatuses: AvailabilityStatus[];
  minHourlyRate: number | null;
  maxHourlyRate: number | null;
}
export { SkillDTO };

