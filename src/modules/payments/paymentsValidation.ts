import { z } from "zod";

export const initiatePaymentSchema = z.object({
  assignmentId: z.number().int().positive(),
  amount: z.number().int().positive().optional(),
  currency: z.string().optional(),
});

export const webhookSchema = z.object({}); // provider specific payloads vary; validate in controller if needed

export const paymentIdParamSchema = z.object({
  paymentId: z.coerce.number().int().positive(),
});

export const listPendingAdminPaymentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const approvePaymentSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required").max(500),
  notes: z.string().trim().max(1000).optional(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(['employer', 'professional']),
  notes: z.string().trim().max(1000).optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
