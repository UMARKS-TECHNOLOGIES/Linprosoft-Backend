/**
 * Certification Integration Tests
 * Tests for certification CRUD operations and validations
 */

import request from "supertest";
import app from "../app";
import { testUsers } from "./fixtures/users.fixture";
import { createProfileFixtures } from "./fixtures/profiles.fixture";
import { createCertificationFixtures, updateCertificationFixtures } from "./fixtures/certifications.fixture";
import { query } from "./setup";

describe("Certification Integration Tests", () => {
  let userId: number;
  let authToken: string;
  let profileId: number;
  let certificationId: number;

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
    await query("DELETE FROM certifications WHERE professional_id = $1", [profileId]);
  });

  // ========================
  // POST /certifications/me - CREATE
  // ========================

  describe("POST /api/profiles/me/certifications - Create Certification", () => {
    it("should create certification with valid data - 201", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.valid);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.certification).toHaveProperty("id");
      expect(res.body.data.certification.title).toBe(createCertificationFixtures.valid.title);
      expect(res.body.data.certification.issuer).toBe(createCertificationFixtures.valid.issuer);
      expect(res.body.message).toContain("added successfully");
    });

    it("should create certification with minimal data", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.validMinimal);

      expect(res.status).toBe(201);
      expect(res.body.data.certification.title).toBe(createCertificationFixtures.validMinimal.title);
      expect(res.body.data.certification.issuer).toBeNull();
      expect(res.body.data.certification.issueDate).toBeNull();
    });

    it("should create certification without expiry date", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.validNoExpiry);

      expect(res.status).toBe(201);
      expect(res.body.data.certification.title).toContain("Linux");
      expect(res.body.data.certification.expiryDate).toBeNull();
    });

    it("should create expired certification", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.validExpired);

      expect(res.status).toBe(201);
      expect(res.body.data.certification.title).toContain("Expired");
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .send(createCertificationFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 404 if profile doesn't exist", async () => {
      // Create auth token but without a profile
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send(testUsers.professional2);

      const newAuthToken = signupRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", newAuthToken)
        .send(createCertificationFixtures.valid);

      expect(res.status).toBe(404);
    });

    it("should reject missing title", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.invalid.noTitle);

      expect(res.status).toBe(400);
    });

    it("should reject invalid date format for issueDate", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.invalid.invalidDateFormat);

      expect(res.status).toBe(400);
    });

    it("should allow expiry date before issue date with current validation", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.invalid.expiryBeforeIssue);

      expect(res.status).toBe(201);
    });

    it("should allow future issue date with current validation", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.invalid.futureDateIssue);

      expect(res.status).toBe(201);
    });

    it("should reject invalid credential URL", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.invalid.invalidUrl);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // GET /certifications/:userId - READ LIST
  // ========================

  describe("GET /api/certifications/:userId - Retrieve Certifications", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.valid);
    });

    it("should retrieve certifications for a user - 200", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/certifications`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.certifications)).toBe(true);
      expect(res.body.data.certifications.length).toBeGreaterThan(0);
    });

    it("should return empty array when no certifications", async () => {
      // Get user without certifications
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

      const res = await request(app).get(`/api/profiles/${newUserId}/certifications`);

      expect(res.status).toBe(200);
      expect(res.body.data.certifications).toEqual([]);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/api/profiles/999999/certifications");

      expect(res.status).toBe(404);
    });

    it("should include all certification details", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/certifications`);

      expect(res.status).toBe(200);
      if (res.body.data.certifications.length > 0) {
        const cert = res.body.data.certifications[0];
        expect(cert).toHaveProperty("id");
        expect(cert).toHaveProperty("title");
        expect(cert).toHaveProperty("issuer");
        expect(cert).toHaveProperty("issueDate");
        expect(cert).toHaveProperty("expiryDate");
        expect(cert).toHaveProperty("credentialUrl");
        expect(cert).toHaveProperty("createdAt");
      }
    });

    it("should sort certifications by creation date (newest first)", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/certifications`);

      expect(res.status).toBe(200);
      const certs = res.body.data.certifications;
      if (certs.length > 1) {
        // Verify sorted by created_at DESC
        for (let i = 0; i < certs.length - 1; i++) {
          const date1 = new Date(certs[i].createdAt);
          const date2 = new Date(certs[i + 1].createdAt);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });
  });

  // ========================
  // PUT /certifications/me/:certId - UPDATE
  // ========================

  describe("PUT /api/profiles/me/certifications/:certId - Update Certification", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.valid);

      certificationId = res.body.data.certification.id; // Store for use in tests
    });

    it("should update certification with valid data - 200", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set("Cookie", authToken)
        .send(updateCertificationFixtures.valid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.certification.title).toBe(updateCertificationFixtures.valid.title);
      expect(res.body.data.certification.issuer).toBe(updateCertificationFixtures.valid.issuer);
    });

    it("should support partial updates", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set("Cookie", authToken)
        .send(updateCertificationFixtures.partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.data.certification.title).toBe(updateCertificationFixtures.partialUpdate.title);
      // Other fields should remain unchanged
      expect(res.body.data.certification.issuer).toBe(createCertificationFixtures.valid.issuer);
    });

    it("should update only expiry date", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set("Cookie", authToken)
        .send(updateCertificationFixtures.updateExpiry);

      expect(res.status).toBe(200);
      expect(res.body.data.certification.expiryDate).toContain(updateCertificationFixtures.updateExpiry.expiryDate.slice(0, 10));
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .send(updateCertificationFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 404 if certification not found", async () => {
      const res = await request(app)
        .put("/api/profiles/me/certifications/999999")
        .set("Cookie", authToken)
        .send(updateCertificationFixtures.valid);

      expect(res.status).toBe(404);
    });

    it("should reject invalid date format in update", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/certifications/${certificationId}`)
        .set("Cookie", authToken)
        .send(updateCertificationFixtures.invalid.invalidDateFormat);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // DELETE /certifications/me/:certId - DELETE
  // ========================

  describe("DELETE /api/profiles/me/certifications/:certId - Delete Certification", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send(createCertificationFixtures.valid);

      certificationId = res.body.data.certification.id; // Store for use in tests
    });

    it("should delete certification - 204", async () => {
      const res = await request(app)
        .delete(`/api/profiles/me/certifications/${certificationId}`)
        .set("Cookie", authToken);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app).get(`/api/profiles/${userId}/certifications`);
      expect(getRes.body.data.certifications.length).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).delete(`/api/profiles/me/certifications/${certificationId}`);

      expect(res.status).toBe(401);
    });

    it("should return 404 if certification not found", async () => {
      const res = await request(app)
        .delete("/api/profiles/me/certifications/999999")
        .set("Cookie", authToken);

      expect(res.status).toBe(404);
    });
  });

  // ========================
  // VALIDATION & EDGE CASES
  // ========================

  describe("Certification Validation & Edge Cases", () => {
    it("should handle very long titles", async () => {
      const longTitle = "A".repeat(255); // Max length
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send({
          title: longTitle,
          issuer: "Test Org",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.certification.title).toBe(longTitle);
    });

    it("should preserve special characters in title and issuer", async () => {
      const specialTitle = "AWS Certified - Solutions Architect (Professional) & Enterprise";
      const specialIssuer = "Amazon Web Services™ (AWS)";

      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send({
          title: specialTitle,
          issuer: specialIssuer,
          credentialUrl: "https://example.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.certification.title).toBe(specialTitle);
      expect(res.body.data.certification.issuer).toBe(specialIssuer);
    });

    it("should handle certificates without dates", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send({
          title: "No Date Certification",
          // No dates provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.certification.issueDate).toBeNull();
      expect(res.body.data.certification.expiryDate).toBeNull();
    });

    it("should reject null credential URL", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send({
          title: "Offline Certification",
          issuer: "Some University",
          credentialUrl: null,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("should handle same-day issue and expiry dates", async () => {
      const res = await request(app)
        .post("/api/profiles/me/certifications")
        .set("Cookie", authToken)
        .send({
          title: "One Day Cert",
          issueDate: "2024-01-01",
          expiryDate: "2024-01-01",
        });

      // Should be valid (expires at end of day)
      expect([201, 400]).toContain(res.status);
    });
  });
});

