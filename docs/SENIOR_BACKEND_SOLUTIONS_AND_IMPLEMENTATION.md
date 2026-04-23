# Senior Backend Solutions and Implementation Plan

**Project:** Linkprosoft Backend  
**Scope:** `linkprosoft_backend`  
**Date:** April 22, 2026  
**Purpose:** Convert the senior backend audit into an implementation-ready remediation plan

---

## Objective

The immediate goal is to make the existing backend truthful, buildable, testable, and operationally safe before expanding feature scope.

This document focuses on:

- what to change
- why the change is necessary
- how to implement it safely
- what to verify after each change

---

## Implementation Strategy

The cleanest path is a staged remediation, not a large refactor. The current architecture is usable. What it needs is integration hardening.

Recommended sequence:

1. Restore build and startup correctness.
2. Make validation and response behavior accurate.
3. Fix auth data mapping and session semantics.
4. Align API contracts with persistence behavior.
5. Stabilize test infrastructure.
6. Harden environment and operational conventions.

---

## Phase 1: Restore Build and Boot Integrity

## Problem

- The project does not compile.
- Production start script points to the wrong runtime entrypoint.

## Solution

Make the repository buildable first so TypeScript, tests, and deployment are meaningful again.

## Implementation

### 1. Remove or repair the stray logger file

Decide whether `src/middleware/requesLogger.ts` is:

- a mistaken duplicate to delete, or
- the intended implementation to keep and rename

Recommended approach:

- keep `src/middleware/requestLogger.ts`
- delete `src/middleware/requesLogger.ts`

Reason:

- the correctly named file already contains the real implementation
- the stray file is broken and creates compiler noise

### 2. Fix the `ApiErrorResponse` type

Current issue:

- `src/types/apiTypes.ts` contains runtime-style conditional spread syntax inside a TypeScript interface

Recommended fix:

```typescript
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}
```

Runtime code can still decide whether to include `stack`; the type should simply allow it.

### 3. Fix the production start script

Recommended change in `package.json`:

```json
"start": "node dist/server.js"
```

Reason:

- `server.ts` is the file that actually binds the HTTP listener
- `app.ts` should remain the composition root for Express only

## Verification

Run:

```powershell
npm run build
npm start
```

Expected result:

- TypeScript compiles cleanly
- the process starts and listens on the configured port

---

## Phase 2: Fix Validation and Error Classification

## Problem

- Invalid request bodies can surface as `500` instead of `400`
- validation logic exists but is not consistently integrated

## Solution

Move validation to the route boundary and make error middleware explicitly understand validation failures.

## Implementation

### Option A: Preferred

Use the existing `validate` middleware in routes.

Example:

```typescript
router.post("/signup", validate(signupSchema), controller.signup);
router.post("/login", validate(loginSchema), controller.login);
```

Then simplify controllers:

```typescript
export const signup = catchAsync(async (req, res) => {
  const result = await service.signup(req.body);
  res.cookie("token", result.token, cookieConfig);
  return ApiResponseHandler.created(res, { user: result.user }, "Account created successfully");
});
```

### Option B: Acceptable fallback

Keep `parse()` in controllers but explicitly convert Zod errors into `AppError` or formatted validation responses.

This is less clean because validation belongs at the input boundary, not inside business orchestration.

### Error middleware enhancement

Add explicit Zod handling:

```typescript
import { ZodError } from "zod";

if (err instanceof ZodError) {
  return res.status(400).json({
    success: false,
    error: "validation_error",
    message: "Invalid request data",
    errors: err.issues.map(issue => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
    timestamp: new Date().toISOString(),
  });
}
```

## Verification

Test these cases:

- missing email
- malformed email
- weak password
- password mismatch
- missing `compName` for employer

Expected result:

- all return `400`
- all return a stable validation error format

---

## Phase 3: Fix Repository-to-Service Data Mapping

## Problem

- repository returns snake_case rows
- service assumes camelCase properties

## Solution

Make the repository responsible for returning one deliberate shape, then keep service logic shape-safe.

## Implementation

### Preferred repository pattern

Create two explicit repository result shapes:

1. internal auth entity with password
2. safe DTO for API responses

Example:

```typescript
interface UserRow {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: "professional" | "employer";
  comp_name: string | null;
  location: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const toUserDTO = (row: UserRow): UserResponseDTO => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  userType: row.user_type,
  compName: row.comp_name ?? undefined,
  location: row.location ?? undefined,
  phone: row.phone ?? undefined,
  isVerified: row.is_verified,
  createdAt: row.created_at,
});
```

Then update login:

```typescript
const user = await repo.findByEmail(email);
if (!user) throw new AppError("Invalid email or password", 401);

const validPassword = await bcrypt.compare(password, user.password);
if (!validPassword) throw new AppError("Invalid email or password", 401);
 
return {
  user: toUserDTO(user),
  token: signToken({
    id: user.id,
    email: user.email,
    userType: user.user_type,
  }),
};
```

## Verification

Confirm that:

- login response returns `firstName`, `lastName`, `userType`, and `createdAt`
- JWT payload contains the correct `userType`
- protected-role logic works with the generated token

---

## Phase 4: Make Session Semantics Explicit and Correct

## Problem

- logout clears cookies only
- tests assume logout invalidates the JWT itself

## Solution

Choose one of two models and document it clearly.

### Model A: Stateless JWT sessions

Behavior:

- logout clears client cookie only
- previously issued tokens remain valid until expiry

Implementation:

- keep current middleware approach
- fix tests and docs to reflect reality
- use shorter expirations and optional token rotation later

Best for:

- simpler architecture
- no token store
- early-stage systems

### Model B: Revocable sessions

Behavior:

- logout invalidates the token server-side

Implementation options:

- maintain a token blacklist
- use token versioning on the user record
- switch to database-backed refresh tokens with rotation

Best for:

- stronger session control
- multi-device management
- security-sensitive products

### Recommended near-term choice

Use Model A for now, but document it honestly and shorten the mismatch between cookie lifetime and token lifetime.

Important current inconsistency:

- cookie max age is 7 days
- JWT expiry is 30 minutes

Recommended adjustment:

- either align both durations, or
- intentionally use short access tokens plus refresh-token flow

## Verification

If choosing stateless sessions:

- update tests so old copied tokens remain valid until expiry
- verify browser logout clears cookie correctly

If choosing revocable sessions:

- verify the same token fails after logout
- add store-backed invalidation tests

---

## Phase 5: Align Signup Contract With Persistence

## Problem

- API accepts `phone` and `location`
- database insert does not persist them

## Solution

Make the API contract truthful in one of two ways.

### Option A: Persist them now

Recommended if frontend already sends these fields.

Update service signature:

```typescript
const { email, password, firstName, lastName, userType, compName, phone, location } = input;
```

Update repository insert:

```sql
INSERT INTO users (
  email, password, first_name, last_name, user_type, comp_name, phone, location, is_verified
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
```

### Option B: Remove them from signup temporarily

Recommended only if profile capture is intentionally deferred to a later onboarding flow.

That means:

- remove them from the schema
- remove them from docs
- collect them in a dedicated profile endpoint later

### Recommended near-term choice

Use Option A because the schema and response expectations already imply support.

## Verification

- signup with `phone` and `location`
- verify those values are stored and returned
- confirm null behavior is consistent when values are omitted

---

## Phase 6: Rebuild the Test Strategy

## Problem

- tests depend on mutable real database state
- fixed emails make reruns non-deterministic
- no setup/teardown isolation

## Solution

Turn the auth test suite into a deterministic integration layer.

## Implementation

### 1. Introduce dedicated test environment config

Use:

- separate test database
- `.env.test`
- isolated schema or disposable DB data

### 2. Add setup and teardown

Approaches:

- transaction per test with rollback
- truncate auth-related tables between tests
- seed fresh fixtures before each suite

### 3. Generate unique test data

Instead of fixed emails like `login.test@test.com`, use:

```typescript
const uniqueEmail = `test-${Date.now()}-${Math.random()}@example.com`;
```

### 4. Separate behavior categories

Split tests into:

- input validation tests
- auth success path tests
- auth failure tests
- session semantics tests

### 5. Correct the logout expectation

This depends on the chosen session model:

- stateless JWT: token remains usable until expiry
- revocable sessions: token becomes invalid immediately

## Verification

Run:

```powershell
npm test
npm run test:coverage
```

Expected result:

- reruns are deterministic
- failures are meaningful
- tests reflect actual auth behavior

---

## Phase 7: Enforce Environment Validation

## Problem

- secrets and DB config are assumed, not validated

## Solution

Create a real configuration module and make the rest of the app consume it instead of reaching into `process.env` directly.

## Implementation

Example:

```typescript
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = envSchema.parse(process.env);
```

Then consume:

```typescript
const pool = new Pool({ connectionString: env.DATABASE_URL });
jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30m" });
```

## Verification

Test startup with:

- valid env
- missing `DATABASE_URL`
- missing `JWT_SECRET`

Expected result:

- app fails fast with clear startup errors

---

## Phase 8: Reduce Drift and Consolidate Standards

## Problem

- duplicated middleware files
- partially adopted abstractions
- design intent exceeds integrated behavior

## Solution

Use one clear rule: shared abstractions must be either adopted or removed.

## Implementation

### Consolidation checklist

- keep one request logger implementation
- keep one validation path
- keep one truth for response formatting
- keep one mapping strategy between DB rows and DTOs
- remove unused or dead files

### Team rule

For every new endpoint:

1. validate at route boundary
2. keep controller thin
3. keep service business-oriented
4. keep repository shape-explicit
5. return standardized responses
6. add deterministic tests

---

## Suggested Work Breakdown

### Sprint 1

- fix build blockers
- fix package start script
- remove duplicate/broken middleware file
- fix `ApiErrorResponse`

### Sprint 2

- wire validation middleware into routes
- improve Zod-to-error handling
- normalize repository/service mapping

### Sprint 3

- persist `phone` and `location`
- choose and document session model
- align cookie and token lifetime strategy

### Sprint 4

- isolate test DB
- add setup/teardown
- correct auth/logout tests
- add rerunnable integration coverage

### Sprint 5

- enforce env validation
- remove remaining dead abstractions
- refresh docs to match runtime truth

---

## Definition of Done

The auth module should be considered remediated when all of the following are true:

- `npm run build` passes
- `npm test` passes consistently on reruns
- invalid input returns `400`, not `500`
- login returns correctly shaped user data
- JWT payload contains correct claims
- signup persists all accepted fields or rejects unsupported ones
- logout semantics are documented and tested accurately
- production start script binds the server correctly
- startup fails fast for missing critical environment variables

---

## Final Recommendation

Do not add more backend surface area until this remediation is complete. The architecture is already good enough to grow on, but the current runtime contract needs to become reliable first.

The strongest move now is discipline, not expansion:

- make the existing auth stack truthful
- let the compiler pass
- let the tests mean something
- then scale Phase 2 with confidence
