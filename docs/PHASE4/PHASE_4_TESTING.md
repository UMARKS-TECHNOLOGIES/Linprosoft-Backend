# Phase 4 Testing Strategy & Execution

**Scope:** Unit tests, integration tests, webhook replay, payment verification, and review aggregation.  
**Coverage Target:** 90% on payment + review critical paths.

---

## Testing Overview

Follow the project's testing pyramid: primarily unit tests and integration tests; simulate provider webhooks for realistic end-to-end coverage.

### Test Types

- Unit tests: `paymentsService`, `paymentsRepository`, `reviewsService` logic and commission math
- Integration tests: full flows using `supertest` and a test DB (initiate → webhook → verify)
- Webhook simulation: local replay of Paystack test payloads; verify idempotency, signature verification
- Load/Performance: measure webhook processing and rating recalculation at scale

---

## Test Cases (Representative)

- Payment initiation: should create `payments` row (status `pending`) and return provider link
- Payment verify success: webhook or manual verify sets `provider_status=paid`, `paid_at` updated, assignment status updated to `paid`
- Payment verify failure: provider status `failed`, assignment status remains `pending`, retries logged
- Idempotency: duplicate webhook payload does not double-credit assignment or create duplicate payments
- Commission calc: ensure 15% seller, 1% buyer applied correctly and stored in DB (example math)
- Reviews flow: only allowed after `job_assignments.status=completed`; rating range validation (1-5)
- Rating aggregation: after new reviews avg_rating updated to correct rounded value

---

## Example Integration Test (jest + supertest)

```typescript
it('completes payment flow and updates assignment', async () => {
  // 1. create assignment by employer
  // 2. call POST /api/payments/initiate -> returns reference
  // 3. simulate Paystack webhook payload POST /api/payments/webhook
  // 4. assert payments table provider_status = 'paid'
  // 5. assert job_assignments.payment_status = 'paid'
});
```

## Webhook Simulation

- Use the Thunder Client collection to POST the exact JSON payload Paystack would send.
- Include `x-paystack-signature` header computed from `PAYSTACK_WEBHOOK_SECRET` when simulating.
- Store raw payload in `payment_webhooks` to aid replay testing.

## Test Environment Variables

Add test env variables for provider sandbox keys:

- `PAYSTACK_SECRET_KEY_TEST`
- `PAYSTACK_PUBLIC_KEY_TEST`
- `PAYSTACK_WEBHOOK_SECRET_TEST`

## CI Recommendations

- Run unit tests on every push
- Run integration tests on PRs that touch payments/reviews
- Have a separate job for webhook simulation (so it can run with sandbox credentials)
