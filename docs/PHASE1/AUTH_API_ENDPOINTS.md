# Authentication API Endpoints

Frontend integration contract for Linkprosoft Phase 1 authentication.

This document is intended to be the source of truth for frontend integration at the current Phase 1 state of the backend. It reflects the actual runtime behavior in the codebase as of April 25, 2026.

## Overview

- Base path: `http://localhost:5020/api/auth`
- Auth model: HTTP-only cookie JWT
- Browser clients must send credentials on every authenticated request
- Supported endpoints:
  - `POST /signup`
  - `POST /login`
  - `GET /verify`
  - `POST /logout`

## Important Integration Notes

- Browser frontend must use `credentials: 'include'` with `fetch`, or `withCredentials: true` with Axios.
- The backend primarily authenticates browsers via the `token` cookie.
- The backend also supports `Authorization: Bearer <token>` as a fallback for non-browser clients.
- JWT expiry is `30 minutes`.
- Cookie lifetime is `7 days`.
- If the JWT expires, `/verify` and `/logout` will return `401` even if the cookie still exists.
- At the current Phase 1 state, `phone` and `location` are accepted in signup validation but are not persisted by the signup flow. Frontend should not rely on them being saved during auth signup.

## Base URLs

### Local development

```text
Backend API base: http://localhost:5020
Auth base:        http://localhost:5020/api/auth
```

### Frontend origin

The backend CORS origin is controlled by:

```env
FRONTEND_URL=http://localhost:5173
```

If `FRONTEND_URL` is not set, the backend defaults to `http://localhost:5173`.

## Standard Response Shapes

### Success response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
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
  "timestamp": "2026-04-25T10:35:00.000Z"
}
```

### Error response

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Invalid email address, Password must contain at least one special character",
  "statusCode": 400,
  "timestamp": "2026-04-25T10:35:00.000Z"
}
```

## User Object Returned By Auth Endpoints

```json
{
  "id": 123,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "professional",
  "compName": null,
  "location": null,
  "phone": null,
  "isVerified": false,
  "createdAt": "2026-04-25T10:30:00.000Z"
}
```

Notes:

- `compName` is typically `null` for professional users.
- `location` and `phone` may be `null`.
- Password is never returned.
- JWT token is never returned in the JSON body.

---

## 1. POST `/signup`

Create a new user account and start an authenticated session.

### Request headers

```http
Content-Type: application/json
```

### Request body

Professional signup:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "professional"
}
```

Employer signup:

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "employer",
  "compName": "Tech Company Inc."
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `firstName` | string | Yes | Trimmed, cannot be empty, max 50 chars |
| `lastName` | string | Yes | Trimmed, cannot be empty, max 50 chars |
| `email` | string | Yes | Valid email, lowercased, must be unique |
| `password` | string | Yes | Min 8 chars, at least one uppercase letter, one number, one special character |
| `passwordConfirm` | string | Yes | Must satisfy same password rules and match `password` |
| `userType` | enum | Yes | `professional` or `employer` |
| `compName` | string | Conditionally | Required for `employer`, 2-100 chars |
| `phone` | string | No | Accepted by validation, max 20 chars, currently not persisted by signup flow |
| `location` | string | No | Accepted by validation, max 100 chars, currently not persisted by signup flow |

### Success response

Status: `201 Created`

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

### Cookie behavior

On success, the server sets:

```text
Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

Production also sets:

```text
Secure
```

### Expected error statuses

- `400` validation failure
- `409` email already exists
- `500` unexpected server error

### Common validation messages

- `Invalid email address`
- `Password must be at least 8 characters`
- `Password must contain at least one uppercase letter`
- `Password must contain at least one number`
- `Password must contain at least one special character`
- `Passwords don't match`
- `Company name is required for employers`

---

## 2. POST `/login`

Authenticate an existing user and start an authenticated session.

### Request headers

```http
Content-Type: application/json
```

### Request body

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Trimmed, cannot be empty |

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
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
  "timestamp": "2026-04-25T10:35:00.000Z"
}
```

### Cookie behavior

On success, the server sets the auth cookie again:

```text
Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

### Expected error statuses

- `400` validation failure
- `401` invalid email or password
- `500` unexpected server error

---

## 3. GET `/verify`

Validate the current session and return fresh user data.

This endpoint is intended for app boot, page refresh, and restoring auth state.

### Authentication

Browser usage:

- send the auth cookie automatically via `credentials: 'include'`

Fallback client usage:

- `Authorization: Bearer <token>`

### Request example

```http
GET /api/auth/verify
Cookie: token=<jwt>
```

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Session verified",
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
  "timestamp": "2026-04-25T10:40:00.000Z"
}
```

### Expected error statuses

- `401` no token provided
- `401` token expired
- `401` invalid token
- `500` unexpected server error

### Example frontend usage with `fetch`

```javascript
async function restoreUserSession() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    const payload = await response.json();
    setUser(payload.data.user);
    setIsAuthenticated(true);
  } catch (error) {
    setUser(null);
    setIsAuthenticated(false);
    console.error("Session verification failed", error);
  }
}
```

---

## 4. POST `/logout`

Clear the auth cookie and end the current session.

### Authentication

Requires a valid authenticated request.

Browser usage:

- send cookie via `credentials: 'include'`

Fallback client usage:

- `Authorization: Bearer <token>`

### Request body

No body required.

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2026-04-25T10:45:00.000Z"
}
```

### Cookie behavior

On success, the backend clears the cookie:

```text
Set-Cookie: token=; HttpOnly; Path=/; SameSite=Lax
```

In practice the browser will treat it as cleared because the server uses `clearCookie(...)`.

### Expected error statuses

- `401` no token provided
- `401` invalid token
- `401` token expired
- `500` unexpected server error

### Example frontend usage with `fetch`

```javascript
async function logout() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      setUser(null);
      setIsAuthenticated(false);
    }
  } catch (error) {
    console.error("Logout failed", error);
  }
}
```

---

## Frontend Setup

### Axios

```javascript
import axios from "axios";

export const authApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/auth`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Fetch helper

```javascript
export async function apiFetch(path, options = {}) {
  return fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
}
```

---

## Frontend Error Handling Guidance

The backend currently returns validation failures as a single string in `message`, not as a field-level `errors` array.

Example:

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Invalid email address, Password must contain at least one special character",
  "statusCode": 400,
  "timestamp": "2026-04-25T10:35:00.000Z"
}
```

Recommended frontend handling:

- Use `statusCode` or HTTP status for control flow
- Display `message` directly for now
- Do not assume `errors[]` exists in Phase 1

Example:

```javascript
try {
  const response = await authApi.post("/signup", formData);
  return response.data.data.user;
} catch (error) {
  if (error.response?.status === 409) {
    throw new Error("An account with this email already exists.");
  }

  if (error.response?.status === 400) {
    throw new Error(error.response.data.message);
  }

  if (error.response?.status === 401) {
    throw new Error("Authentication failed.");
  }

  throw new Error("Something went wrong. Please try again.");
}
```

---

## Session Behavior

- Signup logs the user in immediately.
- Login refreshes the auth cookie.
- Verify returns fresh user data from the database.
- Logout requires a valid current token.
- If the token expires, the frontend should clear local auth state and redirect to login.

### Current auth timing mismatch

At the current backend state:

- cookie lifetime: 7 days
- JWT lifetime: 30 minutes

This means a browser may still hold the cookie after the token inside it has expired. The expected frontend behavior is:

1. Call `/verify` on app load.
2. If the response is `401`, treat the session as expired.
3. Clear local auth state and route user to login.

---

## Environment Variables

### Backend

Required:

```env
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

Recommended for local frontend integration:

```env
FRONTEND_URL=http://localhost:5173
```

### Frontend

```env
VITE_API_BASE_URL=http://localhost:5020
```

---

## Local Testing With cURL

```bash
# Signup
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional"
  }' \
  -c cookies.txt

# Login
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt

# Verify with cookie
curl -X GET http://localhost:5020/api/auth/verify \
  -b cookies.txt

# Logout with cookie
curl -X POST http://localhost:5020/api/auth/logout \
  -b cookies.txt
```

---

## Phase 1 Contract Summary

The frontend can safely rely on the following for Phase 1:

- auth endpoints and paths in this document
- standardized `success`, `message`, `timestamp`, and optional `data`
- cookie-based browser auth with `credentials: 'include'`
- `401` from `/verify` meaning unauthenticated or expired session
- user payload shape documented above

The frontend should not rely on the following yet:

- `phone` and `location` being persisted during signup
- field-level validation error arrays
- long-lived sessions beyond the current 30 minute JWT expiry

