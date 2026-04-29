import * as repo from './assignmentRepository';
import * as jobRepo from '../jobs/jobsRepository';
import { AppError } from "../../utils/appError";

//Invite a professional to perfom a job
export const inviteProfessional = async (employerId:number, {jobId, professionalId, acceptedBudget }: any ) => {
    const job = await jobRepo.findJobById(jobId);

    if (!job) throw new AppError('Job not found', 404);
    if (job.employer_id !== employerId) throw new AppError('Forbidden', 403);

    const assignment = await repo.createAssignment({
        job_id: jobId,
        professional_id: professionalId,
        employer_id: employerId,
        status: 'invited',
        accepted_budget: acceptedBudget ?? null
    });
    return assignment;
};

export const acceptAssignment = async (assignmentId:number, professionalId: number) => {
    const assignment = await repo.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError('Assignment not Found', 404);
    if (assignment.professional_id !== professionalId) throw new AppError('Forbidden', 403);

    const updated = await repo.updateAssignmentStatus(assignmentId, 'accepted', { accepted_budget: assignment.accepted_budget});
    return updated;
};