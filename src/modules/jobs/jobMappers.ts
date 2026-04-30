
import { CreateJobInput } from '../../types/jobTypes';
import { JobRow, UpdateJobInput } from '../../types/jobTypes';

export const mapCreateJobInputToRow = (input: CreateJobInput, employerId: number): Partial<JobRow> => {
  // whitelist allowed API fields and map to DB columns
  const row: Partial<JobRow> = {
    employer_id: employerId,
    title: input.title,
    description: input.description,
    skill_id: input.skillId ?? null,
    budget: input.budget !== undefined ? String(input.budget) : null, // DB stores numeric as string sometimes
    currency: input.currency ?? null,
    duration_days: input.durationDays ?? null,
    location: input.location ?? null,
    visibility: input.visibility ?? 'public',
    status: 'posted'
  };
  return row;
};

// For patch/update: map only known fields
export const mapUpdateJobInputToRow = (input: UpdateJobInput): Partial<JobRow> => {
  const allowed: Record<string, any> = {};
  if (input.title !== undefined) allowed.title = input.title;
  if (input.description !== undefined) allowed.description = input.description;
  if (input.skillId !== undefined) allowed.skill_id = input.skillId;
  if (input.budget !== undefined) allowed.budget = String(input.budget);
  if (input.currency !== undefined) allowed.currency = input.currency;
  if (input.durationDays !== undefined) allowed.duration_days = input.durationDays;
  if (input.location !== undefined) allowed.location = input.location;
  if (input.visibility !== undefined) allowed.visibility = input.visibility;
  return allowed;
};