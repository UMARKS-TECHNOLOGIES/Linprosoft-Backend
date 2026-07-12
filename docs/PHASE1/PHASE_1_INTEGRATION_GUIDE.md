# Phase 1 Frontend Integration Guide

**Target Audience:** Frontend Engineers  
**Purpose:** Guide for integrating with the Phase 1 backend authentication system  
**Last Updated:** July 12, 2026  
**Backend Version:** 1.0.0  

## Overview

This guide covers the Phase 1 authentication system that is ready for frontend integration. Phase 1 focused on establishing a secure authentication foundation using HTTP-only cookies with JWT tokens for access and refresh tokens.

## Base URLs

### Local Development
```
Backend API Base: http://localhost:5020
Auth Base:        http://localhost:5020/api/auth
User Base:        http://localhost:5020/api/users
```

### Environment Configuration
The backend reads the frontend URL from environment variables:
```env
FRONTEND_URL=http://localhost:5173  # Default if not set
```

## Authentication System Overview

### Auth Model
- **HTTP-only cookie JWT** (primary method for browsers) - two cookies: `accessToken` and `refreshToken`
- **Authorization: Bearer <token>** header (fallback for non-browser clients) - uses access token
- **Cookie names:** `accessToken`, `refreshToken`
- **Access token expiry:** 15 minutes
- **Refresh token expiry:** 30 days
- **Cookie settings:** HttpOnly, Secure in production, SameSite=Strict

### Security Features
- ✅ HTTP-only cookies (prevents XSS access via JavaScript)
- ✅ Secure flag in production (requires HTTPS)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Access token short-lived (15min), refresh token rotation on use
- ✅ Refresh tokens stored hashed in database
- ✅ Automatic cleanup on logout
- ✅ Passwords hashed with bcrypt (cost 12)
- ✅ OTPs hashed with bcrypt (cost 10), rate limited
- ✅ Account enumeration prevention (generic responses for signup/forgot-password)
- ✅ Email verification required before login

## Endpoints

All auth endpoints are under `/api/auth`  
User profile endpoints are under `/api/users`

### 1. POST `/signup`
Create a new account and send email verification OTP.  
**Does NOT log in the user** - email verification is required first.

**Request:**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "role": "professional", // or "client"
  "professional_type": "digital", // required if role is professional, null for client
  "phone": "+1234567890", // optional
  "location": "New York" // optional
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Account created. Check email for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "full_name": "John Doe",
      "role": "professional",
      "professional_type": "digital",
      "is_email_verified": false,
      "is_active": true,
      "onboarding_step": 0,
      "phone": "+1234567890",
      "location": "New York",
      "created_at": "2026-07-12T10:30:00.000Z",
      "updated_at": "2026-07-12T10:30:00.000Z"
    }
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

**Notes:**
- Returns user data but NO tokens (user must verify email first)
- OTP is generated and emailed (simulated in dev console)
- Password must be ≥8 chars, contain uppercase, number, special character
- Professional type required for professionals

### 2. POST `/verify-email`
Verify email with OTP code and issue authentication tokens.

**Request:**
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp_code": "123456"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "accessToken": "jwt.access.token.string",
    "refreshToken": "jwt.refresh.token.string",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "full_name": "John Doe",
      "role": "professional",
      "professional_type": "digital",
      "is_email_verified": true,
      "is_active": true,
      "onboarding_step": 1,
      "phone": "+1234567890",
      "location": "New York",
      "created_at": "2026-07-12T10:30:00.000Z",
      "updated_at": "2026-07-12T10:35:00.000Z"
    }
  },
  "timestamp": "2026-07-12T10:35:00.000Z"
}
```

**Cookie Settings (Set-Cookie headers):**
- `accessToken`: JWT, HttpOnly, Secure (prod), SameSite=Strict, Max-Age=900 (15 min)
- `refreshToken`: JWT, HttpOnly, Secure (prod), SameSite=Strict, Max-Age=2592000 (30 days)

### 3. POST `/resend-otp`
Resend OTP for email verification or password reset (rate limited).

**Request:**
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "purpose": "email_verification" // or "password_reset"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists in our system, a new OTP has been sent",
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```
*Note: Always returns success to prevent email enumeration*

### 4. POST `/login`
Authenticate user with email and password. Requires email to be verified.

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt.access.token.string",
    "refreshToken": "jwt.refresh.token.string",
    "user": {
      // ... same user object as above
    }
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

**Error Responses:**
- `401`: Invalid credentials (generic message to prevent enumeration)
- `403`: Email not verified (message: "Email not verified. Please verify your email before logging in.")

**Cookie Settings:** Same as verify-email endpoint

### 5. POST `/refresh-token`
Rotate refresh token and issue new access token.

**Request:**
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "httpOnlyCookieValue" // can also be sent via cookie
}
```
*Note: Can send refreshToken in body OR rely on httpOnly cookie*

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new.jwt.access.token.string"
    // Note: refreshToken is rotated and set via cookie only
  },
  "timestamp": "2026-07-12T10:45:00.000Z"
}
```

**Cookie Settings:**
- `accessToken`: new JWT (HttpOnly, Secure, SameSite=Strict, Max-Age=900)
- `refreshToken`: new JWT (replaces old one, same settings as above)

### 6. POST `/logout`
Revoke refresh token and clear cookies.

**Request:**
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "optional - if not sent, read from cookie"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```
**Effect:** Clears both authentication cookies on client

### 7. POST `/forgot-password`
Initiate password reset (always returns success to prevent enumeration).

**Request:**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists in our system, a password reset OTP has been sent",
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

### 8. POST `/verify-reset-code`
Verify password reset OTP and issue short-lived reset token.

**Request:**
```http
POST /api/auth/verify-reset-code
Content-Type: application/json

{
  "email": "user@example.com",
  "otp_code": "654321"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reset code verified successfully",
  "data": {
    "resetToken": "short.lived.token.string"
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```
*Note: resetToken expires in 15 minutes, single-use*

### 9. POST `/reset-password`
Complete password reset using reset token.

**Request:**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "token.from.verify-reset-code",
  "newPassword": "NewSecurePass456!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password has been successfully reset",
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```
**Effect:** Password updated, all existing revoked refresh tokens for user (force logout everywhere)

### 10. GET `/auth/verify`
Verify current session and return user data (used to check auth status).

**Request:**
```http
GET /api/auth/verify
Headers:
  Cookie: accessToken=jwt...; refreshToken=jwt...
  // OR
  Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Session verified successfully",
  "data": {
    "user": {
      // ... user object without password hash
    }
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```
**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "invalid_request",
  "message": "User not authenticated",
  "statusCode": 401,
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

### 11. GET `/users/me`
Get current user's profile data.

**Request:**
```http
GET /api/users/me
Headers:
  Cookie: accessToken=jwt...; refreshToken=jwt...
  // OR
  Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      // ... full user object
    }
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

### 12. PATCH `/users/me`
Update current user's profile fields.

**Request:**
```http
PATCH /api/users/me
Content-Type: application/json
Headers:
  Cookie: accessToken=jwt...; refreshToken=jwt...

{
  "fullName": "John Doe Updated",
  "professionalType": "non_digital", // only if role is professional
  "phone": "+0987654321",
  "location": "Los Angeles"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      // ... updated user object
    }
  },
  "timestamp": "2026-07-12T10:30:00.000Z"
}
```

**Error Responses:**
- `403`: Forbidden (if non-professional tries to update professionalType)
- `400`: Bad request (no valid fields provided)

## Authentication Flow

### Recommended Client-Side Implementation

1. **App Initialization**
   - Call `GET /api/auth/verify` (with credentials included)
   - On 200: Store user data from `data.user`, consider user authenticated
   - On 401: Clear any auth state, show login screen

2. **Sign-Up Flow**
   - Collect form data (fullName, email, password, role, professionalType, phone, location)
   - POST to `/api/auth/signup`
   - On success: Show email verification screen, instruct user to check email
   - User enters 6-digit OTP from email
   - POST to `/api/auth/verify-email` with email and OTP
   - On success: Store user data and tokens from response, save cookies automatically
   - Redirect to dashboard/home

3. **Login Flow**
   - Collect email and password
   - POST to `/api/auth/login`
   - On success: Store user data and tokens from response
   - On 403 (email not verified): Redirect to email verification screen with email pre-filled
   - On 401 (invalid credentials): Show error message

4. **Session Maintenance**
   - On route changes or periodically, call `GET /api/auth/verify` to validate session
   - If 401: Clear auth state, redirect to login
   - Access tokens expire in 15 minutes - refresh token rotation handled automatically via refresh endpoint when needed

5. **Refresh Token Usage**
   - When access token expires (detected via 401 on protected endpoint or proactive check), 
     call `POST /api/auth/refresh-token` (credentials included)
   - Use new access token from response for subsequent requests
   - Refresh token is rotated automatically via cookie

6. **Logout**
   - Call `POST /api/auth/logout` (credentials included)
   - Clear local auth state and redirect to login/page

7. **Password Reset Flow**
   - User clicks "Forgot password" on login screen
   - Collect email, POST to `/api/auth/forgot-password`
   - Show confirmation: "If email exists, OTP sent"
   - User enters OTP, POST to `/api/auth/verify-reset-code` with email and OTP
   - On success: Store `resetToken` from response
   - Collect new password, POST to `/api/auth/reset-password` with resetToken and newPassword
   - On success: Show success message, redirect to login (user now has new password)

## Security Implementation Notes for Frontend

### Cookie Handling
- **Do not** attempt to read `accessToken` or `refreshToken` cookies via JavaScript (HttpOnly)
- Let browser automatically send cookies with requests by using:
  - **Fetch:** `credentials: 'include'`
  - **Axios:** `withCredential: true`
  - **Vue/Axios module:** Configure globally

### Making Authenticated Requests
```javascript
// Fetch example
fetch('/api/users/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => { /* handle response */ });

// Axios example
axios.get('/api/users/me', { withCredentials: true })
  .then(response => { /* handle response */ });
```

### Token Refresh Handling
Instead of manually refreshing, rely on:
1. Automatic cookie sending with requests
2. Backend returns 401 when access token invalid/expired
3. Interceptor that catches 401, calls refresh endpoint, retries original request

Example interceptor pseudo-code:
```javascript
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          '/api/auth/refresh-token',
          {}, // body empty if using cookies
          { withCredentials: true }
        );
        // New access token is now in cookie, retry original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed -> logout user
        store.dispatch('auth/logout');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

## CORS Configuration

Backend accepts requests only from origin specified in `FRONTEND_URL` environment variable.

**Development Default:** `http://localhost:5173`

**Frontend Requirements:**
- Must be served from exact origin specified in `FRONTEND_URL`
- During development, ensure dev server matches this (`vite` default 5173)
- In production, ensure backend's `FRONTEND_URL` matches deployed frontend URL

## Environment Variables Required (.env)

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# JWT Secrets (min 32 chars recommended)
JWT_SECRET="your-super-secret-key-here-min-32-chars"
REFRESH_TOKEN_SECRET="your-refresh-secret-key-here-min-32-chars"

# Optional: Override defaults
PORT=5020
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# OTP Config (optional - defaults shown)
OTP_LENGTH=6
OTP_EXPIRES_SECONDS=600
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

# Rate Limiting (optional - defaults shown)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS={"login":5,"forgotPassword":3,"verifyOtp":10}

# Paystack (Phase 4 - For auth not required for development

```
2. 

4. Register a user via `/api/auth/signup`
5. Check console for OTP (development simulates email sending)
6. Verify email via `/api/auth/verify-email`
7. Access protected endpoints with credentials included

## Testing Credentials (Development)

No pre-existing test accounts - create your own via signup endpoint.

Example test credentials you could use:
```
Email: test@example.com
Password: SecurePass123!
```

Let me go ahead and apply these updates to the actual file.

## Build & Start Development Server

```bash
# Install dependencies (first time)
npm install

# Start development server with hot reload
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

## Common Issues & Troubleshooting

### 1. Authentication Not Working (401 on protected routes)
**Problem:** Valid login but subsequent requests return 401
**Solutions:**
- Ensure requests include credentials (`credentials: 'include'` or `withCredentials: true`)
- Check browser devtools → Application → Cookies for `accessToken` and `refreshToken`
- Remember access token expires in 15 minutes - verify session with `/auth/verify`
- Clear cookies and re-login if needed

### 2. Cookie Not Being Set
**Problem:** No `Set-Cookie` headers in response
**Solutions:**
- Verify you're hitting the correct endpoint (`/api/auth/verify-email`, `/api/auth/login`, etc.)
- Ensure request is not being blocked by ad blockers or privacy extensions
- Check server logs for errors

### 3. CORS Errors
**Problem:** Browser blocks request due to CORS policy
**Solutions:**
- Confirm frontend origin exactly matches `FRONTEND_URL` in backend env
- In development, verify dev server runs on expected port (default 5173)
- Ensure you're not making requests to different domains/ports (e.g., `localhost` vs `127.0.0.1`)

### 4. OTP Not Received (Development)
**Problem:** No email received in development
**Solution:** 
- Check console output - OTP is logged to server console in development
- Look for: `[OTP] Sending email verification OTP to user@example.com: 123456`

### 5. Email Verification Required
**Problem:** Login returns 403 with "Email not verified"
**Solution:**
- Redirect user to email verification screen
- Optionally auto-resend OTP after short delay
- Allow user to request new OTP via `/api/auth/resend-otp`

## Next Steps Beyond Phase 1

After integrating authentication, these features will be available in later phases:

- **Profiles:** `/api/profiles` (GET/PUT for current user)
- **Skills:** `/api/skills` (catalog and user skills)
- **Jobs:** `/api/jobs` (browse, post, manage job listings)
- **Applications:** `/api/applications` (apply to jobs, manage applications)
- **Payments:** `/api/payments` (processing payments and subscriptions)

For API details on these endpoints, consult the respective module documentation or the main API documentation.

## Getting Help

1. **Check backend logs** for detailed error information
2. **Refer to API specification** in `docs/PHASE1/Linkprosoft_Auth_Backend_Spec.md`
3. **Review integration tests** in `src/__tests__` for working examples
4. **Contact backend team** for environment-specific issues or clarifications

---
*This guide covers the Phase 1 authentication system only. For a complete list of available endpoints beyond authentication, see the `INTEGRATION_READINESS_REPORT.md` document.*