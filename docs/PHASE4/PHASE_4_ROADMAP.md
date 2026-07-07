# Phase 4 Roadmap (Weeks 10-12)

## Goal

Deliver a production-ready payments and reviews system supporting Paystack integration, webhooks, commission calculation, review aggregation, AND **MVP admin approval gate for all payments** (fraud prevention layer).

---

### Week 10 — Payments Foundation

- Day 1: Design DB schema for `payments` and `payment_webhooks` (create migrations) - **include MVP admin approval fields**
- Day 2: Implement `paymentsRepository` and DB queries (parameterized)
- Day 3: Implement `paymentsService` (initiate payment flow + commission calc)
- Day 4: Implement `paymentsController` and routes (`POST /api/payments/initiate`, `GET /api/payments/:reference/verify`)
- Day 5: Add logging, error handling, and unit tests for repository & service

### Week 11 — Webhooks & MVP Admin Approval Gate

- Day 6: Add `webhookController` and secure endpoint (`POST /api/payments/webhook`) - **status now goes to pending_admin_approval**
- Day 7: Implement idempotency checks and webhook audit persistence - **for pending_admin_approval state**
- Day 8: **Implement MVP admin approval endpoints** (
`POST /api/admin/payments/{id}/approve-payment`, `POST /api/admin/payments/{id}/reject-payment`, `GET /api/admin/payments/pending-admin-approval`)
- Day 9: Integration tests for webhook → pending admin approval → admin decision flows
- Day 10: Add admin dashboard tools (list pending, approve/reject with audit logging)

### Week 12 — Employer Satisfaction, Reviews & Polishing

- Day 11: Implement employer satisfaction approval endpoints and employer satisfaction review UI hooks
- Day 12: Implement `reviews` endpoints and `reviewsService` (validation: completed assignments + employer approval)
- Day 13: Add DB trigger or job to recalculate `avg_rating` and test performance
- Day 14: End-to-end tests (initiate payment → webhook → admin approval → assignment funded → work completed → employer approves → post review)
- Day 15: Thunder Client collection and documentation

---

## Release Checklist

- Migration applied and verified in staging (includes MVP admin approval fields)
- Webhook secret configured in environment
- Tests: unit + integration passing (CI) - **including admin approval test suite**
- Thunder Client collection imported and smoke-tested - **including admin approval endpoints**
- Monitoring & alerts configured for:
  - Failed webhooks
  - **Pending admin approvals queue (alert if > threshold)**
  - Stuck payments (not approved within SLA)
- **Admin role verification working on approval endpoints**
- Backup & rollback plan for DB changes
