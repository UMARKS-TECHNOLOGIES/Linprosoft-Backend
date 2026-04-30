import { Request, Response } from "express";
import * as service from './jobService';
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";

export const createJob = catchAsync(async(req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    const job = await service.createJobService(employerId, req.body);
    return ApiResponseHandler.created(res, job, 'Job created');
});

export const listJobs = catchAsync(async () => {
});

//Get job detail's details by id
export const getJobs = catchAsync(async (req: Request, res: Response) => {
    const id = (req as any).user.id;
    const job = await service.getJobService(id);
    return ApiResponseHandler.updated(res, job, 'Job created');

    
});
export const updateJob = catchAsync(async (req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    const jobId = Number(req.params.id);

    const job = await service.updateJobService(employerId, jobId, req.body);
    return ApiResponseHandler.updated(res, job, 'Job updated');
});
export const deleteJob = catchAsync(async (req: Request, res: Response) => {
    const id = (req as any).user.id;
    await service.deleteJobService(id, parseInt(req.params.id));
    return ApiResponseHandler.deleted(res, 'Job deleted');
});
//Get job detail's details by id
export const getJob = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const job = await service.getJobService(id);
    return ApiResponseHandler.success(res, job, 'Job details retrieved');
});
