**LINKPROSOFT**

**Registration & Authentication Backend**

Technical Specification & Implementation Plan

_Derived from onboarding UI flow (11 screens)_

Version 1.0

# **Table of Contents**

1\. Overview

2\. UI Flow Summary

3\. Database Schema

4\. API Endpoints

5\. Detailed Flow Logic

6\. Security & Validation

7\. Error Handling Reference

8\. Open Questions / Recommendations

# **1\. Overview**

This document translates the Linkprosoft onboarding, registration, and authentication UI flow into a complete backend implementation plan: database schema, REST API contract, business logic, and security requirements.

Scope covers: role selection, professional-type selection, sign-up, email verification (OTP), sign-in, forgot password, reset-code verification, and password reset.

# **2\. UI Flow Summary**

The flow observed across the 11 provided screens:

- What brings you here today? - user selects role: "I'm looking to hire" (Client) or "I'm offering my skills" (Professional).
- What kind of a professional are you? - shown only if role = Professional. Options: Digital Professional or Non-digital Professional.
- Sign up to Linkprosoft - Full Name, Email, Password → "Create account".
- Verify Your Email - 6-digit OTP sent to the entered email, with "Resend" option.
- Welcome Onboard!!! - success screen → "Go to dashboard".
- Sign in to Linkprosoft - Email, Password, "Forgot password?" link.
- Forgot Password - user enters email → "Reset" triggers a code send.
- Enter Reset Code - 6-digit OTP sent to email, with "Resend" option.
- Create new password - single new-password field → "Continue".
- Reset Successful - confirmation screen → "Go to dashboard".

# **3\. Database Schema**

Target: PostgreSQL. UUID primary keys, enums for constrained fields, hashed secrets only (no plaintext OTPs/tokens/passwords).

## **3.1 users**

| **Column**              | **Type**       | **Notes**                 |
| ----------------------- | -------------- | ------------------------- |
| id                      | UUID (PK)      | gen_random_uuid()         |
| full_name               | VARCHAR(150)   | Not null                  |
| email                   | CITEXT, UNIQUE | Case-insensitive          |
| password_hash           | VARCHAR(255)   | Null if social-login only |
| auth_provider           | ENUM           | email \| google \| apple  |
| role                    | ENUM           | client \| professional    |
| professional_type       | ENUM, nullable | digital \| non_digital    |
| is_email_verified       | BOOLEAN        | Default false             |
| is_active               | BOOLEAN        | Default true              |
| onboarding_step         | SMALLINT       | Tracks flow progress      |
| created_at / updated_at | TIMESTAMPTZ    | Default now()             |

## **3.2 otp_codes**

Used for both email verification and password reset (distinguished by purpose).

| **Column**              | **Type**              | **Notes**                            |
| ----------------------- | --------------------- | ------------------------------------ |
| id                      | UUID (PK)             |                                      |
| user_id                 | UUID (FK → users)     | ON DELETE CASCADE                    |
| code_hash               | VARCHAR(255)          | Hashed OTP, never plaintext          |
| purpose                 | ENUM                  | email_verification \| password_reset |
| attempts / max_attempts | SMALLINT              | Default 0 / 5                        |
| expires_at              | TIMESTAMPTZ           | ~10 minutes from creation            |
| consumed_at             | TIMESTAMPTZ, nullable | Set once used                        |
| created_at              | TIMESTAMPTZ           | Default now()                        |

## **3.3 refresh_tokens**

| **Column**              | **Type**              | **Notes**                |
| ----------------------- | --------------------- | ------------------------ |
| id                      | UUID (PK)             |                          |
| user_id                 | UUID (FK → users)     |                          |
| token_hash              | VARCHAR(255)          | Hashed refresh token     |
| user_agent / ip_address | TEXT / INET           | Session metadata         |
| expires_at              | TIMESTAMPTZ           | ~30 days                 |
| revoked_at              | TIMESTAMPTZ, nullable | Set on logout / rotation |
| created_at              | TIMESTAMPTZ           |                          |

## **3.4 password_reset_tokens**

Short-lived signed token issued after OTP verification, consumed by the final reset-password call.

| **Column** | **Type**              | **Notes**      |
| ---------- | --------------------- | -------------- |
| id         | UUID (PK)             |                |
| user_id    | UUID (FK → users)     |                |
| token_hash | VARCHAR(255)          |                |
| expires_at | TIMESTAMPTZ           | ~10-15 minutes |
| used_at    | TIMESTAMPTZ, nullable |                |

## **3.5 auth_audit_log**

| **Column**              | **Type**            | **Notes**                                           |
| ----------------------- | ------------------- | --------------------------------------------------- |
| id                      | UUID (PK)           |                                                     |
| user_id                 | UUID, nullable (FK) | ON DELETE SET NULL                                  |
| event_type              | VARCHAR(50)         | signup, login_success, login_failed, otp_sent, etc. |
| ip_address / user_agent | INET / TEXT         |                                                     |
| metadata                | JSONB               | Free-form context                                   |
| created_at              | TIMESTAMPTZ         |                                                     |

## **3.6 SQL DDL**

CREATE TYPE user_role AS ENUM ('client', 'professional');  
CREATE TYPE professional_type AS ENUM ('digital', 'non_digital');  
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple');  
CREATE TYPE otp_purpose AS ENUM ('email_verification', 'password_reset');  
<br/>CREATE TABLE users (  
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
full_name VARCHAR(150) NOT NULL,  
email CITEXT UNIQUE NOT NULL,  
password_hash VARCHAR(255),  
auth_provider auth_provider NOT NULL DEFAULT 'email',  
role user_role NOT NULL,  
professional_type professional_type,  
is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,  
is_active BOOLEAN NOT NULL DEFAULT TRUE,  
onboarding_step SMALLINT NOT NULL DEFAULT 0,  
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),  
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);  
<br/>CREATE TABLE otp_codes (  
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
code_hash VARCHAR(255) NOT NULL,  
purpose otp_purpose NOT NULL,  
attempts SMALLINT NOT NULL DEFAULT 0,  
max_attempts SMALLINT NOT NULL DEFAULT 5,  
expires_at TIMESTAMPTZ NOT NULL,  
consumed_at TIMESTAMPTZ,  
created_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);  
CREATE INDEX idx_otp_user_purpose ON otp_codes(user_id, purpose);  
<br/>CREATE TABLE refresh_tokens (  
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
token_hash VARCHAR(255) NOT NULL,  
user_agent TEXT,  
ip_address INET,  
expires_at TIMESTAMPTZ NOT NULL,  
revoked_at TIMESTAMPTZ,  
created_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);  
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);  
<br/>CREATE TABLE password_reset_tokens (  
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
token_hash VARCHAR(255) NOT NULL,  
expires_at TIMESTAMPTZ NOT NULL,  
used_at TIMESTAMPTZ,  
created_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);  
<br/>CREATE TABLE auth_audit_log (  
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
user_id UUID REFERENCES users(id) ON DELETE SET NULL,  
event_type VARCHAR(50) NOT NULL,  
ip_address INET,  
user_agent TEXT,  
metadata JSONB,  
created_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);

# **4\. API Endpoints**

## **4.1 Onboarding (optional pre-signup persistence)**

| **Method** | **Endpoint**                      | **Purpose**                                     |
| ---------- | --------------------------------- | ----------------------------------------------- |
| POST       | /api/onboarding/role              | Save role: client \| professional               |
| POST       | /api/onboarding/professional-type | Save digital \| non_digital (professional only) |

Recommended MVP approach: skip persisting these separately - carry role and professional_type as client-side form state and submit them together with the /auth/signup payload.

## **4.2 Authentication**

| **Method** | **Endpoint**                | **Purpose**                                                                    |
| ---------- | --------------------------- | ------------------------------------------------------------------------------ |
| POST       | /api/auth/signup            | Create user (full_name, email, password, role, professional_type?). Sends OTP. |
| POST       | /api/auth/verify-email      | Body: email/user_id, otp_code. Marks verified, returns tokens.                 |
| POST       | /api/auth/resend-otp        | Body: email, purpose. Rate-limited.                                            |
| POST       | /api/auth/login             | Body: email, password. Returns access + refresh tokens.                        |
| POST       | /api/auth/refresh-token     | Body: refresh_token. Returns new access token.                                 |
| POST       | /api/auth/logout            | Revokes refresh token.                                                         |
| POST       | /api/auth/forgot-password   | Body: email. Sends OTP, generic response always.                               |
| POST       | /api/auth/verify-reset-code | Body: email, otp_code. Returns short-lived reset_token.                        |
| POST       | /api/auth/reset-password    | Body: reset_token, new_password. Updates password.                             |

## **4.3 Session / User**

| **Method** | **Endpoint**  | **Purpose**                               |
| ---------- | ------------- | ----------------------------------------- |
| GET        | /api/users/me | Fetch current authenticated user profile. |
| PATCH      | /api/users/me | Update profile fields post-onboarding.    |

# **5\. Detailed Flow Logic**

## **5.1 Sign-up + Email Verification**

- POST /auth/signup - validate email uniqueness, hash password (bcrypt/argon2id), create user row with is_email_verified = false, plus role and professional_type.
- Generate a 6-digit numeric OTP, hash it, store in otp_codes (purpose = email_verification, expires_at = now + 10 min).
- Send the OTP by email (SES / SendGrid / Postmark).
- POST /auth/verify-email - fetch latest unconsumed OTP for user + purpose, compare hash, check expiry and attempt count. On success: set consumed_at, is_email_verified = true, issue access token (~15 min) and refresh token (~30 days, hashed at rest).
- Frontend shows "Welcome Onboard!!!" and redirects to the dashboard using the issued tokens.

## **5.2 Sign-in**

- POST /auth/login - verify user exists, compare password hash, check is_email_verified.
- If unverified, return a specific error code so the frontend can redirect back to the OTP screen (and auto-trigger resend).
- On success, issue access + refresh tokens and log login_success to the audit table.

## **5.3 Forgot Password / Reset**

- POST /auth/forgot-password - look up user by email. Always respond generically regardless of whether the email exists (prevents account enumeration). If found, generate an OTP (purpose = password_reset) and email it.
- POST /auth/verify-reset-code - validate the OTP; on success issue a short-lived signed reset_token (10-15 min expiry, single-purpose claim). This corresponds to the "Enter Reset Code → Continue" screen transition.
- POST /auth/reset-password - validate reset_token, ensure new_password differs from the current hash, update password_hash, and revoke all existing refresh_tokens for that user (forces logout everywhere). Log the event.
- Frontend shows "Reset Successful" → "Go to dashboard" (auto-login with freshly issued tokens, or route to the login screen).

# **6\. Security & Validation**

- Passwords: minimum 8 characters, hashed with bcrypt (cost ≥ 12) or argon2id.
- OTPs: 6 numeric digits, hashed at rest, maximum 5 attempts, 10-minute expiry, 60-second resend cooldown.
- Rate limit /login, /forgot-password, and /verify-\* endpoints per IP and per email (e.g. Redis token-bucket).
- Access tokens are short-lived JWTs; refresh tokens are rotated on every use, with reuse detection revoking all sessions for that user.
- All authentication events are written to auth_audit_log for anomaly detection and support investigations.
- Never reveal whether an email exists on signup or forgot-password - always return generic success messaging.
- Enforce HTTPS/TLS everywhere; set refresh tokens as httpOnly, secure, sameSite cookies where applicable.

# **7\. Error Handling Reference**

| **Scenario**                      | **HTTP Status** | **Response Code**        |
| --------------------------------- | --------------- | ------------------------ |
| Email already registered          | 409             | EMAIL_ALREADY_EXISTS     |
| Invalid credentials on login      | 401             | INVALID_CREDENTIALS      |
| Login before email verified       | 403             | EMAIL_NOT_VERIFIED       |
| OTP expired                       | 400             | OTP_EXPIRED              |
| OTP incorrect / attempts exceeded | 400 / 429       | OTP_INVALID / OTP_LOCKED |
| Reset token expired or invalid    | 400             | RESET_TOKEN_INVALID      |
| Rate limit exceeded               | 429             | RATE_LIMITED             |

# **8\. Open Questions / Recommendations**

- Confirm whether role/professional_type should be editable later, or locked once set at signup.
- Decide on social login (Google/Apple) priority - schema already supports it via auth_provider.
- Confirm OTP delivery channel: email only, or SMS fallback for reset flows.
- Consider adding device/session management UI if refresh_tokens will support "log out of all devices."
- Define what "dashboard" data is needed immediately post-verification to pre-fetch on the welcome screen.