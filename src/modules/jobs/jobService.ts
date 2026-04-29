import * as repo from './jobsRepository';
import { AppError } from '../../utils/appError';
import { JobRow, mapJobRowToDTO, UpdateJobRow } from '../../types/jobTypes';

export const createJobService = async (employerId: number, payload: any) => {
  // assume payload validated
  const job = await repo.createJob({ ...payload, employer_id: employerId, status: 'posted' });
  return mapJobRowToDTO(job as JobRow);
};

//Get job's details by id from database
export const getJobService = async (id: number) => {
  const job = await repo.findJobById(id);
  if (!job) throw new AppError('Job not found', 404);
  return mapJobRowToDTO(job);
};

// Helper function to ensure only the employer who created the job can update it
function validateEmployerOwnership(input: UpdateJobRow, existing: JobRow) {
  if ((input as any).employer_id && (input as any).employer_id !== existing.employer_id) {
    throw new AppError('Forbidden: cannot change employer', 403);
  }
}

//Update job posting row
export const updateJobService = async (id:number, input: UpdateJobRow) => {
    //Check if job exists
    const existing = await repo.findJobById(id);
    if (!existing) throw new AppError('Job not Found', 404);

    // Ownership check: only employer who created the job may update
    validateEmployerOwnership(input, existing);

    const job = await repo.updateJob(id, input);
    return mapJobRowToDTO(job as JobRow);
};

//list jobs with pagination and optional filters
export const listJobsService = async (filters: { skillId?: number; location?: string; status?: string; page?: number; limit?: number } = {}) => {
  const res = await repo.listJobs(filters as any);
  return {
    items: res.items.map((r: JobRow) => mapJobRowToDTO(r)),
    pagination: res.pagination
  };
};

// soft-delete job with ownership check
export const deleteJobService = async (employerId: number, id: number) => {
  const existing = await repo.findJobById(id);
  if (!existing) throw new AppError('Job not found', 404);
  if (existing.employer_id !== employerId) throw new AppError('Forbidden', 403);
  const ok = await repo.softDeleteJob(id);
  if (!ok) throw new AppError('Failed to delete job', 500);
  return { success: true };
  };

