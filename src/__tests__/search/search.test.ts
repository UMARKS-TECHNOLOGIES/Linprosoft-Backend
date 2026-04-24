/**
 * Search Integration Tests
 * Tests for professional search and discovery functionality
 * 
 * Test Coverage:
 * - Search professionals by skills
 * - Filter by rating, rate, availability
 * - Pagination
 * - Sorting
 * - Skill autocomplete
 * - Filter options endpoint
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import searchRoutes from '../../modules/search/searchRoutes';
import profileRoutes from '../../modules/profile/profileRoutes';
import skillRoutes from '../../modules/skill/skillRoutes';
import authRoutes from '../../modules/auth/authRoutes';
import { errorHandler } from '../../middleware/errorMiddleware';
import { requestLogger } from '../../middleware/requestLogger';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types/authTypes';

describe('Search Integration Tests', () => {
  let app: Express;
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Test data - Multiple professionals with different skills/rates
  const professionals: Array<{ token: string; userId: number; profile: any }> = [];

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
    app.use('/api/search', searchRoutes);

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
   * Setup: Create test professionals with different profiles
   */
  beforeAll(async () => {
    // Create multiple professionals with different skills/rates
    const testData = [
      {
        name: 'Senior Node Dev',
        email: `senior.node.${runId}@test.com`,
        hourlyRate: 8000,
        availability: 'available' as const,
        skills: [1], // Assuming skill 1 is "Node.js"
      },
      {
        name: 'Junior React Dev',
        email: `junior.react.${runId}@test.com`,
        hourlyRate: 3000,
        availability: 'available' as const,
        skills: [2], // Assuming skill 2 is "React"
      },
      {
        name: 'Full Stack Dev',
        email: `fullstack.${runId}@test.com`,
        hourlyRate: 5500,
        availability: 'unavailable' as const,
        skills: [1, 2], // Both Node.js and React
      },
      {
        name: 'Python Dev Away',
        email: `python.away.${runId}@test.com`,
        hourlyRate: 6000,
        availability: 'away' as const,
        skills: [3], // Assuming skill 3 is "Python"
      },
    ];

    for (const data of testData) {
      // Signup
      const signup = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: data.name,
          lastName: 'Developer',
          email: data.email,
          password: 'SecurePass123!',
          passwordConfirm: 'SecurePass123!',
          userType: 'professional',
        });

      expect(signup.status).toBe(201);
      const userId = signup.body.data.user.id;
      const token = createToken(userId, 'professional');

      // Create profile
      const profile = await request(app)
        .post('/api/profiles')
        .set('Cookie', [`token=${token}`])
        .send({
          hourlyRate: data.hourlyRate,
          bio: `I am a ${data.name}`,
          availabilityStatus: data.availability,
          responseTimeHours: 2,
        });

      expect(profile.status).toBe(201);

      // Add skills
      for (const skillId of data.skills) {
        const skillAdd = await request(app)
          .post('/api/profiles/me/skills')
          .set('Cookie', [`token=${token}`])
          .send({
            skillId,
            proficiencyLevel: data.hourlyRate > 5000 ? 'expert' : 'intermediate',
            isPrimary: skillId === data.skills[0],
          });

        expect(skillAdd.status).toBe(201);
      }

      professionals.push({
        token,
        userId,
        profile: profile.body.data.profile,
      });
    }
  });

  /**
   * =============================================
   * BASIC SEARCH TESTS
   * =============================================
   */

  describe('GET /api/search/professionals', () => {
    /**
     * Test: Search without filters returns results
     */
    it('should return professionals with default filters', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'rating_desc' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.professionals)).toBe(true);
      expect(response.body.data.professionals.length).toBeGreaterThan(0);
    });

    /**
     * Test: Search response includes pagination metadata
     */
    it('should include pagination metadata', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'rating_desc', page: 1, limit: 10 });

      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta).toHaveProperty('page', 1);
      expect(response.body.data.meta).toHaveProperty('limit', 10);
      expect(response.body.data.meta).toHaveProperty('total');
      expect(response.body.data.meta).toHaveProperty('pages');
    });

    /**
     * Test: Search result includes professional details
     */
    it('should include professional details in results', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'rating_desc' });

      const professional = response.body.data.professionals[0];

      expect(professional).toHaveProperty('id');
      expect(professional).toHaveProperty('userId');
      expect(professional).toHaveProperty('hourlyRate');
      expect(professional).toHaveProperty('bio');
      expect(professional).toHaveProperty('availabilityStatus');
      expect(professional).toHaveProperty('user');
      expect(professional.user).toHaveProperty('firstName');
      expect(professional).toHaveProperty('skills');
    });
  });

  /**
   * =============================================
   * SKILL FILTER TESTS
   * =============================================
   */

  describe('Search with Skill Filters', () => {
    /**
     * Test: Filter by single skill
     */
    it('should filter professionals by single skill', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '1', // Node.js
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.professionals.length).toBeGreaterThan(0);

      // All results should have skill 1
      response.body.data.professionals.forEach((prof: any) => {
        const hasSkill = prof.skills.some((s: any) => s.id === 1);
        expect(hasSkill).toBe(true);
      });
    });

    /**
     * Test: Filter by multiple skills (OR logic)
     */
    it('should filter professionals by multiple skills', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '1,2', // Node.js OR React
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);

      // All results should have skill 1 or 2
      response.body.data.professionals.forEach((prof: any) => {
        const hasSkill = prof.skills.some(
          (s: any) => s.id === 1 || s.id === 2
        );
        expect(hasSkill).toBe(true);
      });
    });

    /**
     * Test: No results for non-existent skill
     */
    it('should return empty results for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '999999',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.professionals.length).toBe(0);
    });
  });

  /**
   * =============================================
   * RATE FILTER TESTS
   * =============================================
   */

  describe('Search with Rate Filters', () => {
    /**
     * Test: Filter by minimum hourly rate
     */
    it('should filter professionals by minimum hourly rate', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          minRate: 5000,
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(200);

      // All results should have hourly rate >= 5000
      response.body.data.professionals.forEach((prof: any) => {
        expect(prof.hourlyRate).toBeGreaterThanOrEqual(5000);
      });
    });

    /**
     * Test: Filter by maximum hourly rate
     */
    it('should filter professionals by maximum hourly rate', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          maxRate: 4000,
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(200);

      // All results should have hourly rate <= 4000
      response.body.data.professionals.forEach((prof: any) => {
        expect(prof.hourlyRate).toBeLessThanOrEqual(4000);
      });
    });

    /**
     * Test: Filter by rate range
     */
    it('should filter professionals by rate range', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          minRate: 4000,
          maxRate: 7000,
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(200);

      // All results should have hourly rate between min and max
      response.body.data.professionals.forEach((prof: any) => {
        expect(prof.hourlyRate).toBeGreaterThanOrEqual(4000);
        expect(prof.hourlyRate).toBeLessThanOrEqual(7000);
      });
    });

    /**
     * Test: Validation - minRate cannot be greater than maxRate
     */
    it('should reject invalid rate range', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          minRate: 7000,
          maxRate: 4000, // Invalid: min > max
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * AVAILABILITY FILTER TESTS
   * =============================================
   */

  describe('Search with Availability Filters', () => {
    /**
     * Test: Filter by available status
     */
    it('should filter professionals by availability status', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          availabilityStatus: 'available',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);

      // All results should have availability status = available
      response.body.data.professionals.forEach((prof: any) => {
        expect(prof.availabilityStatus).toBe('available');
      });
    });

    /**
     * Test: Filter by unavailable status
     */
    it('should filter professionals by unavailable status', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          availabilityStatus: 'unavailable',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);

      if (response.body.data.professionals.length > 0) {
        response.body.data.professionals.forEach((prof: any) => {
          expect(prof.availabilityStatus).toBe('unavailable');
        });
      }
    });

    /**
     * Test: Invalid availability status
     */
    it('should reject invalid availability status', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          availabilityStatus: 'invalid_status',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * SORTING TESTS
   * =============================================
   */

  describe('Search Sorting', () => {
    /**
     * Test: Sort by rating descending
     */
    it('should sort professionals by rating descending', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);

      const professionals = response.body.data.professionals;
      if (professionals.length > 1) {
        for (let i = 0; i < professionals.length - 1; i++) {
          expect(professionals[i].avgRating).toBeGreaterThanOrEqual(
            professionals[i + 1].avgRating
          );
        }
      }
    });

    /**
     * Test: Sort by rate ascending
     */
    it('should sort professionals by rate ascending', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(200);

      const professionals = response.body.data.professionals;
      if (professionals.length > 1) {
        for (let i = 0; i < professionals.length - 1; i++) {
          expect(professionals[i].hourlyRate).toBeLessThanOrEqual(
            professionals[i + 1].hourlyRate
          );
        }
      }
    });

    /**
     * Test: Sort by most recent
     */
    it('should sort professionals by creation date descending', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'recent_desc',
        });

      expect(response.status).toBe(200);

      const professionals = response.body.data.professionals;
      if (professionals.length > 1) {
        for (let i = 0; i < professionals.length - 1; i++) {
          const current = new Date(professionals[i].createdAt).getTime();
          const next = new Date(professionals[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  /**
   * =============================================
   * PAGINATION TESTS
   * =============================================
   */

  describe('Search Pagination', () => {
    /**
     * Test: Default pagination
     */
    it('should use default pagination values', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'rating_desc' });

      expect(response.status).toBe(200);
      expect(response.body.data.meta.page).toBe(1);
      expect(response.body.data.meta.limit).toBe(20);
    });

    /**
     * Test: Custom page size
     */
    it('should respect custom page limit', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          limit: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.meta.limit).toBe(2);
      expect(response.body.data.professionals.length).toBeLessThanOrEqual(2);
    });

    /**
     * Test: Page navigation
     */
    it('should navigate between pages', async () => {
      const page1 = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          page: 1,
          limit: 2,
        });

      const page2 = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          page: 2,
          limit: 2,
        });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      // Ensure different results on different pages
      if (page1.body.data.professionals.length > 0 && page2.body.data.professionals.length > 0) {
        const page1Ids = page1.body.data.professionals.map((p: any) => p.id);
        const page2Ids = page2.body.data.professionals.map((p: any) => p.id);
        expect(page1Ids).not.toEqual(page2Ids);
      }
    });

    /**
     * Test: Limit validation (max 100)
     */
    it('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          limit: 200, // Exceeds max
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Minimum page is 1
     */
    it('should reject page 0', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          page: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  /**
   * =============================================
   * COMBINED FILTERS TESTS
   * =============================================
   */

  describe('Search with Combined Filters', () => {
    /**
     * Test: Combine multiple filters
     */
    it('should apply multiple filters together', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '1',
          minRate: 5000,
          availabilityStatus: 'available',
          sortBy: 'rate_asc',
        });

      expect(response.status).toBe(200);

      response.body.data.professionals.forEach((prof: any) => {
        // Must have skill
        const hasSkill = prof.skills.some((s: any) => s.id === 1);
        expect(hasSkill).toBe(true);

        // Must have min rate
        expect(prof.hourlyRate).toBeGreaterThanOrEqual(5000);

        // Must be available
        expect(prof.availabilityStatus).toBe('available');
      });
    });
  });

  /**
   * =============================================
   * SKILL AUTOCOMPLETE TESTS
   * =============================================
   */

  describe('GET /api/search/skills (Autocomplete)', () => {
    /**
     * Test: Autocomplete returns matching skills
     */
    it('should return skills matching query', async () => {
      const response = await request(app)
        .get('/api/search/skills')
        .query({
          q: 'node', // Should match "Node.js"
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.skills)).toBe(true);
    });

    /**
     * Test: Autocomplete respects limit
     */
    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/search/skills')
        .query({
          q: 'a',
          limit: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.skills.length).toBeLessThanOrEqual(5);
    });

    /**
     * Test: Query validation - required
     */
    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/search/skills')
        .query({ limit: 10 });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Query validation - min length
     */
    it('should reject query shorter than 1 character', async () => {
      const response = await request(app)
        .get('/api/search/skills')
        .query({
          q: '',
          limit: 10,
        });

      expect(response.status).toBe(400);
    });

    /**
     * Test: Skill fields in autocomplete response
     */
    it('should include skill fields in autocomplete response', async () => {
      const response = await request(app)
        .get('/api/search/skills')
        .query({
          q: 'a',
          limit: 1,
        });

      if (response.body.data.skills.length > 0) {
        const skill = response.body.data.skills[0];
        expect(skill).toHaveProperty('id');
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('category');
        expect(skill).toHaveProperty('description');
      }
    });
  });

  /**
   * =============================================
   * FILTER OPTIONS TESTS
   * =============================================
   */

  describe('GET /api/search/filters', () => {
    /**
     * Test: Get available filter options
     */
    it('should return available filter options', async () => {
      const response = await request(app)
        .get('/api/search/filters');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filters).toBeDefined();
    });

    /**
     * Test: Filter options structure
     */
    it('should include all filter option types', async () => {
      const response = await request(app)
        .get('/api/search/filters');

      const filters = response.body.data.filters;

      expect(filters).toHaveProperty('skills');
      expect(filters).toHaveProperty('availabilityStatuses');
      expect(filters).toHaveProperty('minHourlyRate');
      expect(filters).toHaveProperty('maxHourlyRate');

      expect(Array.isArray(filters.skills)).toBe(true);
      expect(Array.isArray(filters.availabilityStatuses)).toBe(true);
    });

    /**
     * Test: Skills in filter options have required fields
     */
    it('should include skill details in filter options', async () => {
      const response = await request(app)
        .get('/api/search/filters');

      const skills = response.body.data.filters.skills;

      if (skills.length > 0) {
        const skill = skills[0];
        expect(skill).toHaveProperty('id');
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('category');
      }
    });

    /**
     * Test: Availability statuses
     */
    it('should include all availability statuses', async () => {
      const response = await request(app)
        .get('/api/search/filters');

      const statuses = response.body.data.filters.availabilityStatuses;

      expect(statuses).toContain('available');
      expect(statuses).toContain('unavailable');
      expect(statuses).toContain('away');
    });
  });

  /**
   * =============================================
   * EDGE CASES & ERROR HANDLING
   * =============================================
   */

  describe('Search Edge Cases', () => {
    /**
     * Test: Search with no matching results
     */
    it('should return empty results for no matches', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '999999', // Non-existent skill
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.professionals.length).toBe(0);
      expect(response.body.data.meta.total).toBe(0);
      expect(response.body.data.meta.pages).toBe(0);
    });

    /**
     * Test: Request beyond total pages
     */
    it('should return empty results for page beyond total pages', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          sortBy: 'rating_desc',
          page: 9999,
          limit: 10,
        });

      expect(response.status).toBe(200);
      // Should return empty or last page, depending on implementation
      expect(Array.isArray(response.body.data.professionals)).toBe(true);
    });

    /**
     * Test: Skills array formatting in query
     */
    it('should parse comma-separated skills', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: '1,2,3',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);
    });

    /**
     * Test: Skills with spaces in query
     */
    it('should handle skills with spaces in query', async () => {
      const response = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: ' 1 , 2 , 3 ',
          sortBy: 'rating_desc',
        });

      expect(response.status).toBe(200);
    });
  });
});
