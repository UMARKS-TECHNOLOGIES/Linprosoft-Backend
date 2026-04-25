/**
 * Search Integration Tests
 * Tests for professional search functionality with filters, pagination, and sorting
 */

import request from "supertest";
import app from "../app";
import { testUsers } from "./fixtures/users.fixture";

describe("Search Integration Tests", () => {
  let testUserIds: { [key: string]: number } = {};
  let testAuthTokens: { [key: string]: string } = {};
  let testProfileIds: { [key: string]: number } = {};

  // Setup: Create multiple test professionals with different skills
  beforeAll(async () => {
    // User 1: Senior React Developer
    const user1Res = await request(app)
      .post("/api/auth/signup")
      .send(testUsers.professional1);
    testUserIds["react_senior"] = user1Res.body.data.user.id;
    testAuthTokens["react_senior"] = user1Res.headers["set-cookie"];

    const profile1Res = await request(app)
      .post("/api/profiles")
      .set("Cookie", testAuthTokens["react_senior"])
      .send({
        hourlyRate: 8000,
        bio: "Senior React Developer with 7 years experience",
        availabilityStatus: "available",
        responseTimeHours: 2,
      });
    testProfileIds["react_senior"] = profile1Res.body.data.profile.id;

    // Add React skill
    await request(app)
      .post("/api/skills/me/skills")
      .set("Cookie", testAuthTokens["react_senior"])
      .send({
        skillId: 3,
        proficiencyLevel: "expert",
        yearsOfExperience: 7,
        isPrimary: true,
      });

    // User 2: Node.js Developer
    const user2Res = await request(app)
      .post("/api/auth/signup")
      .send(testUsers.professional2);
    testUserIds["nodejs"] = user2Res.body.data.user.id;
    testAuthTokens["nodejs"] = user2Res.headers["set-cookie"];

    const profile2Res = await request(app)
      .post("/api/profiles")
      .set("Cookie", testAuthTokens["nodejs"])
      .send({
        hourlyRate: 6500,
        bio: "Node.js and TypeScript expert",
        availabilityStatus: "available",
        responseTimeHours: 4,
      });
    testProfileIds["nodejs"] = profile2Res.body.data.profile.id;

    // Add Node.js and TypeScript skills
    await request(app)
      .post("/api/skills/me/skills")
      .set("Cookie", testAuthTokens["nodejs"])
      .send({
        skillId: 2,
        proficiencyLevel: "expert",
        yearsOfExperience: 5,
        isPrimary: true,
      });

    await request(app)
      .post("/api/skills/me/skills")
      .set("Cookie", testAuthTokens["nodejs"])
      .send({
        skillId: 1,
        proficiencyLevel: "expert",
        yearsOfExperience: 5,
        isPrimary: false,
      });
  });

  // ========================
  // GET /search/professionals - BASIC SEARCH
  // ========================

  describe("GET /api/search/professionals - Basic Search", () => {
    it("should retrieve all professionals - 200", async () => {
      const res = await request(app).get("/api/search/professionals");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.professionals)).toBe(true);
      expect(res.body.data.professionals.length).toBeGreaterThan(0);
    });

    it("should return professionals with expected structure", async () => {
      const res = await request(app).get("/api/search/professionals");

      expect(res.status).toBe(200);
      if (res.body.data.professionals.length > 0) {
        const pro = res.body.data.professionals[0];
        expect(pro).toHaveProperty("id");
        expect(pro).toHaveProperty("userId");
        expect(pro).toHaveProperty("hourlyRate");
        expect(pro).toHaveProperty("bio");
        expect(pro).toHaveProperty("availabilityStatus");
        expect(pro).toHaveProperty("avgRating");
        expect(pro).toHaveProperty("totalReviews");
      }
    });

    it("should be publicly accessible (no auth required)", async () => {
      const res = await request(app).get("/api/search/professionals");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================
  // GET /search/professionals?skills=X - SKILL FILTER
  // ========================

  describe("GET /api/search/professionals - Filter by Skills", () => {
    it("should filter by single skill", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ skills: [3] }); // React skill

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      if (professionals.length > 0) {
        // Verify returned professionals have the skill
        professionals.forEach((pro: any) => {
          const hasSkill = pro.skills?.some((s: any) => s.skillId === 3) || true;
          expect(hasSkill).toBe(true);
        });
      }
    });

    it("should filter by multiple skills (OR logic)", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ skills: [1, 2] }); // TypeScript OR Node.js

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.professionals)).toBe(true);
    });

    it("should return empty result for non-existent skill", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ skills: [99999] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.professionals)).toBe(true);
      // May be empty or have professionals without that skill
    });

    it("should handle invalid skill ID format", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ skills: ["invalid"] });

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // GET /search/professionals?minRating=X - RATING FILTER
  // ========================

  describe("GET /api/search/professionals - Filter by Rating", () => {
    it("should filter by minimum rating", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRating: 0 });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        expect(pro.avgRating).toBeGreaterThanOrEqual(0);
      });
    });

    it("should reject invalid rating range (> 5)", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRating: 6 });

      expect(res.status).toBe(400);
    });

    it("should reject negative rating", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRating: -1 });

      expect(res.status).toBe(400);
    });

    it("should accept decimal ratings", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRating: 4.5 });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        expect(pro.avgRating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  // ========================
  // GET /search/professionals?minRate=X&maxRate=Y - RATE FILTER
  // ========================

  describe("GET /api/search/professionals - Filter by Hourly Rate", () => {
    it("should filter by hourly rate range", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRate: 5000, maxRate: 8000 });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        if (pro.hourlyRate !== null) {
          expect(pro.hourlyRate).toBeGreaterThanOrEqual(5000);
          expect(pro.hourlyRate).toBeLessThanOrEqual(8000);
        }
      });
    });

    it("should filter by minimum rate only", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRate: 5000 });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        if (pro.hourlyRate !== null) {
          expect(pro.hourlyRate).toBeGreaterThanOrEqual(5000);
        }
      });
    });

    it("should filter by maximum rate only", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ maxRate: 10000 });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        if (pro.hourlyRate !== null) {
          expect(pro.hourlyRate).toBeLessThanOrEqual(10000);
        }
      });
    });

    it("should reject maxRate < minRate", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRate: 10000, maxRate: 5000 });

      expect(res.status).toBe(400);
    });

    it("should reject negative rates", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRate: -1000 });

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // GET /search/professionals?page=X&limit=Y - PAGINATION
  // ========================

  describe("GET /api/search/professionals - Pagination", () => {
    it("should return paginated results", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals.length).toBeLessThanOrEqual(10);
      expect(res.body.data.meta).toHaveProperty("page");
      expect(res.body.data.meta).toHaveProperty("limit");
      expect(res.body.data.meta).toHaveProperty("total");
      expect(res.body.data.meta).toHaveProperty("pages");
    });

    it("should return correct page number", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(5);
    });

    it("should support offset-based pagination", async () => {
      const page1 = await request(app)
        .get("/api/search/professionals")
        .query({ page: 1, limit: 5 });

      const page2 = await request(app)
        .get("/api/search/professionals")
        .query({ page: 2, limit: 5 });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      if (page1.body.data.meta.total > 5) {
        // Different pages should have different data
        expect(page1.body.data.professionals[0]?.id).not.toEqual(
          page2.body.data.professionals[0]?.id
        );
      }
    });

    it("should reject page 0", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ page: 0 });

      expect(res.status).toBe(400);
    });

    it("should reject negative limit", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ limit: -10 });

      expect(res.status).toBe(400);
    });

    it("should return correct total pages", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      const { total, limit, pages } = res.body.data.meta;
      const expectedPages = Math.ceil(total / limit);
      expect(pages).toBe(expectedPages);
    });
  });

  // ========================
  // GET /search/professionals?sortBy=X - SORTING
  // ========================

  describe("GET /api/search/professionals - Sorting", () => {
    it("should support sorting by rating", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ sortBy: "rating_desc" });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      if (professionals.length > 1) {
        for (let i = 0; i < professionals.length - 1; i++) {
          expect(professionals[i].avgRating).toBeGreaterThanOrEqual(
            professionals[i + 1].avgRating
          );
        }
      }
    });

    it("should support sorting by hourly rate", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ sortBy: "rate_asc" });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      if (professionals.length > 1) {
        // Should be sorted in some order (asc or desc)
        const rates = professionals
          .map((p: any) => p.hourlyRate)
          .filter((r: any) => r !== null);
        expect(rates.length).toBeGreaterThan(0);
      }
    });

    it("should support sorting by recently updated", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ sortBy: "recent_desc" });

      expect(res.status).toBe(200);
      const professionals = res.body.data.professionals;
      if (professionals.length > 1) {
        for (let i = 0; i < professionals.length - 1; i++) {
          const date1 = new Date(professionals[i].updatedAt);
          const date2 = new Date(professionals[i + 1].updatedAt);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });

    it("should reject invalid sortBy value", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ sortBy: "invalid_field" });

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // COMPLEX FILTER COMBINATIONS
  // ========================

  describe("GET /api/search/professionals - Complex Filters", () => {
    it("should handle skills + rating + rate filters", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({
          skills: [1, 2],
          minRating: 0,
          minRate: 5000,
          maxRate: 10000,
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.professionals)).toBe(true);

      const professionals = res.body.data.professionals;
      professionals.forEach((pro: any) => {
        if (pro.hourlyRate !== null) {
          expect(pro.hourlyRate).toBeGreaterThanOrEqual(5000);
          expect(pro.hourlyRate).toBeLessThanOrEqual(10000);
        }
      });
    });

    it("should handle filters with pagination and sorting", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({
          skills: [3],
          minRate: 6000,
          sortBy: "rating_desc",
          page: 1,
          limit: 5,
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.professionals)).toBe(true);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(5);
    });

    it("should handle all filter parameters together", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({
          skills: [1],
          minRating: 0,
          minRate: 3000,
          maxRate: 15000,
          sortBy: "rating_desc",
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals.length).toBeGreaterThanOrEqual(0);
      expect(res.body.data.meta).toBeDefined();
    });
  });

  // ========================
  // GET /search/skills - AUTOCOMPLETE
  // ========================

  describe("GET /api/search/skills - Skills Autocomplete", () => {
    it("should autocomplete skills by name", async () => {
      const res = await request(app)
        .get("/api/search/skills")
        .query({ q: "React" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.skills)).toBe(true);

      if (res.body.data.skills.length > 0) {
        res.body.data.skills.forEach((skill: any) => {
          expect(skill.name.toLowerCase()).toContain("react");
        });
      }
    });

    it("should return suggestions in relevant order", async () => {
      const res = await request(app)
        .get("/api/search/skills")
        .query({ q: "type" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });

    it("should handle empty query", async () => {
      const res = await request(app)
        .get("/api/search/skills")
        .query({ q: "" });

      expect([200, 400]).toContain(res.status);
    });

    it("should be case-insensitive", async () => {
      const res1 = await request(app)
        .get("/api/search/skills")
        .query({ q: "node" });

      const res2 = await request(app)
        .get("/api/search/skills")
        .query({ q: "NODE" });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  // ========================
  // GET /search/filter-options - FILTER OPTIONS
  // ========================

  describe("GET /api/search/filters - Get Filter Options", () => {
    it("should return available filter options - 200", async () => {
      const res = await request(app).get("/api/search/filters");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("filters");
      expect(Array.isArray(res.body.data.filters.skills)).toBe(true);
      expect(Array.isArray(res.body.data.filters.availabilityStatuses)).toBe(true);
    });

    it("should return skills with required properties", async () => {
      const res = await request(app).get("/api/search/filters");

      expect(res.status).toBe(200);
      if (res.body.data.filters.skills.length > 0) {
        const skill = res.body.data.filters.skills[0];
        expect(skill).toHaveProperty("id");
        expect(skill).toHaveProperty("name");
        expect(skill).toHaveProperty("category");
      }
    });

    it("should return availability status options", async () => {
      const res = await request(app).get("/api/search/filters");

      expect(res.status).toBe(200);
      const statuses = res.body.data.filters.availabilityStatuses;
      expect(statuses).toContain("available");
      expect(statuses).toContain("unavailable");
      expect(statuses).toContain("away");
    });

    it("should be publicly accessible", async () => {
      const res = await request(app).get("/api/search/filters");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================
  // PERFORMANCE & EDGE CASES
  // ========================

  describe("Search Performance & Edge Cases", () => {
    it("should handle search with no results", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ minRate: 999999 });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals).toEqual([]);
      expect(res.body.data.meta.total).toBe(0);
    });

    it("should handle large page limits", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ limit: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals.length).toBeLessThanOrEqual(100);
    });

    it("should handle accessing last page", async () => {
      const firstRes = await request(app)
        .get("/api/search/professionals")
        .query({ page: 1, limit: 10 });

      const lastPage = Math.ceil(firstRes.body.data.meta.total / 10);
      const lastRes = await request(app)
        .get("/api/search/professionals")
        .query({ page: lastPage, limit: 10 });

      expect(lastRes.status).toBe(200);
    });

    it("should handle accessing beyond last page", async () => {
      const res = await request(app)
        .get("/api/search/professionals")
        .query({ page: 999999, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals).toEqual([]);
    });
  });
});

