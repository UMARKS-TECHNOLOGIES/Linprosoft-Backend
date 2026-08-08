const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Override cooldown to allow immediate retry for testing
process.env.OTP_RESEND_COOLDOWN_SECONDS = '0';
// Set simulation mode to false to test real email via Resend
process.env.SIMULATE_INBOX = 'false';
// Optional: set a simulated OTP code (not used when SIMULATE_INBOX=false)
process.env.SIMULATED_OTP_CODE = '123456';

// Check if the OTP service module exists
// Ensure the project is built
const distPath = path.join(__dirname, 'dist', 'modules', 'otp', 'otpService.js');
if (!fs.existsSync(distPath)) {
  console.log('Building the project...');
  execSync('npm run build', { stdio: 'inherit' });
}

// Now require the OTP service
const otpService = require('./dist/modules/otp/otpService');

(async () => {
  try {
    // Use a test userId - must exist in the users table
    const userId = '8aa6829e-66de-44e9-be46-8cbe73239a36';
    const email = 'gidsoala@gmail.com'; // target email as requested
    const purpose = 'email_verification';

    console.log('Generating and sending OTP...');
    const result = await otpService.generateAndSendOtP(userId, email, purpose, {
      ipAddress: '127.0.0.1',
      userAgent: 'test-otp-script'
    });

    console.log('OTP Result:', result);

    // Now verify the OTP using the simulated code (if simulation were on) but we need the actual OTP sent.
    // Since we just sent an OTP, we don't know the code; we cannot verify without fetching it.
    // For test we can skip verification or we could fetch from otp table.
    // We'll just output success if sending succeeded.
    console.log('SUCCESS: OTP sent via Resend (check email).');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();
