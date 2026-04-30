# Phase 4 Roadmap (Weeks 10-12)

## Goal

Deliver a production-ready payments and reviews system supporting Paystack integration, webhooks, commission calculation, and review aggregation.

---

### Week 10 — Payments Foundation

- Day 1: Design DB schema for `payments` and `payment_webhooks` (create migrations)
- Day 2: Implement `paymentsRepository` and DB queries (parameterized)
- Day 3: Implement `paymentsService` (initiate payment flow + commission calc)
- Day 4: Implement `paymentsController` and routes (`POST /api/payments/initiate`, `GET /api/payments/:reference/verify`)
- Day 5: Add logging, error handling, and unit tests for repository & service

### Week 11 — Webhooks & Verification

- Day 6: Add `webhookController` and secure endpoint (`POST /api/payments/webhook`)
- Day 7: Implement idempotency checks and webhook audit persistence
- Day 8: Implement provider verification call (Paystack verify endpoint) in `paymentsService`
- Day 9: Integration tests for webhook flows using Paystack test data (simulate callbacks)
- Day 10: Add admin tools (replay webhooks, list failed webhooks)

### Week 12 — Reviews & Polishing

- Day 11: Implement `reviews` endpoints and `reviewsService` (validation: only completed assignments)
- Day 12: Add DB trigger or job to recalculate `avg_rating` and test performance
- Day 13: End-to-end tests (initiate payment → webhook → update assignment → complete assignment → post review)
- Day 14: Thunder Client collection and documentation
- Day 15: Security review, performance tuning, release checklist

---

## Release Checklist

- Migration applied and verified in staging
- Webhook secret configured in environment
- Tests: unit + integration passing (CI)
- Thunder Client collection imported and smoke-tested
- Monitoring & alerts configured for failed webhooks
- Backup & rollback plan for DB changes
