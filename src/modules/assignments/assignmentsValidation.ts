import { z } from "zod";

export const createJobAssignmentSchema = z.object({
    jobId: z.number(),
    professionalId: z.number().optional(),
    acceptedBudget: z.number().optional()
});

export const assignmentActionSchema = z.object({
    assignmentId: z.number()
});

export const listAssignmentsSchema = z.object({
    // This can be extended with filters and pagination parameters
    page: z.number().default(1),
    limit: z.number().default(10)
});

export const updateAssignmentSchema = z.object({
    assignmentId: z.number(),
    acceptedBudget: z.number().optional(),
    status: z.enum(['invited', 'accepted', 'completed', 'cancelled']).optional()
});

export const deleteAssignmentSchema = z.object({    
    assignmentId: z.number()});

export const getAssignmentByIdSchema = z.object({
    assignmentId: z.number()
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

export const approveSatisfactionSchema = z.object({
    notes: z.string().trim().max(1000).optional(),
});

export const disputeSatisfactionSchema = z.object({
    reason: z.string().trim().min(1).max(1000),
    notes: z.string().trim().max(1000).optional(),
});