# Phase 4 Architecture

## Summary

Phase 4 extends the existing layered architecture (Routes → Controllers → Services → Repositories → Database) with a payments subsystem and a reviews subsystem. Both subsystems follow the same module conventions used in Phase 2 and Phase 1.

## High-level Components

- Payments Module
  - `paymentsRoutes.ts`
  - `paymentsController.ts`
  - `paymentsService.ts` (business logic + commission calc)
  - `paymentsRepository.ts` (DB queries)
  - `webhookController.ts` (separate controller to receive Paystack callbacks)

- Reviews Module
  - `reviewsRoutes.ts`
  - `reviewsController.ts`
  - `reviewsService.ts` (validation + ownership checks)
  - `reviewsRepository.ts`

## Interactions & Flow

1. Employer creates/accepts a `job_assignment` and the `job_assignments.payment_status` is `pending`.
2. Frontend calls `POST /api/payments/initiate` with `assignmentId` and `amount`.
3. `paymentsService` creates a `payments` row with status `pending` and returns a Paystack checkout link (or inline token) to the client.
4. Client completes payment on Paystack. Paystack sends webhook to `POST /api/payments/webhook`.
5. `webhookController` verifies signature and idempotency, then `paymentsService` verifies payment with Paystack API and updates `payments` and `job_assignments.payment_status` to `paid`.
6. On `paid` status, platform can mark assignment as funded; commissions are calculated and stored in `payments`.
7. After assignment `status` becomes `completed`, the client can call `POST /api/reviews` to create a review for the completed assignment.
8. A database trigger or background job recalculates `professional_profiles.avg_rating` after new reviews are persisted.

## Webhook & Idempotency

- Verify Paystack signature header on receipt.
- Use `reference` field to ensure idempotent processing (store processed references).
- Persist raw webhook payload to `payment_webhooks` for audit and replay.
- Respond quickly (200 OK) to Paystack once the payload is queued/verified.

## Security

- Webhook endpoint must accept only requests from Paystack IPs (optional) and verify signatures.
- Use environment variable `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET`.
- Store only necessary PCI-related data; do not store card numbers.
- All payment-related endpoints require authentication and authorization checks (assignment ownership or employer/employer-role).

## Scaling & Reliability

- Use a persistent job queue (Redis/ Bull / BullMQ) for webhook verification and heavy processing if traffic increases.
- Monitor failed webhook retries and provide an admin dashboard to replay.

## Module Placement

Place modules under `src/modules/payments/` and `src/modules/reviews/` following the existing pattern used in Phase 2.
