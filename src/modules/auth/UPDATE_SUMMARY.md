# Auth Module Update Summary

Based on the authentication system refactor plan, the following changes are required to the existing auth module (`src/modules/auth/`):

## 1. Controller Updates (`authController.ts`)

### Replace existing methods with OTP-based flow:

#### `signup` method:
- **Current**: Creates user, generates tokens immediately, sets cookies
- **New**: 
  1. Create user with `is_email_verified = false`
  2. Generate and store OTP for email verification (purpose: email_verification)
  3. Send OTP email via email service
  4. Return minimal user data (no tokens yet)
  5. Do NOT set cookies (user not verified yet)

#### Add new methods:
- `verifyEmail`: Verify OTP, mark email as verified, generate and return tokens
- `resendOtp`: Rate-limited OTP resend functionality
- `login`: Check `is_email_verified` before allowing login
- `forgotPassword`: Always return generic response, send OTP if email exists
- `verifyResetCode`: Verify password reset OTP, return reset token
- `resetPassword`: Validate reset token, update password, revoke refresh tokens
- `refreshToken`: Validate refresh token in database, rotate tokens

### Cookie Handling Changes:
- accessToken: HttpOnly, short-lived (from env.ACCESS_TOKEN_EXPIRES_SECONDS)
- refreshToken: HttpOnly, longer-lived, path `/api/auth/refresh`
- Remove legacy `token` cookie (or keep for backward compatibility with warning)

## 2. Service Updates (`authService.ts`)

### Modified `signup`:
- Add OTP generation and storage
- Integrate with email service
- Return user data without tokens

### New Service Methods:
- `verifyEmail`: Validate OTP, update user verification status, generate tokens
- `resendOtp`: Generate new OTP with rate limiting
- `login`: Add email verification check
- `forgotPassword`: Implement account enumeration prevention
- `verifyResetCode`: Validate reset OTP, generate reset token
- `resetPassword`: Update password, revoke all refresh tokens
- `refreshToken`: Validate token exists in DB, implement rotation/reuse detection

### Dependencies:
- Add email service dependency
- Add OTP repository/service dependency
- Add audit logging dependency

## 3. Validation Updates (`authValidation.ts`)

### Update `signupSchema`:
- Replace `firstName` + `lastName` with `full_name`
- Replace `userType` with `role` (enum: client|professional)
- Add conditional `professional_type` (required when role=professional)
- Remove employer-specific fields (compName, etc.) - move to profile updates
- Keep email and password validation

### Add new schemas:
- `verifyEmailSchema`: email + otp_code
- `resendOtpSchema`: email + purpose (enum: email_verification|password_reset)
- `loginSchema`: email + password
- `forgotPasswordSchema`: email
- `verifyResetCodeSchema`: email + otp_code
- `resetPasswordSchema`: reset_token + new_password
- `refreshTokenSchema`: refresh_token

## 4. Repository Updates (`authRepository.ts`)

### Update `findByEmail`:
- Work with new schema (full_name, role, etc.)
- Return UserRow with new field mappings

### Update `createUser`:
- Map new fields to database columns
- Set is_verified = false by default
- Set auth_provider = 'email' default
- Set role from userType mapping
- Set professional_type as needed

### Add new methods:
- `findById`: Accept UUID string, return UserRow
- `updateUserFields`: Update specific fields (onboarding_step, is_email_verified, etc.)
- `updateLastLogin`: Update login timestamp
- `storeRefreshToken`: Store hashed refresh token with metadata
- `findRefreshToken`: Find and validate refresh token
- `revokeRefreshToken`: Mark token as revoked
- `revokeAllRefreshTokensForUser`: Revoke all tokens for a user (on password reset)
- `storePasswordResetToken`: Store hashed reset token
- `findPasswordResetToken`: Find and validate reset token
- `consumePasswordResetToken`: Mark reset token as used

## 5. Routes Updates (`authRoutes.ts`)

### Replace existing route definitions with:

#### Public Routes (No Auth):
- `POST /api/auth/signup` → controller.signup
- `POST /api/auth/verify-email` → controller.verifyEmail  
- `POST /api/auth/resend-otp` → controller.resendOtp
- `POST /api/auth/login` → controller.login
- `POST /api/auth/forgot-password` → controller.forgotPassword
- `POST /api/auth/verify-reset-code` → controller.verifyResetCode
- `POST /api/auth/reset-password` → controller.resetPassword
- `POST /api/auth/refresh-token` → controller.refreshToken

#### Protected Routes (Require Auth):
- `POST /api/auth/logout` → protect, controller.logout
- `GET /api/users/me` → protect, controller.getMe
- `PATCH /api/users/me` → protect, controller.updateMe

## 6. Middleware Updates

### Update `authMiddleware.ts` (`protect`):
- Validate JWT token includes required claims (id, email, role)
- Check token blacklist/revocation if implemented
- Fetch fresh user data from database on each request
- Attach full User object to request (req.user)

### Add rate limiting to auth routes:
- Apply rate limiting to `/auth/login`, `/auth/forgot-password`, `/auth/verify-*` endpoints
- Use combined IP and email rate limiting from rateLimiter.ts

## 7. Utility Updates

### Update `jwt.ts`:
- Modify token verification to work with UUID string IDs
- Add token revocation checking if implementing token blacklist

### Update logger for audit events:
- Create `logAuthEvent` helper
- Log events: signup, login_success, login_failed, otp_sent, otp_verified, 
  password_reset_initiated, password_reset_completed, logout, token_refreshed
- Include: user_id (if applicable), ip_address, user_agent, metadata

## 8. Database Migration Requirements

Run migration scripts:
1. `007_auth_schema_update.sql` - Update schema structure
2. `008_auth_data_migration.sql` - Migrate existing data (run with caution)

## 9. Integration Points

### Email Service:
- Integrate with email provider (SendGrid, SES, etc.)
- Create OTP email templates
- Configure from address, templates, etc.

### Audit Logging:
- Implement auth event logging to auth_audit_log table
- Include security-relevant metadata

## 10. Testing Requirements

### Unit Tests:
- OTP service: generation, validation, expiration, attempts
- Auth service: each method with various inputs
- Validation schemas: valid and invalid inputs
- Repository methods: database operations

### Integration Tests:
- Complete auth flow: signup -> verify email -> login -> access protected route -> logout
- Forgot password flow: request reset -> verify OTP -> reset password -> login with new password
- Rate limiting: exceed limits, verify blocking
- Security: invalid tokens, expired OTPs, wrong passwords
- Edge cases: concurrent requests, race conditions

## 11. Backward Compatibility Notes

This refactor represents a breaking change to the auth API:
- Old endpoints: `/api/auth/signup` (old format), `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/verify`
- New endpoints: As per spec above
- Recommendation: Deploy new endpoints alongside old ones with deprecation warnings, then remove old after migration period

### Data Migration:
Existing users will need migration:
- Convert id from integer to UUID
- Combine first_name + last_name into full_name
- Map user_type "employer" -> role "client", "professional" -> role "professional"
- Set auth_provider = 'email' for all existing users
- Set professional_type = NULL for all (will be set during onboarding/profile update)
- Set is_email_verified = is_verified (current field)
- Set is_active = true for all (unless deleted)
- Set onboarding_step = 0 for all
- Drop unused columns: location, phone, comp_name, deleted_at
- Preserve created_at, updated_at timestamps