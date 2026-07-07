import { env } from "../../config/environment";
import { AppError } from "../../utils/appError";
import crypto from "crypto";
import axios from "axios";

/**
 * Paystack Integration Service
 * Handles all Paystack API calls and webhook verification
 * Phase 4 MVP: Implements payment initialization and signature verification
 */

class PaystackService {
  private baseUrl = "https://api.paystack.co";
  private secretKey = env.PAYSTACK_SECRET_KEY;
  private webhookSecret = env.PAYSTACK_WEBHOOK_SECRET;

  /**
   * Initialize a transaction with Paystack
   * Returns authorization URL for customer to complete payment
   */
  async initializeTransaction(payload: {
    email: string;
    amount: number; // in kobo (smallest unit)
    reference: string;
    metadata?: any;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: payload.email,
          amount: payload.amount,
          reference: payload.reference,
          metadata: payload.metadata || {},
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new AppError("Failed to initialize Paystack transaction", 400);
      }

      return {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
        access_code: response.data.data.access_code,
      };
    } catch (error: any) {
      console.error("Paystack initializeTransaction error:", error.response?.data || error.message);
      throw new AppError(
        `Payment initialization failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Verify a transaction with Paystack
   * Returns transaction details from Paystack
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (!response.data.status) {
        throw new AppError("Transaction verification failed", 400);
      }

      const data = response.data.data;
      return {
        status: data.status, // success, failed, abandoned
        reference: data.reference,
        amount: data.amount, // in kobo
        currency: data.currency,
        customer_email: data.customer?.email,
        paid_at: data.paid_at,
        created_at: data.created_at,
        channel: data.channel,
        authorization: data.authorization,
      };
    } catch (error: any) {
      console.error("Paystack verifyTransaction error:", error.response?.data || error.message);
      throw new AppError(
        `Transaction verification failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
  }

  /**
   * Verify webhook signature
   * Ensures webhook is genuinely from Paystack
   *
   * Formula: hash = hmac_sha512(payload, secret)
   * where payload is the raw request body as string
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    /**
     * ✅ Signature Verification Process
     * 1. Take raw request body
     * 2. Create HMAC SHA-512 hash using webhook secret
     * 3. Compare with x-paystack-signature header
     * 4. Match = genuine Paystack webhook
     */
    const hash = crypto.createHmac("sha512", this.webhookSecret).update(payload).digest("hex");
    return hash === signature;
  }

  /**
   * Refund a transaction
   * Called when admin rejects payment
   */
  async refundTransaction(reference: string, reason?: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: reference,
          reason: reason || "Admin payment rejection",
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new AppError("Refund failed", 400);
      }

      return {
        reference: response.data.data.reference,
        status: response.data.data.status,
      };
    } catch (error: any) {
      console.error("Paystack refundTransaction error:", error.response?.data || error.message);
      throw new AppError(
        `Refund failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
  }
}

export default new PaystackService();
