import pool from "../../config/db";
import { CertificationRow } from "../../types/certificationTypes";

// Create payload mirrors certification table columns.
interface CreateCertificationRowInput {
  title: string;
  issuer?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
}

// Update payload is partial because each field is optional on edits.
interface UpdateCertificationRowInput {
  title?: string;
  issuer?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
}

// Inserts a certification record for a professional profile.
export const createCertification = async (
  professionalId: number,
  input: CreateCertificationRowInput
): Promise<CertificationRow> => {
  const query = `
    INSERT INTO certifications (
      professional_id, title, issuer, issue_date, expiry_date, credential_url
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    professionalId,
    input.title,
    input.issuer ?? null,
    input.issue_date ?? null,
    input.expiry_date ?? null,
    input.credential_url ?? null,
  ];

  const result = await pool.query<CertificationRow>(query, values);
  return result.rows[0];
};

// Lists certifications newest-first for profile display.
export const listByProfessionalId = async (professionalId: number): Promise<CertificationRow[]> => {
  const result = await pool.query<CertificationRow>(
    `SELECT * FROM certifications WHERE professional_id = $1 ORDER BY created_at DESC`,
    [professionalId]
  );

  return result.rows;
};

// Fetches a single certification so the service can verify ownership before mutation.
export const getById = async (certificationId: number): Promise<CertificationRow | null> => {
  const result = await pool.query<CertificationRow>(
    `SELECT * FROM certifications WHERE id = $1`,
    [certificationId]
  );

  return result.rows[0] ?? null;
};

// Builds a dynamic UPDATE statement from only the fields provided by the caller.
export const updateById = async (
  certificationId: number,
  input: UpdateCertificationRowInput
): Promise<CertificationRow | null> => {
  const fields: string[] = [];
  const values: Array<string> = [];

  if (input.title !== undefined) {
    values.push(input.title);
    fields.push(`title = $${values.length}`);
  }

  if (input.issuer !== undefined) {
    values.push(input.issuer);
    fields.push(`issuer = $${values.length}`);
  }

  if (input.issue_date !== undefined) {
    values.push(input.issue_date);
    fields.push(`issue_date = $${values.length}`);
  }

  if (input.expiry_date !== undefined) {
    values.push(input.expiry_date);
    fields.push(`expiry_date = $${values.length}`);
  }

  if (input.credential_url !== undefined) {
    values.push(input.credential_url);
    fields.push(`credential_url = $${values.length}`);
  }

  values.push(String(certificationId));

  const query = `
    UPDATE certifications
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query<CertificationRow>(query, values);
  return result.rows[0] ?? null;
};

// Deletes the certification identified by primary key.
export const deleteById = async (certificationId: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM certifications WHERE id = $1`,
    [certificationId]
  );

  return (result.rowCount ?? 0) > 0;
};
