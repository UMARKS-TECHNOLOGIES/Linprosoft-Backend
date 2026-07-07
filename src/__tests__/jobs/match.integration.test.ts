import request from 'supertest';
import app from '../../app';
import { query } from '../setup';
import { testUsers } from '../fixtures/users.fixture';

describe('Jobs -> Match professionals by skill', () => {
  let employerCookie: string;
  let professionalCookie: string;
  let profileId: number;
  let jobId: number;
  let skillId: number;

  beforeAll(async () => {
    // create employer
    const su = await request(app).post('/api/auth/signup').send(testUsers.employer);
    expect(su.status).toBe(201);
    employerCookie = su.headers['set-cookie'];

    // create professional and profile
    const sp = await request(app).post('/api/auth/signup').send(testUsers.professional1);
    expect(sp.status).toBe(201);
    professionalCookie = sp.headers['set-cookie'];

    const profileRes = await request(app).post('/api/profiles').set('Cookie', professionalCookie).send({ hourlyRate: 3000 });
    expect(profileRes.status).toBe(201);
    profileId = profileRes.body.data.profile.id;

    // pick an existing skill id
    const skills = await query('SELECT id FROM skills LIMIT 1');
    skillId = skills[0].id;
  });

  it('returns matched professionals for job skill', async () => {
    // employer creates job with that skill
    const jobRes = await request(app).post('/api/jobs').set('Cookie', employerCookie).send({ title: 'Match Job', description: 'Find pro', budget: 5000, skillId, currency: 'NGN' });
    expect(jobRes.status).toBe(201);
    jobId = jobRes.body.data.id;

    // attach skill to professional profile
    const ins = await query(`INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [profileId, skillId, 'expert', 5, true]);
    expect(ins.length).toBeGreaterThan(0);

    // call matches endpoint
    const res = await request(app).get(`/api/jobs/${jobId}/matches`).set('Cookie', employerCookie);
    expect(res.status).toBe(200);
    const matches = res.body.data.data;
    expect(Array.isArray(matches)).toBe(true);
    // expect our profile to appear
    const found = matches.find((p: any) => p.id === profileId);
    expect(found).toBeDefined();

    // cleanup
    await query('DELETE FROM professional_skills WHERE professional_id = $1 AND skill_id = $2', [profileId, skillId]);
    await query('DELETE FROM job_postings WHERE id = $1', [jobId]);
  });
});
