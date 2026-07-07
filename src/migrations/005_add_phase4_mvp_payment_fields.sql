-- Phase 4 MVP Payment & Satisfaction Approval Workflow Migration
-- Adds payment lifecycle tracking, admin approval gates, and employer satisfaction approval.
-- Safe to rerun.
-- Date: 2026-06-06

BEGIN;

-- ============================================================================
-- SECTION 1: Payments Table - Payment Lifecycle & Admin Approval Fields
-- ============================================================================

-- payment_summary depends on payments.status, so PostgreSQL will not allow the
-- status column type to be widened while the view exists. This is transactional:
-- if anything fails later, the view drop is rolled back too.
DROP VIEW IF EXISTS payment_summary;

-- The base schema already has payments.status as VARCHAR(20) with older values.
-- Add it only for very old databases, then normalize type/default/checks below.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Drop any older CHECK constraint attached to payments.status before backfilling
-- Phase 4 values such as pending_admin_approval and held_in_escrow.
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'payments'
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE payments
  ALTER COLUMN status TYPE VARCHAR(50),
  ALTER COLUMN status SET DEFAULT 'pending_payment';

-- Provider fields are expected by Phase 4 services and may already exist from 004.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);

-- Admin approval tracking.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS admin_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS admin_rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_rejection_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS pending_admin_review_at TIMESTAMP;

-- Employer satisfaction approval tracking.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS employer_approval_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS employer_approved_at TIMESTAMP;

-- Payout/refund tracking.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payout_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- ============================================================================
-- SECTION 2: Job Assignments Table - Payment & Satisfaction Status Tracking
-- ============================================================================

ALTER TABLE job_assignments
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS satisfaction_status VARCHAR(50) DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS employer_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS employer_disputed_at TIMESTAMP;

ALTER TABLE job_assignments
  ALTER COLUMN payment_status TYPE VARCHAR(50),
  ALTER COLUMN payment_status SET DEFAULT 'pending',
  ALTER COLUMN satisfaction_status TYPE VARCHAR(50),
  ALTER COLUMN satisfaction_status SET DEFAULT 'pending_review';

-- Drop old/new checks on these columns before normalizing values and recreating
-- the final Phase 4 constraints.
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'job_assignments'
      AND c.contype = 'c'
      AND a.attname IN ('payment_status', 'satisfaction_status')
  LOOP
    EXECUTE format('ALTER TABLE job_assignments DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 3: Backfill/Normalize Existing Values
-- ============================================================================

-- Map legacy payment statuses into the Phase 4 lifecycle.
UPDATE payments
SET status = CASE
  WHEN status IS NULL THEN 'pending_payment'
  WHEN status IN (
    'pending_payment',
    'pending_admin_approval',
    'held_in_escrow',
    'held_pending_review',
    'released',
    'refunded',
    'payment_rejected',
    'failed'
  ) THEN status
  WHEN status = 'pending_approval' THEN 'pending_admin_approval'
  WHEN status IN ('pending', 'processing') THEN 'pending_payment'
  WHEN status = 'completed' THEN 'released'
  ELSE 'failed'
END;

-- If a provider-paid payment was not mapped above, place it at the admin gate.
UPDATE payments
SET status = 'pending_admin_approval',
    admin_approval_status = COALESCE(admin_approval_status, 'pending'),
    pending_admin_review_at = COALESCE(pending_admin_review_at, CURRENT_TIMESTAMP)
WHERE provider_status = 'paid'
  AND status = 'pending_payment';

UPDATE job_assignments
SET payment_status = CASE
  WHEN payment_status IS NULL THEN 'pending'
  WHEN payment_status IN ('pending', 'pending_admin_approval', 'funded', 'released', 'refunded') THEN payment_status
  WHEN payment_status = 'paid' THEN 'funded'
  ELSE 'pending'
END;

UPDATE job_assignments
SET satisfaction_status = CASE
  WHEN satisfaction_status IS NULL THEN 'pending_review'
  WHEN satisfaction_status IN ('pending_review', 'satisfied', 'disputed') THEN satisfaction_status
  ELSE 'pending_review'
END;

-- ============================================================================
-- SECTION 4: Constraints
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_status_phase4;
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_status_phase4
  CHECK (status IN (
    'pending_payment',
    'pending_admin_approval',
    'held_in_escrow',
    'held_pending_review',
    'released',
    'refunded',
    'payment_rejected',
    'failed'
  ));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_admin_approval_status_phase4;
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_admin_approval_status_phase4
  CHECK (
    admin_approval_status IS NULL
    OR admin_approval_status IN ('pending', 'approved', 'rejected')
  );

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_employer_approval_status_phase4;
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_employer_approval_status_phase4
  CHECK (
    employer_approval_status IS NULL
    OR employer_approval_status IN ('pending_review', 'approved', 'disputed')
  );

ALTER TABLE job_assignments DROP CONSTRAINT IF EXISTS chk_job_assignments_payment_status_phase4;
ALTER TABLE job_assignments
  ADD CONSTRAINT chk_job_assignments_payment_status_phase4
  CHECK (payment_status IN ('pending', 'pending_admin_approval', 'funded', 'released', 'refunded'));

ALTER TABLE job_assignments DROP CONSTRAINT IF EXISTS chk_job_assignments_satisfaction_status_phase4;
ALTER TABLE job_assignments
  ADD CONSTRAINT chk_job_assignments_satisfaction_status_phase4
  CHECK (satisfaction_status IN ('pending_review', 'satisfied', 'disputed'));

-- ============================================================================
-- SECTION 5: Indexes for Query Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_admin_approval_status ON payments(admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_employer_approval_status ON payments(employer_approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_admin_approved_by ON payments(admin_approved_by);

CREATE INDEX IF NOT EXISTS idx_job_assignments_payment_status ON job_assignments(payment_status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_satisfaction_status ON job_assignments(satisfaction_status);

CREATE INDEX IF NOT EXISTS idx_payments_status_admin_approval ON payments(status, admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_payment_satisfaction
  ON job_assignments(payment_status, satisfaction_status);

-- ============================================================================
-- SECTION 6: Documentation Comments
-- ============================================================================

COMMENT ON COLUMN payments.status IS 'Payment lifecycle: pending_payment -> pending_admin_approval -> held_in_escrow -> released';
COMMENT ON COLUMN payments.admin_approval_status IS 'Admin approval status: pending | approved | rejected';
COMMENT ON COLUMN payments.employer_approval_status IS 'Employer approval status: pending_review | approved | disputed';
COMMENT ON COLUMN job_assignments.payment_status IS 'Assignment payment status: pending -> pending_admin_approval -> funded -> released -> refunded';
COMMENT ON COLUMN job_assignments.satisfaction_status IS 'Employer satisfaction with work: pending_review | satisfied | disputed';

-- ============================================================================
-- SECTION 7: Restore Views
-- ============================================================================

CREATE OR REPLACE VIEW payment_summary AS
SELECT
    p.id,
    p.amount,
    p.seller_commission,
    p.buyer_commission,
    p.seller_receives,
    p.status,
    p.created_at,
    p.completed_at,
    payer.email as payer_email,
    payer.first_name as payer_first_name,
    payee.email as payee_email,
    payee.first_name as payee_first_name,
    ja.budget as negotiated_budget,
    jp.title as job_title
FROM payments p
LEFT JOIN users payer ON p.payer_id = payer.id
LEFT JOIN users payee ON p.payee_id = payee.id
LEFT JOIN job_assignments ja ON p.job_assignment_id = ja.id
LEFT JOIN job_postings jp ON ja.job_id = jp.id;

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration implements the Phase 4 MVP payment flow with admin approval:
-- 1. Employer initiates payment: payments.status = pending_payment
-- 2. Paystack webhook confirms: payments.status = pending_admin_approval
-- 3. Admin approves: payments.status = held_in_escrow, job_assignments.payment_status = funded
-- 4. Professional completes work: job_assignments.status = completed
-- 5. Employer approves satisfaction: job_assignments.satisfaction_status = satisfied
-- 6. Funds are released: payments.status = released
