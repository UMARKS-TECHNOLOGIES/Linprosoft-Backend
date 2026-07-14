/**
 * Skill Integration Tests
 * Tests for skill management operations
 * 
 * Test Coverage:
 * - Add skill to profile
 * - Remove skill from profile
 * - Update skill proficiency
 * - List skills
 * - Primary skill logic
 * - Duplicate skill prevention
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import skillRoutes from '../../modules/skill/skillRoutes';
import profileRoutes from '../../modules/profile/profileRoutes';
import authRoutes from '../../modules/auth/authRoutes';
import { errorHandler } from '../../middleware/errorMiddleware';
import { requestLogger } from '../../middleware/requestLogger';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types/authTypes';

describe('Skill Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Test data
  let professionalToken: string;
  let professionalUserId: number;
  // let skillId = 1; // Assuming skills table has pre-populated data

  const testProfessional = {
    firstName: 'Skill',
    lastName: 'Tester',
    email: `skill.tester.${runId}@test.com`,
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
    app.use('/api/profiles', skillRoutes);

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
   * ADD SKILL TESTS
   * =============================================
   */

  describe('POST /api/profiles/me/skills', () => {
    /**
     * Test: Add skill with all data
     */
    it('should add skill with proficiency and experience', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 1,
          proficiencyLevel: 'expert',
          yearsOfExperience: 5,
          isPrimary: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.skill).toHaveProperty('skillId', 1);
      expect(response.body.data.skill.proficiencyLevel).toBe('expert');
      expect(response.body.data.skill.yearsOfExperience).toBe(5);
      expect(response.body.data.skill.isPrimary).toBe(true);
    });

    /**
     * Test: Add skill with minimal data
     */
    it('should add skill with only skillId', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.skill.skillId).toBe(2);
      expect(response.body.data.skill.proficiencyLevel).toBeNull();
      expect(response.body.data.skill.isPrimary).toBe(false);
    });

    /**
     * Test: Cannot add skill without authentication
     */
    it('should reject skill addition without JWT', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .send({
          skillId: 1,
          proficiencyLevel: 'beginner',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Cannot add non-existent skill
     */
    it('should reject adding non-existent skill', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 999999, // Non-existent
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    /**
     * Test: Cannot add same skill twice
     */
    it('should reject duplicate skill', async () => {
      // Add skill first time
      const first = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 3,
          proficiencyLevel: 'intermediate',
        });

      expect(first.status).toBe(201);

      // Try adding same skill again
      const second = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 3,
          proficiencyLevel: 'expert',
        });

      expect(second.status).toBe(409);
      expect(second.body.message).toContain('already added');
    });

    /**
     * Test: Validation - proficiency level enum
     */
    it('should reject invalid proficiency level', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 4,
          proficiencyLevel: 'super_expert', // Invalid
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - years of experience range
     */
    it('should reject invalid years of experience', async () => {
      const response = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 5,
          yearsOfExperience: -5, // Invalid: negative
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Setting primary skill clears previous primary
     */
    it('should set only one primary skill', async () => {
      // Add first skill as primary
      const first = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 6,
          isPrimary: true,
        });

      expect(first.status).toBe(201);
      expect(first.body.data.skill.isPrimary).toBe(true);

      // Add second skill as primary
      const second = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 7,
          isPrimary: true,
        });

      expect(second.status).toBe(201);

      // Get skills and verify only second is primary
      const skills = await request(app)
        .get(`/api/profiles/${professionalUserId}/skills`);

      const primarySkills = skills.body.data.skills.filter(
        (s: any) => s.isPrimary
      );
      expect(primarySkills.length).toBe(1);
      expect(primarySkills[0].skillId).toBe(7);
    });
  });

  /**
   * =============================================
   * LIST SKILLS TESTS
   * =============================================
   */

  describe('GET /api/profiles/:userId/skills', () => {
    /**
     * Test: List skills for profile
     */
    it('should retrieve skills for professional', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/skills`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.skills)).toBe(true);
      expect(response.body.data.skills.length).toBeGreaterThan(0);
    });

    /**
     * Test: Skill response includes all fields
     */
    it('should include all skill fields in response', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/skills`);

      const skill = response.body.data.skills[0];

      expect(skill).toHaveProperty('skillId');
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('category');
      expect(skill).toHaveProperty('proficiencyLevel');
      expect(skill).toHaveProperty('yearsOfExperience');
      expect(skill).toHaveProperty('isPrimary');
    });

    /**
     * Test: List skills for non-existent profile
     */
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profiles/999999/skills');

      expect(response.status).toBe(404);
    });

    /**
     * Test: Skills ordered by primary first, then by name
     */
    it('should order skills with primary first', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/skills`);

      const skills = response.body.data.skills;

      if (skills.length > 1) {
        const primarySkills = skills.filter((s: any) => s.isPrimary);
        // const nonPrimarySkills = skills.filter((s: any) => !s.isPrimary);

        if (primarySkills.length > 0) {
          expect(skills[0].isPrimary).toBe(true);
        }
      }
    });
  });

  /**
   * =============================================
   * UPDATE SKILL TESTS
   * =============================================
   */

  describe('PUT /api/profiles/me/skills/:skillId', () => {
    /**
     * Test: Update skill proficiency
     */
    it('should update skill proficiency level', async () => {
      // Add skill first
      const add = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 8,
          proficiencyLevel: 'beginner',
        });

      expect(add.status).toBe(201);

      // Update proficiency
      const update = await request(app)
        .put('/api/profiles/me/skills/8')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          proficiencyLevel: 'expert',
        });

      expect(update.status).toBe(200);
      expect(update.body.data.skill.proficiencyLevel).toBe('expert');
    });

    /**
     * Test: Update years of experience
     */
    it('should update years of experience', async () => {
      // Add skill first
      const add = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 9,
          yearsOfExperience: 2,
        });

      expect(add.status).toBe(201);

      // Update experience
      const update = await request(app)
        .put('/api/profiles/me/skills/9')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          yearsOfExperience: 5,
        });

      expect(update.status).toBe(200);
      expect(update.body.data.skill.yearsOfExperience).toBe(5);
    });

    /**
     * Test: Update multiple fields
     */
    it('should update multiple skill fields', async () => {
      // Add skill
      const add = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 10,
          proficiencyLevel: 'beginner',
          yearsOfExperience: 1,
        });

      expect(add.status).toBe(201);

      // Update multiple
      const update = await request(app)
        .put('/api/profiles/me/skills/10')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          proficiencyLevel: 'intermediate',
          yearsOfExperience: 3,
          isPrimary: true,
        });

      expect(update.status).toBe(200);
      expect(update.body.data.skill.proficiencyLevel).toBe('intermediate');
      expect(update.body.data.skill.yearsOfExperience).toBe(3);
      expect(update.body.data.skill.isPrimary).toBe(true);
    });

    /**
     * Test: Update without authentication
     */
    it('should reject skill update without JWT', async () => {
      const response = await request(app)
        .put('/api/profiles/me/skills/1')
        .send({
          proficiencyLevel: 'expert',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Update requires at least one field
     */
    it('should reject empty update', async () => {
      const response = await request(app)
        .put('/api/profiles/me/skills/1')
        .set('Cookie', [`token=${professionalToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one field');
    });

    /**
     * Test: Update non-existent skill
     */
    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .put('/api/profiles/me/skills/999999')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          proficiencyLevel: 'expert',
        });

      expect(response.status).toBe(404);
    });
  });

  /**
   * =============================================
   * DELETE SKILL TESTS
   * =============================================
   */

  describe('DELETE /api/profiles/me/skills/:skillId', () => {
    /**
     * Test: Remove skill from profile
     */
    it('should remove skill from profile', async () => {
      // Add skill
      const add = await request(app)
        .post('/api/profiles/me/skills')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          skillId: 11,
        });

      expect(add.status).toBe(201);

      // Delete skill
      const remove = await request(app)
        .delete('/api/profiles/me/skills/11')
        .set('Cookie', [`token=${professionalToken}`]);

      expect(remove.status).toBe(204);

      // Verify skill is removed
      const list = await request(app)
        .get(`/api/profiles/${professionalUserId}/skills`);

      const skill = list.body.data.skills.find((s: any) => s.skillId === 11);
      expect(skill).toBeUndefined();
    });

    /**
     * Test: Delete without authentication
     */
    it('should reject skill deletion without JWT', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/skills/1');

      expect(response.status).toBe(401);
    });

    /**
     * Test: Delete non-existent skill
     */
    it('should return 404 when deleting non-existent skill', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/skills/999999')
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(404);
    });
  });
});
