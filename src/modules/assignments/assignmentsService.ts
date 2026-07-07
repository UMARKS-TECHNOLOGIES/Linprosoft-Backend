import * as repo from './assignmentRepository';
import * as jobRepo from '../jobs/jobsRepository';
import { AppError } from "../../utils/appError";
import PaymentsRepository from '../payments/paymentsRepository';
import PaymentDisputesRepository from '../payments/paymentDisputesRepository';
import pool from '../../config/db';

//Invite a professional to perfom a job
//Employer can invite a professional to perform a job. This creates an assignment with status 'invited'.
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

//Professional accepts the job assignment
export const acceptAssignment = async (assignmentId:number, professionalId: number) => {
    const assignment = await repo.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError('Assignment not Found', 404);
    if (assignment.professional_id !== professionalId) throw new AppError('Forbidden', 403);

    const updated = await repo.updateAssignmentStatus(assignmentId, 'accepted', { accepted_budget: assignment.accepted_budget});
    return updated;
};

export const approveSatisfaction = async (assignmentId: number, employerId: number) => {
    const assignment = await repo.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (assignment.employer_id !== employerId) throw new AppError('Forbidden', 403);
    if (assignment.status !== 'completed') throw new AppError('Assignment must be completed before approving satisfaction', 400);

    // Use PaymentsRepository helper to set satisfaction status and employer_approved_at
    const paymentsRepo = new PaymentsRepository(pool);
    const updated = await paymentsRepo.updateSatisfactionStatus(assignmentId, 'satisfied');

    // TODO: If payment already held_in_escrow and admin approved, consider queuing release
    return updated;
};

export const disputeSatisfaction = async (assignmentId: number, employerId: number, reason: string, notes?: string) => {
    const assignment = await repo.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (assignment.employer_id !== employerId) throw new AppError('Forbidden', 403);
    if (assignment.status !== 'completed') throw new AppError('Assignment must be completed before disputing satisfaction', 400);

    // Mark satisfaction as disputed
    const paymentsRepo = new PaymentsRepository(pool);
    const updated = await paymentsRepo.updateSatisfactionStatus(assignmentId, 'disputed');

    // TODO: Create payment_disputes record and notify admin for dispute resolution
        const disputesRepo = new PaymentDisputesRepository(pool);
        const dispute = await disputesRepo.createDispute({
            job_assignment_id: assignmentId,
            initiator_id: employerId,
            reason,
            notes: notes,
        });

        // Notify admin via background job (TODO)
        console.warn('Satisfaction disputed for assignment', assignmentId, 'dispute id:', dispute.id);
        return { assignment: updated, dispute };
};