import request from 'supertest';

// Mock PaymentsService before importing app so controller uses mock
jest.mock('../../src/modules/payments/paymentsService', () => {
  return jest.fn().mockImplementation(() => ({
    initiatePayment: jest.fn().mockResolvedValue({ payment: { id: 1, provider_reference: 'ref1' }, checkoutUrl: 'https://checkout/ref1' }),
    handleWebhook: jest.fn().mockResolvedValue(undefined),
    verifyPayment: jest.fn().mockResolvedValue({ id: 1, provider_reference: 'ref1', provider_status: 'paid' }),
    getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  }));
});

import app from '../../app';
import PaymentsService from '../../modules/payments/paymentsService';

describe('Payments integration (mocked provider)', () => {
  it('initiates payment and returns checkout url', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .send({ assignmentId: 10, amount: 150000, currency: 'NGN' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.checkoutUrl).toContain('checkout');
  });

  it('accepts webhook and calls service handler', async () => {
    const payload = { event: 'charge.success', data: { reference: 'ref1' } };

    await request(app)
      .post('/api/payments/webhook')
      .send(payload)
      .expect(200);

    // Verify underlying service.handleWebhook was called
    const ServiceMock = PaymentsService as unknown as jest.Mock;
    expect(ServiceMock).toHaveBeenCalled();
    const instance = ServiceMock.mock.results[0].value;
    expect(instance.handleWebhook).toHaveBeenCalledWith(payload);
  });
});
