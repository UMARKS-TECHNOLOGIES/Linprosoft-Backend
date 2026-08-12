export type ParserSource = "rule" | "groq" | "fallback";
export type PriceIntent = "cheap" | "mid" | "premium";

export interface ParsedQuery {
  intent: "search_professional";
  primaryProfession: string | null;
  primarySkill: string | null;
  keywords: string[];
  locationHint: string | null;
  priceIntent: PriceIntent | null;
  confidence: number;
  parserSource: ParserSource;
  rawQuery: string;
  normalizedQuery: string;
  filters: {
    location?: string;
    ratingMin?: number;
    budgetMin?: number;
    budgetMax?: number;
    budgetRange?: string;
  };
}

export interface GroqClassification {
  profession: string | null;
  skill: string | null;
  intent: "search_professional";
  keywords: string[];
  location: string | null;
  price_intent: PriceIntent | null;
  comment: string | null;
}
