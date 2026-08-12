import crypto from "crypto";
import pool from "../../config/db";
import logger from "../../utils/logger";
import { classifyText } from "./groqClient";
import { matchTaxonomy } from "./searchTaxonomy";
import { inferPriceIntent, normalizeLocation, normalizeText, parseBudget, parseRating } from "./searchNormalizer";
import { GroqClassification, ParsedQuery, ParserSource } from "./searchNlpTypes";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, { parsed: ParsedQuery; expiresAt: number }>();
const TAXONOMY_CONFIDENCE_THRESHOLD = 0.8;
const preview = (value: string, max = 180) => value.length > max ? `${value.slice(0, max)}...` : value;
const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const keywordsFromQuery = (normalized: string, matched: string[] = []): string[] => {
  const values = [...matched, ...normalized.split(" ")].map((value) => value.trim()).filter(Boolean);
  return [...new Set(values)].slice(0, 12);
};

const buildParsed = (input: { rawQuery: string; normalizedQuery: string; profession?: string | null; skill?: string | null; keywords?: string[]; location?: string | null; priceIntent?: ParsedQuery["priceIntent"]; confidence: number; source: ParserSource; filters: ParsedQuery["filters"] }): ParsedQuery => ({
  intent: "search_professional",
  primaryProfession: input.profession ?? null,
  primarySkill: input.skill ?? null,
  keywords: input.keywords ?? keywordsFromQuery(input.normalizedQuery),
  locationHint: input.location ?? null,
  priceIntent: input.priceIntent ?? null,
  confidence: Math.max(0, Math.min(1, input.confidence)),
  parserSource: input.source,
  rawQuery: input.rawQuery,
  normalizedQuery: input.normalizedQuery,
  filters: input.filters,
});

const cacheKey = (normalizedQuery: string): string => crypto.createHash("sha256").update(normalizedQuery).digest("hex");

const readPersistentCache = async (key: string, requestId?: string): Promise<ParsedQuery | null> => {
  try {
    const result = await pool.query<{ parsed_json: ParsedQuery }>("SELECT parsed_json FROM parsed_queries_cache WHERE query_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())", [key]);
    if (result.rows[0]?.parsed_json) {
      void pool.query("UPDATE parsed_queries_cache SET hit_count = hit_count + 1, updated_at = NOW() WHERE query_hash = $1", [key]).catch(() => undefined);
      logger.info("Search NLP persistent cache hit", {
        requestId,
        queryHash: key,
        parserSource: result.rows[0].parsed_json.parserSource,
        profession: result.rows[0].parsed_json.primaryProfession,
        skill: result.rows[0].parsed_json.primarySkill,
      });
      return result.rows[0].parsed_json;
    }
    logger.info("Search NLP persistent cache miss", { requestId, queryHash: key });
  } catch (error) {
    logger.warn("Search NLP persistent cache unavailable", {
      requestId,
      queryHash: key,
      errorMessage: getErrorMessage(error),
    });
  }
  return null;
};

const writePersistence = async (parsed: ParsedQuery, requestId?: string): Promise<void> => {
  const key = cacheKey(parsed.normalizedQuery);
  const ttl = parsed.parserSource === "fallback" ? FALLBACK_TTL_MS : CACHE_TTL_MS;
  try {
    await pool.query("INSERT INTO parsed_queries_cache (query_hash, normalized_query, parsed_json, parser_source, expires_at) VALUES ($1, $2, $3::jsonb, $4, NOW() + ($5 * INTERVAL '1 millisecond')) ON CONFLICT (query_hash) DO UPDATE SET parsed_json = EXCLUDED.parsed_json, parser_source = EXCLUDED.parser_source, updated_at = NOW(), expires_at = EXCLUDED.expires_at", [key, parsed.normalizedQuery, JSON.stringify({ ...parsed, filters: undefined }), parsed.parserSource, ttl]);
    await pool.query("INSERT INTO nlp_parse_logs (raw_query, parsed_json, parser_source, profession_detected, skill_detected, confidence) VALUES ($1, $2::jsonb, $3, $4, $5, $6)", [parsed.rawQuery, JSON.stringify(parsed), parsed.parserSource, parsed.primaryProfession, parsed.primarySkill, parsed.confidence]);
    logger.info("Search NLP parse persisted", {
      requestId,
      queryHash: key,
      parserSource: parsed.parserSource,
      profession: parsed.primaryProfession,
      skill: parsed.primarySkill,
      ttlMs: ttl,
    });
  } catch (error) {
    logger.warn("Search NLP parse persistence unavailable", {
      requestId,
      queryHash: key,
      parserSource: parsed.parserSource,
      errorMessage: getErrorMessage(error),
    });
  }
};

export const parseQuery = async ({ query, location, rating, budget, requestId }: { query: string; location?: string; rating?: string; budget?: string; requestId?: string }): Promise<ParsedQuery> => {
  const startedAt = Date.now();
  const rawQuery = query.trim();
  const normalizedQuery = normalizeText(rawQuery);
  const explicitBudget = parseBudget(budget);
  const explicitRating = parseRating(rating);
  const explicitLocation = normalizeLocation(location);
  const explicitFilters: ParsedQuery["filters"] = { ...(explicitLocation ? { location: explicitLocation } : {}), ...(explicitRating !== undefined ? { ratingMin: explicitRating } : {}), ...explicitBudget, ...(explicitBudget.budgetMin !== undefined || explicitBudget.budgetMax !== undefined ? { budgetRange: `${explicitBudget.budgetMin ?? 0}-${explicitBudget.budgetMax ?? ""}` } : {}) };
  const key = cacheKey(normalizedQuery);
  logger.info("Search NLP parse started", {
    requestId,
    queryHash: key,
    rawQueryPreview: preview(rawQuery),
    normalizedQuery,
    explicitFilters,
  });
  const memory = memoryCache.get(key);
  let base: ParsedQuery | null = null;
  if (memory && memory.expiresAt > Date.now()) {
    base = memory.parsed;
    logger.info("Search NLP memory cache hit", {
      requestId,
      queryHash: key,
      parserSource: base.parserSource,
      profession: base.primaryProfession,
      skill: base.primarySkill,
      expiresInMs: memory.expiresAt - Date.now(),
    });
  } else {
    if (memory) {
      logger.info("Search NLP memory cache expired", {
        requestId,
        queryHash: key,
        parserSource: memory.parsed.parserSource,
      });
    } else {
      logger.info("Search NLP memory cache miss", { requestId, queryHash: key });
    }
    base = await readPersistentCache(key, requestId);
  }
  if (!base) {
    const taxonomy = matchTaxonomy(normalizedQuery);
    logger.info("Search NLP taxonomy evaluated", {
      requestId,
      queryHash: key,
      matched: Boolean(taxonomy),
      confidence: taxonomy?.confidence ?? null,
      threshold: TAXONOMY_CONFIDENCE_THRESHOLD,
      profession: taxonomy?.profession ?? null,
      skill: taxonomy?.skill ?? null,
      matchedKeywords: taxonomy?.matchedKeywords ?? [],
    });
    if (taxonomy && taxonomy.confidence >= TAXONOMY_CONFIDENCE_THRESHOLD) {
      logger.info("Search NLP parser selected taxonomy rule", {
        requestId,
        queryHash: key,
        profession: taxonomy.profession,
        skill: taxonomy.skill,
        confidence: taxonomy.confidence,
      });
      base = buildParsed({ rawQuery, normalizedQuery, profession: taxonomy.profession, skill: taxonomy.skill, keywords: keywordsFromQuery(normalizedQuery, taxonomy.matchedKeywords), confidence: taxonomy.confidence, source: "rule", filters: {} });
    } else {
      try {
        logger.info("Search NLP parser entering Groq fallback", {
          requestId,
          queryHash: key,
          reason: taxonomy ? "taxonomy_low_confidence" : "taxonomy_no_match",
          taxonomyConfidence: taxonomy?.confidence ?? null,
        });
        const model: GroqClassification = requestId ? await classifyText(normalizedQuery, { requestId }) : await classifyText(normalizedQuery);
        logger.info("Search NLP Groq model returned classification", {
          requestId,
          queryHash: key,
          profession: model.profession,
          skill: model.skill,
          intent: model.intent,
          keywords: model.keywords,
          location: model.location,
          priceIntent: model.price_intent,
          selectedParserSource: model.profession ? "groq" : "fallback",
        });
        base = buildParsed({ rawQuery, normalizedQuery, profession: model.profession, skill: model.skill, keywords: model.keywords, location: model.location, priceIntent: model.price_intent, confidence: model.profession ? 0.85 : 0.5, source: "groq", filters: {} });
      } catch (error) {
        logger.warn("Search NLP Groq fallback failed; using rule-based fallback output", {
          requestId,
          queryHash: key,
          errorMessage: getErrorMessage(error),
        });
        base = buildParsed({ rawQuery, normalizedQuery, keywords: keywordsFromQuery(normalizedQuery), priceIntent: inferPriceIntent(rawQuery), confidence: 0.3, source: "fallback", filters: {} });
      }
    }
    memoryCache.set(key, { parsed: base, expiresAt: Date.now() + (base.parserSource === "fallback" ? FALLBACK_TTL_MS : CACHE_TTL_MS) });
    logger.info("Search NLP memory cache stored", {
      requestId,
      queryHash: key,
      parserSource: base.parserSource,
      profession: base.primaryProfession,
      skill: base.primarySkill,
      ttlMs: base.parserSource === "fallback" ? FALLBACK_TTL_MS : CACHE_TTL_MS,
    });
    void writePersistence({ ...base, filters: {} }, requestId);
  }
  const inferredLocation = normalizeLocation(base.locationHint);
  const mergedFilters = { ...(inferredLocation ? { location: inferredLocation } : {}), ...(base.filters ?? {}), ...explicitFilters };
  const parsed = { ...base, locationHint: explicitLocation ?? base.locationHint, priceIntent: base.priceIntent ?? inferPriceIntent(rawQuery), filters: mergedFilters };
  logger.info("Search NLP parse completed", {
    requestId,
    queryHash: key,
    parserSource: parsed.parserSource,
    profession: parsed.primaryProfession,
    skill: parsed.primarySkill,
    confidence: parsed.confidence,
    keywords: parsed.keywords,
    filters: parsed.filters,
    durationMs: Date.now() - startedAt,
  });
  return parsed;
};

export const clearParserCache = (): void => { memoryCache.clear(); };
