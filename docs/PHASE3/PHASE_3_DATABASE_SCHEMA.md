# Phase 3 Database Schema

Version: 1.0

This file describes the DB tables, constraints and indexes introduced in Phase 3.

## Tables

-- Jobs posted by employers
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id),
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(12,2),
  currency VARCHAR(8) DEFAULT 'NGN',
  duration_days INTEGER,
  location TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' /* draft|posted|in_progress|completed|cancelled */,
  visibility VARCHAR(16) DEFAULT 'public' /* public|private */,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);

-- Assignment / invite records
CREATE TABLE IF NOT EXISTS job_assignments (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  professional_id INTEGER REFERENCES professional_profiles(id),
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'invited' /* invited|accepted|rejected|in_progress|completed|cancelled */,
  accepted_budget NUMERIC(12,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_professional_id ON job_assignments(professional_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON job_assignments(status);

## Migration Notes

- Prefer non-destructive `ALTER TABLE` statements when adding columns to existing deployments.
- Avoid `IF NOT EXISTS` for constraints if target Postgres version rejects it; wrap checks in client logic or idempotent SQL.
- Run migrations in staging before production and back up DB before applying schema changes.

