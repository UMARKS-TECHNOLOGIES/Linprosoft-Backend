# Phase 4 API Endpoints (Payments & Reviews)

This document is the frontend/backend integration contract for Phase 4.

## Base URLs

Backend API base: `http://localhost:5020`  
Phase 4 routes: `/api/payments`, `/api/admin/payments`, `/api/reviews`

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
  "amount": 150000,
  "currency": "NGN"
}
```

Success: `201 Created`

```json
{
  "success": true,
  "data": {
    "payment": { 
      "id": 1, 
      "status": "pending_payment",
      "provider_reference": "ref_abc" 
    },
    "checkout_url": "https://paystack.co/checkout/xyz"
  }
}
```

Notes:
- Status starts as `pending_payment`
- Will transition to `pending_admin_approval` after webhook (MVP gate)
- Admin must approve before professional can start work

Errors: 400 validation, 401 auth, 403 not owner, 404 assignment not found

---

## MVP Admin Approval Gate Endpoints (Critical)

These endpoints manage the first-stage approval gate for all payments at MVP stage.

### GET /api/admin/payments/pending-admin-approval

List all payments awaiting admin approval.

Auth: required (admin only)

Query params: `page`, `limit`, `sort` (createdAt|amount)

Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "assignmentId": 123,
        "amount": 150000,
        "currency": "NGN",
        "status": "pending_admin_approval",
        "employer": {
          "id": "emp_123",
          "name": "Chioma Obi",
          "accountStatus": "verified",
          "verificationLevel": "full"
        },
        "professional": {
          "id": "prof_456",
          "name": "Tunde Adeyemi",
          "avgRating": 4.8,
          "totalJobs": 45
        },
        "createdAt": "2026-06-06T10:30:00Z",
        "paymentMethod": "card"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5 }
  }
}
```

Errors: 401 auth, 403 non-admin

---

### POST /api/admin/payments/{paymentId}/approve-payment

**Approve payment and move to escrow (critical MVP gate)**

Auth: required (admin only)

Request body:

```json
{
  "notes": "Optional: Verified employer account and payment method"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "paymentId": 1,
    "status": "held_in_escrow",
    "adminApprovalStatus": "approved",
    "approvedAt": "2026-06-06T10:35:00Z",
    "approvedBy": "admin_123",
    "message": "Payment approved and held in escrow. Professional notified."
  }
}
```

Side effects:
- `payments.status`: `pending_admin_approval` → `held_in_escrow`
- `payments.admin_approval_status`: `pending` → `approved`
  - `job_assignments.payment_status`: `pending_admin_approval` → `funded`
- Professional receives notification that work can begin
- Employer receives confirmation of approved payment

Errors: 400 invalid state, 401 auth, 403 non-admin, 404 payment not found, 409 already processed

---

### POST /api/admin/payments/{paymentId}/reject-payment

**Reject payment and initiate refund (critical MVP gate)**

Auth: required (admin only)

Request body:

```json
{
  "reason": "Required. Reason for rejection",
  "examples": "Employer account verification failed | Suspicious payment method | Policy violation | Other"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "paymentId": 1,
    "status": "payment_rejected",
    "adminApprovalStatus": "rejected",
    "rejectedAt": "2026-06-06T10:35:00Z",
    "rejectedBy": "admin_123",
    "rejectionReason": "Employer account verification failed",
    "refundReference": "refund_abc123",
    "message": "Payment rejected. Refund queued to employer's original payment method."
  }
}
```

Side effects:
- `payments.status`: `pending_admin_approval` → `payment_rejected`
- `payments.admin_approval_status`: `pending` → `rejected`
  - `job_assignments.payment_status`: `pending_admin_approval` → `refunded`
- Refund background job queued (returns funds to employer)
- Assignment marked as refunded/cancelled
- Employer receives notification with rejection reason
- Professional not notified (assignment cancelled)

Errors: 400 invalid state, 401 auth, 403 non-admin, 404 payment not found, 409 already processed

---

### GET /api/payments/:reference/verify

Manual verify: queries provider and returns current status.

Auth: required (owner or admin)

Success: `200 OK` with payment record and provider verification status.

---

### POST /api/payments/webhook

Webhook endpoint for Paystack callbacks. Must be publicly accessible but secured by signature verification.

Auth: none (signature-based)

Behavior (MVP with Admin Approval Gate):

- Verify signature header matches `PAYSTACK_WEBHOOK_SECRET`.
- Ensure idempotency by checking existing `provider_reference` or `payment_webhooks` processed flag.
- Persist payload to `payment_webhooks` and update `payments` row.
- **Key: Payment status goes to `pending_admin_approval` (NOT held_in_escrow)** — MVP fraud prevention gate
- Set `pending_admin_review_at` timestamp
- **DO NOT update `job_assignments.payment_status` yet** — waits for admin approval
- Alert admin dashboard that payment awaits review

Response: `200 OK` immediately on success (or `400/401` on signature failure)

Payment Flow After Webhook:
1. Payment received by Paystack (customer paid)
2. Paystack webhook confirms payment → payment status: `pending_admin_approval`
3. Admin reviews payment for fraud/verification issues
4. Admin approves → status: `held_in_escrow`, professional notified, can start work
5. OR admin rejects → status: `payment_rejected`, refund initiated

---

### GET /api/payments/history/:userId

Return a paginated list of payments involving the user (payer or payee).

Auth: required (user matching userId or admin)

Query params: `page`, `limit`, `status`

---

## Employer Satisfaction & Approval Gates (Secondary)

After work is complete, employer must approve satisfaction before professional receives payout.

### PATCH /api/assignments/{assignmentId}/approve-satisfaction

Employer approves work quality and satisfaction (allows payout after this).

Auth: required (employer who created assignment)

Request body:

```json
{
  "comment": "Optional: Feedback for professional"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "assignmentId": 123,
    "satisfactionStatus": "satisfied",
    "approvedAt": "2026-06-07T14:30:00Z",
    "message": "Work approved. Payout will be released."
  }
}
```

Side effects:
- `job_assignments.satisfaction_status`: `pending_review` → `satisfied`
- `payments.employer_approval_status`: `pending_review` → `approved`
- If admin also approved payment, funds queued for release
- Professional notified of approval

Errors: 400 invalid state, 401 auth, 403 not employer, 404 assignment not found

---

### PATCH /api/assignments/{assignmentId}/dispute-satisfaction

Employer disputes work quality (payment remains held, admin review needed).

Auth: required (employer who created assignment)

Request body:

```json
{
  "reason": "Work does not meet requirements",
  "evidenceLinks": ["https://...", "https://..."],
  "resolveType": "refund_request | revision_request"
}
```

Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "assignmentId": 123,
    "satisfactionStatus": "disputed",
    "disputeId": "disp_456",
    "status": "open",
    "message": "Dispute filed. Admin will review within 48 hours."
  }
}
```

Side effects:
- `job_assignments.satisfaction_status`: `pending_review` → `disputed`
- Dispute record created
- Admin notified for manual review
- Payment remains in escrow pending resolution
- Professional notified of dispute

Errors: 400 invalid state, 401 auth, 403 not employer, 404 assignment not found

---

### POST /api/reviews

Create a review after a job assignment is completed AND employer approves satisfaction.

Auth: required (employer/reviewer)

Request body:

```json
{
  "jobAssignmentId": 456,
  "rating": 5,
  "comment": "Excellent work, delivered on time",
  "isAnonymous": false
}
```

Rules (MVP Approval Gates):

- Only the employer associated with the `job_assignment` may create the review.
- `job_assignment.status` must be `completed`.
- `job_assignments.satisfaction_status` must be `satisfied` (employer already approved)
- Rating must be between 1 and 5.
- One review per assignment (unique constraint on assignmentId + reviewerId)

Success: `201 Created` with persisted review payload

```json
{
  "success": true,
  "data": {
    "id": "review_789",
    "assignmentId": 456,
    "reviewerId": "emp_123",
    "professionalId": "prof_456",
    "rating": 5,
    "comment": "Excellent work, delivered on time",
    "createdAt": "2026-06-07T15:00:00Z"
  }
}
```

Side effects:
- Professional's `avg_rating` recalculated immediately via DB trigger
- Professional's `total_reviews` incremented
- Professional profile updated with new rating

Errors: 400 validation, 401 auth, 403 unauthorized, 404 not found, 409 duplicate review, 422 satisfaction not approved

---

### GET /api/reviews/:professionalId

List reviews for a professional with pagination and sorting.

Auth: not required (public)

Query params: `page`, `limit`, `sort` (recent|rating)

Response includes aggregated `avg_rating` and `total_reviews`.
