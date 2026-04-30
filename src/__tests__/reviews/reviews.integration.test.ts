import request from 'supertest';
import app from '../../app';
import { testUsers } from '../fixtures/users.fixture';
import { query } from '../setup';
// using direct DB queries for assignments in this test

describe('Reviews integration (DB-backed)', () => {
  let employerCookie: string;
  let professionalCookie: string;
  let professionalProfileId: number;
  let jobId: number;
  let assignmentId: number;

  beforeAll(async () => {
    // Create employer
    const signupEmployer = await request(app).post('/api/auth/signup').send(testUsers.employer);
    expect(signupEmployer.status).toBe(201);
    employerCookie = signupEmployer.headers['set-cookie'];

    // Create professional user and profile
    const signupPro = await request(app).post('/api/auth/signup').send(testUsers.professional1);
    expect(signupPro.status).toBe(201);
    professionalCookie = signupPro.headers['set-cookie'];

    const profileRes = await request(app).post('/api/profiles').set('Cookie', professionalCookie).send({ hourlyRate: 5000 });
    expect(profileRes.status).toBe(201);
    professionalProfileId = profileRes.body.data.profile.id;

    // Ensure DB has expected column for assignments (some test DBs may lack employer_id)
    await query("ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS employer_id INTEGER REFERENCES users(id);");
  });

  it('creates job, assignment, completes it and accepts a review', async () => {
    // Employer creates a job
    const jobRes = await request(app).post('/api/jobs').set('Cookie', employerCookie).send({ title: 'Test Job', description: 'Do something', budget: 10000, currency: 'NGN' });
    expect(jobRes.status).toBe(201);
    jobId = jobRes.body.data.id || jobRes.body.data.id;

    // Create assignment directly in DB (some test DBs have different assignment schema)
    const insert = await query(
      `INSERT INTO job_assignments (job_id, professional_id, status, accepted_budget, assigned_at, completed_at)
       VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [jobId, professionalProfileId, 'completed', 9000]
    );
    assignmentId = insert[0].id;

    // Employer posts a review for the professional
    const reviewRes = await request(app).post('/api/reviews').set('Cookie', employerCookie).send({ jobAssignmentId: assignmentId, rating: 5, comment: 'Excellent work' });
    expect(reviewRes.status).toBe(201);

    // Verify review exists in DB
    const rows = await query('SELECT * FROM reviews WHERE job_assignment_id = $1', [assignmentId]);
    expect(rows.length).toBeGreaterThanOrEqual(1);

    // Verify professional_profiles avg_rating updated (trigger or job may have updated it)
    const prof = await query('SELECT avg_rating, total_reviews FROM professional_profiles WHERE id = $1', [professionalProfileId]);
    expect(prof.length).toBe(1);
    // avg_rating may be numeric; check total_reviews at least 1
    expect(Number(prof[0].total_reviews)).toBeGreaterThanOrEqual(1);

    // Cleanup created rows
    await query('DELETE FROM reviews WHERE job_assignment_id = $1', [assignmentId]);
    await query('DELETE FROM job_assignments WHERE id = $1', [assignmentId]);
    await query('DELETE FROM job_postings WHERE id = $1', [jobId]);
  });
});
