/**
 * OPT Service Test Suite
 * Tests the OTP generation, sending, and verification workflow
 *
 * To run: npm test (assuming Jest is configured)
 *
 * NOTE: This test mocks the email sending to avoid actual network calls.
 * For real email testing with Ethereal, see the commented alternative approach below.
 */

// Mock Resend to capture sent emails instead of actually sending
jest.mock('resend');
// Mock logger to avoid actual logging during tests
jest.mock("../../../utils/logger");

import * as otpService from '../otpService';
import * as otpRepository from '../otpRepository';
import { OtpPurpose } from '../otpTypes';
import bcrypt from 'bcryptjs';

// Mock user repository functions that the OTP service might depend on
// (In a real test, you might mock these or use a test database)
const mockFindOtpByUserIdAndPurpose = jest.fn();
const mockCreateOtp = jest.fn();
const mockFindLatestUnconsumedOtp = jest.fn();
const mockFindOtpById = jest.fn();
const mockConsumeOtp = jest.fn();
const mockIncrementOtpAttempts = jest.fn();

// Reference to the mock send function for tests to access
let mockSend: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  // Set up Resend mock
  mockSend = jest.fn();
  // Mock the Resend class constructor to return an object with emails.send
  // We need to access the mock module; since we mocked 'resend', we can require it
  // and mock its Resend export.
  const resendModule = require('resend');
  resendModule.Resend.mockImplementation(() => ({
    emails: {
      send: mockSend
    }
  }));

  // Mock the repository functions
  // In a real implementation, you would inject these dependencies
  // For this test, we're using jest.spyOn to mock module functions
  jest.spyOn(otpRepository, 'findOtpByUserIdAndPurpose').mockImplementation((...args: any[]) => mockFindOtpByUserIdAndPurpose(...args));
  jest.spyOn(otpRepository, 'createOtp').mockImplementation((...args: any[]) => mockCreateOtp(...args));
  jest.spyOn(otpRepository, 'findLatestUnconsumedOtp').mockImplementation((...args: any[]) => mockFindLatestUnconsumedOtp(...args));
  jest.spyOn(otpRepository, 'findOtpById').mockImplementation((...args: any[]) => mockFindOtpById(...args));
  jest.spyOn(otpRepository, 'consumeOtp').mockImplementation((...args: any[]) => mockConsumeOtp(...args));
  jest.spyOn(otpRepository, 'incrementOtpAttempts').mockImplementation((...args: any[]) => mockIncrementOtpAttempts(...args));
});

describe('OTP Service - Email Flow', () => {
  const TEST_EMAIL = 'soalagideon@gmail.com';
  const TEST_USER_ID = 'test-user-id-123';
  const TEST_PURPOSE: OtpPurpose = 'email_verification';

  /**
   * Test Case 1: Successful OTP verification
   * Steps:
   *   1. Trigger OTP generation and sending
   *   2. Capture the OTP code from the mocked email
   *   3. Verify the OTP code is valid
   *   4. Assert verification succeeds
   */
  test('should successfully verify a valid OTP sent via email', async () => {
    // Arrange: Setup mocks for the OTP flow
    // Simulate no existing OTP (for fresh generation)
    mockFindOtpByUserIdAndPurpose.mockResolvedValue(null);

    // Mock OTP creation to return a predictable ID
    const mockOtpId = 'test-otp-id-456';
    mockCreateOtp.mockResolvedValue({ id: mockOtpId } as any);

    // Act: Generate and send OTP (this will use our mocked Resend)
    const result = await otpService.generateAndSendOtP(
      TEST_USER_ID,
      TEST_EMAIL,
      TEST_PURPOSE,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Assert: OTP service returned expected result
    expect(result).toHaveProperty('otpId', mockOtpId);
    expect(result.isResend).toBe(false);

    // Extract the OTP code from the mocked Resend call
    // Get the mock send function that was created in beforeEach
    expect(mockSend).toHaveBeenCalledTimes(1);
    const mailOptions = mockSend.mock.calls[0][0];
    const otpCode = extractOtpFromEmail(mailOptions.text);

    // Assert: We successfully extracted an OTP code
    expect(otpCode).toMatch(/^\d{6}$/); // Should be 6 digits

    // Arrange for verification: Mock repository to return our OTP
    mockFindLatestUnconsumedOtp.mockResolvedValue({ id: mockOtpId } as any);
    mockFindOtpById.mockResolvedValue({
      id: mockOtpId,
      user_id: TEST_USER_ID,
      purpose: TEST_PURPOSE,
      // Use bcrypt to hash the OTP code extracted from the mocked email so verification matches
      code_hash: bcrypt.hashSync(otpCode, 10),
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      consumed_at: null,
      created_at: new Date()
    } as any);

    // Act: Verify the OTP
    const isValid = await otpService.verifyOtP(
      TEST_USER_ID,
      TEST_PURPOSE,
      otpCode,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Assert: Verification should succeed
    expect(isValid).toBe(true);

    // Assert: OTP was marked as consumed
    expect(mockConsumeOtp).toHaveBeenCalledWith(mockOtpId);
  });

  /**
   * Test Case 2: Failed OTP verification (invalid code)
   * Steps:
   *   1. Trigger OTP generation and sending
   *   2. Capture the OTP code from the mocked email
   *   3. Verify with an intentionally incorrect OTP code
   *   4. Assert verification fails
   */
  test('should fail verification with an invalid OTP', async () => {
    // Arrange: Setup similar to first test
    mockFindOtpByUserIdAndPurpose.mockResolvedValue(null);
    mockCreateOtp.mockResolvedValue({ id: 'test-otp-id-789' } as any);

    // Act: Generate and send OTP
    await otpService.generateAndSendOtP(
      TEST_USER_ID,
      TEST_EMAIL,
      TEST_PURPOSE,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Extract OTP from email (same as before)
    expect(mockSend).toHaveBeenCalledTimes(1);
    const mailOptions = mockSend.mock.calls[0][0];
    const correctOtp = extractOtpFromEmail(mailOptions.text);

    // Arrange for verification: Mock repository to return our OTP
    mockFindLatestUnconsumedOtp.mockResolvedValue({ id: 'test-otp-id-789' } as any);
    mockFindOtpById.mockResolvedValue({
      id: 'test-otp-id-789',
      user_id: TEST_USER_ID,
      purpose: TEST_PURPOSE,
      code_hash: bcrypt.hashSync(correctOtp, 10),
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      consumed_at: null,
      created_at: new Date()
    } as any);

    // Act: Verify with incorrect OTP (just change one digit)
    const invalidOtp = String(parseInt(correctOtp, 10) + 1).padStart(6, '0');
    const isValid = await otpService.verifyOtP(
      TEST_USER_ID,
      TEST_PURPOSE,
      invalidOtp,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Assert: Verification should fail
    expect(isValid).toBe(false);

    // Assert: Attempt count was incremented
    expect(mockIncrementOtpAttempts).toHaveBeenCalledWith('test-otp-id-789');
  });

  /**
   * Test Case 3: Failed OTP verification (expired OTP)
   * Steps:
   *   1. Setup an OTP that is already expired
   *   2. Attempt verification
   *   3. Assert verification fails due to expiration
   */
  test('should fail verification with an expired OTP', async () => {
    // Arrange: Setup expired OTP
    const expiredOtpId = 'expired-otp-id';
    mockFindLatestUnconsumedOtp.mockResolvedValue({ id: expiredOtpId } as any);
    mockFindOtpById.mockResolvedValue({
      id: expiredOtpId,
      user_id: TEST_USER_ID,
      purpose: TEST_PURPOSE,
      code_hash: 'hashed-otp-value',
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
      consumed_at: null,
      created_at: new Date(Date.now() - 20 * 60 * 1000) // Created 20 mins ago
    } as any);

    // Act: Attempt verification with any code (will fail due to expiry first)
    const isValid = await otpService.verifyOtP(
      TEST_USER_ID,
      TEST_PURPOSE,
      '123456', // Any code
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Assert: Verification should fail
    expect(isValid).toBe(false);

    // Assert: No attempt increment (failed before attempt check)
    expect(mockIncrementOtpAttempts).not.toHaveBeenCalled();
  });
});

/**
 * Helper function to extract OTP code from email text
 * Assumes email text contains: "Your email verification code is: 123456"
 * @param emailText - The text content of the email
 * @returns The extracted OTP code
 */
function extractOtpFromEmail(emailText: string): string {
  // Match 6-digit number in the email text
  const match = emailText.match(/\b\d{6}\b/);
  if (!match) {
    throw new Error('Could not find 6-digit OTP code in email');
  }
  return match[0];
}