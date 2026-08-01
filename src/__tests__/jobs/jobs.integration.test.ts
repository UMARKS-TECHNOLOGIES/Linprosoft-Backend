import request from 'supertest';
import app from '../../app';
import { createAndLogin } from '../helpers/authHelper';

describe('Jobs integration', () => {
  it('creates a job', async () => {
    const token = await createAndLogin('employer');
    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', `accessToken=${token}`)
      .send({ title: 'Test', description: 'desc', budget: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('lists only jobs created by the logged-in employer on /api/jobs/me', async () => {
    const token = await createAndLogin('employer');
    const createRes = await request(app)
      .post('/api/jobs')
      .set('Cookie', `accessToken=${token}`)
      .send({ title: 'Employer Dashboard Job', description: 'visible only for owner', budget: 2000 });

    expect(createRes.status).toBe(201);

    const res = await request(app)
      .get('/api/jobs/me')
      .set('Cookie', `accessToken=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.some((job: any) => job.id === createRes.body.data.id)).toBe(true);
  });
});