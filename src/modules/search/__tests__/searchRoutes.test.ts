import { describe, expect, it, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import router from "../searchRoutes";
import * as parser from "../searchParserService";
import * as searchService from "../searchService";
import { errorHandler } from "../../../middleware/errorMiddleware";

jest.mock("../searchParserService");
jest.mock("../searchService");

const mockParseQuery = parser.parseQuery as jest.MockedFunction<typeof parser.parseQuery>;
const mockSearchProfessionals = searchService.searchProfessionals as jest.MockedFunction<typeof searchService.searchProfessionals>;

describe("POST /api/search/professionals", () => {
  it("returns professionals, pagination metadata, and parsed query", async () => {
    mockParseQuery.mockResolvedValue({ intent: "search_professional", primaryProfession: "plumber", primarySkill: "plumbing repair", keywords: ["sink"], locationHint: "Lagos", priceIntent: null, confidence: 0.9, parserSource: "rule", rawQuery: "fix sink", normalizedQuery: "fix sink", filters: { location: "Lagos" } });
    mockSearchProfessionals.mockResolvedValue({ professionals: [{ id: 1 }] as any, total: 1, page: 1, limit: 20, pages: 1 });
    const app = express(); app.use(express.json()); app.use("/api/search", router); app.use(errorHandler);
    const response = await request(app).post("/api/search/professionals").send({ query: "fix sink", location: "Lagos" });
    expect(response.status).toBe(200);
    expect(response.body.data.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(response.body.data.parsedQuery.primaryProfession).toBe("plumber");
    expect(response.headers["x-parser-source"]).toBe("rule");
    expect(searchService.searchProfessionals).toHaveBeenCalledWith(expect.objectContaining({ inferredProfession: "plumber", location: "Lagos" }));
  });

  it("rejects an empty query", async () => {
    const app = express(); app.use(express.json()); app.use("/api/search", router); app.use(errorHandler);
    const response = await request(app).post("/api/search/professionals").send({ query: "" });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/search/professionals - Search by profession name", () => {
  it("passes profession filter down to search service", async () => {
    mockSearchProfessionals.mockResolvedValue({
      professionals: [{ id: 1, profession: "Carpenter" }] as any,
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    });
    const app = express();
    app.use(express.json());
    app.use("/api/search", router);
    app.use(errorHandler);

    const response = await request(app)
      .get("/api/search/professionals")
      .query({ profession: "Carpenter", page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(searchService.searchProfessionals).toHaveBeenCalledWith(
      expect.objectContaining({ profession: "Carpenter" })
    );
  });
});
