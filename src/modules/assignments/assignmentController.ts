import { Request, Response } from "express";
import * as service from './assignmentsService';
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";


//Create an assignment
//Employer can invite a professional to perform a job. This creates an assignment with status 'invited'.
export const createAssignment = catchAsync(async(req: Request, res: Response) => {
    const employerId = (req as any).user.id;
    const assignment = await service.inviteProfessional(employerId, req.body);
    return ApiResponseHandler.created(res, assignment, 'Assignment created');
});

//Professional accepts the job assignment
//Professional can accept an assignment that they have been invited to. This updates the assignment's status to 'accepted'.
export const acceptAssignment = catchAsync(async(req: Request, res: Response) => {
    const professionalId = (req as any).user.id;
    const assignmentId = parseInt(req.params.id);

    const updated = await service.acceptAssignment(assignmentId, professionalId);
    return ApiResponseHandler.success(res, updated, 'Assignment accepted');
});

//List assignments with optional filters and pagination
export const listAssignments = catchAsync(async (_req: Request, res: Response) => {
    // This can be implemented to list assignments with filters and pagination
    return ApiResponseHandler.success(res, [], 'List of assignments');
});

export const getAssignmentById = catchAsync(async (_req: Request, res: Response) => {
    // This can be implemented to get assignment details by ID
    return ApiResponseHandler.success(res, {}, 'Assignment details');
}); 

//Update an assignment
export const updateAssignment = catchAsync(async (_req: Request, res: Response) => {
    // This can be implemented to update assignment details
    return ApiResponseHandler.success(res, {}, 'Assignment updated');
});

//Delete an assignment
export const deleteAssignment = catchAsync(async (_req: Request, res: Response) => {
    // This can be implemented to delete an assignment
    return ApiResponseHandler.success(res, {}, 'Assignment deleted');
});