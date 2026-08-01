-- ----------------------------------------------------------------------------
-- Patch: rename job_postings.client_id -> job_postings.employer_id
-- ----------------------------------------------------------------------------
-- Safe to re-run. This script is idempotent and will only apply changes that
-- are still missing.
-- ----------------------------------------------------------------------------

BEGIN;

-- 1) Add employer_id column if it does not exist yet
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'job_postings'
          AND column_name = 'employer_id'
    ) THEN
        ALTER TABLE job_postings ADD COLUMN employer_id UUID;
    END IF;
END $$;

-- 2) Backfill employer_id from client_id where needed
UPDATE job_postings
SET employer_id = client_id
WHERE employer_id IS NULL
  AND client_id IS NOT NULL;

-- 3) Make employer_id NOT NULL after backfill
ALTER TABLE job_postings
ALTER COLUMN employer_id SET NOT NULL;

-- 4) Add the new foreign key constraint (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'job_postings'
          AND c.conname = 'job_postings_employer_id_fkey'
    ) THEN
        ALTER TABLE job_postings
        ADD CONSTRAINT job_postings_employer_id_fkey
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5) Drop the old foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'job_postings'
          AND c.conname = 'job_postings_client_id_fkey'
    ) THEN
        ALTER TABLE job_postings DROP CONSTRAINT job_postings_client_id_fkey;
    END IF;
END $$;

-- 6) Replace the old index with the new one
DROP INDEX IF EXISTS idx_job_postings_client_id;
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON job_postings(employer_id);

-- 7) Drop the dependent view first so the old column can be removed safely
DROP VIEW IF EXISTS job_posting_summary;

-- 8) Drop the old client_id column
ALTER TABLE job_postings DROP COLUMN IF EXISTS client_id;

-- 9) Recreate the job_posting_summary view to use employer_id
CREATE VIEW job_posting_summary AS
SELECT
    jp.id,
    jp.title,
    jp.description,
    jp.budget,
    jp.status,
    jp.location,
    jp.created_at,
    s.name as required_skill,
    u.email as employer_email,
    u.split_part(full_name, ' ', 1) as employer_first_name,
    u.split_part(full_name, ' ', 2) as employer_last_name,
    COUNT(ja.id) as assignment_count
FROM job_postings jp
LEFT JOIN skills s ON jp.skill_id = s.id
LEFT JOIN users u ON jp.employer_id = u.id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
GROUP BY jp.id, s.id, u.id;

-- 9) Update comments to reflect the new naming
COMMENT ON COLUMN job_postings.employer_id IS 'Employer/client owner of the job posting';

COMMIT;
