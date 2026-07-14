/**
 * Profile Integration Tests
 * Tests for professional profile CRUD operations
 * 
 * Test Coverage:
 * - Create profile (valid, validation errors, conflict)
 * - Get profile (own, other's, not found)
 * - Update profile (valid, partial, validation errors)
 * - Delete profile (success, not found)
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import profileRoutes from '../../modules/profile/profileRoutes';
import authRoutes from '../../modules/auth/authRoutes';
import { errorHandler } from '../../middleware/errorMiddleware';
import { requestLogger } from '../../middleware/requestLogger';
import jwt from 'jsonwebtoken';
//import { JwtPayload } from '../../types/authTypes';

describe('Profile Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  
  // Test data
  let professionalToken: string;
  let professionalUserId: number;
  let employerToken: string;
  const testProfessional = {
    firstName: 'John',
    lastName: 'Developer',
    email: `john.dev.${runId}@test.com`,
    password: 'SecurePass123!',
    passwordConfirm: 'SecurePass123!',
    userType: 'professional' as const,
  };

  const testEmployer = {
    firstName: 'Jane',
    lastName: 'Employer',
    email: `jane.emp.${runId}@test.com`,
    password: 'SecurePass123!',
    passwordConfirm: 'SecurePass123!',
    userType: 'employer' as const,
    compName: 'Test Company',
  };

  /**
   * Setup: Create Express app with routes
   */
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
    app.use(requestLogger);
    
    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);
    
    app.use(errorHandler);
  });

  /**
   * Helper: Create JWT token for testing
   */
  const createToken = (userId: number, userType: string): string => {
    return jwt.sign(
      { id: userId, userType },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
  };

  /**
   * Setup: Create test users before running tests
   */
  beforeAll(async () => {
    // Signup professional
    const profSignup = await request(app)
      .post('/api/auth/signup')
      .send(testProfessional);
    
    expect(profSignup.status).toBe(201);
    professionalUserId = profSignup.body.data.user.id;
    professionalToken = createToken(professionalUserId, 'professional');

    // Signup employer
    const empSignup = await request(app)
      .post('/api/auth/signup')
      .send(testEmployer);
    
    expect(empSignup.status).toBe(201);
    employerToken = createToken(empSignup.body.data.user.id, 'employer');
  });

  /**
   * =============================================
   * CREATE PROFILE TESTS
   * =============================================
   */

  describe('POST /api/profiles', () => {
    /**
     * Test: Create profile with valid data
     */
    it('should create a professional profile with valid data', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          hourlyRate: 5000,
          bio: 'Experienced Node.js developer with 5+ years',
          availabilityStatus: 'available',
          responseTimeHours: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toHaveProperty('id');
      expect(response.body.data.profile.hourlyRate).toBe(5000);
      expect(response.body.data.profile.bio).toContain('Node.js');
      expect(response.body.data.profile.availabilityStatus).toBe('available');
    });

    /**
     * Test: Create profile with minimal data
     */
    it('should create profile with optional fields omitted', async () => {
      const newProf = {
        firstName: 'Jane',
        lastName: 'Coder',
        email: `jane.code.${runId}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(newProf);

      const token = createToken(signup.body.data.user.id, 'professional');

      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({
          hourlyRate: 3000,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.profile.hourlyRate).toBe(3000);
      expect(response.body.data.profile.bio).toBeNull();
    });

    /**
     * Test: Create profile without authentication
     */
    it('should reject profile creation without JWT token', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({
          hourlyRate: 5000,
          bio: 'Test bio',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('login');
    });

    /**
     * Test: Employer cannot create profile
     */
    it('should reject profile creation for non-professional users', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${employerToken}`])
        .send({
          hourlyRate: 5000,
          bio: 'Test bio',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('professional');
    });

    /**
     * Test: Cannot create duplicate profile
     */
    it('should reject profile creation if already exists', async () => {
      // First creation should succeed
      const first = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${professionalToken}`])
        .send({ hourlyRate: 4000 });

      expect(first.status).toBe(201);

      // Second creation should fail
      const second = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${professionalToken}`])
        .send({ hourlyRate: 5000 });

      expect(second.status).toBe(409);
      expect(second.body.message).toContain('already has');
    });

    /**
     * Test: Validation - hourlyRate positive number
     */
    it('should reject invalid hourly rate', async () => {
      const newProf = {
        firstName: 'Test',
        lastName: 'User',
        email: `test.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(newProf);

      const token = createToken(signup.body.data.user.id, 'professional');

      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({
          hourlyRate: -1000, // Invalid: negative
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    /**
     * Test: Validation - availabilityStatus enum
     */
    it('should reject invalid availability status', async () => {
      const newProf = {
        firstName: 'Test',
        lastName: 'User',
        email: `test2.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(newProf);

      const token = createToken(signup.body.data.user.id, 'professional');

      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({
          hourlyRate: 5000,
          availabilityStatus: 'invalid_status',
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - bio max length
     */
    it('should reject bio exceeding max length', async () => {
      const newProf = {
        firstName: 'Test',
        lastName: 'User',
        email: `test3.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(newProf);

      const token = createToken(signup.body.data.user.id, 'professional');

      const longBio = 'a'.repeat(2001); // Exceeds 2000 char limit

      const response = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({
          hourlyRate: 5000,
          bio: longBio,
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * GET PROFILE TESTS
   * =============================================
   */

  describe('GET /api/profiles/:userId', () => {
    /**
     * Test: Get public profile
     */
    it('should retrieve public profile without authentication', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toHaveProperty('id');
      expect(response.body.data.profile.user).toBeDefined();
      expect(response.body.data.profile.user).toHaveProperty('firstName');
    });

    /**
     * Test: Get non-existent profile
     */
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profiles/99999999');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    /**
     * Test: Invalid userId parameter
     */
    it('should reject invalid userId parameter', async () => {
      const response = await request(app)
        .get('/api/profiles/invalid-id');

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * GET MY PROFILE TESTS
   * =============================================
   */

  describe('GET /api/profiles/me', () => {
    /**
     * Test: Get authenticated user's profile
     */
    it('should retrieve own profile with authentication', async () => {
      const response = await request(app)
        .get('/api/profiles/me')
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toHaveProperty('id');
      expect(response.body.data.profile.userId).toBe(professionalUserId);
    });

    /**
     * Test: Cannot get own profile without authentication
     */
    it('should reject own profile request without JWT', async () => {
      const response = await request(app)
        .get('/api/profiles/me');

      expect(response.status).toBe(401);
    });
  });

  /**
   * =============================================
   * UPDATE PROFILE TESTS
   * =============================================
   */

  describe('PUT /api/profiles/me', () => {
    /**
     * Test: Update profile with valid data
     */
    it('should update profile with valid data', async () => {
      const response = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          hourlyRate: 6000,
          bio: 'Updated bio - Senior Developer',
          availabilityStatus: 'away',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.hourlyRate).toBe(6000);
      expect(response.body.data.profile.bio).toContain('Senior');
      expect(response.body.data.profile.availabilityStatus).toBe('away');
    });

    /**
     * Test: Partial update (only update some fields)
     */
    it('should update only specified fields', async () => {
      const response = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          bio: 'Another bio update',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.bio).toBe('Another bio update');
      // hourlyRate should remain from previous update
      expect(response.body.data.profile.hourlyRate).toBe(6000);
    });

    /**
     * Test: Update without authentication
     */
    it('should reject profile update without JWT', async () => {
      const response = await request(app)
        .put('/api/profiles/me')
        .send({ hourlyRate: 7000 });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Update with invalid data
     */
    it('should reject update with negative hourly rate', async () => {
      const response = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          hourlyRate: -5000,
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Update requires at least one field
     */
    it('should reject empty update', async () => {
      const response = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', [`token=${professionalToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one field');
    });
  });

  /**
   * =============================================
   * DELETE PROFILE TESTS
   * =============================================
   */

  describe('DELETE /api/profiles/me', () => {
    /**
     * Test: Delete profile successfully
     */
    it('should delete own profile', async () => {
      // Create new user to delete
      const newProf = {
        firstName: 'Delete',
        lastName: 'Me',
        email: `delete.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(newProf);

      const token = createToken(signup.body.data.user.id, 'professional');

      // Create profile first
      await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({ hourlyRate: 5000 });

      // Delete profile
      const deleteRes = await request(app)
        .delete('/api/profiles/me')
        .set('Cookie', [`token=${token}`]);

      expect(deleteRes.status).toBe(204);

      // Verify profile is deleted
      const getRes = await request(app)
        .get('/api/profiles/me')
        .set('Cookie', [`token=${token}`]);

      expect(getRes.status).toBe(404);
    });

    /**
     * Test: Delete without authentication
     */
    it('should reject profile delete without JWT', async () => {
      const response = await request(app)
        .delete('/api/profiles/me');

      expect(response.status).toBe(401);
    });

    /**
     * Test: Delete non-existent profile
     */
    it('should return 404 when deleting non-existent profile', async () => {
      const newToken = createToken(99999, 'professional');

      const response = await request(app)
        .delete('/api/profiles/me')
        .set('Cookie', [`token=${newToken}`]);

      expect(response.status).toBe(404);
    });
  });

  /**
   * =============================================
   * RESPONSE FORMAT TESTS
   * =============================================
   */

  describe('Response Format', () => {
    /**
     * Test: Response includes required fields
     */
    it('should return profile with all required fields', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}`);

      const profile = response.body.data.profile;

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('userId');
      expect(profile).toHaveProperty('hourlyRate');
      expect(profile).toHaveProperty('bio');
      expect(profile).toHaveProperty('availabilityStatus');
      expect(profile).toHaveProperty('responseTimeHours');
      expect(profile).toHaveProperty('avgRating');
      expect(profile).toHaveProperty('totalReviews');
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');
    });

    /**
     * Test: Response timestamp is valid
     */
    it('should include valid timestamp in response', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}`);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).not.toBeNaN();
    });
  });
});
