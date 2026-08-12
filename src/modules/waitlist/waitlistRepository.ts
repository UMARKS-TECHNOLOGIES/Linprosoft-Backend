import pool from "../../config/db";
import { WaitlistRow } from "../../types/waitlistTypes";

export const findByEmail = async (email: string): Promise<WaitlistRow | null> => {
  const result = await pool.query<WaitlistRow>(
    `SELECT id, email, created_at FROM waitlist WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
};

export const insertWaitlistEntry = async (email: string): Promise<WaitlistRow> => {
  const result = await pool.query<WaitlistRow>(
    `INSERT INTO waitlist (email)
     VALUES ($1)
     RETURNING id, email, created_at`,
    [email.toLowerCase()]
  );

  return result.rows[0];
};

export const getAllWaitlistEntries = async (): Promise<WaitlistRow[]> => {
  const result = await pool.query<WaitlistRow>(
    `SELECT id, email, created_at FROM waitlist ORDER BY created_at DESC`
  );

  return result.rows;
};
