import * as repo from './jobsRepository';
import { AppError } from '../../utils/appError';
import { JobRow, mapJobRowToDTO, UpdateJobInput, UpdateJobRow, CreateJobInput } from '../../types/jobTypes';
import { mapCreateJobInputToRow, mapUpdateJobInputToRow } from './jobMappers';

export const createJobService = async (employerId: number, payload: CreateJobInput) => {
  // payload should be validated by controller Zod schema
  const row = mapCreateJobInputToRow(payload, employerId);
  const job = await repo.createJob(row as any);
  return mapJobRowToDTO(job as JobRow);
};

//Get job's details by id from database
export const getJobService = async (id: number) => {
  const job = await repo.findJobById(id);
  if (!job) throw new AppError('Job not found', 404);
  return mapJobRowToDTO(job);
};

//Update job posting row
export const updateJobService = async (employerId: number, jobId: number, input: UpdateJobInput) => {
    //Check if job exists
    const existing = await repo.findJobById(jobId);
    if (!existing) throw new AppError('Job not Found', 404);

    // Ownership check: only employer who created the job may update
    if (existing.employer_id !== employerId) {
      throw new AppError('Forbidden', 403);
    }

    const patch = mapUpdateJobInputToRow(input);

    const job = await repo.updateJob(jobId, patch as UpdateJobRow);
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


//Match jobs to Professional Skills
export const MatchJobsService = async (jobId: number, limit=20, offset=0 ) => {
  

    const matches = await repo.findMatchesForJob(jobId, limit, offset);
    
    return {
      success: true,
      data: matches, 
      pagination: {
        limit,
        offset,

        total: matches.length
      }
    };
};
