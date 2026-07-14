import dotenv from 'dotenv';
import axios from 'axios';
import { strictEqual } from 'assert';

dotenv.config();

/**
 * Configuration: update these values to match your local test setup.
 */
const BASE_URL = process.env.OTP_API_BASE_URL || 'http://localhost:5020';
const TEST_EMAIL = process.env.OTP_TEST_EMAIL || 'soalagideon@gmail.com';

// OTP generation endpoint: adjust this to whichever endpoint triggers OTP sending.
const GENERATE_OTP_ENDPOINT = process.env.OTP_GENERATE_ENDPOINT || '/api/auth/forgot-password';

// OTP verification endpoint: adjust this to the endpoint that accepts OTP codes.
const VERIFY_OTP_ENDPOINT = process.env.OTP_VERIFY_ENDPOINT || '/api/auth/verify-reset-code';

/**
 * Adjust the payload builder for generate OTP requests.
 * If your API uses a different request shape, update this function.
 */
function buildGenerateOtpPayload(email) {
  return {
    email,
    // If your endpoint uses a different property name or additional data,
    // add it here, e.g. purpose: 'password_reset'
  };
}

/**
 * Adjust the payload builder for OTP verification requests.
 */
function buildVerifyOtpPayload(email, otpCode) {
  return {
    email,
    otp_code: otpCode,
    // Some APIs use `otp` instead of `otp_code`.
    // If so, replace the property name accordingly.
  };
}

/**
 * Generic assertion helper.
 */
function assertTrue(value, message) {
  strictEqual(value, true, message);
}

/**
 * Sleep helper for expiration tests.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trigger OTP generation on the API.
 */
async function triggerOtp(email) {
  const url = `${BASE_URL}${GENERATE_OTP_ENDPOINT}`;
  const payload = buildGenerateOtpPayload(email);

  const response = await axios.post(url, payload, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Verify OTP on the API.
 */
async function verifyOtp(email, otpCode) {
  const url = `${BASE_URL}${VERIFY_OTP_ENDPOINT}`;
  const payload = buildVerifyOtpPayload(email, otpCode);

  const response = await axios.post(url, payload, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Simulate or fetch the OTP from a test inbox.
 * Replace this with a real email inbox API or local mailbox reader.
 */
async function fetchOtpFromInbox(email) {
  const shouldSimulateInbox = process.env.SIMULATE_INBOX?.toLowerCase() !== 'false';

  if (shouldSimulateInbox) {
    const simulatedOtp = process.env.SIMULATED_OTP_CODE || '123456';
    console.log(`[INFO] Using simulated inbox for ${email}. Set SIMULATE_INBOX=false and implement inbox retrieval for real mailbox automation.`);
    return simulatedOtp;
  }

  // Example placeholder for an actual inbox API call.
  // If you use a test email provider, implement the API call here.
  // For example, fetch test emails from Mailtrap, Ethereal, Mailosaur, or your own SMTP test inbox.
  // const otpCode = await fetchOtpWithYourEmailApi(email);
  // return otpCode;

  throw new Error('fetchOtpFromInbox() is not implemented. Set SIMULATE_INBOX=true or add your inbox retrieval logic.');
}

/**
 * Extract a 6-digit OTP code from a text block.
 * Use this helper after retrieving raw email content.
 */
function extractOtpFromEmailText(emailText) {
  const match = emailText.match(/\b(\d{6})\b/);
  if (!match) {
    throw new Error('Unable to extract OTP code from email text.');
  }
  return match[1];
}

/**
 * Run the test for a valid OTP.
 */
async function testValidOtpVerification() {
  console.log('\n=== Test 1: Valid OTP Verification ===');
  console.log(`Triggering OTP generation for ${TEST_EMAIL}`);

  const generateResult = await triggerOtp(TEST_EMAIL);
  console.log('OTP generation response:', JSON.stringify(generateResult));

  const otpCode = await fetchOtpFromInbox(TEST_EMAIL);
  console.log(`Retrieved OTP from inbox: ${otpCode}`);

  const verifyResult = await verifyOtp(TEST_EMAIL, otpCode);
  console.log('OTP verification response:', JSON.stringify(verifyResult));

  assertTrue(verifyResult.success !== false, 'Expected OTP verification to succeed.');
  console.log('✅ Valid OTP verification passed.');
}

/**
 * Run the test for an invalid OTP.
 */
async function testInvalidOtpVerification() {
  console.log('\n=== Test 2: Invalid OTP Verification ===');
  console.log(`Triggering OTP generation for ${TEST_EMAIL}`);

  await triggerOtp(TEST_EMAIL);

  const invalidOtp = '000000';
  console.log(`Verifying invalid OTP: ${invalidOtp}`);

  try {
    const verifyResult = await verifyOtp(TEST_EMAIL, invalidOtp);
    console.log('OTP verification response:', JSON.stringify(verifyResult));
    throw new Error('Expected invalid OTP verification to fail, but it succeeded.');
  } catch (error) {
    if (error.response && error.response.data) {
      const responseData = error.response.data;
      assertTrue(responseData.success === false || responseData.error, 'Expected API to return an error for invalid OTP.');
      console.log('✅ Invalid OTP verification correctly failed:', JSON.stringify(responseData));
      return;
    }
    throw error;
  }
}

/**
 * Run the test for an expired OTP.
 * Note: this test only works if the server timeout is short enough to wait in a script,
 * or if you adjust `OTP_TEST_EXPIRE_SECONDS` to a value your server honors in the test environment.
 */
async function testExpiredOtpVerification() {
  console.log('\n=== Test 3: Expired OTP Verification ===');

  const expireSeconds = Number(process.env.OTP_TEST_EXPIRE_SECONDS || 10);
  if (expireSeconds <= 0) {
    console.log('[SKIP] OTP expiration test skipped because OTP_TEST_EXPIRE_SECONDS is not set to a positive value.');
    return;
  }

  console.log(`Triggering OTP generation for ${TEST_EMAIL}`);
  await triggerOtp(TEST_EMAIL);

  const otpCode = await fetchOtpFromInbox(TEST_EMAIL);
  console.log(`Retrieved OTP from inbox: ${otpCode}`);

  const waitMs = expireSeconds * 1000 + 2000;
  console.log(`Waiting ${waitMs / 1000} seconds for OTP to expire...`);
  await sleep(waitMs);

  try {
    const verifyResult = await verifyOtp(TEST_EMAIL, otpCode);
    console.log('OTP verification response:', JSON.stringify(verifyResult));
    throw new Error('Expected expired OTP verification to fail, but it succeeded.');
  } catch (error) {
    if (error.response && error.response.data) {
      const responseData = error.response.data;
      assertTrue(responseData.success === false || responseData.error, 'Expected API to return an error for expired OTP.');
      console.log('✅ Expired OTP verification correctly failed:', JSON.stringify(responseData));
      return;
    }
    throw error;
  }
}

/**
 * Main runner.
 */
async function runTests() {
  console.log('Starting OTP module automation tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test email: ${TEST_EMAIL}`);

  try {
    await testValidOtpVerification();
    await testInvalidOtpVerification();
    await testExpiredOtpVerification();
    console.log('\nAll OTP automation tests completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\nOTP automation test failed:', error.message || error);
    if (error.response && error.response.data) {
      console.error('API error response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

runTests();
