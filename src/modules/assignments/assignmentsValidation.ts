import { z } from "zod";

export const createJobAssignmentSchema = z.object({
    jobId: z.number(),
    professionalId: z.number().optional(),
    acceptedBudget: z.number().optional()
});

export const assignmentActionSchema = z.object({
    assignmentId: z.number()
});