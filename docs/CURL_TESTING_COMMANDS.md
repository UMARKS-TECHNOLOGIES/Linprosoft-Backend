# cURL Testing Commands - Phase 1 Auth Endpoints

## Overview

This file contains ready-to-use cURL commands for testing all Phase 1 endpoints. Perfect for:
- Terminal-based testing
- CI/CD pipelines
- Automation scripts
- Quick validation

---

## Prerequisites

```bash
# Ensure server is running
cd linkprosoft_backend
npm run dev
# Should see: Server running on http://localhost:5020
```

---

## Cookie Management

Thunder Client handles cookies automatically, but with cURL you need to manage them:

```bash
# Save cookies to file after login/signup
-c cookies.txt

# Load cookies from file in subsequent requests
-b cookies.txt

# Or pass token directly via Authorization header
-H "Authorization: Bearer <token>"
```

---

## Test Commands

### 1. HEALTH CHECK
```bash
curl -X GET http://localhost:5020/health \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-21T10:00:00.000Z"
}
```

---

### 2. SIGNUP - Professional User
```bash
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@test.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional",
    "phone": "+1234567890",
    "location": "New York"
  }'
```

**Expected Response:**
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

### 3. SIGNUP - Employer User
```bash
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies_employer.txt \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@company.com",
    "password": "SecurePass456!",
    "passwordConfirm": "SecurePass456!",
    "userType": "employer",
    "compName": "Tech Company Inc.",
    "phone": "+1987654321",
    "location": "San Francisco"
  }'
```

---

### 4. SIGNUP - Validation Error (Missing Email)
```bash
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "timestamp": "2026-04-21T10:01:00.000Z"
}
```

---

### 5. SIGNUP - Duplicate Email
```bash
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Another",
    "lastName": "User",
    "email": "john.doe@test.com",
    "password": "DifferentPass456!",
    "passwordConfirm": "DifferentPass456!",
    "userType": "professional"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Email already exists",
  "timestamp": "2026-04-21T10:02:00.000Z"
}
```

---

### 6. LOGIN - Valid Credentials
```bash
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies_login.txt \
  -d '{
    "email": "john.doe@test.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**
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
  "timestamp": "2026-04-21T10:03:00.000Z"
}
```

---

### 7. LOGIN - Invalid Password
```bash
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@test.com",
    "password": "WrongPassword123!"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "timestamp": "2026-04-21T10:04:00.000Z"
}
```

---

### 8. LOGIN - User Not Found
```bash
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@test.com",
    "password": "SomePassword123!"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "timestamp": "2026-04-21T10:05:00.000Z"
}
```

---

### 9. VERIFY - With Cookie
```bash
# Using saved cookies from login
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -b cookies_login.txt
```

**Expected Response:**
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
  "timestamp": "2026-04-21T10:06:00.000Z"
}
```

---

### 10. VERIFY - Without Token/Cookie
```bash
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Please login to access this resource",
  "timestamp": "2026-04-21T10:07:00.000Z"
}
```

---

### 11. VERIFY - With Authorization Header
```bash
# First, extract token from login response
# Then pass it in Authorization header

curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqb2huLmRvZUB0ZXN0LmNvbSIsInVzZXJUeXBlIjoicHJvZmVzc2lvbmFsIiwiaWF0IjoxNjI2NzcwMDAwLCJleHAiOjE2MjczNzYwMDB9.abc123..."
```

**Expected Response:**
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
  "timestamp": "2026-04-21T10:08:00.000Z"
}
```

---

### 12. LOGOUT - Valid Session
```bash
curl -X POST http://localhost:5020/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies_login.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2026-04-21T10:09:00.000Z"
}
```

---

### 13. LOGOUT - Without Token
```bash
curl -X POST http://localhost:5020/api/auth/logout \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Please login to access this resource",
  "timestamp": "2026-04-21T10:10:00.000Z"
}
```

---

## Testing Workflows via cURL

### Complete Professional User Flow
```bash
#!/bin/bash

# 1. Signup
echo "=== SIGNUP PROFESSIONAL ==="
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@test.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional"
  }' | jq .

# 2. Verify with token
echo -e "\n=== VERIFY SESSION ==="
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt | jq .

# 3. Logout
echo -e "\n=== LOGOUT ==="
curl -X POST http://localhost:5020/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt | jq .

# 4. Verify token is cleared
echo -e "\n=== VERIFY AFTER LOGOUT ==="
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt | jq .
```

### Complete Employer User Flow
```bash
#!/bin/bash

# 1. Signup
echo "=== SIGNUP EMPLOYER ==="
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies_emp.txt \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@company.com",
    "password": "SecurePass456!",
    "passwordConfirm": "SecurePass456!",
    "userType": "employer",
    "compName": "Tech Company Inc."
  }' | jq .

# 2. Login with credentials
echo -e "\n=== LOGIN ==="
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies_emp_login.txt \
  -d '{
    "email": "jane.smith@company.com",
    "password": "SecurePass456!"
  }' | jq .

# 3. Verify
echo -e "\n=== VERIFY ==="
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -b cookies_emp_login.txt | jq .

# 4. Logout
echo -e "\n=== LOGOUT ==="
curl -X POST http://localhost:5020/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies_emp_login.txt | jq .
```

---

## Advanced Testing

### Extract Token and Reuse
```bash
# 1. Signup and capture token
TOKEN=$(curl -s -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@test.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional"
  }' | jq -r '.data.token')

echo "Token: $TOKEN"

# 2. Use token in Authorization header
curl -X GET http://localhost:5020/api/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Test All Endpoints with Error Handling
```bash
#!/bin/bash

declare -a TESTS=(
  "test_signup_valid"
  "test_signup_duplicate"
  "test_login_valid"
  "test_login_invalid"
  "test_verify_valid"
  "test_verify_invalid"
  "test_logout"
)

for test in "${TESTS[@]}"; do
  echo "Running: $test"
  $test
  if [ $? -eq 0 ]; then
    echo "✅ $test PASSED"
  else
    echo "❌ $test FAILED"
  fi
done
```

---

## Performance Testing with Apache Bench

```bash
# Install ab (Apache Bench)
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils
# Windows: Install from ApacheFriends

# Test signup endpoint - 100 requests, 10 concurrent
ab -n 100 -c 10 -p signup.json \
  -T "application/json" \
  http://localhost:5020/api/auth/signup

# Test login endpoint - 100 requests
ab -n 100 -c 10 -p login.json \
  -T "application/json" \
  http://localhost:5020/api/auth/login

# Test verify endpoint - 100 requests (most common)
ab -n 100 -c 10 \
  http://localhost:5020/api/auth/verify
```

---

## Load Testing with wrk

```bash
# Install wrk
# macOS: brew install wrk
# Ubuntu: sudo apt-get install wrk

# Create request script
cat > verify.lua << 'EOF'
request = function()
  wrk.method = "GET"
  wrk.headers["Authorization"] = "Bearer YOUR_TOKEN_HERE"
  return wrk.format(nil, "/api/auth/verify")
end
EOF

# Run load test - 4 threads, 100 connections, 30 second test
wrk -t4 -c100 -d30s -s verify.lua http://localhost:5020
```

---

## Using jq for Response Parsing

```bash
# Pretty print JSON
curl -s ... | jq .

# Extract specific field
curl -s ... | jq '.data.user.email'

# Check success
curl -s ... | jq '.success'

# Count properties
curl -s ... | jq 'keys | length'

# Filter and map
curl -s ... | jq '.data | {id, email, userType}'
```

---

## Status Code Reference

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | login, verify, logout (success) |
| 201 | Created | signup success |
| 400 | Bad Request | validation error |
| 401 | Unauthorized | invalid credentials, missing token |
| 409 | Conflict | duplicate email |
| 500 | Internal Error | server error |

---

## Security Check with cURL

### Verify No Password in Response
```bash
curl -s -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@test.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "userType": "professional"
  }' | jq '.data.user | has("password")'
  
# Should output: false
```

### Verify Token in Cookie (Not Response Body)
```bash
curl -s -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{...}' | jq 'has("token")'

# Should output: false (no token in body)

cat cookies.txt | grep token
# Should show: token cookie value
```

### Verify 401 Doesn't Reveal Email
```bash
# Should get same message for:
# 1. Wrong password
# 2. Non-existent user
# 3. Invalid credentials

curl -s -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nope@test.com", "password":"wrong"}' | jq '.error'

# Should output: "Invalid email or password"
```

---

## Troubleshooting

### Connection Refused
```bash
# Server not running
Error: curl: (7) Failed to connect

# Solution: Start server
cd linkprosoft_backend && npm run dev
```

### Invalid JSON
```bash
# Fix: Escape quotes properly
-d '{"email":"test@test.com"}'
```

### Cookie Not Persisting
```bash
# Add -c flag to save cookies
curl ... -c cookies.txt ... 
# Add -b flag to load cookies
curl ... -b cookies.txt ...
```

### Token Expired
```bash
# Tokens last 7 days
# If testing after 7 days, create new user/token
```

---

## Bash Script Template

```bash
#!/bin/bash

set -e  # Exit on error

BASE_URL="http://localhost:5020"
COOKIES="cookies.txt"

log() {
  echo "[$(date +'%H:%M:%S')] $1"
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  log "Testing: $method $endpoint"
  
  if [ -z "$data" ]; then
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -b $COOKIES | jq .
  else
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -c $COOKIES \
      -b $COOKIES \
      -d "$data" | jq .
  fi
}

# Run tests
test_endpoint "POST" "/api/auth/signup" '{"firstName":"John","lastName":"Doe","email":"john@test.com","password":"SecurePass123!","passwordConfirm":"SecurePass123!","userType":"professional"}'
test_endpoint "GET" "/api/auth/verify" ""
test_endpoint "POST" "/api/auth/logout" ""
```

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test Auth Endpoints

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start server
        run: |
          cd linkprosoft_backend
          npm install
          npm run dev &
          sleep 5
      
      - name: Test endpoints
        run: bash test-endpoints.sh
```

---

## Additional Resources

- **Thunder Client Guide:** THUNDER_CLIENT_GUIDE.md
- **API Documentation:** AUTH_API_ENDPOINTS.md
- **Phase 1 Assessment:** PHASE_1_ASSESSMENT.md

---

**Document:** cURL Testing Commands  
**Version:** 1.0  
**Status:** Complete  
**Last Updated:** April 21, 2026

