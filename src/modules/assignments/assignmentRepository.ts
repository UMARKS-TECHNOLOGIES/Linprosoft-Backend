import pool from "../../config/db";
import { JobAssignmentRow } from "../../types/jobTypes";

//Create a Job Assignment and insert it into the job assignments table
export const createAssignment = async (a: Partial<JobAssignmentRow>) => {
    const query = `INSERT INTO job_assignments (job_id, professional_id, employer_id, status, 
    accepted_budget) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const values = [a.job_id, a.professional_id, a.employer_id, a.status ?? 'invited', a.accepted_budget ?? null];
    
    const res = await pool.query(query, values);
    return res.rows[0] as JobAssignmentRow;
};

//Find a job assignments from the job assignments table using id
export const findAssignmentById = async (id:number) => {
    const query = `SELECT * FROM job_assignments WHERE id=$1`;
    const values = [id];

    const res = await pool.query(query, values);
    return res.rows[0] as JobAssignmentRow | undefined;
};

//Update a Job Assignment's Status
export const updateAssignmentStatus = async (id:number, status: string, extra: Partial<JobAssignmentRow> = {}) => {
    const query = ` UPDATE job_assignments
    SET status=$2, started_at = COALESCE($3, started_at), completed_at = COALESCE($4, completed_at), accepted_budget = COALESCE($5, accepted_budget), updated_at = CURRENT_TIMESTAMP
    WHERE id=$1 RETURNING *`;
    const values = [id, status, extra.started_at ?? null, extra.completed_at ?? null, extra.accepted_budget ?? null];

    const res = await pool.query(query, values);
    return res.rows[0] as JobAssignmentRow;
};