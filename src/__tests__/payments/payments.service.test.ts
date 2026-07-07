import PaymentsService from '../../modules/payments/paymentsService';

// Mock external dependencies
jest.mock('../../modules/assignments/assignmentRepository');
jest.mock('../../modules/payments/paystackService');
jest.mock('../../config/db');

import * as assignmentRepo from '../../modules/assignments/assignmentRepository';
import PaystackService from '../../modules/payments/paystackService';

describe('PaymentsService - Phase 4 MVP', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = new PaymentsService();
    service.repo = {
      createPendingPayment: jest.fn().mockResolvedValue({ 
        id: 1, 
        provider_reference: 'payref_1',
        status: 'pending_payment',
        amount_bigint: 100000
      }),
      findByReference: jest.fn().mockResolvedValue(null),
      persistWebhook: jest.fn().mockResolvedValue({}),
      updatePaymentStatus: jest.fn().mockResolvedValue({}),
      updateAssignmentPaymentStatus: jest.fn().mockResolvedValue({}),
    } as any;

    // Mock assignment repository
    (assignmentRepo.findAssignmentById as jest.Mock).mockResolvedValue({
      id: 123,
      job_id: 456,
      professional_id: 789,
      employer_id: 111,
      status: 'accepted',
      accepted_budget: 1000, // 1000 NGN
    });

    // Mock Paystack service
    (PaystackService.initializeTransaction as jest.Mock).mockResolvedValue({
      authorization_url: 'https://checkout.paystack.com/test',
      reference: 'payref_1',
      access_code: 'access_code_1',
    });

    (PaystackService.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (PaystackService.verifyTransaction as jest.Mock).mockResolvedValue({
      status: 'success',
      reference: 'payref_1',
      amount: 101000, // 1000 NGN budget + 1% commission
      currency: 'NGN',
      paid_at: new Date(),
    });
  });

  describe('initiatePayment', () => {
    it('throws when assignmentId or employerId is missing', async () => {
      await expect(
        service.initiatePayment({ assignmentId: 0 as any, employerId: 0 as any })
      ).rejects.toThrow();
    });

    it('validates employer owns the assignment', async () => {
      (assignmentRepo.findAssignmentById as jest.Mock).mockResolvedValueOnce({
        ...{ id: 123, professional_id: 789, employer_id: 999, status: 'accepted', accepted_budget: 1000 }
      });

      await expect(
        service.initiatePayment({ assignmentId: 123, employerId: 111 })
      ).rejects.toThrow('Only the employer can initiate payment');
    });

    it('creates pending payment with correct payer/payee and calls Paystack', async () => {
      const result = await service.initiatePayment({ 
        assignmentId: 123, 
        employerId: 111,
        currency: 'NGN'
      });

      expect(result.payment).toBeDefined();
      expect(result.authorization_url).toContain('checkout.paystack.com');
      expect(service.repo.createPendingPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          job_assignment_id: 123,
          payer_id: 111, // Employer pays
          payee_id: 789, // Professional receives
        })
      );
    });
  });

  describe('handleWebhook', () => {
    it('verifies webhook signature before processing', async () => {
      (PaystackService.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const payload = { event: 'charge.success', data: { reference: 'payref_1', amount: 101000 } };
      await expect(
        service.handleWebhook(payload as any, 'invalid_signature', 'raw_body')
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('moves payment to pending_admin_approval on charge.success', async () => {
      (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({ 
        status: 'pending_payment',
        job_assignment_id: 123,
        provider_reference: 'payref_1',
        amount_bigint: 101000,
      });

      const payload = { 
        event: 'charge.success', 
        data: { reference: 'payref_1', amount: 101000 } 
      };

      const result = await service.handleWebhook(payload as any, 'valid_sig', 'raw_body');

      expect(result.action).toBe('moved_to_pending_approval');
      expect(service.repo.updatePaymentStatus).toHaveBeenCalledWith(
        'payref_1',
        'pending_admin_approval',
        'pending',
        expect.any(Date)
      );
    });

    it('prevents duplicate webhook processing', async () => {
      (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({ 
        status: 'pending_admin_approval', // Already processed
        job_assignment_id: 123,
        provider_reference: 'payref_1',
      });

      const payload = { 
        event: 'charge.success', 
        data: { reference: 'payref_1' } 
      };

      const result = await service.handleWebhook(payload as any, 'valid_sig', 'raw_body');

      expect(result.action).toBe('duplicate_prevented');
      expect(service.repo.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('rejects payment on amount mismatch', async () => {
      (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({ 
        status: 'pending_payment',
        job_assignment_id: 123,
        provider_reference: 'payref_1',
        amount_bigint: 100000, // Expected amount
      });

      (PaystackService.verifyTransaction as jest.Mock).mockResolvedValueOnce({
        status: 'success',
        reference: 'payref_1',
        amount: 99999, // Different amount!
      });

      const payload = { 
        event: 'charge.success', 
        data: { reference: 'payref_1' } 
      };

      await expect(
        service.handleWebhook(payload as any, 'valid_sig', 'raw_body')
      ).rejects.toThrow('Payment amount mismatch');
    });
  });

  describe('verifyPayment', () => {
    it('allows payer to verify payment', async () => {
      (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({
        reference: 'payref_1',
        payer_id: 111,
        payee_id: 789,
      });

      const result = await service.verifyPayment('payref_1', 111);
      expect(result).toBeDefined();
    });

    it('blocks non-owner from verifying payment', async () => {
      (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({
        reference: 'payref_1',
        payer_id: 111,
        payee_id: 789,
      });

      await expect(
        service.verifyPayment('payref_1', 999) // Wrong user
      ).rejects.toThrow('You do not have access to this payment');
    });
  });
});
