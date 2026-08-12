-- Migration 007: Add NLP search tables for AI-powered professional search
-- Run: psql $DATABASE_URL -f src/migrations/007_search_nlp_tables.sql

-- 1. Taxonomy store: maps keywords to professions/skills
CREATE TABLE IF NOT EXISTS search_taxonomy (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL UNIQUE,
    profession VARCHAR(100) NOT NULL,
    skill VARCHAR(100),
    weight INTEGER DEFAULT 1, -- higher weight = higher confidence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_search_taxonomy_keyword ON search_taxonomy(keyword);

-- 2. NLP parse logs: audit trail for debugging and improvement
CREATE TABLE IF NOT EXISTS nlp_parse_logs (
    id SERIAL PRIMARY KEY,
    raw_query TEXT NOT NULL,
    parsed_json JSONB NOT NULL,
    parser_source VARCHAR(20) NOT NULL CHECK (parser_source IN ('rule', 'groq', 'fallback')),
    profession_detected VARCHAR(100),
    skill_detected VARCHAR(100),
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_nlp_parse_logs_created ON nlp_parse_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nlp_parse_logs_source ON nlp_parse_logs(parser_source);
CREATE INDEX IF NOT EXISTS idx_nlp_parse_logs_profession ON nlp_parse_logs(profession_detected);

-- 3. Parsed queries cache: memoization of frequent natural queries
CREATE TABLE IF NOT EXISTS parsed_queries_cache (
    query_hash VARCHAR(64) PRIMARY KEY, -- SHA256 of normalized query
    normalized_query TEXT NOT NULL,
    parsed_json JSONB NOT NULL,
    parser_source VARCHAR(20) NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE parsed_queries_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Index for hit counting
CREATE INDEX IF NOT EXISTS idx_parsed_queries_cache_updated ON parsed_queries_cache(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_queries_cache_expires ON parsed_queries_cache(expires_at);

-- Insert initial taxonomy data
INSERT INTO search_taxonomy (keyword, profession, skill, weight) VALUES
('fridge', 'electrician', 'appliance repair', 10),
('refrigerator', 'electrician', 'appliance repair', 10),
('AC', 'electrician', 'air conditioning repair', 10),
('sink', 'plumber', 'drain clearing', 10),
('leak', 'plumber', 'pipe repair', 10),
('painter', 'painter', 'room painting', 10),
('paint', 'painter', 'wall decoration', 10),
('electrician', 'electrician', 'wiring', 10),
('plumber', 'plumber', 'plumbing', 10),
('mover', 'mover', 'furniture moving', 10)
 ,('toilet', 'plumber', 'toilet repair', 10)
 ,('pipe', 'plumber', 'pipe installation', 10)
 ,('wire', 'electrician', 'electrical wiring', 10)
 ,('socket', 'electrician', 'socket repair', 10)
 ,('light', 'electrician', 'lighting installation', 10)
 ,('fan', 'electrician', 'fan installation', 10)
 ,('tile', 'mason', 'tile installation', 10)
 ,('roof', 'roofer', 'roof repair', 10)
 ,('door', 'carpenter', 'door installation', 10)
 ,('window', 'carpenter', 'window installation', 10)
 ,('clean', 'cleaner', 'general cleaning', 10)
 ,('wash', 'cleaner', 'laundry service', 10)
 ,('iron', 'cleaner', 'ironing service', 10)
 ,('cook', 'chef', 'cooking service', 10)
 ,('bake', 'chef', 'baking service', 10)
 ,('garden', 'gardener', 'gardening service', 10)
 ,('landscape', 'landscaper', 'landscape design', 10)
ON CONFLICT (keyword) DO NOTHING;
