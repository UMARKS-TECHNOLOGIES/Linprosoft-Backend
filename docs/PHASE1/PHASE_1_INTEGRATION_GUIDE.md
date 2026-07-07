# Phase 1 Frontend Integration Guide

**Target Audience:** Frontend Engineers  
**Purpose:** Guide for integrating with the Phase 1 backend authentication system  
**Last Updated:** July 7, 2026  
**Backend Version:** 1.0.0  

## Overview

This guide covers the Phase 1 authentication system that is ready for frontend integration. Phase 1 focused on establishing a secure authentication foundation using HTTP-only cookies with JWT tokens.

## Base URLs

### Local Development
```
Backend API Base: http://localhost:5020
Auth Base:        http://localhost:5020/api/auth
```

### Environment Configuration
The backend reads the frontend URL from environment variables:
```env
FRONTEND_URL=http://localhost:5173  # Default if not set
```

## Authentication System Overview

### Auth Model
- **HTTP-only cookie JWT** (primary method for browsers)
- **Authorization: Bearer <token>** header (fallback for non-browser clients)
- **Cookie name:** `token`
- **JWT expiry:** 30 minutes
- **Cookie lifetime:** 7 days

### Security Features
- ✅ HTTP-only cookie (prevents XSS access via JavaScript)
- ✅ Secure flag in production (requires HTTPS)
- ⚠️ SameSite=Lax (CSRF protection - note: may affect some cross-site POST scenarios)
- ✅ JWT never exposed in response body
- ✅ Automatic cleanup on logout

## Endpoints

All auth endpoints are under `/api/auth`

### 1. POST `/signup`
Create a new account and automatically log in the user.

**Request:**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "professional" // or "employer"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "professional",
      "compName": null,
      "location": null,
      "phone": null,
      "isVerified": false,
      "createdAt": "2026-04-25T10:30:00.000Z"
    }
  },
  "timestamp": "2026-04-25T10:30:00.000Z"
}
```

**Cookie Set:** `token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`

### 2. POST `/login`
Authenticate existing user and establish session.

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
Same structure as signup success response.

**Cookie Set:** Same as signup (refreshes token)

### 3. GET `/verify`
Verify current session and refresh user data. Use on app load/refresh.

**Request:**
```http
GET /api/auth/verify
Cookie: token=<jwt>
```

**Success Response (200 OK):**
Same user object structure as above.

**Error Responses:**
- `401 Unauthorized`: No token, expired token, or invalid token

### 4. POST `/logout`
End current session and clear auth cookie.

**Request:**
```http
POST /api/auth/logout
Cookie: token=<jwt>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2026-04-25T10:45:00.000Z"
}
```

**Cookie Cleared:** `token=; HttpOnly; Path=/; SameSite=Lax`

## Frontend Integration Patterns

### Using Fetch API
```javascript
// Configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5020';

// Helper for authenticated requests
async function apiFetch(endpoint, options = {}) {
  return fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include', // Critical for sending cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
}

// Example: Signup
async function signUp(userData) {
  const response = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Sign up failed');
  }
  
  return await response.json();
}

// Example: Check auth status on app load
async function checkAuthStatus() {
  try {
    const response = await apiFetch('/api/auth/verify');
    if (response.ok) {
      const data = await response.json();
      return data.data.user; // Return user object
    }
    return null; // Not authenticated
  } catch (error) {
    return null; // Treat as not authenticated
  }
}

// Example: Logout
async function logOut() {
  const response = await apiFetch('/api/auth/logout', {
    method: 'POST',
  });
  
  if (!response.ok) {
    console.warn('Logout failed but clearing local state');
  }
  // Clear local auth state regardless
}
```

### Using Axios
```javascript
import axios from 'axios';

// Create instance with credentials
const api = axios.create({
  baseURL: 'http://localhost:5020/api/auth',
  withCredentials: true, // Sends cookies with requests
});

// Example usage
async function login(credentials) {
  try {
    const response = await api.post('/login', credentials);
    return response.data.data.user;
  } catch (error) {
    throw error.response?.data || new Error('Login failed');
  }
}

async function verifySession() {
  try {
    const response = await api.get('/verify');
    return response.data.data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      return null; // Session expired/invalid
    }
    throw error;
  }
}

async function logout() {
  try {
    await api.post('/logout');
  } catch (error) {
    // Continue with logout cleanup even if request fails
  } finally {
    // Clear local auth state
  }
}
```

## Response Format Standards

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { /* payload varies by endpoint */ },
  "timestamp": "ISO 8601 timestamp"
}
```

### Error Response
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "statusCode": HTTP_STATUS_CODE,
  "timestamp": "ISO 8601 timestamp"
}
```

### Common Error Status Codes
- `400`: Validation error (bad request)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (e.g., duplicate email)
- `500`: Internal server error

## User Object Structure

When returned by auth endpoints, the user object contains:
```json
{
  "id": 123,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "professional" | "employer",
  "compName": null || "Company Name",
  "location": null || "Location String",
  "phone": null || "Phone Number",
  "isVerified": false,
  "createdAt": "2026-04-25T10:30:00.000Z"
}
```

**Important Notes:**
- Password hash is NEVER returned
- JWT token is NEVER returned in response body (only in cookie)
- `compName` is only relevant for `userType: "employer"`
- `location` and `phone` may be null (accepted but not currently persisted in Phase 1 signup)

## Session Management

### Recommended Auth Flow
1. **On App Load:** Call `/api/auth/verify` to check session
2. **On Successful Login/Signup:** Store user data from response
3. **On Logout or 401 Response:** Clear user data and redirect to login
4. **Protected Routes:** Check auth status before rendering

### Handling Token Expiry
Due to the 30-minute JWT expiry vs 7-day cookie:
1. The cookie may persist after the token inside it expires
2. `/verify` will return `401` when token is expired
3. Frontend should treat any `401` from `/verify` as logged out
4. Clear local auth state and redirect to login

## CORS Configuration

The backend is configured to accept requests only from the origin specified in `FRONTEND_URL` environment variable.

**Development Default:** `http://localhost:5173`

**Frontend Requirements:**
- Must be served from the exact origin specified in `FRONTEND_URL`
- During development, ensure your dev server matches this
- In production, ensure the backend's `FRONTEND_URL` matches your deployed frontend

## Testing Credentials (Development)

For local development testing, you can use:
```
Email: test@example.com
Password: TestPass123!
```

*Note: These credentials may not exist in fresh database instances. Create your own test account via signup.*

## Common Issues & Troubleshooting

### 1. Cookie Not Being Sent
**Problem:** Authenticated endpoints return 401 despite logging in
**Solution:** Ensure you're using:
- Fetch: `credentials: 'include'`
- Axios: `withCredentials: true`
- Or manually setting cookies (not recommended)

### 2. CORS Errors
**Problem:** Browser blocks requests due to CORS policy
**Solution:**
- Verify frontend origin matches `FRONTEND_URL` in backend env
- In development, check that your dev server port matches expected
- Ensure you're not making requests to different domains/ports

### 3. Unexpected 401 After Login
**Problem:** Login succeeds but subsequent requests return 401
**Solutions:**
1. Check if you're sending credentials with requests
2. Verify the cookie is being set in browser dev tools
3. Remember JWT expires in 30 minutes - call `/verify` to check validity
4. Clear cookies and re-login if needed

### 4. Missing User Data
**Problem:** Auth endpoints return success but no user data
**Solution:**
- Check that you're accessing `response.data.data.user` (nested structure)
- The API wraps user data in: `{ success, message, data: { user: ... }, timestamp }`

## Next Steps Beyond Phase 1

After integrating authentication, these Phase 2+ features will be available:

- **Profiles:** `/api/profiles` (GET/PUT for current user)
- **Skills:** `/api/skills` (catalog and user skills)
- **Jobs:** `/api/jobs` (browse, post, manage job listings)
- **Applications:** `/api/applications` (apply to jobs, manage applications)
- **Payments:** `/api/payments` (processing payments and subscriptions)

Refer to the individual module documentation or the main API documentation for details on these endpoints.

## Getting Help

1. **Check the backend logs** for detailed error information
2. **Refer to the API documentation** in `docs/PHASE1/AUTH_API_ENDPOINTS.md`
3. **Review integration tests** in `src/__tests__` for working examples
4. **Contact the backend team** for environment-specific issues or clarifications

---
*This guide covers the Phase 1 authentication system only. For a complete list of available endpoints beyond authentication, see the `INTEGRATION_READINESS_REPORT.md` document.*