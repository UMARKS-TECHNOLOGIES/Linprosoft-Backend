import { Request, Response } from "express";
import * as service from './jobService';
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";

export const createJob = catchAsync(async(req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    const job = await service.createJobService(employerId, req.body);
    return ApiResponseHandler.created(res, job, 'Job created');
});

//List jobs with optional filters and pagination

export const listJobs = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        skillId: req.query.skillId ? parseInt(req.query.skillId as string) : undefined,
        location: req.query.location as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    const jobs = await service.listJobsService(filters);
    return ApiResponseHandler.success(res, jobs, 'Jobs retrieved');
});

//Get job detail's details by id
export const getJobs = catchAsync(async (req: Request, res: Response) => {
    const id = (req as any).user.id;
    const job = await service.getJobService(id);
    return ApiResponseHandler.updated(res, job, 'Job created');

    
});
export const updateJob = catchAsync(async (req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    const jobId = parseInt(req.params.id);

    const job = await service.updateJobService(employerId, jobId, req.body);
    return ApiResponseHandler.updated(res, job, 'Job updated');
});
export const deleteJob = catchAsync(async (req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    await service.deleteJobService(employerId, parseInt(req.params.id));
    return ApiResponseHandler.deleted(res, 'Job deleted');
});
//Get job detail's details by id
export const getJob = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const job = await service.getJobService(id);
    return ApiResponseHandler.success(res, job, 'Job details retrieved');
});

//Match jobs and skills
export const matchJobToProfessionalSkill = catchAsync(async (req: Request, res: Response) => {
    const jobId = parseInt(req.params.id);
    //const limit;

    const job = await service.MatchJobsService(jobId, 20, 0);
    return ApiResponseHandler.success(res, job, 'Job Matched' )
})