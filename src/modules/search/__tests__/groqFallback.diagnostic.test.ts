import axios from "axios";
import { classifyText } from "../groqClient";
import { clearParserCache, parseQuery } from "../searchParserService";
import * as groqClient from "../groqClient";
import * as taxonomy from "../searchTaxonomy";

jest.mock("axios");
jest.mock("../../../config/db", () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

describe("Groq fallback diagnostics", () => {
  beforeEach(() => {
    clearParserCache();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_MAX_RETRIES = "0";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("confirms 'fix my chair' bypasses taxonomy and reaches Groq", async () => {
    const taxonomySpy = jest.spyOn(taxonomy, "matchTaxonomy");
    jest.spyOn(groqClient, "classifyText").mockResolvedValue({
      profession: "carpenter",
      skill: "chair repair",
      intent: "search_professional",
      keywords: ["chair repair"],
      location: null,
      price_intent: null,
      comment: "A carpenter repairs wooden chairs",
    });

    const parsed = await parseQuery({ query: "i need someone to fix my chair" });

    expect(taxonomySpy).toHaveReturnedWith(null);
    expect(groqClient.classifyText).toHaveBeenCalledWith("fix chair");
    expect(parsed.parserSource).toBe("groq");
    expect(parsed.primaryProfession).toBe("carpenter");
    expect(parsed.primarySkill).toBe("chair repair");
  });

  it("verifies the real client strictly parses a carpenter JSON completion", async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          profession: "carpenter",
          skill: "chair repair",
          intent: "search_professional",
          keywords: ["chair repair"],
          location: null,
          price_intent: null,
          comment: null,
        }) } }],
      },
    });

    const result = await classifyText("fix chair");

    expect(result.profession).toBe("carpenter");
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({ model: expect.any(String) }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-key" }) }),
    );
    const prompt = (axios.post as jest.Mock).mock.calls[0][1].messages[0].content;
    expect(prompt).toContain("fix chair");
    expect(prompt).toContain("Return ONLY valid JSON");
  });

  it("identifies invalid JSON as a client failure", async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { choices: [{ message: { content: "carpenter" } }] } });
    await expect(classifyText("fix chair")).rejects.toThrow();
  });

  it("shows parser behavior when Groq returns no profession", async () => {
    jest.spyOn(groqClient, "classifyText").mockResolvedValue({
      profession: null,
      skill: null,
      intent: "search_professional",
      keywords: ["fix", "chair"],
      location: null,
      price_intent: null,
      comment: null,
    });

    const parsed = await parseQuery({ query: "i need someone to fix my chair" });

    expect(parsed.parserSource).toBe("fallback");
    expect(parsed.primaryProfession).toBeNull();
    expect(parsed.keywords).toEqual(["fix", "chair"]);
  });
});
