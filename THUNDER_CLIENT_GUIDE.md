# Thunder Client - Phase 1 Testing Guide

## Overview

This guide explains how to use Thunder Client to test all Phase 1 authentication endpoints. Thunder Client is a lightweight alternative to Postman, built directly into VS Code.

---

## Installation & Setup

### Step 1: Install Thunder Client Extension
```
VS Code Extensions → Search "Thunder Client" 
Publisher: Thunder Client
Install the extension
```

### Step 2: Import the Test Collection
```
1. Open Thunder Client panel (left sidebar)
2. Click "Collections" icon
3. Click "Import"
4. Select: Thunder-Client-Collection.json
5. Collection "Linkprosoft Auth API - Phase 1 Testing" imported ✅
```

### Step 3: Start Your Backend Server
```bash
cd linkprosoft_backend
npm install
npm run dev
# Server should start on http://localhost:5020
```

---

## Test Execution Strategy

### Recommended Order
1. **Health Check** - Verify server is running
2. **Signup Tests** - Test user registration
3. **Login Tests** - Test authentication
4. **Verify Tests** - Test token verification
5. **Logout Tests** - Test session termination

### Key Points
- **Run tests sequentially** (not in parallel)
- **Signup before Login** (create user first)
- **Login before Verify** (need token)
- **Verify before Logout** (need valid session)

---

## Test Descriptions

### 1. SIGNUP - Professional User
**Endpoint:** `POST /api/auth/signup`  
**Expected Status:** 201 Created

**Test Data:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@test.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "professional",
  "phone": "+1234567890",
  "location": "New York"
}
```

**Validations:**
- ✅ Status code is 201
- ✅ Response has `success: true`
- ✅ Response has `message`, `data`, `timestamp`
- ✅ User data contains no password (security check)
- ✅ Token is set in HTTP-only cookie

**Success Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@test.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "professional",
      "phone": "+1234567890",
      "location": "New York",
      "createdAt": "2026-04-21T10:00:00Z"
    }
  },
  "timestamp": "2026-04-21T10:00:00.000Z"
}
```

---

### 2. SIGNUP - Employer User
**Endpoint:** `POST /api/auth/signup`  
**Expected Status:** 201 Created

**Test Data:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "password": "SecurePass456!",
  "passwordConfirm": "SecurePass456!",
  "userType": "employer",
  "compName": "Tech Company Inc.",
  "phone": "+1987654321",
  "location": "San Francisco"
}
```

**Validations:**
- ✅ Status code is 201
- ✅ Company name is included in response
- ✅ User type is `employer`

**Note:** Employer users MUST provide `compName` field

---

### 3. SIGNUP - Validation Error (Missing Email)
**Endpoint:** `POST /api/auth/signup`  
**Expected Status:** 400 Bad Request

**Test Data:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "userType": "professional"
}
```

**Validations:**
- ✅ Status code is 400
- ✅ `success: false`
- ✅ Error message provided

**Validation Rules Tested:**
- Email is required
- Email must be valid format
- Password minimum 8 characters
- Password must match passwordConfirm
- First name must not be empty
- Last name must not be empty
- User type must be "professional" or "employer"

---

### 4. SIGNUP - Duplicate Email (409 Conflict)
**Endpoint:** `POST /api/auth/signup`  
**Expected Status:** 409 Conflict

**Test Data:**
```json
{
  "firstName": "Another",
  "lastName": "User",
  "email": "john.doe@test.com",
  "password": "DifferentPass456!",
  "passwordConfirm": "DifferentPass456!",
  "userType": "professional"
}
```

**Validations:**
- ✅ Status code is 409
- ✅ Message indicates email already exists
- ✅ No duplicate user created

**Note:** Run Test 1 first to create john.doe@test.com, then this test will fail as expected.

---

### 5. LOGIN - Valid Credentials
**Endpoint:** `POST /api/auth/login`  
**Expected Status:** 200 OK

**Test Data:**
```json
{
  "email": "john.doe@test.com",
  "password": "SecurePass123!"
}
```

**Validations:**
- ✅ Status code is 200
- ✅ `success: true`
- ✅ Message indicates successful login
- ✅ User data includes email
- ✅ Token is set in HTTP-only cookie
- ✅ No password in response

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@test.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "professional",
      "createdAt": "2026-04-21T10:00:00Z"
    }
  },
  "timestamp": "2026-04-21T10:01:00.000Z"
}
```

---

### 6. LOGIN - Invalid Password
**Endpoint:** `POST /api/auth/login`  
**Expected Status:** 401 Unauthorized

**Test Data:**
```json
{
  "email": "john.doe@test.com",
  "password": "WrongPassword123!"
}
```

**Validations:**
- ✅ Status code is 401
- ✅ `success: false`
- ✅ No token returned

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "timestamp": "2026-04-21T10:02:00.000Z"
}
```

---

### 7. LOGIN - User Not Found
**Endpoint:** `POST /api/auth/login`  
**Expected Status:** 401 Unauthorized

**Test Data:**
```json
{
  "email": "nonexistent@test.com",
  "password": "SomePassword123!"
}
```

**Validations:**
- ✅ Status code is 401
- ✅ `success: false`
- ✅ Same error message as invalid password (security best practice)

**Note:** This follows security best practices - we don't reveal whether an email exists or not.

---

### 8. VERIFY - Valid Token (from Cookie)
**Endpoint:** `GET /api/auth/verify`  
**Expected Status:** 200 OK
**Auth Required:** Yes (via cookie)

**How It Works:**
1. Thunder Client automatically includes cookies from previous requests
2. After login/signup, the `token` cookie is stored
3. This test sends GET request with that cookie
4. Backend verifies the JWT token

**Validations:**
- ✅ Status code is 200
- ✅ `success: true`
- ✅ Message indicates session verified
- ✅ User data is returned
- ✅ User ID and email included
- ✅ No password in response

**Success Response:**
```json
{
  "success": true,
  "message": "Session verified",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@test.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "professional",
      "createdAt": "2026-04-21T10:00:00Z"
    }
  },
  "timestamp": "2026-04-21T10:03:00.000Z"
}
```

---

### 9. VERIFY - Missing Token (401)
**Endpoint:** `GET /api/auth/verify`  
**Expected Status:** 401 Unauthorized
**Auth Required:** Yes (but missing)

**How to Test:**
1. Clear cookies in Thunder Client (or open in new context)
2. Send GET request without cookie
3. Should receive 401

**Validations:**
- ✅ Status code is 401
- ✅ `success: false`
- ✅ Message indicates login required

**Error Response:**
```json
{
  "success": false,
  "error": "Please login to access this resource",
  "timestamp": "2026-04-21T10:04:00.000Z"
}
```

---

### 10. VERIFY - Using Authorization Header
**Endpoint:** `GET /api/auth/verify`  
**Expected Status:** 200 OK
**Auth Required:** Yes (via Authorization header)

**How It Works:**
1. After login, extract the JWT token
2. Add it to Authorization header: `Bearer <token>`
3. Send request without relying on cookies

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Validations:**
- ✅ Status code is 200
- ✅ Token from header is recognized
- ✅ Works even without cookies

**Note:** Replace the example token with actual token from login response.

---

### 11. LOGOUT - Valid Session
**Endpoint:** `POST /api/auth/logout`  
**Expected Status:** 200 OK
**Auth Required:** Yes

**How It Works:**
1. Must have valid token (from login/signup)
2. POST request clears the token cookie
3. Token is revoked (no longer valid)

**Validations:**
- ✅ Status code is 200
- ✅ `success: true`
- ✅ Message indicates logout success
- ✅ Cookie is cleared (Set-Cookie header present)

**Success Response:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2026-04-21T10:05:00.000Z"
}
```

---

### 12. LOGOUT - Without Token (401)
**Endpoint:** `POST /api/auth/logout`  
**Expected Status:** 401 Unauthorized

**How to Test:**
1. Clear cookies (or test in new context)
2. POST request without authentication
3. Should receive 401

**Validations:**
- ✅ Status code is 401
- ✅ `success: false`

**Error Response:**
```json
{
  "success": false,
  "error": "Please login to access this resource",
  "timestamp": "2026-04-21T10:06:00.000Z"
}
```

---

### 13. HEALTH CHECK
**Endpoint:** `GET /health`  
**Expected Status:** 200 OK
**Auth Required:** No

**Purpose:** Verify server is running

**Success Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-21T10:07:00.000Z",
  "uptime": 305.123
}
```

---

## Testing Workflows

### Full Workflow 1: Complete User Journey (Professional)
```
1. SIGNUP - Professional User          ✅ 201
   └─ Creates new user & sets token
   
2. VERIFY - Valid Token                ✅ 200
   └─ Confirms session works
   
3. LOGOUT - Valid Session              ✅ 200
   └─ Clears token
   
4. VERIFY - Missing Token              ✅ 401
   └─ Confirms token was cleared
```

### Full Workflow 2: Complete User Journey (Employer)
```
1. SIGNUP - Employer User              ✅ 201
   └─ Creates employer with company
   
2. LOGIN - Valid Credentials           ✅ 200
   └─ Authenticates with credentials
   
3. VERIFY - Valid Token                ✅ 200
   └─ Confirms session
   
4. LOGOUT - Valid Session              ✅ 200
   └─ Ends session
```

### Workflow 3: Error Testing
```
1. SIGNUP - Missing Email              ✅ 400
2. SIGNUP - Duplicate Email            ✅ 409
3. LOGIN - Invalid Password            ✅ 401
4. LOGIN - User Not Found              ✅ 401
5. VERIFY - Missing Token              ✅ 401
6. LOGOUT - Without Token              ✅ 401
```

---

## Thunder Client Tips & Tricks

### Running Tests
```
1. Click test request
2. Click "Send" button (or Ctrl+Enter)
3. View response in right panel
4. Check "Tests" tab for results
```

### Viewing Cookies
```
1. Click "Cookies" tab in Thunder Client
2. See all stored cookies
3. Use "Clear Cookies" to reset state
```

### Extracting Tokens
```
1. After login, view response
2. Copy Authorization header value
3. Paste into Authorization header field of next request
4. Or use cookies automatically (preferred)
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot GET /api/auth/verify" | Server not running. Run `npm run dev` |
| 401 errors on verify | Clear cookies. Re-run signup/login first |
| Duplicate email error | Use different email for each test run |
| Token expired | Token lasts 7 days. Or logout & login again |
| CORS errors | Check backend CORS config in app.ts |

---

## Expected Test Results Summary

| Test # | Name | Status | Code |
|--------|------|--------|------|
| 1 | SIGNUP Professional | ✅ PASS | 201 |
| 2 | SIGNUP Employer | ✅ PASS | 201 |
| 3 | SIGNUP Validation Error | ✅ PASS | 400 |
| 4 | SIGNUP Duplicate Email | ✅ PASS | 409 |
| 5 | LOGIN Valid | ✅ PASS | 200 |
| 6 | LOGIN Invalid Password | ✅ PASS | 401 |
| 7 | LOGIN Not Found | ✅ PASS | 401 |
| 8 | VERIFY Valid | ✅ PASS | 200 |
| 9 | VERIFY Missing | ✅ PASS | 401 |
| 10 | VERIFY Header | ✅ PASS | 200 |
| 11 | LOGOUT Valid | ✅ PASS | 200 |
| 12 | LOGOUT Invalid | ✅ PASS | 401 |
| 13 | HEALTH CHECK | ✅ PASS | 200 |

**Total Tests:** 13  
**Success Rate Target:** 100%

---

## Security Notes

### What These Tests Validate
- ✅ Passwords never returned in responses
- ✅ Tokens only in HTTP-only cookies (not in response body)
- ✅ 401 errors don't reveal email existence
- ✅ Duplicate emails return 409, not 400
- ✅ Session tokens verified on every protected endpoint

### What These Tests Don't Cover
- Rate limiting (Phase 1B)
- Email verification (Phase 1B)
- Password reset flow (Phase 1B)
- 2FA/MFA (Phase 3+)
- Session refresh tokens (Phase 2)

---

## Performance Notes

### Expected Response Times
- Signup: 150-200ms (hash + insert)
- Login: 140-180ms (bcrypt verify)
- Verify: 50-80ms (JWT check + query)
- Logout: 10-30ms (clear cookie)

### Factors Affecting Performance
- Database distance (localhost = fastest)
- Bcrypt salt rounds (10 = standard)
- Network latency
- Server load

---

## Troubleshooting Guide

### Server Won't Start
```bash
# Check if port 5020 is in use
lsof -i :5020

# If in use, kill process
kill -9 <PID>

# Or change port in server.ts
npm run dev
```

### "Cannot find module" Errors
```bash
# Install dependencies
npm install

# Rebuild TypeScript
npm run build
```

### Database Connection Issues
```bash
# Check MONGO_URI in .env
cat .env | grep MONGO_URI

# Test connection manually
mongosh "mongodb://localhost:27017/linkprosoft"
```

### JWT Verification Fails
```bash
# Check JWT_SECRET in .env
cat .env | grep JWT_SECRET

# Tokens should last 7 days
# If getting "token expired", create new user
```

---

## Next Steps

After Phase 1 testing is complete:

1. ✅ All 13 tests passing
2. ✅ Frontend integration ready
3. ✅ Move to Phase 2:
   - User profile endpoints
   - File upload
   - Search/filtering
4. ✅ Production deployment review

---

## Additional Resources

- **Auth API Endpoints:** See `AUTH_API_ENDPOINTS.md`
- **Implementation Details:** See `DAY4_EXECUTION_GUIDE.md`
- **Assessment Report:** See `PHASE_1_ASSESSMENT.md`
- **Type Definitions:** See `src/types/`

---

**Document:** Thunder Client Testing Guide  
**Version:** 1.0  
**Status:** Complete  
**Last Updated:** April 21, 2026

