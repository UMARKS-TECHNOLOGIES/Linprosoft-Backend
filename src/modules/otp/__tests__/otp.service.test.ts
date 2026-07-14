/**
 * OPT Service Test Suite
 * Tests the OTP generation, sending, and verification workflow
 *
 * To run: npm test (assuming Jest is configured)
 *
 * NOTE: This test mocks the email sending to avoid actual network calls.
 * For real email testing with Ethereal, see the commented alternative approach below.
 */

// Mock nodemailer to capture sent emails instead of actually sending
jest.mock('nodemailer');
// Mock logger to avoid actual logging during tests
jest.mock("../../../utils/logger");

import * as otpService from '../otpService';
import * as otpRepository from '../otpRepository';
import nodemailer from 'nodemailer';
import { OtpPurpose } from '../otpTypes';

// Mock nodemailer to capture sent emails instead of actually sending
jest.mock('nodemailer');
// Mock logger to avoid actual logging during tests
jest.mock("../../../utils/logger");

describe('OTP Service - Email Flow', () => {
  const TEST_EMAIL = 'soalagideon@gmail.com';
  const TEST_USER_ID = 'test-user-id-123';
  const TEST_PURPOSE: OtpPurpose = 'email_verification';

  // Mock user repository functions that the OTP service might depend on
  // (In a real test, you might mock these or use a test database)
  const mockFindOtpByUserIdAndPurpose = jest.fn();
  const mockCreateOtp = jest.fn();
  const mockFindLatestUnconsumedOtp = jest.fn();
  const mockFindOtpById = jest.fn();
  const mockConsumeOtp = jest.fn();
  const mockIncrementOtpAttempts = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up nodemailer mock
    const mockSendMail = jest.fn();
    const mockTransport = { sendMail: mockSendMail, close: jest.fn() };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransport);

    // Mock the repository functions
    // In a real implementation, you would inject these dependencies
    // For this test, we're using jest.spyOn to mock module functions
    jest.spyOn(otpRepository, 'findOtpByUserIdAndPurpose').mockImplementation(() => mockFindOtpByUserIdAndPurpose());
    jest.spyOn(otpRepository, 'createOtp').mockImplementation(() => mockCreateOtp());
    jest.spyOn(otpRepository, 'findLatestUnconsumedOtp').mockImplementation(() => mockFindLatestUnconsumedOtp());
    jest.spyOn(otpRepository, 'findOtpById').mockImplementation(() => mockFindOtpById());
    jest.spyOn(otpRepository, 'consumeOtp').mockImplementation(() => mockConsumeOtp());
    jest.spyOn(otpRepository, 'incrementOtpAttempts').mockImplementation(() => mockIncrementOtpAttempts());
  });

  /**
   * Test Case 1: Successful OTP verification
   * Steps:
   * 1. Trigger OTP generation and sending
   * 2. Capture the OTP code from the mocked email
   * 3. Verify the OTP code is valid
   * 4. Assert verification succeeds
   */
  test('should successfully verify a valid OTP sent via email', async () => {
    // Arrange: Setup mocks for the OTP flow
    // Simulate no existing OTP (for fresh generation)
    mockFindOtpByUserIdAndPurpose.mockResolvedValue(null);

    // Mock OTP creation to return a predictable ID
    const mockOtpId = 'test-otp-id-456';
    mockCreateOtp.mockResolvedValue({ id: mockOtpId } as any);

    // Act: Generate and send OTP (this will use our mocked nodemailer)
    const result = await otpService.generateAndSendOtP(
      TEST_USER_ID,
      TEST_EMAIL,
      TEST_PURPOSE,
      { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
    );

    // Assert: OTP service returned expected result
    expect(result).toHaveProperty('otpId', mockOtpId);
    expect(result.isResend).toBe(false);

    // Extract the OTP code from the mocked nodemailer call
    // Get the mock transport instance that was created
    const mockCreateTransport = nodemailer.createTransport as jest.Mock;
    const mockTransportInstance = mockCreateTransport.mock.results[0].value;

    // Get the sendMail mock from the transport instance
    const mockSendMail = mockTransportInstance.sendMail as jest.Mock;

    // Verify sendMail was called
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    // Extract the OTP code from the email content
    const mailOptions = mockSendMail.mock.calls[0][0];
    const otpCode = extractOtpFromEmail(mailOptions.text);

    // Assert: We successfully extracted an OTP code
    expect(otpCode).toMatch(/^\d{6}$/); // Should be 6 digits

    // Arrange for verification: Mock repository to return our OTP
    mockFindLatestUnconsumedOtp.mockResolvedValue({ id: mockOtpId } as any);
    mockFindOtpById.mockResolvedValue({
      id: mockOtpId,
      user_id: TEST_USER_ID,
      purpose: TEST_PURPOSE,
      code_hash: otpService.generateHashedOtP().codeHash, // Get actual hash
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
   * 1. Trigger OTP generation and sending
   * 2. Capture the OTP code from the mocked email
   * 3. Verify with an intentionally incorrect OTP code
   * 4. Assert verification fails
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
    const mockCreateTransport = nodemailer.createTransport as jest.Mock;
    const mockTransportInstance = mockCreateTransport.mock.results[0].value;
    const mockSendMail = mockTransportInstance.sendMail as jest.Mock;
    const mailOptions = mockSendMail.mock.calls[0][0];
    const correctOtp = extractOtpFromEmail(mailOptions.text);

    // Arrange for verification: Mock repository to return our OTP
    mockFindLatestUnconsumedOtp.mockResolvedValue({ id: 'test-otp-id-789' } as any);
    mockFindOtpById.mockResolvedValue({
      id: 'test-otp-id-789',
      user_id: TEST_USER_ID,
      purpose: TEST_PURPOSE,
      code_hash: otpService.generateHashedOtP().codeHash,
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
   * Test Case 3: Failed OTP verification (expired OPT)
   * Steps:
   * 1. Setup an OPT that is already expired
   * 2. Attempt verification
   * 3. Assert verification fails due to expiration
   */
  test('should fail verification with an expired OTP', async () => {
    // Arrange: Setup expired OPT
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

/**
 * ALTERNATIVE APPROACH FOR REAL ETHEREAL EMAIL TESTING
 *
 * If you want to test with actual Ethereal emails (slower but more realistic):
 *
 * 1. Install ethereal-email: npm install ethereal-email
 * 2. Create a transporter using Ethereal credentials
 * 3. Send the email via nodemailer
 * 4. Fetch the email from Ethereal's API to get the OTP
 *
 * Example setup:
 *
 * const { getTestMessageUrl } = require('nodemailer');
 *
 * // After sending email:
 * const testMessageUrl = await getTestMessageUrl(info);
 * // Then fetch from testMessageUrl to get email content
 *
 * Note: This requires network access and is slower, but tests the actual delivery.
 *
 * UNCOMMENT AND ADAPT THE FOLLOWING IF YOU PREFER REAL ETHEREAL TESTING:
 */
// import { getTestMessageUrl } from 'nodemailer';
// import fetch from 'node-fetch'; // or use built-in fetch in Node 18+
//
// describe('OTP Service - Real Ethereal Email', () => {
//   // ... similar setup but without nodemailer mock
//
//   test('should verify OTP from real Ethereal email', async () => {
//     // ... generate and send OTP (using real nodemailer with Ethereal)
//     // ... fetch email from getTestMessageUrl(info)
//     // ... extract OTP and verify
//   });
// });