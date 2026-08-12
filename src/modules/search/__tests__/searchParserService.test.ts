import { matchTaxonomy } from "../searchTaxonomy";
import { parseBudget, parseRating } from "../searchNormalizer";
import { parseQuery, clearParserCache } from "../searchParserService";
import * as groqClient from "../groqClient";

jest.mock("../groqClient");
jest.mock("../../../config/db", () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

describe("search parser", () => {
  beforeEach(() => { clearParserCache(); jest.clearAllMocks(); });

  it("matches high-confidence taxonomy entries without Groq", async () => {
    expect(matchTaxonomy("fix fridge quickly")?.profession).toBe("electrician");
    const result = await parseQuery({ query: "I need someone to fix my fridge", location: "Lagos", rating: "4+ Stars", budget: "₦5,000 - ₦20,000" });
    expect(result.parserSource).toBe("rule");
    expect(result.primaryProfession).toBe("electrician");
    expect(result.filters).toMatchObject({ location: "Lagos", ratingMin: 4, budgetMin: 5000, budgetMax: 20000 });
    expect(groqClient.classifyText).not.toHaveBeenCalled();
  });

  it("uses valid Groq JSON for ambiguous text", async () => {
    (groqClient.classifyText as jest.Mock).mockResolvedValue({ profession: "carpenter", skill: "woodwork", intent: "search_professional", keywords: ["custom shelf"], location: null, price_intent: "mid", comment: null });
    const result = await parseQuery({ query: "custom shelf for my apartment" });
    expect(result.parserSource).toBe("groq");
    expect(result.primaryProfession).toBe("carpenter");
  });

  it("falls back when Groq fails or returns invalid JSON", async () => {
    (groqClient.classifyText as jest.Mock).mockRejectedValue(new Error("invalid JSON"));
    const result = await parseQuery({ query: "something unusual" });
    expect(result.parserSource).toBe("fallback");
    expect(result.keywords).toContain("something");
  });

  it("normalizes rating and budget controls", () => {
    expect(parseRating("4+ Stars")).toBe(4);
    expect(parseBudget("Under ₦5,000")).toEqual({ budgetMin: 0, budgetMax: 5000 });
  });
});
