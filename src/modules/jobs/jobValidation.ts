import { z } from "zod";

//Create a Zod schema for validating job posting data
export const createJobSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    skillId: z.coerce.number().int().positive().optional(),
    budget: z.coerce.number().positive().optional(),
    currency: z.string().trim().length(3).optional(),
    durationDays: z.coerce.number().int().positive().optional(),
    location: z.string().trim().optional(),
    visibility: z.enum(['public', 'private']).optional()
}).strict();

//Update job posting schema - all fields optional for partial updates
export const updateJobSchema = createJobSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required"
);

//List jobs query schema - for validating query parameters when listing jobs
export const listJobsQuerySchema = z.object({
    skillId: z.coerce.number().int().positive().optional(),
    location: z.string().trim().optional(),
    status: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
}).strict();

//Route param schema for endpoints that receive a job id
export const jobIdParamSchema = z.object({
    id: z.coerce.number().int().positive("Job id must be a positive number")
});
