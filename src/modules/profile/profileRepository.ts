import pool from "../../config/db";
import { ProfessionalProfileRow } from "../../types/profileTypes";

// Repository input mirrors database column names so the SQL layer can stay close to the schema.
interface UpdateProfileRowInput {
  hourly_rate?: number;
  bio?: string;
  availability_status?: "available" | "unavailable" | "away";
  response_time_hours?: number;
}

// Inserts a new professional profile row for the owning user.
export const createProfile = async (
  userId: number,
  input: UpdateProfileRowInput
): Promise<ProfessionalProfileRow> => {
  const query = `
    INSERT INTO professional_profiles (
      user_id, hourly_rate, bio, availability_status, response_time_hours
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    userId,
    input.hourly_rate ?? null,
    input.bio ?? null,
    input.availability_status ?? "available",
    input.response_time_hours ?? null,
  ];

  const result = await pool.query<ProfessionalProfileRow>(query, values);
  return result.rows[0];
};

// Looks up a profile by owning user id.
export const findByUserId = async (userId: number): Promise<ProfessionalProfileRow | null> => {
  const result = await pool.query<ProfessionalProfileRow>(
    `SELECT * FROM professional_profiles WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
};

// Fetches profile data together with the user fields needed for public profile responses.
export const findByUserIdWithUser = async (userId: number) => {
  const query = `
    SELECT
      pp.*,
      u.id AS user_id,
      u.first_name,
      u.last_name,
      u.location
    FROM professional_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.user_id = $1 AND u.deleted_at IS NULL
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] ?? null;
};

// Builds a partial update query from only the fields supplied by the service layer.
export const updateByUserId = async (
  userId: number,
  input: UpdateProfileRowInput
): Promise<ProfessionalProfileRow | null> => {
  const fields: string[] = [];
  const values: Array<number | string> = [];

  if (input.hourly_rate !== undefined) {
    values.push(input.hourly_rate);
    fields.push(`hourly_rate = $${values.length}`);
  }

  if (input.bio !== undefined) {
    values.push(input.bio);
    fields.push(`bio = $${values.length}`);
  }

  if (input.availability_status !== undefined) {
    values.push(input.availability_status);
    fields.push(`availability_status = $${values.length}`);
  }

  if (input.response_time_hours !== undefined) {
    values.push(input.response_time_hours);
    fields.push(`response_time_hours = $${values.length}`);
  }

  values.push(userId);

  const query = `
    UPDATE professional_profiles
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE user_id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query<ProfessionalProfileRow>(query, values);
  return result.rows[0] ?? null;
};

// Deletes the profile row belonging to the given user id.
export const deleteByUserId = async (userId: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM professional_profiles WHERE user_id = $1`,
    [userId]
  );

  return (result.rowCount ?? 0) > 0;
};
