import { mapCreateJobInputToRow, mapUpdateJobInputToRow } from '../../../src/modules/jobs/jobMappers';

describe('Job mappers', () => {
  it('maps CreateJobInput to DB row correctly', () => {
    const input = {
      title: 'Test Job',
      description: 'Do work',
      skillId: 5,
      budget: 1500,
      currency: 'USD',
      durationDays: 7,
      location: 'Remote',
      visibility: 'private' as const,
    };

    const row = mapCreateJobInputToRow(input as any, 42);

    expect(row.employer_id).toBe(42);
    expect(row.title).toBe('Test Job');
    expect(row.skill_id).toBe(5);
    expect(row.budget).toBe(String(1500));
    expect(row.currency).toBe('USD');
    expect(row.duration_days).toBe(7);
    expect(row.location).toBe('Remote');
    expect(row.visibility).toBe('private');
    expect(row.status).toBe('posted');
  });

  it('maps partial update input to DB patch correctly', () => {
    const input = {
      title: 'New Title',
      budget: 2000,
    };

    const patch = mapUpdateJobInputToRow(input as any);
    expect(patch.title).toBe('New Title');
    expect(patch.budget).toBe(String(2000));
    expect(patch.skill_id).toBeUndefined();
  });
});
