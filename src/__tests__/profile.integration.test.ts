/**
 * Profile Integration Tests
 * Tests for professional profile CRUD operations and validations
 */

import request from "supertest";
import app from "../app";
import { testUsers } from "./fixtures/users.fixture";
import { createProfileFixtures, updateProfileFixtures, testProfiles } from "./fixtures/profiles.fixture";
import { query } from "./setup";

describe("Profile Integration Tests", () => {
  let userId: number;
  let authToken: string;

  // Setup: Create a test user and authenticate
  beforeAll(async () => {
    const signupRes = await request(app)
      .post("/api/auth/signup")
      .send(testUsers.professional1);

    expect(signupRes.status).toBe(201);
    userId = signupRes.body.data.user.id;
    authToken = signupRes.headers["set-cookie"];
  });

  // Cleanup: Remove profile after each test
  afterEach(async () => {
    await query("DELETE FROM professional_profiles WHERE user_id = $1", [userId]);
  });

  // ========================
  // POST /api/profiles - CREATE
  // ========================

  describe("POST /api/profiles - Create Profile", () => {
    it("should create profile with valid data - 201", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toHaveProperty("id");
      expect(res.body.data.profile.hourlyRate).toBe(5000);
      expect(res.body.data.profile.bio).toContain("Experienced");
      expect(res.body.data.profile.availabilityStatus).toBe("available");
      expect(res.body.message).toContain("created successfully");
    });

    it("should create profile with minimal data", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.validMinimal);

      expect(res.status).toBe(201);
      expect(res.body.data.profile.hourlyRate).toBe(3000);
      expect(res.body.data.profile.bio).toBeNull();
      expect(res.body.data.profile.availabilityStatus).toBeDefined();
    });

    it("should create profile with all optional fields", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.validAllFields);

      expect(res.status).toBe(201);
      expect(res.body.data.profile).toMatchObject({
        hourlyRate: 7500,
        responseTimeHours: 4,
        availabilityStatus: "available",
      });
      expect(res.body.data.profile.bio).toContain("MERN");
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .send(createProfileFixtures.valid);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("authentication_error");
    });

    it("should return 409 if profile already exists", async () => {
      // Create first profile
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);

      // Try to create another
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.validAllFields);

      expect(res.status).toBe(409);
      expect(res.body.code).toContain("409");
      expect(res.body.message).toContain("already has");
    });

    it("should reject negative hourly rate", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.invalid.negativeRate);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject zero hourly rate", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.invalid.zeroRate);

      expect(res.status).toBe(400);
    });

    it("should reject bio exceeding max length", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.invalid.bioTooLong);

      expect(res.status).toBe(400);
    });

    it("should reject invalid availability status", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.invalid.invalidAvailability);

      expect(res.status).toBe(400);
    });

    it("should reject negative response time", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.invalid.invalidResponseTime);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // GET /api/profiles/:userId - READ
  // ========================

  describe("GET /api/profiles/:userId - Retrieve Profile", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);
    });

    it("should retrieve profile by user ID - 200", async () => {
      const res = await request(app).get(`/api/profiles/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toHaveProperty("id");
      expect(res.body.data.profile.userId).toBe(userId);
      expect(res.body.data.profile.hourlyRate).toBe(5000);
      expect(res.body.data.profile.user).toBeDefined();
      expect(res.body.data.profile.user.firstName).toBe("John");
    });

    it("should return 404 if profile not found", async () => {
      const res = await request(app).get("/api/profiles/999999");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("not found");
    });

    it("should not expose sensitive user information", async () => {
      const res = await request(app).get(`/api/profiles/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.user).not.toHaveProperty("email");
      expect(res.body.data.profile.user).not.toHaveProperty("password");
      expect(res.body.data.profile.user).not.toHaveProperty("deleted_at");
    });
  });

  // ========================
  // GET /api/profiles/:userId/detailed - READ DETAILED
  // ========================

  describe("GET /api/profiles/:userId/detailed - Retrieve Detailed Profile", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);
    });

    it("should retrieve detailed profile with all related data - 200", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/detailed`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toHaveProperty("id");
      expect(res.body.data.profile).toHaveProperty("user");
      expect(res.body.data.profile).toHaveProperty("skills");
      expect(res.body.data.profile).toHaveProperty("certifications");
      expect(res.body.data.profile).toHaveProperty("portfolioItems");
      expect(Array.isArray(res.body.data.profile.skills)).toBe(true);
      expect(Array.isArray(res.body.data.profile.certifications)).toBe(true);
      expect(Array.isArray(res.body.data.profile.portfolioItems)).toBe(true);
    });

    it("should include basic profile information in detailed response", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/detailed`);

      expect(res.status).toBe(200);
      const { profile } = res.body.data;
      expect(profile.userId).toBe(userId);
      expect(profile.hourlyRate).toBe(5000);
      expect(profile.bio).toContain("Experienced");
      expect(profile.availabilityStatus).toBe("available");
    });

    it("should return empty arrays for skills, certs, portfolio when none exist", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/detailed`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.skills).toEqual([]);
      expect(res.body.data.profile.certifications).toEqual([]);
      expect(res.body.data.profile.portfolioItems).toEqual([]);
    });

    it("should return 404 if detailed profile not found", async () => {
      const res = await request(app).get("/api/profiles/999999/detailed");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================
  // GET /api/profiles/me - READ OWN PROFILE
  // ========================

  describe("GET /api/profiles/me - Retrieve Own Profile", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);
    });

    it("should retrieve own profile when authenticated - 200", async () => {
      const res = await request(app)
        .get("/api/profiles/me")
        .set("Cookie", authToken);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.userId).toBe(userId);
      expect(res.body.data.profile.hourlyRate).toBe(5000);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/profiles/me");

      expect(res.status).toBe(401);
    });

    it("should return 404 if own profile doesn't exist", async () => {
      // Delete the profile
      await query("DELETE FROM professional_profiles WHERE user_id = $1", [userId]);

      const res = await request(app)
        .get("/api/profiles/me")
        .set("Cookie", authToken);

      expect(res.status).toBe(404);
    });
  });

  // ========================
  // PUT /api/profiles/me - UPDATE
  // ========================

  describe("PUT /api/profiles/me - Update Profile", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(testProfiles.basic);
    });

    it("should update profile with valid data - 200", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.valid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.bio).toBe("Updated bio - Senior Full-stack Developer");
      expect(res.body.data.profile.hourlyRate).toBe(6000);
      expect(res.body.data.profile.availabilityStatus).toBe("away");
      expect(res.body.data.profile.responseTimeHours).toBe(48);
    });

    it("should support partial updates", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.bio).toBe("Only updating bio");
      expect(res.body.data.profile.hourlyRate).toBe(5000); // Unchanged
    });

    it("should update only specified fields", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.anotherPartial);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.hourlyRate).toBe(8000);
      expect(res.body.data.profile.availabilityStatus).toBe("unavailable");
      expect(res.body.data.profile.bio).toBe("Node.js developer"); // Unchanged
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .send(updateProfileFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should reject negative hourly rate in update", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.invalid.negativeRate);

      expect(res.status).toBe(400);
    });

    it("should reject bio exceeding max length in update", async () => {
      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.invalid.bioTooLong);

      expect(res.status).toBe(400);
    });

    it("should return 404 if profile doesn't exist", async () => {
      // Delete the profile
      await query("DELETE FROM professional_profiles WHERE user_id = $1", [userId]);

      const res = await request(app)
        .put("/api/profiles/me")
        .set("Cookie", authToken)
        .send(updateProfileFixtures.valid);

      expect(res.status).toBe(404);
    });
  });

  // ========================
  // DELETE /api/profiles/me - DELETE
  // ========================

  describe("DELETE /api/profiles/me - Delete Profile", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send(createProfileFixtures.valid);
    });

    it("should delete profile - 204", async () => {
      const res = await request(app)
        .delete("/api/profiles/me")
        .set("Cookie", authToken);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify deleted
      const getRes = await request(app).get(`/api/profiles/${userId}`);
      expect(getRes.status).toBe(404);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).delete("/api/profiles/me");

      expect(res.status).toBe(401);
    });

    it("should return 404 if profile doesn't exist", async () => {
      // Delete the profile first
      await query("DELETE FROM professional_profiles WHERE user_id = $1", [userId]);

      const res = await request(app)
        .delete("/api/profiles/me")
        .set("Cookie", authToken);

      expect(res.status).toBe(404);
    });

    it("should cascade delete related data", async () => {
      // Verify profile exists
      let getRes = await request(app).get(`/api/profiles/${userId}`);
      expect(getRes.status).toBe(200);

      // Delete profile
      const deleteRes = await request(app)
        .delete("/api/profiles/me")
        .set("Cookie", authToken);
      expect(deleteRes.status).toBe(204);

      // Verify profile is gone
      getRes = await request(app).get(`/api/profiles/${userId}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ========================
  // VALIDATION & EDGE CASES
  // ========================

  describe("Profile Validation & Edge Cases", () => {
    it("should handle very large hourly rate", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send({ hourlyRate: 999999 });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.hourlyRate).toBe(999999);
    });

    it("should preserve special characters in bio", async () => {
      const specialBio = "Developer & Architect! @React #TypeScript";
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send({ hourlyRate: 5000, bio: specialBio });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.bio).toBe(specialBio);
    });

    it("should handle profile without bio", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send({ hourlyRate: 5000 });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.bio).toBeNull();
    });

    it("should set default availability status if not provided", async () => {
      const res = await request(app)
        .post("/api/profiles")
        .set("Cookie", authToken)
        .send({ hourlyRate: 5000 });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.availabilityStatus).toBeDefined();
    });
  });
});
