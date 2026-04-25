/**
 * Portfolio Integration Tests
 * Tests for portfolio item CRUD operations and validations
 */

import request from "supertest";
import app from "../app";
import { testUsers } from "./fixtures/users.fixture";
import { createProfileFixtures } from "./fixtures/profiles.fixture";
import { createPortfolioFixtures, updatePortfolioFixtures } from "./fixtures/portfolioItems.fixture";
import { query } from "./setup";

describe("Portfolio Integration Tests", () => {
  let userId: number;
  let authToken: string;
  let profileId: number;
  let portfolioItemId: number;

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
    await query("DELETE FROM portfolio_items WHERE professional_id = $1", [profileId]);
  });

  // ========================
  // POST /portfolio/me - CREATE
  // ========================

  describe("POST /api/profiles/me/portfolio - Create Portfolio Item", () => {
    it("should create portfolio item with valid data - 201", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.valid);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.portfolioItem).toHaveProperty("id");
      expect(res.body.data.portfolioItem.title).toBe(createPortfolioFixtures.valid.title);
      expect(res.body.data.portfolioItem.description).toBe(createPortfolioFixtures.valid.description);
      expect(res.body.data.portfolioItem.imageUrl).toBe(createPortfolioFixtures.valid.imageUrl);
      expect(res.body.data.portfolioItem.linkUrl).toBe(createPortfolioFixtures.valid.linkUrl);
      expect(res.body.message).toContain("created successfully");
    });

    it("should create portfolio item with minimal data", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.validMinimal);

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.title).toBe(createPortfolioFixtures.validMinimal.title);
      expect(res.body.data.portfolioItem.description).toBeNull();
      expect(res.body.data.portfolioItem.imageUrl).toBeNull();
      expect(res.body.data.portfolioItem.linkUrl).toBeNull();
    });

    it("should create portfolio item without image URL", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.validNoImage);

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.imageUrl).toBeNull();
      expect(res.body.data.portfolioItem.linkUrl).toBeDefined();
    });

    it("should create portfolio item without link URL", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.validNoLink);

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.linkUrl).toBeNull();
      expect(res.body.data.portfolioItem.imageUrl).toBeDefined();
    });

    it("should create portfolio item with all fields", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.validAllFields);

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem).toMatchObject({
        title: createPortfolioFixtures.validAllFields.title,
        description: createPortfolioFixtures.validAllFields.description,
        imageUrl: createPortfolioFixtures.validAllFields.imageUrl,
        linkUrl: createPortfolioFixtures.validAllFields.linkUrl,
      });
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .send(createPortfolioFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 404 if profile doesn't exist", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send(testUsers.professional2);

      const newAuthToken = signupRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", newAuthToken)
        .send(createPortfolioFixtures.valid);

      expect(res.status).toBe(404);
    });

    it("should reject missing title", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.invalid.noTitle);

      expect(res.status).toBe(400);
    });

    it("should reject title exceeding max length", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.invalid.titleTooLong);

      expect(res.status).toBe(400);
    });

    it("should reject description exceeding max length", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.invalid.descriptionTooLong);

      expect(res.status).toBe(400);
    });

    it("should reject invalid image URL format", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.invalid.invalidImageUrl);

      expect(res.status).toBe(400);
    });

    it("should reject invalid link URL format", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.invalid.invalidLinkUrl);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // GET /portfolio/:userId - READ LIST
  // ========================

  describe("GET /api/portfolio/:userId - Retrieve Portfolio Items", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.valid);
    });

    it("should retrieve portfolio items for a user - 200", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/portfolio`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.portfolioItems)).toBe(true);
      expect(res.body.data.portfolioItems.length).toBeGreaterThan(0);
    });

    it("should return empty array when no portfolio items", async () => {
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

      const res = await request(app).get(`/api/profiles/${newUserId}/portfolio`);

      expect(res.status).toBe(200);
      expect(res.body.data.portfolioItems).toEqual([]);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/api/profiles/999999/portfolio");

      expect(res.status).toBe(404);
    });

    it("should include all portfolio item details", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/portfolio`);

      expect(res.status).toBe(200);
      if (res.body.data.portfolioItems.length > 0) {
        const item = res.body.data.portfolioItems[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("description");
        expect(item).toHaveProperty("imageUrl");
        expect(item).toHaveProperty("linkUrl");
        expect(item).toHaveProperty("createdAt");
      }
    });

    it("should sort portfolio items by creation date (newest first)", async () => {
      const res = await request(app).get(`/api/profiles/${userId}/portfolio`);

      expect(res.status).toBe(200);
      const items = res.body.data.portfolioItems;
      if (items.length > 1) {
        for (let i = 0; i < items.length - 1; i++) {
          const date1 = new Date(items[i].createdAt);
          const date2 = new Date(items[i + 1].createdAt);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });
  });

  // ========================
  // PUT /portfolio/me/:itemId - UPDATE
  // ========================

  describe("PUT /api/profiles/me/portfolio/:itemId - Update Portfolio Item", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.valid);

      portfolioItemId = res.body.data.portfolioItem.id; // Store for use in tests
    });

    it("should update portfolio item with valid data - 200", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.valid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.portfolioItem.title).toBe(updatePortfolioFixtures.valid.title);
      expect(res.body.data.portfolioItem.description).toBe(updatePortfolioFixtures.valid.description);
      expect(res.body.data.portfolioItem.imageUrl).toBe(updatePortfolioFixtures.valid.imageUrl);
      expect(res.body.data.portfolioItem.linkUrl).toBe(updatePortfolioFixtures.valid.linkUrl);
    });

    it("should support partial updates", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.data.portfolioItem.title).toBe(updatePortfolioFixtures.partialUpdate.title);
      // Other fields should remain unchanged
      expect(res.body.data.portfolioItem.description).toBe(createPortfolioFixtures.valid.description);
    });

    it("should update only description", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.updateDescription);

      expect(res.status).toBe(200);
      expect(res.body.data.portfolioItem.description).toBe(updatePortfolioFixtures.updateDescription.description);
      expect(res.body.data.portfolioItem.title).toBe(createPortfolioFixtures.valid.title);
    });

    it("should update image and link URLs", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.updateLinks);

      expect(res.status).toBe(200);
      expect(res.body.data.portfolioItem.imageUrl).toBe(updatePortfolioFixtures.updateLinks.imageUrl);
      expect(res.body.data.portfolioItem.linkUrl).toBe(updatePortfolioFixtures.updateLinks.linkUrl);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .send(updatePortfolioFixtures.valid);

      expect(res.status).toBe(401);
    });

    it("should return 404 if portfolio item not found", async () => {
      const res = await request(app)
        .put("/api/profiles/me/portfolio/999999")
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.valid);

      expect(res.status).toBe(404);
    });

    it("should reject empty title in update", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.invalid.emptyTitle);

      expect(res.status).toBe(400);
    });

    it("should reject invalid URL in update", async () => {
      const res = await request(app)
        .put(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken)
        .send(updatePortfolioFixtures.invalid.invalidUrl);

      expect(res.status).toBe(400);
    });
  });

  // ========================
  // DELETE /portfolio/me/:itemId - DELETE
  // ========================

  describe("DELETE /api/profiles/me/portfolio/:itemId - Delete Portfolio Item", () => {
    beforeEach(async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send(createPortfolioFixtures.valid);

      portfolioItemId = res.body.data.portfolioItem.id; // Store for use in tests
    });

    it("should delete portfolio item - 204", async () => {
      const res = await request(app)
        .delete(`/api/profiles/me/portfolio/${portfolioItemId}`)
        .set("Cookie", authToken);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app).get(`/api/profiles/${userId}/portfolio`);
      expect(getRes.body.data.portfolioItems.length).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).delete(`/api/profiles/me/portfolio/${portfolioItemId}`);

      expect(res.status).toBe(401);
    });

    it("should return 404 if portfolio item not found", async () => {
      const res = await request(app)
        .delete("/api/profiles/me/portfolio/999999")
        .set("Cookie", authToken);

      expect(res.status).toBe(404);
    });
  });

  // ========================
  // VALIDATION & EDGE CASES
  // ========================

  describe("Portfolio Validation & Edge Cases", () => {
    it("should handle very long titles", async () => {
      const longTitle = "A".repeat(255);
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: longTitle,
          description: "A project",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.title).toBe(longTitle);
    });

    it("should handle very long descriptions", async () => {
      const longDescription = "Project description. ".repeat(100);
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: "Project",
          description: longDescription,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.description.length).toBeLessThanOrEqual(5000);
    });

    it("should handle special characters in title and description", async () => {
      const specialTitle = "E-Commerce Platform & Mobile App (iOS/Android)";
      const specialDesc = "Built with React, TypeScript & Node.js—REST API & WebSockets";

      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: specialTitle,
          description: specialDesc,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.title).toBe(specialTitle);
      expect(res.body.data.portfolioItem.description).toBe(specialDesc);
    });

    it("should handle portfolio items without optional fields", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: "Minimal Project",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.description).toBeNull();
      expect(res.body.data.portfolioItem.imageUrl).toBeNull();
      expect(res.body.data.portfolioItem.linkUrl).toBeNull();
    });

    it("should handle portfolio items with GitHub repository links", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: "Open Source Project",
          linkUrl: "https://github.com/user/project",
          imageUrl: "https://raw.githubusercontent.com/user/project/main/screenshot.png",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.linkUrl).toContain("github.com");
      expect(res.body.data.portfolioItem.imageUrl).toContain("githubusercontent.com");
    });

    it("should handle portfolio items with video demo links", async () => {
      const res = await request(app)
        .post("/api/profiles/me/portfolio")
        .set("Cookie", authToken)
        .send({
          title: "Video Demo Project",
          linkUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.portfolioItem.linkUrl).toContain("youtube.com");
    });
  });
});

