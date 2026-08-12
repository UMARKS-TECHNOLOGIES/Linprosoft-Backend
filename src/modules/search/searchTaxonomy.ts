export const TAXONOMY_VERSION = "2026-08-01";

export interface TaxonomyEntry { phrases: string[]; profession: string; skill: string; weight: number; }
export interface TaxonomyMatch { profession: string; skill: string; confidence: number; matchedKeywords: string[]; }

export const SEARCH_TAXONOMY: TaxonomyEntry[] = [
  { phrases: ["fridge", "refrigerator", "ac", "air conditioner", "socket", "switch", "wire", "wiring", "light", "fan", "tv install"], profession: "electrician", skill: "electrical repair", weight: 0.9 },
  { phrases: ["sink", "leak", "toilet", "drain", "pipe", "unclog"], profession: "plumber", skill: "plumbing repair", weight: 0.9 },
  { phrases: ["paint", "painter", "wall", "decor"], profession: "painter", skill: "room painting", weight: 0.85 },
  { phrases: ["door", "wardrobe", "cabinet", "window"], profession: "carpenter", skill: "woodwork", weight: 0.85 },
  { phrases: ["roof", "roofing", "tile", "floor"], profession: "roofer", skill: "roof and tile repair", weight: 0.82 },
  { phrases: ["clean", "sanitize", "disinfect", "laundry", "iron"], profession: "cleaner", skill: "cleaning service", weight: 0.82 },
  { phrases: ["move", "mover", "moving", "relocate"], profession: "mover", skill: "moving assistance", weight: 0.82 },
];

export const matchTaxonomy = (normalizedText: string): TaxonomyMatch | null => {
  const matches = SEARCH_TAXONOMY.map((entry) => ({ entry, phrases: entry.phrases.filter((phrase) => normalizedText.includes(phrase)) }))
    .filter((match) => match.phrases.length > 0)
    .sort((a, b) => (b.entry.weight + (b.phrases.length - 1) * 0.05) - (a.entry.weight + (a.phrases.length - 1) * 0.05));
  const best = matches[0];
  if (!best) return null;
  return { profession: best.entry.profession, skill: best.entry.skill, confidence: Math.min(0.95, best.entry.weight + (best.phrases.length - 1) * 0.05), matchedKeywords: best.phrases };
};
