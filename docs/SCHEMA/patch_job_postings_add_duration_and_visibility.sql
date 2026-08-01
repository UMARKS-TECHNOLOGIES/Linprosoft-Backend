-- ----------------------------------------------------------------------------
-- Patch: add missing job_postings columns expected by the backend
-- ----------------------------------------------------------------------------
-- Adds duration_days, visibility, deleted_at, currency if missing.
-- Also recreates the job_posting_summary view so it remains valid.
-- ----------------------------------------------------------------------------

BEGIN;

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'NGN';

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS duration_days INTEGER;

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) DEFAULT 'public';

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

COMMENT ON COLUMN job_postings.currency IS 'Currency code for the job budget (e.g. NGN, USD)';
COMMENT ON COLUMN job_postings.duration_days IS 'Expected job duration in days';
COMMENT ON COLUMN job_postings.visibility IS 'Job visibility: public or private';
COMMENT ON COLUMN job_postings.deleted_at IS 'Soft delete timestamp for removed job postings';

DROP VIEW IF EXISTS job_posting_summary;

CREATE VIEW job_posting_summary AS
SELECT
    jp.id,
    jp.title,
    jp.description,
    jp.budget,
    jp.currency,
    jp.duration_days,
    jp.visibility,
    jp.status,
    jp.location,
    jp.created_at,
    s.name AS required_skill,
    u.email AS employer_email,
    u.split_part(full_name, ' ', 1) AS employer_first_name,
    u.split_part(full_name, ' ', 2) AS employer_last_name,
    COUNT(ja.id) AS assignment_count
FROM job_postings jp
LEFT JOIN skills s ON jp.skill_id = s.id
LEFT JOIN users u ON jp.employer_id = u.id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
GROUP BY jp.id, s.id, u.id;

COMMIT;
