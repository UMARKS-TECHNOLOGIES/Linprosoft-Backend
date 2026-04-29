import pool from '../../config/db';
import { JobRow } from "../../types/jobTypes";

// Create a new job posting
export const createJob = async (data:Partial<JobRow>) => {
    const query = `INSERT INTO job_postings (employer_id, skill_id, title, description, budget,
    currency, duration_days, location, status, visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`;

    const values = [
        data.employer_id, data.skill_id ?? null, data.title,
        data.description, data.budget ?? null, data.currency ?? null,
        data.duration_days ?? null, data.location ?? null,
        data.status ?? 'draft', data.visibility ?? 'public'
    ];
    const res = await pool.query(query, values);

    return res.rows[0] as JobRow;
    
};

/// Find a job posting by ID (only if not deleted)
export const findJobById = async (id:number) => {
    const query = `SELECT * FROM job_postings WHERE id=$1 AND deleted_at is NULL`;

    const values = [id];
    const res = await pool.query(query, values);

    return res.rows[0] as JobRow | undefined;
}

// Update a job posting by ID (only if not deleted)
export const updateJob = async (id:number, patch: Partial<JobRow>) => {
    const fields = Object.keys(patch);
    if (fields.length === 0) {
        // nothing to update
        return await findJobById(id) as JobRow;
    }
    const sets = fields.map((f, i) => `${f}=$${i+2}`).join(', ');
    const values = fields.map(k => (patch as any)[k]);
    const query =  `UPDATE job_postings SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE 
        id=$1 RETURNING *`;
    

    const res = await pool.query(query, [id, ...values]);
    return res.rows[0] as JobRow;
};

//Soft Delete a Job Posting 
export const softDeleteJob = async (id:number) => {
    const query = `UPDATE job_postings
     SET deleted_at = CURRENT_TIMESTAMP WHERE id=$1`;;
    const values = [id];
    const res = await pool.query(query, values);
    return res.rowCount > 0;
};

 
//Simple match: join skills and professionals_profiles
export const findMatchesForJob = async (jobId:number, limit=20, offset=0) => {
    const query = ` SELECT p.* FROM professional_profiles p
    JOIN professional_skills ps on ps.professional_id = p.id
    JOIN job_postings j on j.skill_id = ps.skill_id
    WHERE j.id=$1
    ORDER BY p.avg_rating DESC NULLS LAST
    LIMIT $2 OFFSET $3`;

    const values = [jobId, limit, offset];

    const res = await pool.query(query, values);
    return res.rows;
};

// List jobs with optional filters and pagination
export const listJobs = async (filters: { skillId?: number; location?: string; status?: string; page?: number; limit?: number } = {}) => {
    const where: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let idx = 1;

    if (filters.skillId !== undefined) {
        where.push(`skill_id = $${idx++}`);
        values.push(filters.skillId);
    }
    if (filters.location) {
        where.push(`location ILIKE $${idx++}`);
        values.push(`%${filters.location}%`);
    }
    if (filters.status) {
        where.push(`status = $${idx++}`);
        values.push(filters.status);
    }

    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const offset = (page - 1) * limit;

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const q = `SELECT * FROM job_postings ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const res = await pool.query(q, values);

    // get total count for pagination
    const countQ = `SELECT COUNT(*)::int AS total FROM job_postings ${whereClause}`;
    const countRes = await pool.query(countQ, values.slice(0, values.length - 2));
    const total = countRes.rows[0]?.total ?? 0;

    return {
        items: res.rows as JobRow[],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
};

export const getJob = async (id: number) => {
    return await findJobById(id);
};

