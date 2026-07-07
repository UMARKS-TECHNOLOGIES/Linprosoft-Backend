-- Migration: Create payment_disputes table for Phase 4 dispute workflow
-- Adds a dedicated table to record disputes tied to payments and job assignments

BEGIN;

CREATE TABLE IF NOT EXISTS payment_disputes (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  job_assignment_id BIGINT REFERENCES job_assignments(id) ON DELETE CASCADE,
  initiator_id BIGINT REFERENCES users(id) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending|in_review|resolved|rejected
  admin_resolved_by BIGINT REFERENCES users(id),
  admin_resolved_at TIMESTAMP,
  admin_resolution_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_job_assignment_id ON payment_disputes(job_assignment_id);

COMMIT;
