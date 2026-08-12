import pool from "../../config/db";
import { SearchFilters, SearchSortBy } from "../../types/searchTypes";

// Shape returned by the main search query before it is mapped into API DTOs.
interface SearchRow {
  profile_id: number;
  user_id: number;
  full_name: string | null;
  location: string | null;
  hourly_rate: string | null;
  bio: string | null;
  profession: string | null;
  availability_status: "available" | "unavailable" | "away" | null;
  response_time_hours: number | null;
  total_hours_worked: number | null;
  avg_rating: string | null;
  total_reviews: number | null;
  created_at: Date;
  updated_at: Date;
  skills_json: unknown;
}

// Helper payload used by the WHERE-clause builder.
interface QueryBuildResult {
  whereClause: string;
  values: Array<number | number[] | string | string[]>;
}

// Builds reusable filter conditions so the list query and count query stay perfectly in sync.
const buildWhereClause = (filters: SearchFilters): QueryBuildResult => {
  const conditions: string[] = ["u.deleted_at IS NULL"];
  const values: Array<number | number[] | string | string[]> = [];

  if (filters.skills && filters.skills.length > 0) {
    values.push(filters.skills);
    // `EXISTS` keeps the parent profile rows unique while still filtering by linked skills.
    conditions.push(`EXISTS (
      SELECT 1
      FROM professional_skills psf
      WHERE psf.professional_id = pp.id
        AND psf.skill_id = ANY($${values.length}::int[])
    )`);
  }

  if (filters.minRating !== undefined) {
    values.push(filters.minRating);
    conditions.push(`COALESCE(pp.avg_rating, 0) >= $${values.length}`);
  }

  if (filters.maxRating !== undefined) {
    values.push(filters.maxRating);
    conditions.push(`COALESCE(pp.avg_rating, 0) <= $${values.length}`);
  }

  if (filters.minRate !== undefined) {
    values.push(filters.minRate);
    conditions.push(`COALESCE(pp.hourly_rate, 0) >= $${values.length}`);
  }

  if (filters.maxRate !== undefined) {
    values.push(filters.maxRate);
    conditions.push(`COALESCE(pp.hourly_rate, 0) <= $${values.length}`);
  }

  if (filters.availabilityStatus) {
    values.push(filters.availabilityStatus);
    conditions.push(`pp.availability_status = $${values.length}`);
  }

  if (filters.inferredProfession) {
    values.push(filters.inferredProfession);
    conditions.push(`LOWER(COALESCE(pp.profession, '')) = LOWER($${values.length})`);
  }
  if (filters.location) {
    values.push(filters.location);
    conditions.push(`LOWER(COALESCE(u.location, '')) = LOWER($${values.length})`);
  }
  if (filters.budgetMin !== undefined) {
    values.push(filters.budgetMin);
    conditions.push(`COALESCE(pp.hourly_rate, 0) >= $${values.length}`);
  }
  if (filters.budgetMax !== undefined) {
    values.push(filters.budgetMax);
    conditions.push(`COALESCE(pp.hourly_rate, 0) <= $${values.length}`);
  }
  if (filters.inferredSkill || (filters.inferredKeywords && filters.inferredKeywords.length > 0)) {
    const terms = [filters.inferredSkill, ...(filters.inferredKeywords ?? [])].filter((term): term is string => Boolean(term));
    values.push(terms);
    conditions.push(`EXISTS (SELECT 1 FROM professional_skills pss JOIN skills ss ON ss.id = pss.skill_id WHERE pss.professional_id = pp.id AND LOWER(ss.name) = ANY(SELECT LOWER(unnest($${values.length}::text[]))))`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

// Only whitelisted sort expressions are allowed so callers cannot influence raw SQL.
const sortByMap: Record<SearchSortBy, string> = {
  rating_desc: "COALESCE(pp.avg_rating, 0) DESC, pp.id DESC",
  rate_asc: "COALESCE(pp.hourly_rate, 0) ASC, pp.id DESC",
  recent_desc: "pp.created_at DESC, pp.id DESC",
};

// Executes the paginated profile discovery query and embeds each profile's skills as aggregated JSON.
export const searchProfessionals = async (filters: SearchFilters): Promise<SearchRow[]> => {
  const { whereClause, values } = buildWhereClause(filters);
  const offset = (filters.page - 1) * filters.limit;

  // Sorting is chosen from a fixed map instead of being interpolated directly from user input.
  const sortClause = sortByMap[filters.sortBy];

  values.push(filters.limit);
  const limitPos = values.length;
  values.push(offset);
  const offsetPos = values.length;

  const query = `
    SELECT
      pp.id AS profile_id,
      pp.user_id,
      u.full_name,
      u.location,
      pp.hourly_rate,
      pp.bio,
      pp.profession,
      pp.availability_status,
      pp.response_time_hours,
      pp.total_hours_worked,
      pp.avg_rating,
      pp.total_reviews,
      pp.created_at,
      pp.updated_at,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'category', s.category,
            'description', s.description
          )
          ORDER BY ps.is_primary DESC, s.name ASC
        )
        FROM professional_skills ps
        JOIN skills s ON s.id = ps.skill_id
        WHERE ps.professional_id = pp.id
      ), '[]'::json) AS skills_json
    FROM professional_profiles pp
    JOIN users u ON u.id = pp.user_id
    ${whereClause}
    ORDER BY ${sortClause}
    LIMIT $${limitPos} OFFSET $${offsetPos}
  `;

  const result = await pool.query<SearchRow>(query, values);
  return result.rows;
};

// Counts the total rows that match the same filters used by the paginated search query.
export const countSearchResults = async (filters: SearchFilters): Promise<number> => {
  const { whereClause, values } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM professional_profiles pp
    JOIN users u ON u.id = pp.user_id
    ${whereClause}
  `;

  const result = await pool.query<{ total: number }>(query, values);
  return result.rows[0]?.total ?? 0;
};

// Provides data needed to render search filter controls such as rate range and skill options.
export const getFilterOptions = async () => {
  const [rateRange, skills] = await Promise.all([
    pool.query<{ min_rate: string | null; max_rate: string | null }>(
      `SELECT MIN(hourly_rate)::text AS min_rate, MAX(hourly_rate)::text AS max_rate FROM professional_profiles`
    ),
    pool.query<{ id: number; name: string; category: string; description: string | null }>(
      `SELECT id, name, category, description FROM skills ORDER BY name ASC`
    ),
  ]);

  return {
    minRate: rateRange.rows[0]?.min_rate === null ? null : Number(rateRange.rows[0].min_rate),
    maxRate: rateRange.rows[0]?.max_rate === null ? null : Number(rateRange.rows[0].max_rate),
    skills: skills.rows,
  };
};

// Supports skill typeahead by matching names case-insensitively.
export const autocompleteSkills = async (queryText: string, limit: number) => {
  const query = `
    SELECT id, name, category, description
    FROM skills
    WHERE name ILIKE $1
    ORDER BY name ASC
    LIMIT $2
  `;

  const result = await pool.query<{ id: number; name: string; category: string; description: string | null }>(
    query,
    [`%${queryText}%`, limit]
  );

  return result.rows;
};
