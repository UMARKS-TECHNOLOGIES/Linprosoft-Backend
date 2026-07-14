/**
 * Smoke test: Verify the refresh token storage fix 
 * Directly tests that storeRefreshToken includes expires_at in the INSERT
 */
import pool from '../../src/config/db';

describe('Refresh Token Storage Fix', () => {
  it('should store refresh token with expires_at value (no null constraint violation)', async () => {
    // This test directly verifies that the storeRefreshToken function
    // now includes the expires_at column in the INSERT query.
    // Before the fix, it would fail with:
    // "null value in column \"expires_at\" of relation \"refresh_tokens\" violates not-null constraint"

    // Step 1: Create a test user directly
    const userEmail = `refresh-token-test-${Date.now()}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, auth_provider, role, is_email_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userEmail, 'hashed_pwd', 'Test User', 'email', 'client', true, true]
    );

    const userId = userResult.rows[0].id;

    // Step 2: Call storeRefreshToken (this is what happens during login)
    // Import and call it directly
    const { storeRefreshToken } = await import('../../src/modules/auth/authRepository');
    
    // This should NOT throw an error about expires_at being null
    await storeRefreshToken(userId, 'test-refresh-token-value', {
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1'
    });

    // Step 3: Verify the token was stored with a valid expires_at
    const tokenResult = await pool.query(
      'SELECT expires_at, user_id FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    expect(tokenResult.rows.length).toBe(1);
    expect(tokenResult.rows[0].expires_at).toBeInstanceOf(Date);
    expect(tokenResult.rows[0].expires_at.getTime()).toBeGreaterThan(Date.now());
    expect(tokenResult.rows[0].user_id).toBe(userId);
  });
});
