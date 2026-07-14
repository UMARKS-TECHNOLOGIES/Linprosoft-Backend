/**
 * Certification Integration Tests
 * Tests for professional certification management
 * 
 * Test Coverage:
 * - Create certification
 * - Read certification
 * - Update certification
 * - Delete certification
 * - List certifications
 * - Date validation (issue/expiry)
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import certificationRoutes from '../../modules/certification/certificationRoutes';
import profileRoutes from '../../modules/profile/profileRoutes';
import authRoutes from '../../modules/auth/authRoutes';
import { errorHandler } from '../../middleware/errorMiddleware';
import { requestLogger } from '../../middleware/requestLogger';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types/authTypes';

describe('Certification Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Test data
  let professionalToken: string;
  let professionalUserId: number;

  const testProfessional = {
    firstName: 'Cert',
    lastName: 'Master',
    email: `cert.master.${runId}@test.com`,
    password: 'SecurePass123!',
    passwordConfirm: 'SecurePass123!',
    userType: 'professional' as const,
  };

  /**
   * Setup: Create Express app
   */
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
    app.use(requestLogger);

    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);
    app.use('/api/profiles', certificationRoutes);

    app.use(errorHandler);
  });

  /**
   * Helper: Create JWT token
   */
  const createToken = (userId: number, userType: string): string => {
    return jwt.sign(
      { id: userId, userType } as unknown as JwtPayload,
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
  };

  /**
   * Setup: Create test user and profile
   */
  beforeAll(async () => {
    // Signup
    const signup = await request(app)
      .post('/api/auth/signup')
      .send(testProfessional);

    expect(signup.status).toBe(201);
    professionalUserId = signup.body.data.user.id;
    professionalToken = createToken(professionalUserId, 'professional');

    // Create profile
    const profile = await request(app)
      .post('/api/profiles')
      .set('Cookie', [`token=${professionalToken}`])
      .send({ hourlyRate: 5000 });

    expect(profile.status).toBe(201);
  });

  /**
   * =============================================
   * CREATE CERTIFICATION TESTS
   * =============================================
   */

  describe('POST /api/profiles/me/certifications', () => {
    /**
     * Test: Create certification with all fields
     */
    it('should create certification with all data', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          issueDate: '2023-01-15',
          expiryDate: '2026-01-15',
          credentialUrl: 'https://aws.amazon.com/certification/123456',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certification).toHaveProperty('id');
      expect(response.body.data.certification.title).toBe(
        'AWS Certified Solutions Architect'
      );
      expect(response.body.data.certification.issuer).toBe('Amazon Web Services');
    });

    /**
     * Test: Create certification with minimal data
     */
    it('should create certification with only title', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'JavaScript Fundamentals',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.certification.title).toBe(
        'JavaScript Fundamentals'
      );
      expect(response.body.data.certification.issuer).toBeNull();
      expect(response.body.data.certification.issueDate).toBeNull();
    });

    /**
     * Test: Cannot create certification without authentication
     */
    it('should reject certification creation without JWT', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .send({
          title: 'Some Certification',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Validation - title required
     */
    it('should reject certification without title', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          issuer: 'Some Issuer',
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - title max length
     */
    it('should reject title exceeding max length', async () => {
      const longTitle = 'a'.repeat(256); // Exceeds 255 limit

      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: longTitle,
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - invalid date format
     */
    it('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Certification',
          issueDate: 'invalid-date',
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - invalid credential URL
     */
    it('should reject invalid credential URL', async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Certification',
          credentialUrl: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * LIST CERTIFICATIONS TESTS
   * =============================================
   */

  describe('GET /api/profiles/:userId/certifications', () => {
    /**
     * Test: List certifications for profile
     */
    it('should retrieve certifications for professional', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/certifications`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.certifications)).toBe(true);
    });

    /**
     * Test: Certification response includes all fields
     */
    it('should include all certification fields in response', async () => {
      // Create a certification first
      await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Test Cert',
          issuer: 'Test Issuer',
          issueDate: '2024-01-01',
        });

      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/certifications`);

      const cert = response.body.data.certifications[0];

      expect(cert).toHaveProperty('id');
      expect(cert).toHaveProperty('professionalId');
      expect(cert).toHaveProperty('title');
      expect(cert).toHaveProperty('issuer');
      expect(cert).toHaveProperty('issueDate');
      expect(cert).toHaveProperty('expiryDate');
      expect(cert).toHaveProperty('credentialUrl');
      expect(cert).toHaveProperty('createdAt');
    });

    /**
     * Test: List certifications for non-existent profile
     */
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profiles/999999/certifications');

      expect(response.status).toBe(404);
    });
  });

  /**
   * =============================================
   * UPDATE CERTIFICATION TESTS
   * =============================================
   */

  describe('PUT /api/profiles/me/certifications/:certificationId', () => {
    let certificationId: number;

    /**
     * Setup: Create a certification to update
     */
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Certificate to Update',
          issuer: 'Original Issuer',
        });

      certificationId = response.body.data.certification.id;
    });

    /**
     * Test: Update certification title
     */
    it('should update certification title', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certification.title).toBe('Updated Title');
    });

    /**
     * Test: Update certification details
     */
    it('should update all certification fields', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'New Title',
          issuer: 'New Issuer',
          issueDate: '2024-06-01',
          expiryDate: '2027-06-01',
          credentialUrl: 'https://example.com/cert/123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certification.title).toBe('New Title');
      expect(response.body.data.certification.issuer).toBe('New Issuer');
    });

    /**
     * Test: Update without authentication
     */
    it('should reject update without JWT', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Update non-existent certification
     */
    it('should return 404 for non-existent certification', async () => {
      const response = await request(app)
        .put('/api/profiles/me/certifications/999999')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
    });

    /**
     * Test: Update requires at least one field
     */
    it('should reject empty update', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one field');
    });
  });

  /**
   * =============================================
   * DELETE CERTIFICATION TESTS
   * =============================================
   */

  describe('DELETE /api/profiles/me/certifications/:certificationId', () => {
    /**
     * Test: Delete certification
     */
    it('should delete certification', async () => {
      // Create certification
      const create = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'To Delete',
        });

      const certId = create.body.data.certification.id;

      // Delete
      const response = await request(app)
        .delete(`/api/profiles/me/certifications/${certId}`)
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(204);

      // Verify deletion
      const list = await request(app)
        .get(`/api/profiles/${professionalUserId}/certifications`);

      const cert = list.body.data.certifications.find((c: any) => c.id === certId);
      expect(cert).toBeUndefined();
    });

    /**
     * Test: Delete without authentication
     */
    it('should reject deletion without JWT', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/certifications/1');

      expect(response.status).toBe(401);
    });

    /**
     * Test: Delete non-existent certification
     */
    it('should return 404 for non-existent certification', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/certifications/999999')
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(404);
    });
  });

  /**
   * =============================================
   * CERTIFICATION OWNERSHIP TESTS
   * =============================================
   */

  describe('Certification Ownership', () => {
    /**
     * Test: User cannot update other's certification
     */
    it('should prevent updating certification of other user', async () => {
      // Create second user
      const otherUser = {
        firstName: 'Other',
        lastName: 'User',
        email: `other.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(otherUser);

      const otherToken = createToken(signup.body.data.user.id, 'professional');

      // Create profile for second user
      await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${otherToken}`])
        .send({ hourlyRate: 4000 });

      // Create certification for first user
      const create = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'First User Cert',
        });

      const certId = create.body.data.certification.id;

      // Try to update with second user's token
      const response = await request(app)
        .put(`/api/profiles/me/certifications/${certId}`)
        .set('Cookie', [`token=${otherToken}`])
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(404); // Should not find the certification
    });

    /**
     * Test: User cannot delete other's certification
     */
    it('should prevent deleting certification of other user', async () => {
      // Create second user
      const otherUser = {
        firstName: 'Another',
        lastName: 'User',
        email: `another.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        passwordConfirm: 'SecurePass123!',
        userType: 'professional' as const,
      };

      const signup = await request(app)
        .post('/api/auth/signup')
        .send(otherUser);

      const otherToken = createToken(signup.body.data.user.id, 'professional');

      // Create profile for second user
      await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${otherToken}`])
        .send({ hourlyRate: 4000 });

      // Create certification for first user
      const create = await request(app)
        .post('/api/profiles/me/certifications')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Protected Cert',
        });

      const certId = create.body.data.certification.id;

      // Try to delete with second user's token
      const response = await request(app)
        .delete(`/api/profiles/me/certifications/${certId}`)
        .set('Cookie', [`token=${otherToken}`]);

      expect(response.status).toBe(404); // Should not find the certification
    });
  });
});
