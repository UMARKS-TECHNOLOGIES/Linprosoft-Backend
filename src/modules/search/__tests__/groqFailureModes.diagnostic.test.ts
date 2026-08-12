import axios from "axios";
import { classifyText } from "../groqClient";
import { clearParserCache, parseQuery } from "../searchParserService";
import * as groqClient from "../groqClient";

jest.mock("axios");
jest.mock("../../../config/db", () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const query = "i need someone to fix my chair";
const nullProfessionResponse = {
  profession: null,
  skill: null,
  intent: "search_professional" as const,
  keywords: ["fix", "chair"],
  location: null,
  price_intent: null,
  comment: "No profession could be inferred",
};

describe("Groq API failure-mode diagnostics", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    clearParserCache();
    process.env.GROQ_API_KEY = "diagnostic-key";
    process.env.GROQ_MAX_RETRIES = "0";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.GROQ_API_KEY = "diagnostic-key";
  });

  it("handles a valid model response with profession: null", async () => {
    jest.spyOn(groqClient, "classifyText").mockResolvedValue(nullProfessionResponse);

    const parsed = await parseQuery({ query });

    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
    expect(parsed.keywords).toEqual(["fix", "chair"]);
  });

  it("handles invalid/non-conforming JSON from Groq", async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { choices: [{ message: { content: "{ profession: carpenter }" } }] },
    });

    await expect(classifyText("fix chair")).rejects.toThrow();

    jest.spyOn(groqClient, "classifyText").mockRejectedValue(new Error("invalid JSON from Groq"));
    const parsed = await parseQuery({ query });
    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
  });

  it("handles a missing GROQ_API_KEY", async () => {
    delete process.env.GROQ_API_KEY;

    await expect(classifyText("fix chair")).rejects.toThrow("GROQ_API_KEY is not configured");

    const parsed = await parseQuery({ query });
    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
  });

  it("handles an invalid GROQ_API_KEY / 401 response", async () => {
    (axios.post as jest.Mock).mockRejectedValue({
      response: { status: 401, data: { error: { message: "Invalid API Key" } } },
      message: "Request failed with status code 401",
    });

    await expect(classifyText("fix chair")).rejects.toBeDefined();

    jest.spyOn(groqClient, "classifyText").mockRejectedValue(new Error("401 Invalid API Key"));
    const parsed = await parseQuery({ query });
    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
  });

  it("handles a network/timeout failure and still searches with fallback keywords", async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error("timeout exceeded"));

    await expect(classifyText("fix chair")).rejects.toThrow("timeout exceeded");

    jest.spyOn(groqClient, "classifyText").mockRejectedValue(new Error("timeout exceeded"));
    const parsed = await parseQuery({ query, location: "Lagos" });
    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
    expect(parsed.keywords).toEqual(["fix", "chair"]);
    expect(parsed.filters.location).toBe("Lagos");
  });
});
