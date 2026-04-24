import pool from "../../config/db";
import { PortfolioItemRow } from "../../types/portfolioTypes";

// Insert payload uses snake_case column names to keep the repository close to SQL.
interface CreatePortfolioItemRowInput {
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
}

// Update payload is partial because clients can patch only selected fields.
interface UpdatePortfolioItemRowInput {
  title?: string;
  description?: string;
  image_url?: string;
  link_url?: string;
}

// Inserts a new portfolio row for the owning professional profile.
export const createPortfolioItem = async (
  professionalId: number,
  input: CreatePortfolioItemRowInput
): Promise<PortfolioItemRow> => {
  const query = `
    INSERT INTO portfolio_items (professional_id, title, description, image_url, link_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const result = await pool.query<PortfolioItemRow>(query, [
    professionalId,
    input.title,
    input.description ?? null,
    input.image_url ?? null,
    input.link_url ?? null,
  ]);

  return result.rows[0];
};

// Returns portfolio items newest-first for display on profile pages.
export const listByProfessionalId = async (professionalId: number): Promise<PortfolioItemRow[]> => {
  const result = await pool.query<PortfolioItemRow>(
    `SELECT * FROM portfolio_items WHERE professional_id = $1 ORDER BY created_at DESC`,
    [professionalId]
  );

  return result.rows;
};

// Fetches a single portfolio item so services can verify ownership before mutating it.
export const getById = async (portfolioItemId: number): Promise<PortfolioItemRow | null> => {
  const result = await pool.query<PortfolioItemRow>(
    `SELECT * FROM portfolio_items WHERE id = $1`,
    [portfolioItemId]
  );

  return result.rows[0] ?? null;
};

// Builds a dynamic UPDATE statement from the exact fields supplied by the caller.
export const updateById = async (
  portfolioItemId: number,
  input: UpdatePortfolioItemRowInput
): Promise<PortfolioItemRow | null> => {
  const fields: string[] = [];
  const values: string[] = [];

  if (input.title !== undefined) {
    values.push(input.title);
    fields.push(`title = $${values.length}`);
  }

  if (input.description !== undefined) {
    values.push(input.description);
    fields.push(`description = $${values.length}`);
  }

  if (input.image_url !== undefined) {
    values.push(input.image_url);
    fields.push(`image_url = $${values.length}`);
  }

  if (input.link_url !== undefined) {
    values.push(input.link_url);
    fields.push(`link_url = $${values.length}`);
  }

  // The id is appended last so the dynamic placeholders in `fields` stay stable.
  values.push(String(portfolioItemId));

  const query = `
    UPDATE portfolio_items
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query<PortfolioItemRow>(query, values);
  return result.rows[0] ?? null;
};

// Deletes the portfolio item identified by its primary key.
export const deleteById = async (portfolioItemId: number): Promise<boolean> => {
  const result = await pool.query(`DELETE FROM portfolio_items WHERE id = $1`, [portfolioItemId]);
  return (result.rowCount ?? 0) > 0;
};
