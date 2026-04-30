import PaymentsRepository from '../../modules/payments/paymentsRepository';
import { Pool } from 'pg';

describe('PaymentsRepository', () => {
  let repo: PaymentsRepository;
  let mockDb: Partial<Pool>;

  beforeEach(() => {
    mockDb = { query: jest.fn() } as any;
    repo = new PaymentsRepository(mockDb as Pool);
  });

  it('creates pending payment with parameterized query', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

    const payment = await repo.createPendingPayment({
      assignment_id: 1,
      payer_id: 2,
      payee_id: 3,
      amount_bigint: 100000,
      currency: 'NGN',
      provider: 'paystack',
      provider_reference: 'ref1',
      provider_status: 'pending',
    });

    expect(payment).toEqual({ id: 1 });
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
  });

  it('finds by reference and returns null when not found', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const res = await repo.findByReference('nope');
    expect(res).toBeNull();
  });
});
