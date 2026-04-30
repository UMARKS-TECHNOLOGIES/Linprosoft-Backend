import { z } from "zod";

export const initiatePaymentSchema = z.object({
  assignmentId: z.number().int().positive(),
  amount: z.number().int().positive(),
  currency: z.string().optional(),
});

export const webhookSchema = z.object({}); // provider specific payloads vary; validate in controller if needed

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
