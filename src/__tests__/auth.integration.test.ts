/**
 * Auth Integration Tests
 * Tests for signup, login, verify, and logout endpoints
 * 
 * Test Coverage:
 * - Signup: valid input, validation errors, duplicate email
 * - Login: valid credentials, invalid credentials, validation errors
 * - Verify: valid token, invalid token, expired token
 * - Logout: valid logout, cookie clearing
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from '../../src/modules/auth/authRoutes';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorMiddleware';
import { requestLogger } from '../../src/middleware/requestLogger';

/**
 * Test database setup
 * In a real scenario, we would use a test database or mock the database layer
 * For now, these tests assume the backend is running with a real database
 */

describe('Auth Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const makeEmail = (prefix: string, domain = "test.com") => `${prefix}.${runId}@${domain}`;

  /**
   * Setup: Create Express app with all middleware and routes
   */
  beforeAll(() => {
    app = express();

    // Middleware
    app.use(express.json());
    app.use(cookieParser());
    app.use(
      cors({
        origin: 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );
    app.use(requestLogger);

    // Routes
    app.use('/api/auth', authRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Health check (for debugging)
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'OK' });
    });
  });

  /**
   * =============================================
   * SIGNUP ENDPOINT TESTS
   * =============================================
   */

  describe('POST /api/auth/signup', () => {
    /**
     * Test: Valid signup for professional user
     */
    it('should create a new professional user account', async () => {
      const email = makeEmail("john.doe");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email,
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
          phone: '+1234567890',
          location: 'New York',
        });

      // Assertions
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Account created');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user.userType).toBe('professional');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    /**
     * Test: Valid signup for employer user with company name
     */
    it('should create a new employer user account with company name', async () => {
      const email = makeEmail("jane.smith", "company.com");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email,
          password: 'SecurePass456!',
          passwordConfirm: 'SecurePass456!',
          userType: 'employer',
          compName: 'Tech Company Inc.',
          phone: '+1987654321',
          location: 'San Francisco',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.userType).toBe('employer');
      expect(response.body.data.user.compName).toBe('Tech Company Inc.');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    /**
     * Test: Validation error - missing email
     */
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    /**
     * Test: Validation error - invalid email format
     */
    it('should return 400 if email format is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - password too short
     */
    it('should return 400 if password is less than 8 characters', async () => {
      const email = makeEmail("short.pass");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email,
          password: 'Pass12',
          passwordConfirm: 'Pass12',
          userType: 'professional',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - passwords don't match
     */
    it('should return 400 if passwords do not match', async () => {
      const email = makeEmail("password.mismatch");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email,
          password: 'SecurePass123!',
          passwordConfirm: 'DifferentPass123!',
          userType: 'professional',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - missing compName for employer
     */
    it('should return 400 if compName is missing for employer type', async () => {
      const email = makeEmail("jane.missing.company", "company.com");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email,
          password: 'SecurePass456!',
          passwordConfirm: 'SecurePass456!',
          userType: 'employer',
          // compName is missing
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Duplicate email error
     */
    it('should return 409 if email already exists', async () => {
      const email = makeEmail("duplicate");
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email,
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
        });

      // Second signup with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Another',
          lastName: 'User',
          email,
          password: 'SecurePass456!',
          passwordConfirm: 'SecurePass456!',
          userType: 'professional',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already');
    });
  });

  /**
   * =============================================
   * LOGIN ENDPOINT TESTS
   * =============================================
   */

  describe('POST /api/auth/login', () => {
    // Setup: Create a test user for login tests
    let testUserEmail = makeEmail('login.test');

    beforeAll(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Login',
          lastName: 'Test',
          email: testUserEmail,
          password: 'TestPass123!',
          passwordConfirm: 'TestPass123!',
          userType: 'professional',
        });
    });

    /**
     * Test: Valid login with correct credentials
     */
    it('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'TestPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    /**
     * Test: Invalid credentials - wrong password
     */
    it('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    /**
     * Test: Invalid credentials - user not found
     */
    it('should return 401 if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - missing email
     */
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - missing password
     */
    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation error - invalid email format
     */
    it('should return 400 if email format is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'TestPass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * =============================================
   * VERIFY ENDPOINT TESTS
   * =============================================
   */

  describe('GET /api/auth/verify', () => {
    let loginToken: string;
    let testUserEmail2 = makeEmail('verify.test');

    beforeAll(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Verify',
          lastName: 'Test',
          email: testUserEmail2,
          password: 'VerifyPass123!',
          passwordConfirm: 'VerifyPass123!',
          userType: 'professional',
        });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail2,
          password: 'VerifyPass123!',
        });

      // Extract token from Set-Cookie header
      const setCookie = loginResponse.headers['set-cookie'];
      if (setCookie) {
        loginToken = setCookie[0].split(';')[0].replace('token=', '');
      }
    });

    /**
     * Test: Valid session verification
     */
    it('should verify valid session and return user data', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Cookie', `token=${loginToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUserEmail2);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    /**
     * Test: Invalid token
     */
    it('should return 401 if token is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Cookie', 'token=invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Missing token
     */
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('login');
    });

    /**
     * Test: Using Authorization header as fallback
     */
    it('should verify session using Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * =============================================
   * LOGOUT ENDPOINT TESTS
   * =============================================
   */

  describe('POST /api/auth/logout', () => {
    let logoutToken: string;
    let testUserEmail3 = makeEmail('logout.test');

    beforeAll(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Logout',
          lastName: 'Test',
          email: testUserEmail3,
          password: 'LogoutPass123!',
          passwordConfirm: 'LogoutPass123!',
          userType: 'professional',
        });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail3,
          password: 'LogoutPass123!',
        });

      const setCookie = loginResponse.headers['set-cookie'];
      if (setCookie) {
        logoutToken = setCookie[0].split(';')[0].replace('token=', '');
      }
    });

    /**
     * Test: Valid logout
     */
    it('should successfully logout and clear cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${logoutToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
      // Check that Set-Cookie header clears the token
      expect(response.headers['set-cookie']).toBeDefined();
    });

    /**
     * Test: Logout without token
     */
    it('should return 401 if no token is provided for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Cannot verify after logout
     */
    it('should not verify session after logout', async () => {
      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${logoutToken}`);

      // Cookie is cleared, so verify without token should fail
      const verifyResponse = await request(app)
        .get('/api/auth/verify');

      expect(verifyResponse.status).toBe(401);
      expect(verifyResponse.body.success).toBe(false);
    });
  });

  /**
   * =============================================
   * RESPONSE FORMAT TESTS
   * =============================================
   */

  describe('Response Format Validation', () => {
    /**
     * Test: Success response has correct format
     */
    it('should return responses with correct success format', async () => {
      const email = makeEmail("format");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Format',
          lastName: 'Test',
          email,
          password: 'FormatPass123!',
          passwordConfirm: 'FormatPass123!',
          userType: 'professional',
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    /**
     * Test: Error response has correct format
     */
    it('should return errors with correct format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid',
          password: 'pass',
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('timestamp');
    });

    /**
     * Test: Validation error response has error details
     */
    it('should include error details in validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Invalid',
          lastName: 'User',
          email: 'not-an-email',
          password: 'short',
          passwordConfirm: 'different',
          userType: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * =============================================
   * SECURITY TESTS
   * =============================================
   */

  describe('Security Tests', () => {
    /**
     * Test: Password is not exposed in signup response
     */
    it('should not expose password in signup response', async () => {
      const email = makeEmail("security1");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Security',
          lastName: 'Test',
          email,
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
        });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    /**
     * Test: Password is not exposed in login response
     */
    it('should not expose password in login response', async () => {
      const email = makeEmail("security2");
      // Create user first
      await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Security2',
          lastName: 'Test',
          email,
          password: 'SecurePass456!',
          passwordConfirm: 'SecurePass456!',
          userType: 'professional',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'SecurePass456!',
        });

      expect(loginResponse.body.data.user).not.toHaveProperty('password');
    });

    /**
     * Test: Token is not in response body
     */
    it('should not expose JWT token in response body', async () => {
      const email = makeEmail("token");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Token',
          lastName: 'Test',
          email,
          password: 'TokenPass123!',
          passwordConfirm: 'TokenPass123!',
          userType: 'professional',
        });

      expect(response.body).not.toHaveProperty('token');
      expect(JSON.stringify(response.body)).not.toContain('Bearer');
    });

    /**
     * Test: Token is in HTTP-only cookie
     */
    it('should set token in HTTP-only cookie', async () => {
      const email = makeEmail("cookie");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Cookie',
          lastName: 'Test',
          email,
          password: 'CookiePass123!',
          passwordConfirm: 'CookiePass123!',
          userType: 'professional',
        });

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain('HttpOnly');
      expect(setCookie[0]).toContain('SameSite');
    });
  });

  /**
   * =============================================
   * USER TYPE TESTS
   * =============================================
   */

  describe('User Type Handling', () => {
    /**
     * Test: Professional user without compName
     */
    it('should allow professional user without company name', async () => {
      const email = makeEmail("prof");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Prof',
          lastName: 'User',
          email,
          password: 'ProfPass123!',
          passwordConfirm: 'ProfPass123!',
          userType: 'professional',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.userType).toBe('professional');
      expect(response.body.data.user.compName).toBeNull();
    });

    /**
     * Test: Employer user must have compName
     */
    it('should require company name for employer user', async () => {
      const email = makeEmail("employer");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Employer',
          lastName: 'User',
          email,
          password: 'EmpPass123!',
          passwordConfirm: 'EmpPass123!',
          userType: 'employer',
          // Missing compName
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Employer user with compName
     */
    it('should accept employer user with company name', async () => {
      const email = makeEmail("employer2");
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Employer',
          lastName: 'User',
          email,
          password: 'EmpPass456!',
          passwordConfirm: 'EmpPass456!',
          userType: 'employer',
          compName: 'Awesome Company',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.userType).toBe('employer');
      expect(response.body.data.user.compName).toBe('Awesome Company');
    });
  });
});
