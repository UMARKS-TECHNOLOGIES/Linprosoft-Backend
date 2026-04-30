import request from 'supertest';
import app from '../../app';
import { createAndLogin } from '../helpers/authHelper';

describe('Jobs integration', () => {
  it('creates a job', async () => {
    const token = await createAndLogin('employer');
    // debug token
    // eslint-disable-next-line no-console
    console.log('TEST DEBUG token length:', token ? token.length : 0);
    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', `accessToken=${token}`)
      .send({ title: 'Test', description: 'desc', budget: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // `createJob` returns the job object as `data`, not `{ job: ... }`
    expect(res.body.data.id).toBeDefined();
  });
});