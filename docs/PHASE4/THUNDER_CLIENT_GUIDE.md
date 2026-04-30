# Thunder Client - Phase 4 Testing Guide

This guide explains how to test Phase 4 (Payments & Reviews) flows using Thunder Client.

## Quick Setup

1. Install Thunder Client extension in VS Code.
2. Import the Phase 4 collection (create one from examples below).
3. Configure environment variables for sandbox keys and baseUrl.

Environment vars to add to Thunder Client collection env:

```json
{
  "baseUrl": "http://localhost:5020",
  "token": "<jwt-token>",
  "paystack_public_key": "pk_test_xxx",
  "paystack_secret_key": "sk_test_xxx",
  "paystack_webhook_secret": "whsec_xxx",
  "assignmentId": "<assignment id>",
  "paymentReference": ""
}
```

## Recommended Request Order (Smoke tests)

1. Health check: `GET {{baseUrl}}/health`
2. Create assignment (or use existing): ensure `job_assignments.id` available
3. POST `/api/payments/initiate` with `assignmentId` and `amount`
   - Save returned `provider_reference` to env `paymentReference`
4. Simulate Paystack webhook: POST `/api/payments/webhook` with sandbox payload
   - Add header `x-paystack-signature` computed using `paystack_webhook_secret`
5. GET `/api/payments/{{paymentReference}}/verify` to confirm status
6. Mark assignment as `completed` (if using test helper endpoint) and POST `/api/reviews`
7. GET `/api/reviews/:professionalId` to confirm review and aggregated rating

## Simulating Paystack Webhook (Thunder Client)

- Example minimal webhook body:

```json
{
  "event": "charge.success",
  "data": {
    "reference": "{{paymentReference}}",
    "amount": 150000,
    "status": "success",
    "metadata": { "assignmentId": {{assignmentId}} }
  }
}
```

- Compute `x-paystack-signature` by HMAC-SHA512 of the JSON body using `paystack_webhook_secret`.
- In Thunder Client, add header: `x-paystack-signature: <computed-signature>`

## Useful Notes

- Use `payment_webhooks` DB table to inspect raw payloads and debug signature mismatches.
- For idempotency testing, send the same webhook twice and observe that the second request does not double-credit.
- For failing webhook scenarios, send malformed payload or wrong signature to ensure 400/401 behavior.

## Example cURL (simulate webhook)

```bash
PAYLOAD='{"event":"charge.success","data":{"reference":"ref_xxx","amount":150000}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "$PAYSTACK_WEBHOOK_SECRET")
curl -X POST "{{baseUrl}}/api/payments/webhook" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Troubleshooting

- If webhook returns 401: verify `x-paystack-signature` computation and that `PAYSTACK_WEBHOOK_SECRET` in env matches server.
- If payment remains `pending`: verify provider verification flow and check `payments.provider_reference` exists.
