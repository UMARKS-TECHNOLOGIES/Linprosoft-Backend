import request from 'supertest';
import jwt from 'jsonwebtoken';

// Ensure env required by config is present for test runtime
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/testdb';
process.env.PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test';
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test';
process.env.PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || 'whsec_test';

// Mock PaymentsService before importing app so controller uses mock
jest.mock('../../modules/payments/paymentsService', () => {
  return jest.fn().mockImplementation(() => ({
    listPendingAdminApprovals: jest.fn().mockResolvedValue({ items: [{ id: 1, amount: 100000, status: 'pending_admin_approval' }], total: 1 }),
    approvePaymentByAdmin: jest.fn().mockResolvedValue({ paymentId: 1, status: 'held_in_escrow' }),
    rejectPaymentByAdmin: jest.fn().mockResolvedValue({ paymentId: 1, status: 'payment_rejected', refundReference: 'refund_abc' }),
  }));
});

import app from '../../app';
import PaymentsService from '../../modules/payments/paymentsService';

const createToken = (payload: object) => jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });

describe('Admin Payments endpoints', () => {
  it('forbids non-admin from approving payments', async () => {
    const token = createToken({ id: 10, email: 'user@example.com', userType: 'employer' });

    await request(app)
      .post('/api/admin/payments/1/approve-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'ok' })
      .expect(403);
  });

  it('allows admin to list pending admin approvals', async () => {
    const token = createToken({ id: 1, email: 'admin@example.com', userType: 'admin' });

    const res = await request(app)
      .get('/api/admin/payments/pending-admin-approval')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payments.length).toBeGreaterThan(0);

    const ServiceMock = PaymentsService as unknown as jest.Mock;
    expect(ServiceMock).toHaveBeenCalled();
    const instance = ServiceMock.mock.results[0].value;
    expect(instance.listPendingAdminApprovals).toHaveBeenCalled();
  });

  it('allows admin to approve a payment', async () => {
    const token = createToken({ id: 1, email: 'admin@example.com', userType: 'admin' });

    const res = await request(app)
      .post('/api/admin/payments/1/approve-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Verified and approved' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('held_in_escrow');

    const ServiceMock = PaymentsService as unknown as jest.Mock;
    const instance = ServiceMock.mock.results[0].value;
    expect(instance.approvePaymentByAdmin).toHaveBeenCalledWith(1, 1, 'Verified and approved');
  });

  it('allows admin to reject a payment', async () => {
    const token = createToken({ id: 1, email: 'admin@example.com', userType: 'admin' });

    const res = await request(app)
      .post('/api/admin/payments/1/reject-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Suspicious', notes: 'Fraud checks failed' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('payment_rejected');

    const ServiceMock = PaymentsService as unknown as jest.Mock;
    const instance = ServiceMock.mock.results[0].value;
    expect(instance.rejectPaymentByAdmin).toHaveBeenCalledWith(1, 1, 'Suspicious', 'Fraud checks failed');
  });
});
