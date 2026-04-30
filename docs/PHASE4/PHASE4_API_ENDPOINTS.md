# Phase 4 API Endpoints (Payments & Reviews)

This document is the frontend/backend integration contract for Phase 4.

## Base URLs

Backend API base: `http://localhost:5020`  
Phase 4 routes: `/api/payments`, `/api/reviews`

## Standard Response Shapes

Follow the same response format as previous phases (success/error envelopes). Payments may return 202 when initiation defers to provider.

---

### POST /api/payments/initiate

Create a pending payment and return provider checkout link.

Auth: required (employer)

Request body:

```json
{
  "assignmentId": 123,
  "amount": 150000, // in smallest unit (kobo)
  "currency": "NGN"
}
```

Success: `201 Created`

```json
{
  "success": true,
  "data": {
    "payment": { "id": 1, "provider_reference": "ref_abc" },
    "checkout_url": "https://paystack.co/checkout/xyz"
  }
}
```

Errors: 400 validation, 401 auth, 403 not owner, 404 assignment not found

---

### GET /api/payments/:reference/verify

Manual verify: queries provider and returns current status.

Auth: required (owner or admin)

Success: `200 OK` with payment record and provider verification status.

---

### POST /api/payments/webhook

Webhook endpoint for Paystack callbacks. Must be publicly accessible but secured by signature verification.

Auth: none (signature-based)

Behavior:

- Verify signature header matches `PAYSTACK_WEBHOOK_SECRET`.
- Ensure idempotency by checking existing `provider_reference` or `payment_webhooks` processed flag.
- Persist payload to `payment_webhooks` and update `payments` row.
- Update `job_assignments.payment_status` to `paid` on successful verification.

Respond with `200 OK` immediately on success (or `400/401` on signature failure).

---

### GET /api/payments/history/:userId

Return a paginated list of payments involving the user (payer or payee).

Auth: required (user matching userId or admin)

Query params: `page`, `limit`, `status`

---

### POST /api/reviews

Create a review after a job assignment is completed.

Auth: required (reviewer)

Request body:

```json
{
  "jobAssignmentId": 456,
  "rating": 5,
  "comment": "Great work",
  "isAnonymous": false
}
```

Rules:

- Only the reviewer associated with the `job_assignment` may create the review.
- `job_assignment.status` must be `completed`.
- Rating must be between 1 and 5.

Success: `201 Created` with persisted review payload.

Errors: 400 validation, 401 auth, 403 unauthorized, 409 duplicate review

---

### GET /api/reviews/:professionalId

List reviews for a professional with pagination and sorting.

Auth: not required (public)

Query params: `page`, `limit`, `sort` (recent|rating)

Response includes aggregated `avg_rating` and `total_reviews`.
