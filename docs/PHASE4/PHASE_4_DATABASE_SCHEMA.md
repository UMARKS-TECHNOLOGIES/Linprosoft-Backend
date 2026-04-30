# Phase 4 Database Schema (Payments & Reviews)

This file describes the SQL schema changes and recommended indexes for Phase 4.

## payments table

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
  payer_id INTEGER NOT NULL REFERENCES users(id),
  payee_id INTEGER NOT NULL REFERENCES users(id),
  amount_bigint BIGINT NOT NULL, -- amounts stored as smallest currency unit (e.g., kobo)
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  provider VARCHAR(50) NOT NULL, -- e.g., paystack
  provider_reference VARCHAR(255) NOT NULL UNIQUE,
  provider_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending|paid|failed
  commission_seller_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  commission_buyer_percent NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  commission_amount_bigint BIGINT, -- computed platform commission
  paid_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_assignment_id ON payments(assignment_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider_reference);
```

## payment_webhooks table (audit)

```sql
CREATE TABLE payment_webhooks (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  provider_reference VARCHAR(255),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_webhooks_provider_ref ON payment_webhooks(provider_reference);
```

## reviews table (reference)

Phase 3/architecture already included `reviews`. Ensure it supports these fields and constraints:

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewed_professional_id INTEGER NOT NULL REFERENCES professional_profiles(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_assignment_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewed_professional_id ON reviews(reviewed_professional_id);
```

## Trigger: update professional_profiles.avg_rating

Option A: DB trigger (recommended for immediate consistency)

```sql
CREATE OR REPLACE FUNCTION update_professional_avg_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE professional_profiles
  SET avg_rating = (
    SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewed_professional_id = NEW.reviewed_professional_id
  ),
  total_reviews = (
    SELECT COUNT(*) FROM reviews WHERE reviewed_professional_id = NEW.reviewed_professional_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.reviewed_professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_avg_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE PROCEDURE update_professional_avg_rating();
```

Option B: Background job that recalculates ratings periodically (useful to avoid heavy write-time work on very high write loads).

## Additional Indexes & Notes

- Add index on `payments(provider_status)` for quick status queries.
- Use `BIGINT` and integer smallest-unit currency to avoid floating point errors.
- Store provider payloads in `payment_webhooks.payload` for audit and debugging.
- Consider a `processed_reference` table if you need a very fast lookup for idempotency separate from `payments`.
