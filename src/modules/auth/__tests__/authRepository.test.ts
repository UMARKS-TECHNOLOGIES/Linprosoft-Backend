import { storeRefreshToken } from '../authRepository';
import pool from '../../../config/db';

jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

describe('authRepository.storeRefreshToken', () => {
  const mockedPool = pool as unknown as { query: jest.Mock };

  beforeEach(() => {
    mockedPool.query.mockReset();
    mockedPool.query.mockResolvedValue({ rows: [] });
  });

  it('stores refresh tokens with an expiration timestamp', async () => {
    await storeRefreshToken('123', 'refresh-token');

    expect(mockedPool.query).toHaveBeenCalledTimes(1);
    const [query, values] = mockedPool.query.mock.calls[0];

    expect(query).toContain('expires_at');
    expect(values).toHaveLength(5);
    expect(values[4]).toBeInstanceOf(Date);
  });
});
