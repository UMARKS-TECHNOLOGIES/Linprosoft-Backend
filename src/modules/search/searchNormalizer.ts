import { PriceIntent } from "./searchNlpTypes";

const stopwords = new Set(["the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "i", "me", "my", "we", "us", "our", "you", "your", "need", "want", "looking", "someone", "somebody", "help", "find", "get", "is", "are", "was", "were", "be"]);

export const normalizeText = (value: string): string => value
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .split(/\s+/)
  .filter((word) => word && !stopwords.has(word))
  .join(" ");

export const parseRating = (rating?: string): number | undefined => {
  if (!rating) return undefined;
  const match = rating.trim().match(/^([0-5])\+?\s*stars?$/i);
  return match ? Number(match[1]) : undefined;
};

export const parseBudget = (budget?: string): { budgetMin?: number; budgetMax?: number } => {
  if (!budget) return {};
  const values = [...budget.matchAll(/\d[\d,]*/g)].map((match) => Number(match[0].replace(/,/g, ""))).filter(Number.isFinite);
  const normalized = budget.toLowerCase();
  if (values.length === 0) return {};
  if (/under|below|less than|max/i.test(normalized)) return { budgetMin: 0, budgetMax: values[0] };
  if (/over|above|more than|min/i.test(normalized)) return { budgetMin: values[0] };
  return { budgetMin: values[0], budgetMax: values[1] };
};

export const normalizeLocation = (location?: string | null): string | undefined => {
  const value = location?.trim().replace(/\s+/g, " ");
  return value ? value : undefined;
};

export const inferPriceIntent = (text: string): PriceIntent | null => {
  if (/\b(cheap|affordable|budget|low cost)\b/i.test(text)) return "cheap";
  if (/\b(premium|luxury|best)\b/i.test(text)) return "premium";
  if (/\b(mid range|standard)\b/i.test(text)) return "mid";
  return null;
};
