-- Phase 4 non-destructive migration
-- Adds missing columns to payments table and creates payment_webhooks audit table

BEGIN;

-- 1) Add safe, non-destructive columns to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS commission_seller_percent NUMERIC(5,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS commission_buyer_percent NUMERIC(5,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS commission_amount_bigint BIGINT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS amount_bigint BIGINT;

-- 2) Backfill `provider_reference` from existing `paystack_reference` if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='paystack_reference') THEN
    UPDATE payments SET provider_reference = paystack_reference WHERE provider_reference IS NULL AND paystack_reference IS NOT NULL;
  END IF;
END$$;

-- 3) Backfill provider_status from existing status column if provider_status is NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='status') THEN
    UPDATE payments SET provider_status = status WHERE provider_status IS NULL AND status IS NOT NULL;
  END IF;
END$$;

-- 4) Create indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_payments_assignment_id ON payments(job_assignment_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments(provider_status);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);

-- 5) Create payment_webhooks audit table if not exists
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  provider_reference VARCHAR(255),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider_ref ON payment_webhooks(provider_reference);

COMMIT;

-- Notes:
-- - This migration avoids destructive operations (no drops, no unique constraints enforced).
-- - Review `amount_bigint` population strategy manually (depends on whether `amount` is stored in base units already).
