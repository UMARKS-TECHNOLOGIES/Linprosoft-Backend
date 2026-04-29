import request from 'supertest';
import app from '../../app';
describe('Jobs integration', () => {
  it('creates a job', async () => {
    const token = '...'; // create user fixture or use helper
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', description: 'desc', budget: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.id).toBeDefined();
  });
});