/**
 * Portfolio Integration Tests
 * Tests for portfolio item management
 * 
 * Test Coverage:
 * - Create portfolio item
 * - Read portfolio items
 * - Update portfolio item
 * - Delete portfolio item
 * - URL validation
 * - Ownership protection
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import portfolioRoutes from '../../modules/portfolio/portfolioRoutes';
import profileRoutes from '../../modules/profile/profileRoutes';
import authRoutes from '../../modules/auth/authRoutes';
import { errorHandler } from '../../middleware/errorMiddleware';
import { requestLogger } from '../../middleware/requestLogger';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types/authTypes';

describe('Portfolio Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Test data
  let professionalToken: string;
  let professionalUserId: number;

  const testProfessional = {
    firstName: 'Portfolio',
    lastName: 'Creator',
    email: `portfolio.${runId}@test.com`,
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
    app.use('/api/profiles', portfolioRoutes);

    app.use(errorHandler);
  });

  /**
   * Helper: Create JWT token
   */
  const createToken = (userId: number, userType: string): string => {
    return jwt.sign(
      { id: userId, userType } as JwtPayload,
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
   * CREATE PORTFOLIO ITEM TESTS
   * =============================================
   */

  describe('POST /api/profiles/me/portfolio', () => {
    /**
     * Test: Create portfolio item with all fields
     */
    it('should create portfolio item with all data', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'E-commerce Platform',
          description: 'Built a full-stack e-commerce platform using Node.js and React',
          imageUrl: 'https://example.com/images/ecommerce.jpg',
          linkUrl: 'https://ecommerce-example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolioItem).toHaveProperty('id');
      expect(response.body.data.portfolioItem.title).toBe('E-commerce Platform');
      expect(response.body.data.portfolioItem.description).toContain('e-commerce');
    });

    /**
     * Test: Create portfolio item with minimal data
     */
    it('should create portfolio item with only title', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Simple Project',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.portfolioItem.title).toBe('Simple Project');
      expect(response.body.data.portfolioItem.description).toBeNull();
      expect(response.body.data.portfolioItem.imageUrl).toBeNull();
      expect(response.body.data.portfolioItem.linkUrl).toBeNull();
    });

    /**
     * Test: Cannot create portfolio item without authentication
     */
    it('should reject portfolio creation without JWT', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .send({
          title: 'Project',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Validation - title required
     */
    it('should reject portfolio item without title', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          description: 'Missing title',
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - title max length
     */
    it('should reject title exceeding max length', async () => {
      const longTitle = 'a'.repeat(256); // Exceeds 255 limit

      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: longTitle,
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - description max length
     */
    it('should reject description exceeding max length', async () => {
      const longDesc = 'a'.repeat(5001); // Exceeds 5000 limit

      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Project',
          description: longDesc,
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - invalid image URL
     */
    it('should reject invalid image URL', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Project',
          imageUrl: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Validation - invalid link URL
     */
    it('should reject invalid link URL', async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Project',
          linkUrl: 'invalid-url-format',
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * LIST PORTFOLIO ITEMS TESTS
   * =============================================
   */

  describe('GET /api/profiles/:userId/portfolio', () => {
    /**
     * Test: List portfolio items for profile
     */
    it('should retrieve portfolio items for professional', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/portfolio`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.portfolioItems)).toBe(true);
    });

    /**
     * Test: Portfolio item response includes all fields
     */
    it('should include all portfolio item fields in response', async () => {
      // Create an item first
      await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Test Item',
          description: 'Test description',
          imageUrl: 'https://example.com/image.jpg',
          linkUrl: 'https://example.com',
        });

      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/portfolio`);

      const item = response.body.data.portfolioItems[0];

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('professionalId');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('imageUrl');
      expect(item).toHaveProperty('linkUrl');
      expect(item).toHaveProperty('createdAt');
    });

    /**
     * Test: List portfolio items for non-existent profile
     */
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profiles/999999/portfolio');

      expect(response.status).toBe(404);
    });

    /**
     * Test: Portfolio items ordered by most recent first
     */
    it('should order portfolio items by creation date descending', async () => {
      const response = await request(app)
        .get(`/api/profiles/${professionalUserId}/portfolio`);

      const items = response.body.data.portfolioItems;

      if (items.length > 1) {
        for (let i = 0; i < items.length - 1; i++) {
          const current = new Date(items[i].createdAt).getTime();
          const next = new Date(items[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  /**
   * =============================================
   * UPDATE PORTFOLIO ITEM TESTS
   * =============================================
   */

  describe('PUT /api/profiles/me/portfolio/:portfolioItemId', () => {
    let portfolioItemId: number;

    /**
     * Setup: Create a portfolio item to update
     */
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Item to Update',
          description: 'Original description',
        });

      portfolioItemId = response.body.data.portfolioItem.id;
    });

    /**
     * Test: Update portfolio item title
     */
    it('should update portfolio item title', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.portfolioItem.title).toBe('Updated Title');
    });

    /**
     * Test: Update all portfolio item fields
     */
    it('should update all portfolio item fields', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'New Title',
          description: 'New description',
          imageUrl: 'https://example.com/new-image.jpg',
          linkUrl: 'https://new-example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.portfolioItem.title).toBe('New Title');
      expect(response.body.data.portfolioItem.description).toBe('New description');
      expect(response.body.data.portfolioItem.imageUrl).toBe(
        'https://example.com/new-image.jpg'
      );
      expect(response.body.data.portfolioItem.linkUrl).toBe('https://new-example.com');
    });

    /**
     * Test: Update without authentication
     */
    it('should reject update without JWT', async () => {
      const response = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(401);
    });

    /**
     * Test: Update non-existent item
     */
    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .put('/api/profiles/me/portfolio/999999')
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
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set('Cookie', [`token=${professionalToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one field');
    });
  });

  /**
   * =============================================
   * DELETE PORTFOLIO ITEM TESTS
   * =============================================
   */

  describe('DELETE /api/profiles/me/portfolio/:portfolioItemId', () => {
    /**
     * Test: Delete portfolio item
     */
    it('should delete portfolio item', async () => {
      // Create item
      const create = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'To Delete',
        });

      const itemId = create.body.data.portfolioItem.id;

      // Delete
      const response = await request(app)
        .delete(`/api/profiles/me/portfolio/${itemId}`)
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(204);

      // Verify deletion
      const list = await request(app)
        .get(`/api/profiles/${professionalUserId}/portfolio`);

      const item = list.body.data.portfolioItems.find((i: any) => i.id === itemId);
      expect(item).toBeUndefined();
    });

    /**
     * Test: Delete without authentication
     */
    it('should reject deletion without JWT', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/portfolio/1');

      expect(response.status).toBe(401);
    });

    /**
     * Test: Delete non-existent item
     */
    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .delete('/api/profiles/me/portfolio/999999')
        .set('Cookie', [`token=${professionalToken}`]);

      expect(response.status).toBe(404);
    });
  });

  /**
   * =============================================
   * PORTFOLIO OWNERSHIP TESTS
   * =============================================
   */

  describe('Portfolio Ownership', () => {
    /**
     * Test: User cannot update other's portfolio item
     */
    it('should prevent updating portfolio item of other user', async () => {
      // Create second user
      const otherUser = {
        firstName: 'Other',
        lastName: 'Dev',
        email: `other.dev.${Date.now()}@test.com`,
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

      // Create portfolio item for first user
      const create = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'First User Project',
        });

      const itemId = create.body.data.portfolioItem.id;

      // Try to update with second user's token
      const response = await request(app)
        .put(`/api/profiles/me/portfolio/${itemId}`)
        .set('Cookie', [`token=${otherToken}`])
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(404); // Should not find the item
    });

    /**
     * Test: User cannot delete other's portfolio item
     */
    it('should prevent deleting portfolio item of other user', async () => {
      // Create second user
      const otherUser = {
        firstName: 'Another',
        lastName: 'Dev',
        email: `another.dev.${Date.now()}@test.com`,
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

      // Create portfolio item for first user
      const create = await request(app)
        .post('/api/profiles/me/portfolio')
        .set('Cookie', [`token=${professionalToken}`])
        .send({
          title: 'Protected Project',
        });

      const itemId = create.body.data.portfolioItem.id;

      // Try to delete with second user's token
      const response = await request(app)
        .delete(`/api/profiles/me/portfolio/${itemId}`)
        .set('Cookie', [`token=${otherToken}`]);

      expect(response.status).toBe(404); // Should not find the item
    });
  });
});
