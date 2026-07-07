-- Add updated_at column to reviews table (non-destructive)
BEGIN;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;

-- NOTE: This migration is safe to run multiple times.
