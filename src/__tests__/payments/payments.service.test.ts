import PaymentsService from '../../modules/payments/paymentsService';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    // Use real instance but stub repository methods
    service = new PaymentsService();
    service.repo = {
      createPendingPayment: jest.fn().mockResolvedValue({ id: 1, provider_reference: 'payref_1' }),
      findByReference: jest.fn().mockResolvedValue(null),
      persistWebhook: jest.fn().mockResolvedValue({}),
      updateStatus: jest.fn().mockResolvedValue({}),
      markAssignmentPaid: jest.fn().mockResolvedValue({}),
    } as any;
  });

  it('throws when assignmentId or amount is missing', async () => {
    await expect(service.initiatePayment({ assignmentId: 0 as any, amount: 0 as any })).rejects.toThrow();
  });

  it('creates a pending payment and returns checkoutUrl', async () => {
    const res = await service.initiatePayment({ assignmentId: 123, amount: 100000, currency: 'NGN', payerId: 5 });
    expect(res.payment).toBeDefined();
    expect(res.checkoutUrl).toContain('payref_');
  });

  it('handles webhook charge.success by updating payment and assignment', async () => {
    const payload = { event: 'charge.success', data: { reference: 'payref_1' } };
    // make findByReference return a payment not yet paid
    (service.repo.findByReference as jest.Mock).mockResolvedValueOnce({ provider_status: 'pending', assignment_id: 10, provider_reference: 'payref_1' });

    await service.handleWebhook(payload);

    expect(service.repo.persistWebhook).toHaveBeenCalled();
    expect(service.repo.updateStatus).toHaveBeenCalledWith('payref_1', 'paid', expect.any(Date));
    expect(service.repo.markAssignmentPaid).toHaveBeenCalledWith(10);
  });
});
