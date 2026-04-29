/**
 * Job-related Types
 */


/// JobRow - Represents a row from the job_postings table
export type JobRow = {
    id: number;
    employer_id: number;
    skill_id?: number | null;
    title: string;
    description: string;
    budget?: string | null;
    currency?: string | null;
    duration_days?: number | null;
    location?: string | null;
    status: string;
    visibility: string; // "public" or "private"
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date | null;
}

//Mapper function from DB row to API DTO
export const mapJobRowToDTO = (row: JobRow) => {
    return {
        id: row.id,
        employerId: row.employer_id,
        skillId: row.skill_id ?? undefined,
        title: row.title,
        description: row.description,
        budget: row.budget ?? undefined,
        currency: row.currency ?? undefined,
        durationDays: row.duration_days ?? undefined,
        location: row.location ?? undefined,
        status: row.status,
        visibility: row.visibility,
        createdAt: row.created_at && (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)),
        updatedAt: row.updated_at && (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)),
        deletedAt: row.deleted_at ? (row.deleted_at instanceof Date ? row.deleted_at.toISOString() : String(row.deleted_at)) : undefined
    };
};

//Update Job Row shape
export type UpdateJobRow = {
    id?: number;
    employer_id?: number;
    skill_id?: number | null;
    title?: string;
    description?: string;
    budget?: string | null;
    currency?: string | null;
    duration_days?: number | null;
    location?: string | null;
    status?: string;
    visibility?: string; // "public" or "private"
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
}



// JobPostingDTO - Data Transfer Object for creating/updating job postings
export type JobPostingDTO = {
    id: number;
    employerId: number;
    skillId?: number | null;
    title: string;
    description: string;
    budget?: string | null;
    currency?: string | null;
    durationDays?: number | null;

}

// JobAssignmentRow - Represents a row from the job_assignments table
export type JobAssignmentRow = {
    id: number;
    job_id: number;
    professional_id: number;
    assigned_at: string;
    started_at: string | null;
    completed_at?: string | null;
    status: string;
    employer_id: number;
    accepted_budget?: string | null;
    updated_at: string;

}
//JobAssignmentDTO - Data Transfer Object for creating/updating job assignments
export type JobAssignmentDTO = {
    id: number;
    jobId: number;
    professionalId: number;
    employerId: number;
    assignedAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    status: string;
    acceptedBudget?: string | null;
    updatedAt: string;
    
};


