import pool from "../../config/db";
import { ProfessionalSkillRow, SkillRow } from "../../types/skillTypes";

// Payload used when creating a row in the profile-to-skill join table.
interface AddProfileSkillRowInput {
  proficiency_level?: "beginner" | "intermediate" | "expert";
  years_of_experience?: number;
  is_primary?: boolean;
}

// Payload used for partial updates to an existing join-table row.
interface UpdateProfileSkillRowInput {
  proficiency_level?: "beginner" | "intermediate" | "expert";
  years_of_experience?: number;
  is_primary?: boolean;
}

// Looks up a skill in the global skills catalog.
export const getSkillById = async (skillId: number): Promise<SkillRow | null> => {
  const result = await pool.query<SkillRow>(
    `SELECT * FROM skills WHERE id = $1`,
    [skillId]
  );

  return result.rows[0] ?? null;
};

// Returns catalog skills plus a separate total count for pagination.
export const getAllSkills = async (limit?: number, offset?: number): Promise<{ skills: SkillRow[]; total: number }> => {
  // Count first so pagination metadata reflects the full catalog, not just the current page.
  const countResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM skills`
  );
  const total = parseInt(countResult.rows[0].count as any, 10);

  // Build the page query dynamically because limit and offset are optional.
  let query = `SELECT * FROM skills ORDER BY name ASC`;
  const values: Array<number> = [];

  if (limit !== undefined) {
    values.push(limit);
    query += ` LIMIT $${values.length}`;
  }

  if (offset !== undefined) {
    values.push(offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query<SkillRow>(query, values);

  return {
    skills: result.rows,
    total,
  };
};

// Returns all skills linked to a professional profile together with skill catalog details.
export const getProfileSkills = async (professionalId: number): Promise<ProfessionalSkillRow[]> => {
  const query = `
    SELECT
      ps.*,
      s.name AS skill_name,
      s.category AS skill_category,
      s.description AS skill_description
    FROM professional_skills ps
    JOIN skills s ON s.id = ps.skill_id
    WHERE ps.professional_id = $1
    ORDER BY ps.is_primary DESC, s.name ASC
  `;

  const result = await pool.query<ProfessionalSkillRow>(query, [professionalId]);
  return result.rows;
};

// Inserts a new profile-to-skill association row.
export const addSkillToProfile = async (
  professionalId: number,
  skillId: number,
  input: AddProfileSkillRowInput
): Promise<ProfessionalSkillRow> => {
  const query = `
    INSERT INTO professional_skills (
      professional_id, skill_id, proficiency_level, years_of_experience, is_primary
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    professionalId,
    skillId,
    input.proficiency_level ?? "beginner",
    input.years_of_experience ?? null,
    input.is_primary ?? false,
  ];

  const result = await pool.query<ProfessionalSkillRow>(query, values);
  return result.rows[0];
};

// Partially updates a profile-to-skill association identified by composite ownership keys.
export const updateProfileSkill = async (
  professionalId: number,
  skillId: number,
  input: UpdateProfileSkillRowInput
): Promise<ProfessionalSkillRow | null> => {
  const fields: string[] = [];
  const values: Array<number | string | boolean> = [];

  if (input.proficiency_level !== undefined) {
    values.push(input.proficiency_level);
    fields.push(`proficiency_level = $${values.length}`);
  }

  if (input.years_of_experience !== undefined) {
    values.push(input.years_of_experience);
    fields.push(`years_of_experience = $${values.length}`);
  }

  if (input.is_primary !== undefined) {
    values.push(input.is_primary);
    fields.push(`is_primary = $${values.length}`);
  }

  values.push(professionalId, skillId);

  const query = `
    UPDATE professional_skills
    SET ${fields.join(", ")}
    WHERE professional_id = $${values.length - 1} AND skill_id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query<ProfessionalSkillRow>(query, values);
  return result.rows[0] ?? null;
};

// Removes a skill association from a professional profile.
export const removeSkillFromProfile = async (
  professionalId: number,
  skillId: number
): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM professional_skills WHERE professional_id = $1 AND skill_id = $2`,
    [professionalId, skillId]
  );

  return (result.rowCount ?? 0) > 0;
};

// Clears the primary flag across all skills so another skill can be promoted safely.
export const clearPrimarySkill = async (professionalId: number): Promise<void> => {
  await pool.query(
    `UPDATE professional_skills SET is_primary = false WHERE professional_id = $1`,
    [professionalId]
  );
};
