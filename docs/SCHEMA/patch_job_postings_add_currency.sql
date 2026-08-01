-- ----------------------------------------------------------------------------
-- Patch: add missing currency column to job_postings
-- ----------------------------------------------------------------------------
-- Safe to re-run. Adds the column if it does not already exist.
-- ----------------------------------------------------------------------------

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'NGN';

COMMENT ON COLUMN job_postings.currency IS 'Currency code for the job budget (e.g. NGN, USD)';
