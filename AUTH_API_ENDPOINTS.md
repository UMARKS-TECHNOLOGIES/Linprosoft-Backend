# Authentication API Endpoints

Complete documentation for the Linkprosoft authentication API. All requests/responses follow a standardized format with HTTP-only cookie-based JWT authentication.

## Base URL
```
http://localhost:5020/api/auth
```

## Response Format

### Success Response (2xx)
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
      "phone": "+1234567890",
      "location": "New York",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "error": "error_type",
  "message": "Human readable error message",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Validation Error Response (400)
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:35:00Z"
}
```

---

## Public Endpoints

### 1. POST /signup
Create a new user account (professional or employer)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "professional",
  "phone": "+1234567890",
  "location": "New York"
}
```

**For Employer Account:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "employer",
  "compName": "Tech Company Inc.",
  "phone": "+1234567890",
  "location": "San Francisco"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| firstName | string | ✅ | Non-empty |
| lastName | string | ✅ | Non-empty |
| email | string | ✅ | Valid email format, unique |
| password | string | ✅ | Min 8 characters, letters & numbers |
| passwordConfirm | string | ✅ | Must match password |
| userType | enum | ✅ | "professional" or "employer" |
| compName | string | ⚠️ | Required if userType="employer" |
| phone | string | ❌ | Optional |
| location | string | ❌ | Optional |

**Response:** 201 Created
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
      "phone": "+1234567890",
      "location": "New York",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Sets Cookie:**
```
Set-Cookie: token=<jwt_token>; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=604800
```

**Error Cases:**
- 400: Validation error (see validation errors above)
- 409: Email already exists
- 500: Server error

---

### 2. POST /login
Authenticate user and start session

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | ✅ | Valid email format |
| password | string | ✅ | Non-empty |

**Response:** 200 OK
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
      "phone": "+1234567890",
      "location": "New York",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

**Sets Cookie:**
```
Set-Cookie: token=<jwt_token>; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=604800
```

**Error Cases:**
- 400: Validation error
- 401: Invalid email or password
- 500: Server error

---

## Protected Endpoints

All protected endpoints require authentication via HTTP-only cookie. If cookie is missing, request will fail with 401.

**How Authentication Works:**
1. After signup/login, token is automatically set in HTTP-only cookie
2. Browser automatically includes cookie in all subsequent requests
3. Backend extracts token from cookie and verifies it
4. If valid, request proceeds; if invalid/expired, returns 401

### 3. GET /verify
Verify current session and restore user data

**Request Headers:**
```
Cookie: token=<jwt_token>
```

**Response:** 200 OK
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
      "phone": "+1234567890",
      "location": "New York",
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

**Frontend Usage:**
```javascript
// Call on app mount to restore session
async function restoreUserSession() {
  try {
    const response = await fetch('http://localhost:5020/api/auth/verify', {
      method: 'GET',
      credentials: 'include', // Important: sends cookies
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.data.user);
      setIsAuthenticated(true);
    } else {
      // Session expired or invalid
      setUser(null);
      setIsAuthenticated(false);
    }
  } catch (error) {
    console.error('Session verification failed:', error);
  }
}

// Call on app initialization
useEffect(() => {
  restoreUserSession();
}, []);
```

**Error Cases:**
- 401: No valid token or token expired
- 500: Server error

---

### 4. POST /logout
Clear user session by removing token cookie

**Request Headers:**
```
Cookie: token=<jwt_token>
```

**Request Body:** Empty

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

**Clears Cookie:**
```
Set-Cookie: token=; HttpOnly; Path=/; Max-Age=0
```

**Frontend Usage:**
```javascript
async function logout() {
  try {
    const response = await fetch('http://localhost:5020/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Important: sends cookies
    });

    if (response.ok) {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

**Error Cases:**
- 401: No valid token or token expired
- 500: Server error

---

## Frontend Integration Example

### Setup with Axios
```javascript
import axios from 'axios';

const authAPI = axios.create({
  baseURL: 'http://localhost:5020/api/auth',
  withCredentials: true, // CRITICAL: enables cookie sending
  headers: {
    'Content-Type': 'application/json',
  },
});

export default authAPI;
```

### Using the API
```javascript
// Signup
const response = await authAPI.post('/signup', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  passwordConfirm: 'SecurePass123!',
  userType: 'professional',
});

// Login
const response = await authAPI.post('/login', {
  email: 'john@example.com',
  password: 'SecurePass123!',
});

// Verify session
const response = await authAPI.get('/verify');

// Logout
const response = await authAPI.post('/logout');
```

### Error Handling
```javascript
try {
  const response = await authAPI.post('/signup', signupData);
  
  if (response.data.success) {
    // Handle success
    console.log('User created:', response.data.data.user);
  }
} catch (error) {
  if (error.response) {
    // Server responded with error
    if (error.response.status === 409) {
      console.log('Email already exists');
    } else if (error.response.status === 400) {
      // Validation error
      const validationErrors = error.response.data.errors;
      validationErrors.forEach(err => {
        console.log(`${err.field}: ${err.message}`);
      });
    }
  } else if (error.request) {
    console.log('No response from server');
  } else {
    console.log('Error:', error.message);
  }
}
```

---

## Security Features

### HTTP-Only Cookies
- Token stored in HTTP-only cookie (inaccessible to JavaScript)
- Protects against XSS (Cross-Site Scripting) attacks
- Browser automatically includes in requests with `credentials: 'include'`

### CSRF Protection
- `SameSite=Lax` cookie attribute prevents CSRF attacks
- Cookies only sent to same-site requests
- Cross-origin requests must explicitly include credentials

### Secure HTTPS
- In production, `Secure` flag requires HTTPS only
- Cookies never transmitted over unencrypted connections
- Development mode allows HTTP for localhost

### Password Security
- Passwords hashed with bcrypt
- Min 8 characters required
- Password never returned in responses

### JWT Token
- Signed with server secret
- Includes user ID, email, and user type
- Expires after 7 days
- Verified on each protected request

---

## Common Issues & Solutions

### Issue: Cookies not being set
**Solution:** Ensure `credentials: 'include'` or `withCredentials: true` is set in requests

### Issue: 401 when accessing protected routes
**Solution:** Verify token is valid by calling `/verify` endpoint; if it returns 401, user needs to login again

### Issue: CORS errors
**Solution:** Backend allows `http://localhost:5173` - ensure frontend runs on this URL

### Issue: "Email already exists" on signup
**Solution:** Use a different email address or clear database (for development)

### Issue: Token not included in Authorization header
**Solution:** Use format `Bearer <token>` in Authorization header (fallback when cookies unavailable)

---

## Status Codes Reference

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created (signup success) |
| 400 | Bad Request | Validation failed or malformed request |
| 401 | Unauthorized | Missing token or invalid credentials |
| 403 | Forbidden | Insufficient permissions for resource |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Unexpected server error |

---

## Environment Variables Required

Backend should have:
```
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

Frontend should use:
```
VITE_API_BASE_URL=http://localhost:5020
```

---

## Testing with cURL

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

# Verify (with cookies)
curl -X GET http://localhost:5020/api/auth/verify \
  -b cookies.txt

# Logout (with cookies)
curl -X POST http://localhost:5020/api/auth/logout \
  -b cookies.txt
```

---

## Next Steps

- Implement email verification flow
- Add password reset functionality
- Add profile update endpoint
- Implement refresh token for longer sessions
- Add rate limiting to auth endpoints
- Add logging for all auth operations

