-- Non-destructive migration to reconcile existing schema with Phase 3 model
-- Adds missing columns, indices, and migrates assignment status values (pending -> invited)
-- Safe steps: adds columns, populates new status column, renames, and adds checks/indexes

BEGIN;

-- 1) job_postings: add optional columns
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 2) job_postings: set default status to 'draft' (safe because 'draft' is already an allowed value)
ALTER TABLE job_postings ALTER COLUMN status SET DEFAULT 'draft';

-- 3) job_postings: helpful indexes for new columns
CREATE INDEX IF NOT EXISTS idx_job_postings_currency ON job_postings(currency);
CREATE INDEX IF NOT EXISTS idx_job_postings_duration_days ON job_postings(duration_days);
CREATE INDEX IF NOT EXISTS idx_job_postings_visibility ON job_postings(visibility);

-- 4) job_assignments: add new audit / timestamp / budget columns
ALTER TABLE job_assignments
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS accepted_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5) job_assignments: migrate status values by using a temporary column
ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS status_new VARCHAR(40);

UPDATE job_assignments SET status_new =
  CASE status
    WHEN 'pending' THEN 'invited'
    WHEN 'pending'::text THEN 'invited'
    WHEN 'disputed' THEN 'disputed'
    ELSE status
  END;

-- Ensure any NULLs become a safe default
UPDATE job_assignments SET status_new = COALESCE(status_new, 'invited');

-- Drop old status column and replace with status_new
ALTER TABLE job_assignments DROP COLUMN IF EXISTS status;
ALTER TABLE job_assignments RENAME COLUMN status_new TO status;

-- 6) Add a conservative CHECK constraint including legacy 'disputed' and new 'cancelled'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'chk_job_assignments_status' AND t.relname = 'job_assignments'
  ) THEN
    EXECUTE 'ALTER TABLE job_assignments ADD CONSTRAINT chk_job_assignments_status CHECK (status IN (''invited'',''accepted'',''rejected'',''in_progress'',''completed'',''cancelled'',''disputed''))';
  END IF;
END$$;

-- 7) Add indexes to support queries
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_at ON job_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON job_assignments(status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_updated_at ON job_assignments(updated_at);

-- 8) Backfill assigned_at for older rows where applicable (use created_at/completed_at heuristics)
-- If `created_at` exists and `assigned_at` is NULL, set assigned_at = created_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_assignments' AND column_name='created_at') THEN
    UPDATE job_assignments SET assigned_at = created_at WHERE assigned_at IS NULL AND created_at IS NOT NULL;
  END IF;
END$$;

COMMIT;

-- Notes:
-- - This script avoids dropping tables or losing data. It adds columns and migrates status values safely.
-- - If you prefer to remove legacy values (e.g., 'disputed'), update the mapping logic above.
-- - After verifying, consider adding triggers to keep `updated_at` current on updates.
