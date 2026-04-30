# Linkprosoft Backend - Phase 4: Payments & Reviews

**Version:** 1.0  
**Timeline:** Weeks 10-12 (3 weeks)  
**Focus:** Payment Gateway Integration, Commissioning, Payment Webhooks, Reviews & Ratings, Accounting Records, and Payout Workflow  
**Build on:** Phase 1 (Auth) + Phase 2 (Profiles & Search) + Phase 3 (Jobs & Assignments)

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Project Structure Additions](#project-structure-additions)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Database Schema & Migrations](#database-schema--migrations)
6. [API Endpoints & Contracts](#api-endpoints--contracts)
7. [Service / Repository Details](#service--repository-details)
8. [Webhooks & Idempotency](#webhooks--idempotency)
9. [Security & Compliance](#security--compliance)
10. [Testing Strategy](#testing-strategy)
11. [Monitoring, Logging & Observability](#monitoring-logging--observability)
12. [Integration Checklist](#integration-checklist)

---

## Overview & Goals

### Phase 4 Objectives

- Integrate a payment gateway (Paystack or HTTP client) for initiating and verifying payments.
- Implement commission and fee calculations (default: 15% seller, 1% buyer).
- Persist payment lifecycle records and reconcile with job assignments.
- Implement secure webhook handler for payment confirmations and handle idempotency.
- Implement review/rating system tied to completed job assignments; update professional aggregate ratings.
- Provide endpoints for payment history, refund handling, and payout initiation (platform side).
- Add comprehensive integration tests and migration scripts for DB changes.

### Success Criteria

- Payments can be initiated and return a gateway checkout link or payment reference.
- Payment verification updates `payments` record and job/assignment status atomically.
- Commission, platform fees, and net amounts correctly calculated and stored.
- Webhook processing is idempotent and secure (signature verification).
- Reviews can be created only after assignment completion and update professional rating.
- Test coverage for payments and reviews endpoints achieves required confidence.

---

## Architecture & Design Patterns

Phase 4 extends the layered architecture. New responsibilities are centralized in `payment` and `review` modules and interact with `job_assignments` and `users`.

Key integrations:
- Payment gateway (Paystack) via backend-to-backend API calls and webhooks.
- Background reconciliation tasks (optional) to re-check unsettled payments.
- Accounting-friendly `payments` table with detailed fee breakdown for future reporting.

High level flow (payment):

1. Employer initiates payment for a `job_assignment` via `POST /api/payments/initiate`.
2. Backend creates `payments` record (status: pending) and requests a payment URL (or returns gateway flow data).
3. User completes payment on gateway; gateway calls our `POST /api/payments/webhook`.
4. Webhook verifies signature → updates payment status to `completed` (or `failed`) and records transaction reference.
5. On success, backend marks job_assignment/payment as settled, calculates commissions, and triggers post-payment actions (notification, release to payee, etc.).

High level flow (review):

1. After `job_assignment.status` == `completed`, reviewer can `POST /api/reviews` for that assignment.
2. Service validates reviewer ownership, records review, and updates `professional_profiles.avg_rating`, `total_ratings` and `total_jobs_completed`.
3. Reviews are read-only once created (update allowed only by admin or under strict conditions).

---

## Project Structure Additions

Add module folders and types similar to previous phases.

- `src/modules/payment/`
  - `paymentController.ts`
  - `paymentService.ts`
  - `paymentRepository.ts`
  - `paymentRoutes.ts`
  - `paymentValidation.ts`
  - `types/payment.types.ts`

- `src/modules/review/`
  - `reviewController.ts`
  - `reviewService.ts`
  - `reviewRepository.ts`
  - `reviewRoutes.ts`
  - `reviewValidation.ts`
  - `types/review.types.ts`

- Add background worker/reconciliation helper: `src/jobs/paymentReconciliation.ts` (optional)
- Add webhook signature secret to env and environment validation: `PAYSTACK_SECRET` or general `PAYMENT_WEBHOOK_SECRET`.

---

## Step-by-Step Implementation

### Week 1 — Core Payment Flow & DB (Days 1–3)

1. Add DB migrations for `payments` (detailed schema below) and any indexes.
2. Implement `paymentRepository` CRUD operations and queries.
3. Implement `paymentService.initiatePayment(assignmentId)` to:
   - Validate assignment exists and is payable.
   - Create `payments` row (status `pending`).
   - Call gateway to create transaction (or build checkout link); persist returned reference.
4. Implement `POST /api/payments/initiate` route and controller.

### Week 1 — Webhook Handler & Verification (Days 3–5)

1. Implement secure `POST /api/payments/webhook` that:
   - Verifies gateway signature.
   - Finds corresponding `payments` record by `transaction_reference` or gateway id.
   - Uses idempotency: if payment already processed, return 200.
   - Updates `payments` to `completed` (or `failed`) with gateway payload.
   - Calls `paymentService.finalizePayment()` that:
     - Calculates commissions and platform fees.
     - Updates `job_assignment` and triggers notifications.

### Week 2 — Reviews & Ratings (Days 6–10)

1. Add `reviews` table migration (if not already present).
2. Implement `reviewService.createReview(assignmentId, reviewerId, rating, comment)` to:
   - Verify assignment is completed and reviewer is allowed.
   - Insert review and update `professional_profiles` aggregates in a transaction.
3. Add endpoints and tests:
   - `POST /api/reviews`
   - `GET /api/reviews/:professionalId`
   - `GET /api/reviews/:id`

### Week 2 — Payment History, Refunds & Reconciliation (Days 11–13)

1. Implement `GET /api/payments/history/:userId` with pagination and filters.
2. Add `POST /api/payments/refund` (admin/employer) stub to initiate refund flow via gateway.
3. Implement periodic reconciliation job to re-query unsettled payments and fix inconsistencies.

### Week 3 — Finalization, Tests & Docs (Days 14–21)

1. End-to-end integration tests (supertest) for payment flows + webhook simulation.
2. Tests for reviews and rating aggregation.
3. Run lint, type-check, and update docs (this file + endpoint collection).
4. Create thunder client or Postman collection for payment and webhook testing.

---

## Database Schema & Migrations

### Payments table (migration SQL sample)

This schema aligns with the architecture document but includes additional fields for safe reconciliation.

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id),
  payer_id INTEGER NOT NULL REFERENCES users(id),
  payee_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  seller_commission_percent DECIMAL(5,2) DEFAULT 15,
  buyer_commission_percent DECIMAL(5,2) DEFAULT 1,
  seller_commission_amount DECIMAL(12,2),
  buyer_commission_amount DECIMAL(12,2),
  platform_fee DECIMAL(12,2),
  net_amount DECIMAL(12,2),
  payment_method VARCHAR(50),
  status ENUM('pending','processing','completed','failed','refunded') DEFAULT 'pending',
  transaction_reference VARCHAR(255) UNIQUE,
  gateway_response JSONB,
  reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_job_assignment_id ON payments(job_assignment_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Reviews table (if not already present)

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id),
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

Notes:
- Use transactions when writing payments + job_assignment updates + notifications.
- Persist full gateway response in `gateway_response` for audit and debugging.

---

## API Endpoints & Contracts

### Payment Endpoints

- `POST /api/payments/initiate`
  - Auth: protected (employer or payer)
  - Body: `{ assignmentId: number, paymentMethod?: string }`
  - Response: `{ success: true, data: { paymentId, transactionReference, checkoutUrl? } }`

- `POST /api/payments/webhook`
  - Auth: none (gateway calls via secret signature)
  - Body: gateway payload
  - Response: `200 OK` (idempotent)

- `GET /api/payments/:reference/verify`
  - Auth: protected
  - Returns: payment details + verification status

- `GET /api/payments/history/:userId`
  - Auth: protected (userId must match or admin)
  - Query: `?page=1&limit=20&status=completed`

- `POST /api/payments/refund` (admin/employer)
  - Body: `{ paymentId, reason }`
  - Starts refund flow via gateway and marks `payments.status = 'refunded'` on success.

### Review Endpoints

- `POST /api/reviews`
  - Auth: protected (reviewer)
  - Body: `{ assignmentId, rating, comment, isAnonymous? }`
  - Response: created review object

- `GET /api/reviews/:professionalId`
  - Public: yes
  - Query: `?page=1&limit=10`

- `GET /api/reviews/:id`
  - Public: yes

Contracts should follow existing `ApiResponseHandler` format.

---

## Service / Repository Details

### `paymentService`

Key methods:
- `initiatePayment(assignmentId: number, payerId: number, paymentMethod?: string)`
  - Validates assignment status (e.g., `accepted`), payer permissions.
  - Creates `payments` record with status `pending`.
  - Calls gateway to create transaction; stores gateway `transaction_reference`.
  - Returns checkout info to frontend.

- `finalizePayment(transactionReference: string, gatewayPayload: object)`
  - Idempotent: returns early if payment already completed.
  - Verifies amount with assignment expected amount.
  - Calculates commissions:
    - `sellerCommissionAmount = amount * (seller_commission_percent / 100)`
    - `buyerCommissionAmount = amount * (buyer_commission_percent / 100)`
    - `platformFee = sellerCommissionAmount + buyerCommissionAmount` (or other formula)
    - `netAmount = amount - platformFee`
  - Persists computed fields atomically and updates `job_assignments.status` if necessary.
  - Returns finalized payment record.

- `getPaymentHistory(userId: number, filters)`
- `initiateRefund(paymentId: number)`
- `reconcileUnsettledPayments()` (background)

### `paymentRepository`

- `create(payment: Partial<PaymentRow>)`
- `findByReference(reference: string)`
- `updateStatus(id: number, updates: Partial<PaymentRow>)`
- `findUnreconciled(limit, offset)`

### `reviewService`

- `createReview(assignmentId, reviewerId, rating, comment, isAnonymous)`
  - Validate assignment completed and reviewer relationship.
  - Insert review row and update `professional_profiles` aggregate fields in a transaction:
    - `total_ratings = total_ratings + 1`
    - `avg_rating = ((avg_rating * (total_ratings - 1)) + rating) / total_ratings`
    - `total_jobs_completed` increment as required

- `getReviewsForProfessional(professionalId, pagination)`

### Concurrency & Transactions

- Use DB transactions for operations that touch `payments`, `job_assignments`, and `professional_profiles` together.
- For high contention operations (rating recalculation), prefer `SELECT FOR UPDATE` on the professional_profiles row.

---

## Webhooks & Idempotency

- Verify gateway signature using configured secret (`PAYSTACK_SECRET` / `PAYMENT_WEBHOOK_SECRET`).
- Use `transaction_reference` or gateway `event.id` as idempotency key.
- Store full webhook payload in `payments.gateway_response` for audit.
- If webhook indicates dispute/refund, change `payments.status` and `job_assignments.status` accordingly and notify stakeholders.

Security checklist for webhooks:
- Validate `X-PAYSTACK-SIGNATURE` (or provider equivalent).
- Use HTTPS and a non-guessable endpoint path (e.g., `/api/payments/webhook?env=prod` not required but recommended for staging separation).
- Limit options to gateway IPs (optional) and require signature.

---

## Security & Compliance

- PCI: Do not store card data; use gateway-hosted checkout or tokenization.
- Secrets: Keep `PAYSTACK_SECRET`, `PAYMENT_PUBLIC_KEY`, and `PAYMENT_WEBHOOK_SECRET` in `.env` and `src/config/environment.ts`.
- Access control: Only authorized users (employer/payer) can initiate payments for assignments they own.
- Logging: Record payment lifecycle events and webhook payloads to logs with correlation IDs.
- Auditing: Keep `gateway_response` JSONB for every payment for future audits.
- Idempotency: Ensure repeated webhooks or retries won't double-credit or double-update.

---

## Testing Strategy

- Unit tests for commission calculation and `finalizePayment` logic.
- Integration tests that simulate:
  - `POST /api/payments/initiate` → verify created `payments` row and returned checkout link.
  - Mock gateway calls and simulate `POST /api/payments/webhook` with valid and invalid signatures.
  - Ensure idempotent webhook calls do not duplicate state changes.
  - `POST /api/reviews` flow: invalid attempts (before completion) are rejected; valid attempts update aggregates.
- End-to-end tests (optional): Use a sandbox account for the gateway to simulate full flow.

Test utilities:
- Use `supertest` to hit routes.
- Use test fixtures with unique runId emails and sample users/assignments.
- Seed minimal DB state in `beforeAll` and clean up in `afterAll`.

---

## Monitoring, Logging & Observability

- Log important events with `winston`:
  - Payment initiation (include `paymentId`, `assignmentId`, `payerId`).
  - Webhook receipt and verification result.
  - Payment finalization and commission amounts.
  - Reconciliation job runs and results.
- Expose metrics (Prometheus-compatible) for:
  - Payments initiated per minute
  - Payment success/failure rates
  - Webhook processing latency
- Alerts:
  - Reconciliation job failures
  - Increasing webhook failures (signature mismatch)

---

## Integration Checklist

- [ ] Add environment variables (`PAYSTACK_SECRET`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`).
- [ ] Create and run DB migrations for `payments` and `reviews`.
- [ ] Implement `payment` module: repository, service, controller, routes.
- [ ] Implement `review` module: repository, service, controller, routes.
- [ ] Implement `POST /api/payments/webhook` with signature verification.
- [ ] Add integration tests for payments and reviews.
- [ ] Add thunder-client/Postman collection for manual testing.
- [ ] Update `docs/PHASE4/PHASE_4_IMPLEMENTATION.md` with endpoint samples (this file).
- [ ] Run `npm run lint`, `npm test`, and a local manual checkout flow to validate.

---

## Appendix: Example environment variables

```
PAYMENT_PROVIDER=paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET=sk_test_xxx
PAYMENT_WEBHOOK_SECRET=whsec_xxx
PAYMENT_CURRENCY=NGN
PLATFORM_COMMISSION_SELLER=15
PLATFORM_COMMISSION_BUYER=1
```

---

## Appendix: Example commission calculation (TypeScript)

```ts
function calculateCommissions(amount: number, sellerPercent = 15, buyerPercent = 1) {
  const sellerCommission = +(amount * (sellerPercent / 100)).toFixed(2);
  const buyerCommission = +(amount * (buyerPercent / 100)).toFixed(2);
  const platformFee = +(sellerCommission + buyerCommission).toFixed(2);
  const netAmount = +(amount - platformFee).toFixed(2);
  return { sellerCommission, buyerCommission, platformFee, netAmount };
}
```

---

End of Phase 4 implementation guide. Follow the integration checklist to implement and test incrementally.
