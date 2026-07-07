# Phase 4 Architecture

## Summary

Phase 4 extends the existing layered architecture (Routes → Controllers → Services → Repositories → Database) with a payments subsystem and a reviews subsystem. Both subsystems follow the same module conventions used in Phase 2 and Phase 1.

## Payment Model: Escrow-Based (Method 2)

**Model Choice**: Funds are held in escrow (via Paystack) until a release condition is met (e.g., assignment completion), protecting both employer and professional.

**Rationale**:
- Safer for both parties: Employer funds only release after professional delivers AND employer explicitly approves quality. Professional doesn't risk non-payment after delivery.
- Clear refund semantics: Employer can dispute/reject work before funds release, with automatic refund to original payment method.
- Reduced disputes: Natural checkpoint at employer approval prevents "paid but unsatisfactory" scenarios and protects professional's reputation.
- Trust-building: Transparent approval workflow shows both parties their work is validated.

**Implementation**:
- Paystack processes the charge and holds funds.
- Platform creates escrow records and tracks approval conditions.
- Professional marks work as complete → System notifies employer for review.
- Employer approves work as "satisfied" → Platform triggers release to professional's bank/account.
- Commission is retained by platform from the held funds.
- Audit trail records all state transitions, approvals, and disputes for reconciliation and resolution.

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

**Phase A: Payment Capture & Admin Verification (MVP Required)**

1. Employer creates/accepts a `job_assignment`; `job_assignments.payment_status` is initially `pending`.
2. Employer initiates payment: Frontend calls `POST /api/payments/initiate` with `assignmentId`, `amount`, and optional `note`.
3. `paymentsService` creates a `payments` row with:
   - `status`: `pending_admin_approval` **(MVP: Requires admin review before escrow hold)**
   - `admin_approval_status`: `pending`
   - `assignment_id`
   - `amount` (total, including commission)
   - `commission_amount` (calculated upfront)
   - `net_amount` (amount due to professional after commission)
   - Returns Paystack checkout link to client.
4. Employer completes payment on Paystack. Paystack sends webhook to `POST /api/payments/webhook`.
5. `webhookController` verifies signature and idempotency, then `paymentsService` verifies payment with Paystack API and updates:
   - `payments.status` → `pending_admin_approval` **(NOT held_in_escrow yet)**
   - `payments.paystack_reference` is stored for audit.
   - Payment is queued for admin review; does NOT automatically move to held_in_escrow
   - System notifies admin: "New payment of ₦100,000 requires approval."

**Phase A.5: Admin Payment Verification (MVP Gate)**

6. Admin reviews payment details via dashboard:
   - Employer identity & payment history
   - Assignment details & professional info
   - Fraud/risk checks
   - **Option A (Approve)**: Admin calls `POST /api/admin/payments/{paymentId}/approve-payment`
     - `payments.status` → `held_in_escrow` (now funds are truly held)
     - `job_assignments.payment_status` → `funded`
     - `payments.admin_approved_at` → NOW()
     - Employer notified: "Payment approved. Professional can now start work."
   - **Option B (Reject)**: Admin calls `POST /api/admin/payments/{paymentId}/reject-payment`
     - `payments.status` → `payment_rejected`
     - Refund initiated to employer's original card
     - Employer notified: "Payment rejected due to [reason]. Refund processing."
     - Assignment remains `payment_status: pending`

**Phase B: Work Delivery & Employer Review**

7. **Only after admin approval**, professional can see assignment as funded and begin work.
   - Professional marks assignment as complete: `PATCH /api/assignments/{id}` with `status: "completed"`.
   - `job_assignments.status` → `completed`
   - System sends notification to employer: "Work is ready for review. Please confirm satisfaction."
   - `payments.status` remains `held_in_escrow` (funds NOT automatically released)
   - `payments.employer_approval_status` → `pending_review`

8. Employer reviews the completed work (deliverables, quality, requirements met).
   - **Option A (Satisfied)**: Employer calls `PATCH /api/assignments/{id}/approve` with satisfaction confirmation
     - `job_assignments.satisfaction_status` → `satisfied`
     - `payments.employer_approval_status` → `approved`
     - `payments.employer_approved_at` → NOW()
     - System queues background job: `release_escrow_payment`
   - **Option B (Not Satisfied)**: Employer calls `PATCH /api/assignments/{id}/dispute` with reason
     - `job_assignments.satisfaction_status` → `disputed`
     - `payment_disputes` record created with reason
     - `payments.employer_approval_status` → `disputed`
     - Funds remain in escrow; admin intervention required

**Phase C: Escrow Release & Professional Payout**

9. When employer approves (satisfaction confirmed), background job `release_escrow_payment` is triggered:
   - `paymentsService.releaseEscrow()` is called.
   - Platform commission is transferred to platform account.
   - Net amount is released/transferred to professional's bank account (via Paystack Subaccount, direct transfer, or platform-held wallet).
   - `payments.status` → `released`.
   - `payments.released_at` timestamp is recorded.
   - Optional: `payments.payout_reference` (processor transaction ID) is stored for reconciliation.
   - Professional receives email: "₦{net_amount} has been transferred to your account."

10. After payment is released, employer can call `POST /api/reviews` to create a review for the completed assignment.
11. A database trigger or background job recalculates `professional_profiles.avg_rating` after new reviews are persisted.

## Real-Life Analogy & Technical Deep Dive

### The Scenario
Think of Linkprosoft's payment flow like a trusted **marketplace escrow service** (similar to Jumia, Fiverr, or Upwork):

- **Employer** = Buyer who wants work done
- **Professional** = Seller who will do the work
- **Linkprosoft Platform** = Trusted intermediary holding money
- **Paystack** = Bank/Payment processor that processes the card

**Story**: Chioma (employer) hires Tunde (professional) to build a website for ₦100,000. Here's how the escrow protects both:

1. **Chioma pays Paystack** ₦100,000 via card → Paystack holds it (doesn't give to Tunde yet).
2. **Linkprosoft records** a ₦100,000 escrow order with ₦10,000 commission (10% platform fee).
3. **Linkprosoft Admin reviews** payment: Checks Chioma's identity, fraud signals, assignment legitimacy.
4. **Admin approves payment** → Funds now held in escrow; system notifies Tunde: "Payment approved, you can start work."
5. **Tunde starts work** knowing money is securely held AND verified by admin.
6. **Tunde finishes & submits** work → Assignment marked `completed` → System notifies Chioma: "Work is ready for review."
7. **Chioma reviews** deliverables (website, code quality, requirements) → **Chioma approves** → Assignment marked `satisfied`.
8. **Linkprosoft releases**: ₦90,000 to Tunde's bank, ₦10,000 to platform.
9. **Chioma writes** a review and rates Tunde for future visibility.

**Protection**:
- Payments are verified by admin before professional can start (fraud prevention at gate)
- Tunde isn't paid until work is complete AND Chioma explicitly approves it.
- Chioma can dispute work quality before releasing funds (automatic refund if rejected).
- Tunde's reputation is protected: Payment only after employer confirms quality.
- Linkprosoft earns commission while facilitating trust between parties AND reducing fraud risk.

---

### Technical Flow: Layer-by-Layer Execution

Below is how each layer (Routes → Controllers → Services → Repositories → Database) handles the payment transaction:

#### **STEP 1: Employer Initiates Payment**

**Frontend Action**: Employer clicks "Pay for Assignment" → `POST /api/payments/initiate`

```
Request Body:
{
  "assignmentId": "assign-001",
  "amount": 100000,
  "note": "Website development payment"
}
```

**Controller Layer** (`paymentsController.ts: initiatePayment()`)
```
1. Extract & validate request (assignmentId, amount, user = employer)
2. Call paymentsService.createPaymentOrder(assignmentId, amount, employerId)
3. Return Paystack checkout link to frontend
```

**Service Layer** (`paymentsService.ts: createPaymentOrder()`)
```
1. Fetch job_assignment from DB to verify:
   - Assignment exists & is in correct state (pending/accepted)
   - Employer owns this assignment
   - Professional is assigned
   
2. Calculate commission:
   - commission_amount = amount × 0.10 (10% platform fee)
   - net_amount = amount - commission_amount
   
3. Create payment record:
   - Call paymentsRepository.create({
       assignmentId,
       amount: 100000,
       commission_amount: 10000,
       net_amount: 90000,
       status: "pending_payment",
       escrow_release_condition: "assignment_completion",
       metadata: { note: "Website development payment" }
     })
   
4. Return Paystack checkout URL (to be shown to user)
```

**Repository Layer** (`paymentsRepository.ts: create()`)
```
INSERT INTO payments (
  id, assignment_id, amount, commission_amount, net_amount,
  status, escrow_release_condition, currency, created_at
) VALUES (
  'pay-001', 'assign-001', 100000, 10000, 90000,
  'pending_payment', 'assignment_completion', 'NGN', NOW()
)
```

**Database State After Step 1**:
```
payments table:
| id     | assignment_id | amount | commission | net_amount | status          | captured_at |
|--------|---------------|--------|------------|------------|-----------------|-------------|
| pay-001| assign-001    | 100000 | 10000      | 90000      | pending_payment | NULL        |

job_assignments table:
| id        | payment_status |
|-----------|----------------|
| assign-001| pending        | (unchanged)
```

---

#### **STEP 2: Employer Completes Payment on Paystack**

**Frontend Action**: User enters card details on Paystack checkout → Payment processed → Paystack redirects back

**Paystack Webhook** (asynchronous): Paystack → `POST /api/payments/webhook`

```
Webhook Payload (from Paystack):
{
  "event": "charge.success",
  "data": {
    "id": 987654321,
    "reference": "ps-ref-001",
    "amount": 10000000,  (in kobo: 100000 * 100)
    "status": "success",
    "customer": { "email": "chioma@example.com" },
    "authorization": { ... }
  }
}
```

**Webhook Controller** (`webhookController.ts: handlePaystackWebhook()`)
```
1. Verify Paystack signature:
   - Extract signature from headers
   - Validate against PAYSTACK_WEBHOOK_SECRET
   - If invalid, return 401 Unauthorized

2. Check idempotency:
   - Query payment_webhooks table for reference "ps-ref-001"
   - If exists & processed=true, return 200 (prevent duplicate)
   
3. Store raw webhook for audit:
   - Call paymentsRepository.storeWebhookPayload({
       paystack_reference: "ps-ref-001",
       event_type: "charge.success",
       payload: {...},
       processed: false
     })

4. Queue async job or call service directly:
   - Queue job: "process.payment.webhook" with reference
   - OR: Call paymentsService.confirmPayment("ps-ref-001")

5. Return 200 OK immediately (Paystack expects quick response)
```

**Service Layer** (`paymentsService.ts: confirmPayment()`) — Runs async

```
1. Fetch payment by Paystack reference:
   - paymentsRepository.findByPaystackRef("ps-ref-001")
   - If not found, log error and exit

2. Verify with Paystack API (backend-to-backend):
   - Call Paystack API: GET /transaction/verify/{reference}
   - Confirm amount matches, status is "success"
   
3. Update payment record:
   - paymentsRepository.update("pay-001", {
       status: "pending_admin_approval",  // MVP: Not yet held in escrow!
       paystack_reference: "ps-ref-001",
       captured_at: NOW(),
       admin_approval_status: "pending"   // Awaiting admin review
     })

4. Update job assignment:
    - assignmentRepository.update("assign-001", {
       payment_status: "pending_admin_approval"  // Professional CANNOT start yet
     })

5. Mark webhook as processed & Queue admin review:
   - paymentsRepository.updateWebhook("webhook-id", {
       processed: true,
       processed_at: NOW()
     })
   - Queue notification: "Admin payment review required"

6. Log audit entry:
   - Call auditRepository.log({
       action: "PAYMENT_CONFIRMED_AWAITING_ADMIN",
       paymentId: "pay-001",
       userId: employerId,
       timestamp: NOW()
     })
```

**Database State After Step 2**:
```
payments table:
| id     | assignment_id | amount | status                | captured_at        | paystack_reference | admin_approval_status |
|--------|---------------|--------|----------------------|--------------------|--------------------|-----------------------|
| pay-001| assign-001    | 100000 | pending_admin_approval| 2026-05-04 10:15   | ps-ref-001        | pending               |

payment_webhooks table:
| id | paystack_reference | event_type     | processed | processed_at       |
|----|-------------------|----------------|-----------|-------------------|
| wh1| ps-ref-001        | charge.success | true      | 2026-05-04 10:15  |

job_assignments table:
| id        | status      | payment_status      |
|-----------|-------------|---------------------|
| assign-001| accepted    | pending_admin_approval    | (Payment waiting for admin!)

Payment is held by Paystack but NOT in escrow yet. Professional CANNOT start work.
Admin notification: "Payment of ₦100,000 requires review."
```

---

#### **STEP 2.5: Admin Approves or Rejects Payment (MVP Gate)**

**Admin Dashboard**: Admin reviews pending payment approvals in `/api/admin/dashboard/payments-pending-approval`

**Admin Reviews**:
```
1. Check payment details:
   - Employer: Chioma (chioma@example.com)
   - Amount: ₦100,000 | Commission: ₦10,000
   - Professional: Tunde (tunde@example.com)
   - Assignment: Website Development
   
2. Risk assessment:
   - Employer account age: 45 days ✓
   - Previous successful payments: 3 ✓
   - Chargebacks on file: None ✓
   - Professional verified: Yes ✓
   - Assignment description quality: Clear requirements ✓
   
3. Decision: Admin clicks "APPROVE" or "REJECT"
```

**Approval Path:**

**Controller Layer** (`paymentsController.ts: approvePaymentByAdmin()` — Admin only):
```
1. Verify admin role
2. Extract paymentId from URL
3. Call paymentsService.approvePaymentByAdmin(paymentId, adminId)
4. Return result
```

**Service Layer** (`paymentsService.ts: approvePaymentByAdmin()`):
```
1. Fetch & validate payment:
   - payment = paymentsRepository.findById("pay-001")
   - Verify status = "pending_admin_approval"
   
2. Update payment to escrow:
   - paymentsRepository.update("pay-001", {
       status: "held_in_escrow",           // NOW funds are in escrow
       admin_approval_status: "approved",
       admin_approved_at: NOW(),
       admin_approved_by: adminId
     })

3. Unlock assignment for professional:
   - assignmentRepository.update("assign-001", {
       payment_status: "funded"             // Professional can now start
     })

4. Send notifications:
   - Email to employer: "✓ Payment approved and secured in escrow."
   - Email to professional: "✓ Payment approved! You can now start work."
   - SMS optional

5. Log audit:
   - auditRepository.log({
       action: "PAYMENT_APPROVED_BY_ADMIN",
       paymentId: "pay-001",
       admin_id: adminId,
       amount: 100000,
       timestamp: NOW()
     })
```

**Rejection Path:**

**Service Layer** (`paymentsService.ts: rejectPaymentByAdmin()`):
```
1. Fetch & validate payment

2. Process refund via Paystack:
   - Call paystackService.refundPayment({
       paystack_reference: "ps-ref-001",
       amount: 100000,
       reason: "Admin approval denied - [reason]"
     })

3. Update payment:
   - paymentsRepository.update("pay-001", {
       status: "payment_rejected",
       admin_approval_status: "rejected",
       admin_rejected_at: NOW(),
       admin_rejected_by: adminId,
       admin_rejection_reason: reason,
       refund_reference: "refund-001"
     })

4. Reset assignment:
   - assignmentRepository.update("assign-001", {
       payment_status: "pending",
       status: "pending"
     })

5. Notifications:
   - Email to employer: "Payment rejected: [reason]. Refund processing (3-5 business days)."
   - SMS with support contact

6. Log:
   - auditRepository.log({
       action: "PAYMENT_REJECTED_BY_ADMIN",
       paymentId: "pay-001",
       admin_id: adminId,
       reason: reason,
       timestamp: NOW()
     })
```

**Database State After Step 2.5 (Approved)**:
```
payments table:
| id     | status         | admin_approval_status | admin_approved_at  | admin_approved_by |
|--------|----------------|----------------------|--------------------|-------------------|
| pay-001| held_in_escrow | approved             | 2026-05-04 10:30   | admin_user_id     |

job_assignments table:
| id        | status      | payment_status |
|-----------|-------------|----------------|
| assign-001| accepted    | funded         | ← Professional can NOW start!
```

**Database State After Step 2.5 (Rejected)**:
```
payments table:
| id     | status            | admin_approval_status | admin_rejected_at   | admin_rejected_by | refund_reference |
|--------|-------------------|----------------------|---------------------|-------------------|------------------|
| pay-001| payment_rejected   | rejected             | 2026-05-04 10:30    | admin_user_id     | refund-001       |

job_assignments table:
| id        | status      | payment_status |
|-----------|-------------|----------------|
| assign-001| pending     | pending        | ← Back to original state

Refund processing: 3-5 business days to employer's original card.
```

---

#### **STEP 3: Professional Starts Work (Only After Admin Approval)**

**Frontend Action**: Professional sees assignment is funded, clicks "Start Work" → `PATCH /api/assignments/assign-001` with `status: "in_progress"`

**Backend Validation**:
```
POST /api/assignments/{id}/start-service
  Validation BEFORE allowing start:
    1. Check payment_status = 'funded' (Admin MUST have approved)
    2. If payment_status = 'pending_admin_approval': 
       Return 402 Payment Required + message: "Awaiting admin approval"
    3. If payment_status = 'pending': 
       Return error: "Payment not initiated"
    4. If status = 'payment_rejected':
       Return error: "Payment was rejected. Employer must initiate new payment."
```

---

#### **STEP 4: Professional Completes Work & Notifies Employer**

**Frontend Action**: Professional marks work as done → `PATCH /api/assignments/assign-001` with `status: "completed"`

**Controller Layer** (`assignmentsController.ts`):
```
1. Verify professional is owner of assignment
2. Call assignmentService.updateAssignmentStatus("assign-001", "completed")
3. Return updated assignment
```

**Service Layer** (`assignmentService.ts`):
```
1. Validate assignment state (must be "in_progress")
2. Update assignment:
   - job_assignments.status → "completed"
   - job_assignments.completed_at → NOW()

3. Update payment state:
   - Call paymentsRepository.update(payment_id, {
       employer_approval_status: "pending_review",
       pending_review_at: NOW()
     })

4. Send notification to employer:
   - Email/SMS: "Work is ready for review! Please confirm satisfaction."
   - In-app notification with link to review deliverables

5. Log audit entry:
   - auditRepository.log({
       action: "WORK_MARKED_COMPLETE",
       assignmentId: "assign-001",
       professionalId,
       timestamp: NOW()
     })
```

**Database State After Step 3**:
```
job_assignments table:
| id        | status    | completed_at       | satisfaction_status |
|-----------|-----------|-------------------|---------------------|
| assign-001| completed | 2026-05-04 13:00  | NULL                |

payments table:
| id     | employer_approval_status | pending_review_at  | status          |
|--------|--------------------------|-------------------|-----------------|
| pay-001| pending_review          | 2026-05-04 13:00  | held_in_escrow  |

Payment status: STILL HELD (no automatic release!)
```

---

#### **STEP 3.5: Employer Reviews & Approves Work**

**Frontend Action**: Employer reviews deliverables → Clicks "Approve" OR "Dispute"

**Employer Approves (Satisfied)**:

**Controller Layer** (`assignmentsController.ts: approveAssignment()`):
```
1. Verify employer owns this assignment
2. Extract satisfaction confirmation (rating, comment optional)
3. Call assignmentService.approveAssignment("assign-001", employerId, approvalData)
4. Return approval confirmation
```

**Service Layer** (`assignmentService.ts: approveAssignment()`):
```
1. Fetch assignment & payment:
   - assignment = assignmentRepository.findById("assign-001")
   - payment = paymentsRepository.findByAssignmentId("assign-001")

2. Validate conditions:
   - assignment.status = "completed"
   - assignment.employer_id matches current user
   - payment.employer_approval_status = "pending_review"
   - payment.status = "held_in_escrow"

3. Update assignment:
   - job_assignments.satisfaction_status → "satisfied"
   - job_assignments.employer_approved_at → NOW()

4. Update payment:
   - paymentsRepository.update(payment_id, {
       employer_approval_status: "approved",
       employer_approved_at: NOW()
     })

5. Queue escrow release job:
   - Queue job: "release_escrow_payment"
   - Payload: { paymentId: "pay-001", triggeredBy: "employer_approval" }

6. Notify professional:
   - Email/SMS: "Your work has been approved! Payment is being processed."

7. Log audit entry:
   - auditRepository.log({
       action: "WORK_APPROVED_BY_EMPLOYER",
       assignmentId: "assign-001",
       employerId,
       timestamp: NOW()
     })
```

**Employer Disputes (Not Satisfied)**:

**Controller Layer** (`assignmentsController.ts: disputeAssignment()`):
```
1. Extract dispute reason (required)
2. Call assignmentService.disputeAssignment("assign-001", employerId, reason)
3. Return dispute confirmation
```

**Service Layer** (`assignmentService.ts: disputeAssignment()`):
```
1. Validate same conditions as approval
2. Update assignment:
   - job_assignments.satisfaction_status → "disputed"
   - job_assignments.employer_disputed_at → NOW()

3. Create dispute record:
   - paymentsRepository.createDispute({
       payment_id: "pay-001",
       reason: "Colors don't match design mockup",
       status: "open",
       created_by: employerId
     })

4. Update payment:
   - paymentsRepository.update(payment_id, {
       employer_approval_status: "disputed",
       status: "held_pending_review"  (awaiting admin)
     })

5. Alert admin + professional:
   - Admin notification: "Payment disputed by employer. Review required."
   - Professional notification: "Work marked as not satisfactory. Awaiting resolution."

6. Log audit entry:
   - auditRepository.log({
       action: "WORK_DISPUTED_BY_EMPLOYER",
       assignmentId: "assign-001",
       employerId,
       reason: "Colors don't match design mockup",
       timestamp: NOW()
     })
```

**Database State After Step 3.5 (Approved Path)**:
```
job_assignments table:
| id        | satisfaction_status | employer_approved_at   |
|-----------|---------------------|----------------------|
| assign-001| satisfied           | 2026-05-04 13:30     |

payments table:
| id     | employer_approval_status | employer_approved_at | status          |
|--------|--------------------------|---------------------|-----------------|
| pay-001| approved                | 2026-05-04 13:30     | held_in_escrow  |

Background job queued: "release_escrow_payment" scheduled to run
```

**Database State After Step 3.5 (Disputed Path)**:
```
job_assignments table:
| id        | satisfaction_status | employer_disputed_at   |
|-----------|---------------------|----------------------|
| assign-001| disputed            | 2026-05-04 13:30     |

payments table:
| id     | employer_approval_status | status                | 
|--------|--------------------------|---------------------|
| pay-001| disputed                | held_pending_review   |

payment_disputes table:
| id | payment_id | reason | status | created_by |
|----|------------|--------|--------|------------|
| d1 | pay-001    | "Colors don't match design mockup" | open | employer_id |

Funds remain in escrow. Admin intervention required for resolution.
```

---

#### **STEP 4: Release Escrow & Payout to Professional** (Triggered by Employer Approval)

**Background Job** (triggered by assignment completion):

```
Job: "release_escrow_payment" running for payment "pay-001"
```

**Service Layer** (`paymentsService.ts: releaseEscrow()`) — Runs async when triggered by employer approval

```
1. Fetch payment & assignment:
   - payment = paymentsRepository.findById("pay-001")
   - assignment = assignmentRepository.findById("assign-001")

2. Validate release conditions:
   - Check payment.status = "held_in_escrow"
   - Check assignment.status = "completed"
   - Check assignment.satisfaction_status = "satisfied" ← KEY: Employer approved!
   - Check payment.employer_approval_status = "approved" ← TRIGGER CONDITION

3. Get professional's payout details:
   - professional = professionalRepository.findById(assignment.professionalId)
   - Fetch bank account or Paystack subaccount: professional.paystack_subaccount_id

4. Execute payout to professional:
   - Call paystackService.transferFunds({
       amount: 90000,  (net_amount)
       recipient: professional.paystack_subaccount_id,
       reference: "payout-001",
       reason: "Job assignment completed"
     })
   - Paystack returns: { transfer_id: "trf-001", status: "success" }

5. Retain platform commission:
   - Platform receives ₦10,000 in main account (kept from charge)
   - OR: Call paystackService.transferFunds({
       amount: 10000,
       recipient: "platform_subaccount",
       reference: "commission-001"
     })

6. Update payment record:
   - paymentsRepository.update("pay-001", {
       status: "released",
       released_at: NOW(),
       payout_reference: "trf-001"
     })

7. Send notification to professional:
   - Send email/SMS: "₦90,000 has been transferred to your account"

8. Log audit entry:
   - auditRepository.log({
       action: "ESCROW_RELEASED",
       paymentId: "pay-001",
       amount: 90000,
       professional_id: professional.id,
       timestamp: NOW()
     })
```

**Repository Layer** (calls within service):
```
paymentsRepository.update("pay-001", {...})
  UPDATE payments
  SET status = 'released', released_at = NOW(), payout_reference = 'trf-001'
  WHERE id = 'pay-001'
```

**Database State After Step 4**:
```
payments table:
| id     | status   | released_at        | payout_reference | net_amount |
|--------|----------|-------------------|------------------|------------|
| pay-001| released | 2026-05-04 14:30  | trf-001          | 90000      |

Professional's bank account: ₦90,000 received ✓
Platform's account: ₦10,000 commission retained ✓
```

---

### Error Handling & Retry Logic

**If Payment Confirmation Fails** (Step 2):
```
webhookController → paymentsService.confirmPayment() throws error
  → Mark webhook as failed
  → Queue retry job (exponential backoff: 1 min, 5 min, 15 min)
  → Admin dashboard shows: "Payment ps-ref-001 pending confirmation"
  → Manual verification endpoint: POST /api/payments/{paymentId}/verify
```

**If Escrow Release Fails** (Step 4):
```
releaseEscrow() → paystackService.transferFunds() throws error
  → Catch exception
  → Mark payment status as "release_pending" (manual intervention)
  → Log error with details
  → Alert admin via dashboard
  → Admin can retry: POST /api/payments/{paymentId}/retry-release
```

**Idempotency Example**:
```
Scenario: Paystack sends charge.success webhook twice
  → First time: Webhook stored, payment updated, 200 OK
  → Second time: Webhook controller checks payment_webhooks table
    → Finds ps-ref-001 already processed
    → Returns 200 OK immediately (prevents duplicate charge)
```

---

### Summary: Transaction State Machine

```
         ┌─────────────────────────────────────┐
         │ Step 1: Payment Initiated           │
         │ Status: pending_payment             │
         │ DB: payments.status = pending       │
         └─────────────────┬───────────────────┘
                           │
                      [Employer pays on Paystack]
                           │
         ┌─────────────────▼──────────────────────────┐
         │ Step 2: Payment Confirmed (Webhook)        │
         │ Status: pending_admin_approval (MVP)       │
         │ DB: payments.status = pending_admin_approval
         │     job_assignments.payment_status = pending_admin_approval
         │ [System notifies admin for review]         │
         └─────────────────┬──────────────────────────┘
                           │
                    [Admin reviews payment...]
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌─────▼────────────────┐  ┌──▼──────────────────┐
         │ Step 2.5: Admin      │  │ Admin Rejects       │
         │ Approves Payment     │  │ (Refund issued)     │
         │ (MVP Gate)           │  │ Status: rejected    │
         │ Approval: approved   │  └──────────────────────┘
         └─────┬────────────────┘
               │
         ┌─────▼──────────────────────┐
         │ Payment Held in Escrow      │
         │ Status: held_in_escrow      │
         │ Professional can NOW start  │
         └─────┬──────────────────────┘
               │
      [Professional works...]
               │
         ┌─────▼───────────────────────────────┐
         │ Step 3: Work Complete & Review Init │
         │ Status: held_in_escrow (unchanged)  │
         │ Approval: pending_review            │
         │ [System notifies employer to review]│
         └─────┬───────────────────────────────┘
               │
         [Employer reviews...]
               │
         ┌─────┴──────────┐
         │                │
    ┌────▼────────┐   ┌───▼──────────┐
    │ Approved    │   │ Disputed     │
    │ (Satisfied) │   │ (Not OK)     │
    └────┬────────┘   └───┬──────────┘
         │                │
  [Release job]   [Admin review]
         │                │
    ┌────▼────────┐   ┌───▼──────────────┐
    │ Step 4:     │   │ Dispute Status   │
    │ Payout      │   │ Under Review     │
    │ released    │   └──────────────────┘
    └─────────────┘
```

## Escrow Release Conditions

**How & When Are Funds Released?**

- **Admin Approval (MVP GATE)**: Before ANY work starts, admin must approve payment. Payment goes from `pending_admin_approval` → `held_in_escrow`. This is THE critical fraud prevention step at MVP stage.
- **Employer Approval (SECONDARY GATE)**: Funds are released ONLY when `job_assignments.satisfaction_status` transitions to `satisfied` AND employer explicitly confirms. This ensures professional is paid only after employer confirms quality.
- **Employer Dispute**: If employer marks work as unsatisfactory, funds remain held and admin must review for resolution.
- **Timed Auto-Release (Optional)**: After employer approval, funds automatically release if not disputed within a configurable hold period (e.g., 7 days). Prevents employer from indefinitely withholding payment.
- **Admin Override**: System admin can manually release or refund disputed payments after investigation.

**Release Workflow:**
1. Check that `payments.status` is `held_in_escrow` and release condition is met (e.g., assignment complete).
2. Calculate final commission and net payout.
3. Execute payout to professional (transfer to bank or Subaccount).
4. Update `payments` status to `released` and record `released_at` timestamp.
5. Optionally persist payout transaction ID for reconciliation.

## Webhook & Idempotency

- Verify Paystack signature header on receipt.
- Use `reference` field to ensure idempotent processing (store processed references in `payment_webhooks` audit table).
- Persist raw webhook payload to `payment_webhooks` for audit and replay in case of disputes or reconciliation issues.
- Respond quickly (200 OK) to Paystack once the payload is queued/verified.
- Use idempotency keys on transfer/payout requests to prevent duplicate releases.

## Security & Authorization

- **Webhook endpoint** must accept only requests from Paystack IPs (optional) and verify signatures.
- Use environment variables: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`.
- Store only necessary PCI-related data; do not store card numbers.
- **Release authorization**: Only employer, professional (if auto-release), or admin can release escrow. Enforce via role-based access control (RBAC).
- **Payment endpoints** require authentication and authorization checks:
  - Initiate: Employer of the assignment only.
  - Release: Employer or admin only.
  - View payment details: Assignment stakeholders (employer, professional) or admin.
- Maintain audit trail of all payment state changes (create, hold, release, refund) with user ID and timestamp.

## Disputes & Refunds

- **Refund Request**: If an assignment is canceled or disputed before release, employer can request a refund. Admin reviews and approves/denies.
- **Processing**: Upon approval, payment is refunded to employer's original payment method (via Paystack).
- **Audit**: All dispute records and resolutions are logged with timestamps and responsible admin user.

## Admin Approval Scenarios

Not all payments can be auto-released. Manual admin intervention is required in these critical scenarios:

### 1. **Disputed Assignments** (Most Common)
- **Trigger**: Employer claims work is incomplete or doesn't meet requirements
- **Example**: Designer delivered website but colors are wrong or features missing
- **Admin Action**: Review deliverables, contact parties, approve release or refund
- **DB Status**: `payment_disputes.status = "under_review"`

### 2. **Refund Requests from Professional**
- **Trigger**: Professional cancels mid-project or becomes unavailable
- **Example**: "I have a family emergency and can't complete this"
- **Admin Action**: Verify cancellation, decide refund or partial payment to professional
- **DB Status**: `payments.status = "refunded"` + dispute record

### 3. **Automated Release Failed (Technical)**
- **Trigger**: Background job crashed or Paystack API timeout
- **Example**: Transfer to professional's bank failed; payment stuck in `held_in_escrow`
- **Admin Action**: Review error logs, verify account, manually retry release
- **Endpoint**: `POST /api/admin/payments/{paymentId}/retry-release`

### 4. **Chargebacks or Fraud Suspected**
- **Trigger**: Employer initiates chargeback with credit card company
- **Example**: "I never authorized this payment" (friendly fraud)
- **Admin Action**: Review communication, verify legitimacy, approve/deny chargeback
- **DB Status**: `payments.status = "held_pending_investigation"`

### 5. **Professional Account Issues**
- **Trigger**: Professional's bank account is invalid, suspended, or KYC failed
- **Example**: Account closed, incomplete details, or verification failed
- **Admin Action**: Notify professional, hold funds until account validated
- **DB Status**: `payments.status = "release_pending"` (awaiting professional action)

### 6. **High-Value Transaction Threshold**
- **Trigger**: Assignment exceeds risk threshold (configurable, e.g., > ₦500,000)
- **Example**: Large branding project for ₦2,000,000
- **Admin Action**: Apply additional verification, review history, approve if safe
- **Config**: `ADMIN_APPROVAL_THRESHOLD = 500000` (env var)

### 7. **New Professional Onboarding**
- **Trigger**: Professional has < 5 completed jobs or < 30 days on platform
- **Example**: Fresh graduate taking first paid gig
- **Admin Action**: Review profile, verify work quality, approve or hold
- **Config**: `NEW_PROFESSIONAL_APPROVAL_REQUIRED = true` (first 3-5 payments)

### 8. **Partial Completion / Milestone Splits**
- **Trigger**: Multi-stage project where professional completed 50% but wants partial payment
- **Example**: Design: "I've done mockups (50%), can I get ₦45,000?"
- **Admin Action**: Review deliverables against milestone, approve partial release
- **DB Status**: `payments.status = "partially_released"` (custom field)

### 9. **Policy Violation Investigation**
- **Trigger**: Assignment violates platform rules (plagiarism, copyright, harmful content)
- **Example**: Commissioned to do plagiarism work or create misleading content
- **Admin Action**: Investigate, refund employer, penalize professional if confirmed
- **DB Status**: `payments.status = "held_pending_investigation"`

### 10. **Paystack Gateway Outage**
- **Trigger**: Paystack API is down and scheduled release can't execute
- **Example**: "We're experiencing technical difficulties, please try again later"
- **Admin Action**: Wait for recovery, then retry; or manually release with logging
- **Fallback**: Queue for manual processing with timestamp for later reconciliation

### 11. **Mutual Early Release Agreement**
- **Trigger**: Both employer & professional agree to release funds before completion
- **Example**: "The professional did excellent work early, we'd like to pay them now"
- **Admin Action**: Verify written consent from both parties, approve early release
- **Override**: `payments.force_released_by_admin = true` + audit trail

### 12. **Reconciliation Discrepancies**
- **Trigger**: Payment in DB doesn't match Paystack ledger
- **Example**: Platform shows ₦100,000 released, Paystack shows ₦90,000
- **Admin Action**: Investigate reconciliation job, issue correction transfer if needed
- **Log**: Detailed audit entry with discrepancy amount & reason

---

### Employer Approval Endpoints

Implement the following endpoints to allow employers to approve or dispute work:

```typescript
// Approve completed work (triggers escrow release)
PATCH /api/assignments/{assignmentId}/approve
  Authentication: Required (employer only)
  Body: { 
    confirmSatisfied: true,
    rating?: 1-5,
    comment?: "Great work, very professional"
  }
  Result: Updates assignment.satisfaction_status = "satisfied", queues escrow release job
  Response: { assignmentId, satisfactionStatus: "satisfied", payment: { status, releaseScheduledAt } }

// Dispute completed work (freezes escrow for admin review)
PATCH /api/assignments/{assignmentId}/dispute
  Authentication: Required (employer only)
  Body: { 
    reason: "Required field. Why is work not satisfactory?",
    evidenceLinks?: ["link1", "link2"],  // Screenshots, references, etc.
    resolveType?: "refund_request" | "revision_request"  // What does employer want?
  }
  Result: Updates assignment.satisfaction_status = "disputed", creates dispute record, alerts admin
  Response: { assignmentId, satisfactionStatus: "disputed", disputeId, status: "open" }

// Get assignment review status (for employer dashboard)
GET /api/assignments/{assignmentId}/review-status
  Authentication: Required
  Returns: {
    assignmentId,
    status: "completed" | "pending_review" | "satisfied" | "disputed",
    workDetails: { deliverables, submittedAt },
    payment: { amount, status, approvalStatus },
    reviewDeadline?: "2026-05-11T13:00:00Z"  // Optional: auto-release in 7 days if not disputed
  }
```

---

### Admin Dashboard Requirements

Implement the following endpoints to support manual approval workflows:

```typescript
// ===== MVP GATE 1: ADMIN PAYMENT APPROVAL (Must happen BEFORE professional can work) =====

// List payments pending admin approval
GET /api/admin/payments/pending-admin-approval
  Authentication: Admin only
  Returns: All payments in pending_admin_approval status (awaiting first gate approval)
  Response: [{ 
    id, assignmentId, amount, employer, professional, 
    createdAt, paymentMethod, 
    employer: { name, accountStatus, verificationLevel },
    professional: { name, avgRating }
  }]

// Approve payment for escrow hold (MVP Gate - Critical!)
POST /api/admin/payments/{paymentId}/approve-payment
  Authentication: Admin only
  Body: { notes?: "Optional approval notes" }
  Result: 
    - payments.status: pending_admin_approval → held_in_escrow
    - payments.admin_approval_status: pending → approved
    - job_assignments.payment_status: pending_admin_approval → funded
    - Notifications sent to professional & employer
  Response: { paymentId, status: "held_in_escrow", approvedAt, approvedBy }

// Reject payment and initiate refund (MVP Gate - Critical!)
POST /api/admin/payments/{paymentId}/reject-payment
  Authentication: Admin only
  Body: { 
    reason: "Required. Reason for rejection",
    examples: "Employer account verification failed", "Suspicious payment method", "Policy violation"
  }
  Result: 
    - payments.status: pending_admin_approval → payment_rejected
    - payments.admin_approval_status: pending → rejected
    - Refund queued to employer's original payment method
    - job_assignments.payment_status: pending_admin_approval → refunded
    - Notifications sent to employer with rejection reason
  Response: { paymentId, status: "payment_rejected", refundReference, rejectedAt }

// ===== SECONDARY GATES: Work & Employer Approval =====

// List pending employer approvals (work complete, awaiting satisfaction confirmation)
GET /api/admin/assignments/pending-employer-approval
  Returns: All assignments with satisfaction_status = pending_review
  Response: [{ id, employer, professional, workSubmittedAt }]

// List disputed payments
GET /api/admin/payments/disputed
  Returns: Payments with open disputes
  Response: [{ paymentId, disputeId, reason, status, createdAt }]

// Approve & release payment
POST /api/admin/payments/{paymentId}/approve
  Body: { 
    reason: "Work verified complete",
    releaseImmediately: true,
    notes: "Optional detailed notes"
  }
  Result: Triggers escrow release to professional
  Response: { paymentId, status: "released", releasedAt }

// Reject & refund payment
POST /api/admin/payments/{paymentId}/reject
  Body: { 
    reason: "Refund reason",
    refundReason: "incomplete_work" | "fraud_suspected" | "other",
    notes: "Detailed explanation"
  }
  Result: Process refund to employer's original payment method
  Response: { paymentId, status: "refunded", refundedAt }

// Mark as under investigation
POST /api/admin/payments/{paymentId}/investigate
  Body: { notes: "Checking for policy violation..." }
  Result: Set payment to `under_investigation` status
  Response: { paymentId, status: "under_investigation" }

// Retry failed release
POST /api/admin/payments/{paymentId}/retry-release
  Body: { notes: "Manual retry after account verification" }
  Result: Re-attempt payout to professional
  Response: { paymentId, retryResult: "success" | "failed", error? }

// View audit trail
GET /api/admin/payments/{paymentId}/audit-log
  Returns: Full history of state changes & admin actions
  Response: [{ action, changedBy, changedAt, details, reason }]

// Get payment details
GET /api/admin/payments/{paymentId}
  Returns: Complete payment with assignment, employer, professional, dispute info
  Response: { payment, assignment, employer, professional, dispute?, auditLog }

// List all pending/failed payments
GET /api/admin/payments?status=release_pending&sort=-createdAt
  Returns: Filtered payment list for admin dashboard
  Response: [{ id, amount, status, reason, createdAt }]
```

---

### Risk Matrix: When Admin Approval is Required

| Scenario | Trigger | Priority | Auto-Release? | Approval Time |
|----------|---------|----------|:-------------:|:-------------:|
| Dispute filed | Employer clicks "Dispute" | 🔴 HIGH | ❌ | < 24 hrs |
| Refund requested | Professional cancels | 🔴 HIGH | ❌ | < 24 hrs |
| Tech failure | Release job fails 3x | 🟡 MEDIUM | ❌ Manual retry | ASAP |
| Chargeback filed | Card company notifies | 🔴 CRITICAL | ❌ Frozen pending | < 5 days |
| High-value threshold | Amount > ₦500k | 🟡 MEDIUM | ❌ | < 48 hrs |
| New professional | First 3 payments | 🟢 LOW | ⚠️ Optional | < 24 hrs |
| Paystack down | API returns error | 🟡 MEDIUM | ❌ Wait/manual | When fixed |
| Mutual early release | Both parties agree | 🟢 LOW | ✅ Auto (after verification) | N/A |
| Account issue | KYC/Bank verification failed | 🟡 MEDIUM | ❌ Hold pending | Pending fix |
| Policy violation | Content/copyright flagged | 🔴 HIGH | ❌ | < 48 hrs |

---

### Approval Workflow Example

**Scenario: Employer disputes payment (says work incomplete)**

```
Step 1: Employer calls PATCH /api/assignments/{assignmentId}/dispute
        with reason: "Missing responsive design"
        
Step 2: Database
        - payments.status remains "held_in_escrow"
        - payment_disputes record created: { paymentId, reason, status: "open" }
        - Admin notification queued

Step 3: Admin Dashboard
        - Payment appears in "Pending Approvals" section
        - Admin clicks "Review" → sees:
          * Employer: "Missing responsive design"
          * Professional's deliverables (links)
          * Assignment requirements
          * Previous messages between parties

Step 4: Admin makes decision
        Option A: Approve release
          POST /api/admin/payments/{paymentId}/approve
          Body: { reason: "Requirements were met", releaseImmediately: true }
          Result: payments.status → "released"
          
        Option B: Refund employer
          POST /api/admin/payments/{paymentId}/reject
          Body: { refundReason: "incomplete_work", notes: "Missing responsive design confirmed" }
          Result: payments.status → "refunded"

Step 5: Both parties notified
        Employer/Professional receive notification & email of resolution
        Audit log records: { action: "APPROVED_BY_ADMIN", admin_id, timestamp, reason }
```

## Scaling & Reliability

- Use a persistent job queue (Redis/Bull/BullMQ) for:
  - Webhook verification and idempotency checks.
  - Escrow release triggers (when assignment completes).
  - Payout processing (transfer to professional's bank).
  - Failed release retries with exponential backoff.
- Monitor failed release attempts and provide admin dashboard to manually trigger or resolve.
- Implement reconciliation job: periodic check that `payments` table matches Paystack ledger and all released amounts have been disbursed.

## Database Schema (Escrow Model)

### New Tables

**`payments`**
- `id` (UUID, PK)
- `assignment_id` (UUID, FK to `job_assignments`)
- `amount` (DECIMAL) — Total amount including commission
- `commission_amount` (DECIMAL) — Platform fee
- `net_amount` (DECIMAL) — Amount due to professional (amount - commission)
- `currency` (VARCHAR, default: `NGN`)
- `status` (ENUM: `pending_payment`, `pending_admin_approval`, `held_in_escrow`, `held_pending_review`, `released`, `refunded`, `payment_rejected`, `failed`) — **UPDATED**: Added `pending_admin_approval` and `payment_rejected` states
- `admin_approval_status` (ENUM: `pending`, `approved`, `rejected`, nullable) — **NEW (MVP)**: Tracks admin review of payment before escrow hold
- `admin_approved_at` (TIMESTAMP, nullable) — **NEW**: When admin approved the payment
- `admin_approved_by` (UUID, nullable) — **NEW**: FK to admin user who approved
- `admin_rejected_at` (TIMESTAMP, nullable) — **NEW**: When admin rejected the payment
- `admin_rejected_by` (UUID, nullable) — **NEW**: FK to admin user who rejected
- `admin_rejection_reason` (VARCHAR, nullable) — **NEW**: Reason for rejection (e.g., "Suspicious employer account", "Unverified payment method")
- `employer_approval_status` (ENUM: `pending_review`, `approved`, `disputed`, nullable) — tracks employer satisfaction confirmation
- `employer_approved_at` (TIMESTAMP, nullable) — When employer approved
- `paystack_reference` (VARCHAR, unique) — Paystack transaction reference
- `payout_reference` (VARCHAR, nullable) — Processor payout transaction ID
- `created_at` (TIMESTAMP)
- `captured_at` (TIMESTAMP, nullable) — When payment was confirmed (webhook received)
- `pending_admin_review_at` (TIMESTAMP, nullable) — **NEW**: When payment entered `pending_admin_approval` state
- `pending_review_at` (TIMESTAMP, nullable) — When work was marked complete, awaiting employer review
- `released_at` (TIMESTAMP, nullable) — When escrow was released to professional
- `refunded_at` (TIMESTAMP, nullable) — If refunded
- `metadata` (JSON, nullable) — Additional payment notes or custom fields

**`payment_webhooks`** (Audit/Idempotency)
- `id` (UUID, PK)
- `paystack_reference` (VARCHAR) — Paystack reference from webhook
- `event_type` (VARCHAR) — e.g., `charge.success`, `transfer.success`
- `payload` (JSONB) — Raw webhook payload
- `processed` (BOOLEAN, default: false)
- `processed_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)

**`payment_disputes`** (Optional, for dispute tracking)
- `id` (UUID, PK)
- `payment_id` (UUID, FK to `payments`)
- `reason` (VARCHAR) — Dispute reason
- `status` (ENUM: `open`, `under_review`, `resolved`)
- `resolution` (VARCHAR, nullable) — Resolution details
- `resolved_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)

### Modified Tables

**`job_assignments`** (MVP Payment State)
- Add column: `payment_status` (ENUM: `pending`, `pending_admin_approval`, `funded`, `released`, `refunded`) — **UPDATED**: Added `pending_admin_approval` state for when payment awaits admin approval
- Add column: `satisfaction_status` (ENUM: `pending_review`, `satisfied`, `disputed`) — **KEY**: tracks employer's satisfaction with work
- Add column: `employer_approved_at` (TIMESTAMP, nullable) — When employer approved work
- Add column: `employer_disputed_at` (TIMESTAMP, nullable) — When employer disputed work
- Existing: `status` (already tracks assignment workflow: `pending`, `accepted`, `in_progress`, `completed`, `canceled`)

**`professional_profiles`**
- Ensure: `avg_rating` exists for review aggregation (updated by trigger on `reviews` insert)

**`reviews`** (If not already created in earlier phases)
- `id` (UUID, PK)
- `assignment_id` (UUID, FK to `job_assignments`)
- `reviewer_id` (UUID, FK to `users` — the employer)
- `professional_id` (UUID, FK to `professional_profiles`)
- `rating` (INT, 1–5)
- `comment` (TEXT, nullable)
- `created_at` (TIMESTAMP)

### Database Triggers (Recommended)

1. **Trigger on `reviews` INSERT**: Recalculate `professional_profiles.avg_rating`.

2. **Trigger on `payments` UPDATE** (admin_approval_status → `approved`) — **NEW (MVP)**:
   - Update `payments.status` from `pending_admin_approval` → `held_in_escrow`.
  - Update `job_assignments.payment_status` from `pending_admin_approval` → `funded`.
   - Send notification to professional that payment is approved and work can begin.
   - Queue background job to notify employer if auto-start is enabled.

3. **Trigger on `payments` UPDATE** (admin_approval_status → `rejected`) — **NEW (MVP)**:
   - Update `payments.status` from `pending_admin_approval` → `payment_rejected`.
   - Queue background job `process_refund_payment` to return funds to employer.
   - Update `job_assignments.payment_status` to `refunded`.
   - Send notification to employer with rejection reason.

4. **Trigger on `job_assignments` UPDATE** (satisfaction_status → `satisfied`):
   - If `payments.status` is `held_in_escrow` and `payments.admin_approval_status` is `approved` and `payments.employer_approval_status` is `approved`, queue background job `release_escrow_payment`.
   - This ensures escrow is released ONLY after BOTH admin AND employer approve.

5. **Trigger on `job_assignments` UPDATE** (status → `completed`):
   - Update `payments.employer_approval_status` to `pending_review` (if not already set).
   - Send notification to employer to review work.

## Module Placement

Place modules under `src/modules/payments/` and `src/modules/reviews/` following the existing pattern used in Phase 2.
