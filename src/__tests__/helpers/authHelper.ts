import request from 'supertest';
import app from '../../app';
import { testUsers } from '../fixtures/users.fixture';
import * as authService from '../../modules/auth/authService';

async function extractTokenFromSetCookie(
  setCookie: string[] | string | undefined
) {
  if (!setCookie) return null;

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

  const tokenCookie = cookies.find(
    (c) => c.startsWith('accessToken=') || c.startsWith('token=')
  );

  if (!tokenCookie) return null;

  return tokenCookie.split(';')[0].split('=')[1];
}
export async function createAndLogin(userType: 'employer' | 'professional' = 'employer') {
  const user = userType === 'employer' ? testUsers.employer : testUsers.professional1;

  // Try HTTP signup/login first
  await request(app).post('/api/auth/signup').send(user);
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });

  let token = await extractTokenFromSetCookie(
    loginRes.headers['set-cookie']
  );
  if (token) return token;

  // Fallback: call authService.signup directly to get tokens (bypass cookies)
  const result = await authService.signup({
    email: user.email,
    password: user.password,
    passwordConfirm: user.passwordConfirm,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    compName: (user as any).compName,
  } as any);

  if (result && result.accessToken) return result.accessToken;
  throw new Error('Failed to obtain auth token');
}

export default { createAndLogin };
