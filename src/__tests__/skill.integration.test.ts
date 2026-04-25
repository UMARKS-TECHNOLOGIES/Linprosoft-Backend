/**
 * Skill Integration Tests
 * Tests for skill management CRUD and validations
 */

import request from "supertest";
import app from "../app";
import { testUsers } from "./fixtures/users.fixture";
import { createProfileFixtures } from "./fixtures/profiles.fixture";
import { addSkillFixtures, updateSkillFixtures } from "./fixtures/skills.fixture";
import { query } from "./setup";

describe("Skill Integration Tests", () => {
  let userId: number;
  let authToken: string;
  let profileId: number;

  // Setup: Create test user and profile
  beforeAll(async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send(testUsers.professional1);

    userId = signupRes.body.data.user.id;
    authToken = signupRes.headers["set-cookie"];

    // Create profile
    const profileRes = await request(app)
      .post("/api/profiles")
      .set("Cookie", authToken)
      .send(createProfileFixtures.valid);

    profileId = profileRes.body.data.profile.id;
  });

  // Cleanup
  afterEach(async () => {
    await query("DELETE FROM professional_skills WHERE professional_id = $1", [profileId]);
  });

  // ========================
  // GET /api/skills - GET ALL SKILLS
  // ========================

  describe("GET /api/skills - Retrieve All Skills", () => {
    it("should retrieve all skills with default pagination - 200", async () => {
      const res = await request(app).get("/api/skills");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("skills");
      expect(res.body.data).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data.skills)).toBe(true);
      expect(res.body.data.pagination.limit).toBe(20); // Default limit
      expect(res.body.data.pagination.offset).toBe(0);
      expect(res.body.data.pagination).toHaveProperty("total");
      expect(res.body.data.pagination).toHaveProperty("totalPages");
    });

    it("should return skills with expected structure", async () => {
      const res = await request(app).get("/api/skills");

      expect(res.status).toBe(200);
      if (res.body.data.skills.length > 0) {
        const skill = res.body.data.skills[0];
        expect(skill).toHaveProperty("id");
        expect(skill).toHaveProperty("name");
        expect(skill).toHaveProperty("category");
        expect(skill).toHaveProperty("description");
      }
    });

    it("should support limit parameter", async () => {
      const res = await request(app).get("/api/skills?limit=10");

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.skills.length).toBeLessThanOrEqual(10);
    });

    it("should support offset parameter", async () => {
      const page1 = await request(app).get("/api/skills?limit=5&offset=0");
      const page2 = await request(app).get("/api/skills?limit=5&offset=5");

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      if (page1.body.data.pagination.total > 5) {
        // If we have more than 5 skills, pages should be different
        expect(page1.body.data.skills[0].id).not.toEqual(page2.body.data.skills[0].id);
      }
    });

    it("should support max limit of 100", async () => {
      const res = await request(app).get("/api/skills?limit=100");

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(100);
    });

    it("should reject limit exceeding max (100)", async () => {
      const res = await request(app).get("/api/skills?limit=150");

      expect(res.status).toBe(400);
    });

    it("should reject zero limit", async () => {
      const res = await request(app).get("/api/skills?limit=0");

      expect(res.status).toBe(400);
    });

    it("should reject negative offset", async () => {
      const res = await request(app).get("/api/skills?offset=-5");

      expect(res.status).toBe(400);
    });

    it("should calculate total pages correctly", async () => {
      const res = await request(app).get("/api/skills?limit=20");

      expect(res.status).toBe(200);
      const { total, limit, totalPages } = res.body.data.pagination;
      const expectedPages = Math.ceil(total / limit);
      expect(totalPages).toBe(expectedPages);
    });

    it("should be publicly accessible (no auth required)", async () => {
      const res = await request(app).get("/api/skills");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================
  // GET /:userId/skills - GET PROFILE SKILLS
  // ========================

  describe("GET /:userId/skills - Retrieve Profile Skills", () => {
    beforeEach(async () => {
      // Add a skill to the profile
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);
    });

    it("should retrieve skills for a profile - 200", async () => {
      const res = await request(app).get(`/api/skills/${userId}/skills`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.skills)).toBe(true);
      expect(res.body.data.skills.length).toBeGreaterThan(0);
    });

    it("should return empty array when no skills", async () => {
      // Get a user without skills
      const newUserRes = await request(app)
        .post("/api/auth/signup")
        .send(testUsers.professional2);

      const newUserId = newUserRes.body.data.user.id;
      const newAuthToken = newUserRes.headers["set-cookie"];

      // Create profile for new user
      await request(app)
        .post("/api/profiles")
        .set("Cookie", newAuthToken)
        .send(createProfileFixtures.valid);

      const res = await request(app).get(`/api/skills/${newUserId}/skills`);

      expect(res.status).toBe(200);
      expect(res.body.data.skills).toEqual([]);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/api/skills/999999/skills");

      expect(res.status).toBe(404);
    });

    it("should include skill details in response", async () => {
      const res = await request(app).get(`/api/skills/${userId}/skills`);

      expect(res.status).toBe(200);
      if (res.body.data.skills.length > 0) {
        const skill = res.body.data.skills[0];
        expect(skill).toHaveProperty("skillId");
        expect(skill).toHaveProperty("name");
        expect(skill).toHaveProperty("category");
        expect(skill).toHaveProperty("proficiencyLevel");
        expect(skill).toHaveProperty("yearsOfExperience");
        expect(skill).toHaveProperty("isPrimary");
      }
    });
  });

  // ========================
  // POST /me/skills - ADD SKILL
  // ========================

  describe("POST /api/skills/me/skills - Add Skill", () => {
    it("should add skill with valid data - 201", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skill).toHaveProperty("skillId");
      expect(res.body.data.skill.skillId).toBe(addSkillFixtures.valid.skillId);
      expect(res.body.data.skill.proficiencyLevel).toBe("expert");
      expect(res.body.data.skill.yearsOfExperience).toBe(4);
      expect(res.body.data.skill.isPrimary).toBe(true);
    });

    it("should add skill with minimal data", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.validMinimal);

      expect(res.status).toBe(201);
      expect(res.body.data.skill.skillId).toBe(2);
      expect(res.body.data.skill.proficiencyLevel).toBeNull();
      expect(res.body.data.skill.isPrimary).toBe(false);
    });

    it("should set primary skill correctly", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send({ ...addSkillFixtures.validIntermediate, isPrimary: true });

      expect(res.status).toBe(201);
      expect(res.body.data.skill.isPrimary).toBe(true);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .send(addSkillFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 409 if skill already added", async () => {
      // Add skill first time
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);

      // Try to add same skill again
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already added");
    });

    it("should reject non-existent skill ID", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.invalid.invalidSkillId);

      expect(res.status).toBe(404);
    });

    it("should reject missing skill ID", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.invalid.noSkillId);

      expect(res.status).toBe(400);
    });

    it("should reject invalid proficiency level", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.invalid.invalidProficiency);

      expect(res.status).toBe(400);
    });

    it("should reject negative years of experience", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.invalid.negativeYears);

      expect(res.status).toBe(400);
    });

    it("should reject excessive years of experience", async () => {
      const res = await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.invalid.tooManyYears);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // PUT /me/skills/:skillId - UPDATE SKILL
  // ========================

  describe("PUT /api/skills/me/skills/:skillId - Update Skill", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);
    });

    it("should update skill with valid data - 200", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .set("Cookie", authToken)
        .send(updateSkillFixtures.valid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skill.proficiencyLevel).toBe("expert");
      expect(res.body.data.skill.yearsOfExperience).toBe(5);
      expect(res.body.data.skill.isPrimary).toBe(true);
    });

    it("should support partial updates", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .set("Cookie", authToken)
        .send(updateSkillFixtures.partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.data.skill.proficiencyLevel).toBe("intermediate");
      // Other fields should remain unchanged
    });

    it("should update only years of experience", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .set("Cookie", authToken)
        .send(updateSkillFixtures.updateYears);

      expect(res.status).toBe(200);
      expect(res.body.data.skill.yearsOfExperience).toBe(3);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .send(updateSkillFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 404 if skill not found", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/999999")
        .set("Cookie", authToken)
        .send(updateSkillFixtures.valid);

      expect(res.status).toBe(404);
    });

    it("should reject empty update", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .set("Cookie", authToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should reject invalid proficiency level in update", async () => {
      const res = await request(app)
        .put("/api/skills/me/skills/1")
        .set("Cookie", authToken)
        .send(updateSkillFixtures.invalid.invalidProficiency);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // DELETE /me/skills/:skillId - REMOVE SKILL
  // ========================

  describe("DELETE /api/skills/me/skills/:skillId - Remove Skill", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send(addSkillFixtures.valid);
    });

    it("should remove skill - 204", async () => {
      const res = await request(app)
        .delete("/api/skills/me/skills/1")
        .set("Cookie", authToken);

      expect(res.status).toBe(204);

      // Verify removed
      const getRes = await request(app).get(`/api/skills/${userId}/skills`);
      expect(getRes.body.data.skills.length).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).delete("/api/skills/me/skills/1");

      expect(res.status).toBe(401);
    });

    it("should return 404 if skill not found", async () => {
      const res = await request(app)
        .delete("/api/skills/me/skills/999999")
        .set("Cookie", authToken);

      expect(res.status).toBe(404);
    });
  });

  // ========================
  // VALIDATION & EDGE CASES
  // ========================

  describe("Skill Validation & Edge Cases", () => {
    it("should handle proficiency levels correctly", async () => {
      const levels = ["beginner", "intermediate", "expert"];

      for (const level of levels) {
        const res = await request(app)
          .post("/api/skills/me/skills")
          .set("Cookie", authToken)
          .send({
            skillId: Math.floor(Math.random() * 5) + 1,
            proficiencyLevel: level,
          });

        if (res.status === 201) {
          expect(res.body.data.skill.proficiencyLevel).toBe(level);
        } else if (res.status === 409) {
          // Skill already added, that's ok for this test
        }
      }
    });

    it("should preserve skill order (primary first)", async () => {
      // Add non-primary skill
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send({ skillId: 1, isPrimary: false });

      // Add primary skill
      await request(app)
        .post("/api/skills/me/skills")
        .set("Cookie", authToken)
        .send({ skillId: 2, isPrimary: true });

      const res = await request(app).get(`/api/skills/${userId}/skills`);

      expect(res.status).toBe(200);
      // Primary should be first
      if (res.body.data.skills.length > 0) {
        expect(res.body.data.skills[0].isPrimary).toBe(true);
      }
    });
  });
});
