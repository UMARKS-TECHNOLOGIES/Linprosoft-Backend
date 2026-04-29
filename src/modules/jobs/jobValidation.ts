import { z } from "zod";

//Create a Zod schema for validating job posting data
export const createJobSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    skillId: z.number().optional(),
    budget: z.number().optional(),
    currency: z.string().optional(),
    durationDays: z.number().optional(),
    location: z.string().optional(),
    visibility: z.enum(['public', 'private']).optional()
});

//Update job posting schema - all fields optional for partial updates
export const updateJobSchema = createJobSchema.partial();

//List jobs query schema - for validating query parameters when listing jobs
export const listJobsQuerySchema = z.object({
    skillId: z.string().optional(),
    location: z.string().optional(),
    status: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional()
});
