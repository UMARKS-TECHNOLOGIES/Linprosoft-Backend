# Phase 4 Testing Strategy & Execution

**Scope:** Unit tests, integration tests, webhook replay, admin approval workflows, payment verification, and review aggregation.  
**Coverage Target:** 90% on payment + admin approval + review critical paths.

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

### Payment Initiation & Webhook
- Payment initiation: should create `payments` row (status `pending_payment`) and return provider link
- Webhook receipt: status transitions `pending_payment` → `pending_admin_approval` (NEW - MVP)
- Webhook idempotency: duplicate webhook doesn't create duplicate payment or state change

### MVP Admin Approval Gate (Critical)
- Admin list pending: `GET /api/admin/payments/pending-admin-approval` returns all pending-admin-approval status payments
- Admin approve success: 
  - Request: `POST /api/admin/payments/{id}/approve-payment`
  - Updates: status → `held_in_escrow`, `admin_approval_status` → `approved`
  - `job_assignments.payment_status` → `funded`
  - Professional receives notification can start work
- Admin reject success:
  - Request: `POST /api/admin/payments/{id}/reject-payment` with reason
  - Updates: status → `payment_rejected`, `admin_approval_status` → `rejected`
  - Refund queued to employer
  - Employer receives notification with rejection reason
- Admin approval auth: non-admin users cannot approve/reject (403 forbidden)
- Admin approval idempotency: duplicate approve/reject doesn't double-update

### Employer Satisfaction Gate
- Employer approve: payment only releases after employer approves satisfaction (not automatic)
- Employer dispute: marks payment under review, admin must resolve

### Payment Verification & Completion
- Payment verify success: after both admin AND employer approve, payment moves to `released`
- Commission calc: ensure 15% seller, 1% buyer applied correctly and stored in DB (example math)

### Reviews Flow
- Reviews validation: only allowed after `job_assignments.status=completed` AND `employer_approval_status=approved`
- Rating range validation (1-5)
- Rating aggregation: after new review, avg_rating updated to correct rounded value

---

## Example Integration Test (jest + supertest) - MVP Admin Approval Flow

```typescript
it('completes payment flow with admin approval', async () => {
  // 1. Create assignment
  const assignment = await createTestAssignment();
  
  // 2. Initiate payment - creates payments with status pending_payment
  const payResponse = await supertest(app)
    .post('/api/payments/initiate')
    .send({ assignmentId: assignment.id });
  const paymentId = payResponse.body.data.payment.id;
  
  // 3. Simulate webhook - payment goes to pending_admin_approval
  const webhookPayload = createPaystackWebhookPayload(payResponse.body.data.provider_reference);
  await supertest(app)
    .post('/api/payments/webhook')
    .set('x-paystack-signature', signPayload(webhookPayload))
    .send(webhookPayload);
    
  // 4. Verify payment is pending admin approval
  let payment = await Payment.findById(paymentId);
  expect(payment.status).toBe('pending_admin_approval');
  
  // 5. Non-admin cannot approve
  await supertest(app)
    .post(`/api/admin/payments/${paymentId}/approve-payment`)
    .set('Authorization', employerToken)
    .expect(403);
    
  // 6. Admin approves payment
  await supertest(app)
    .post(`/api/admin/payments/${paymentId}/approve-payment`)
    .set('Authorization', adminToken)
    .send({ notes: 'Verified employer' })
    .expect(200);
    
  // 7. Verify payment moved to held_in_escrow and assignment to funded
  payment = await Payment.findById(paymentId);
  expect(payment.status).toBe('held_in_escrow');
  expect(payment.admin_approval_status).toBe('approved');
  
  const updatedAssignment = await JobAssignment.findById(assignment.id);
  expect(updatedAssignment.payment_status).toBe('funded');
  
  // 8. Professional can now start work
  const startResponse = await supertest(app)
    .patch(`/api/assignments/${assignment.id}/start-service`)
    .set('Authorization', professionalToken);
  expect(startResponse.status).toBe(200);
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
