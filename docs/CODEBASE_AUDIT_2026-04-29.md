# Linkprosoft Backend Codebase Audit

Date: April 29, 2026  
Reviewer stance: senior backend engineer and system AI auditor  
Scope: source code, tests, schema docs, existing project documentation, architecture, coding style, patterns, and implementation readiness.

---

## Executive Take

Linkprosoft is a marketplace backend for connecting employers/service requesters with skilled professionals. The system currently supports authentication, professional profiles, skills, certifications, portfolio items, professional search, early job postings, and early assignments. The product direction is clear: a Nigerian and broader service marketplace centered on trust, searchable skill profiles, location, ratings, bookings/jobs, and eventual payments/reviews/messaging.

The backend has moved beyond a basic Express app. It now has a recognizable modular structure, TypeScript strict mode, Zod validation in several modules, DTO mapping, response wrappers, auth middleware, rate limiting, Winston logging, and integration tests. That is a good foundation.

The main issue is uneven maturity across modules. Profile, skill, portfolio, certification, and search mostly follow the intended architecture. Jobs and assignments are partially implemented and currently break the consistency and safety expectations established elsewhere. Environment validation is also missing, schema/migration documentation is not fully reconciled with code, and the tests could not be fully verified in this audit run because Jest timed out.

Overall current score: 7.2/10.

Target after the next hardening pass: 8.5/10.

---

## Product Understanding

Linkprosoft appears to be a two-sided professional services marketplace:

- Professionals create profiles, add skills, certifications, portfolio items, rates, availability, and credibility signals.
- Employers search/filter professionals and create job postings.
- The platform should eventually support matching, invitations/assignments, reviews, payments, messaging, verification, analytics, and admin moderation.

The core system goal is not just CRUD. It is trusted discovery plus workflow: search -> evaluate profile -> contact/invite/book -> assign -> complete -> review/pay.

That product goal implies backend priorities:

- Strong identity and role handling.
- Accurate ownership checks.
- Search performance and ranking.
- Data consistency across users, profiles, jobs, assignments, reviews, and payments.
- Auditable state transitions.
- Clear API contracts for frontend and mobile clients.

---

## Tech Stack

Observed stack:

- Runtime/API: Node.js, Express 4, TypeScript.
- Database: PostgreSQL via `pg`.
- Validation: Zod.
- Auth: JWT access/refresh tokens, bcryptjs, HTTP-only cookies plus Authorization header support.
- Security middleware: Helmet, CORS, express-rate-limit.
- Logging: Winston plus request/error middleware.
- Testing: Jest, ts-jest, Supertest.
- Documentation: extensive Markdown docs and SQL schema references.

Good stack fit: this is appropriate for an MVP marketplace backend. There is no premature framework complexity, and PostgreSQL is the right persistence choice for relational marketplace workflows.

---

## Architecture Review

The codebase is organized by feature modules:

- `auth`
- `profile`
- `skill`
- `certification`
- `portfolio`
- `search`
- `jobs`
- `assignments`

The intended pattern is:

`route -> validation middleware -> controller -> service -> repository -> database`

This is a strong, maintainable shape. It keeps HTTP concerns out of business logic and SQL out of controllers. The better modules use this pattern well.

The weaker modules bypass parts of the pattern:

- Jobs define validation schemas but do not use them in routes.
- Assignments have service/repository/validation files but no real routes/controllers.
- Some job controller methods use `req.user.id` as the job id instead of `req.params.id`.
- Repository update code accepts arbitrary request field names and interpolates them into SQL.

The architecture is therefore sound in concept but inconsistent in enforcement.

---

## Strengths

1. Clear modular direction

Feature boundaries are easy to understand. Most modules have their own route, controller, service, repository, validation, and types. This will scale better than a large controller folder.

2. TypeScript strictness is enabled

`tsconfig.json` enables `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, and `noImplicitReturns`. The project also passed `npm run build` during this review.

3. Security baseline is much better than a raw Express app

The app uses Helmet, CORS credentials, HTTP-only cookies, JWT verification middleware, bcrypt hashing, rate limiting, and response DTOs that avoid returning passwords.

4. Validation exists and is reusable

`validationMiddleware.ts` provides a generic Zod validation middleware for body/query/params. Profile, skill, search, portfolio, and certification routes make practical use of it.

5. Response consistency has improved

`ApiResponseHandler` gives a common envelope for success, creation, update, deletion, pagination, and errors.

6. Search appears intentionally designed

The search module has typed filters, query validation, repository query building, metadata, filter options, and autocomplete. That aligns well with the product's discovery goal.

7. Documentation is unusually extensive

There are PRD, architecture, implementation, phase, testing, and schema documents. Even where docs are stale or over-optimistic, they make the project intent easier to recover.

---

## High Priority Findings

### 1. Jobs update endpoint uses the authenticated user id as the job id

File: `src/modules/jobs/jobController.ts`

`updateJob` reads:

```ts
const id = (req as any).user.id;
const job = await service.updateJobService(id, req.body);
```

For `PUT /api/jobs/:id`, `id` should come from `req.params.id`. The service should receive both `employerId` and `jobId`, then check ownership. As written, user id and job id are confused, which can update the wrong job or fail unpredictably.

Recommended fix:

- Parse and validate `req.params.id`.
- Pass `employerId` and `jobId` separately.
- In service: fetch job by job id, require `job.employer_id === employerId`, then update.

### 2. Jobs list endpoint is empty

File: `src/modules/jobs/jobController.ts`

`listJobs` is declared but does nothing. `GET /api/jobs` will hang or return an invalid response path depending on the async wrapper behavior.

Recommended fix:

- Use `listJobsQuerySchema` in routes.
- Convert validated query strings into numbers.
- Call `listJobsService`.
- Return a paginated response.

### 3. Jobs routes define validation but do not use it

Files:

- `src/modules/jobs/jobRoutes.ts`
- `src/modules/jobs/jobValidation.ts`

The schemas exist, but routes do not call `validate(...)`. This allows arbitrary payloads into job service/repository logic.

Recommended fix:

- Add validation middleware for create, update, list query, and id params.
- Use Zod transforms/coercion for numeric query and param values.

### 4. Dynamic SQL update fields are not allowlisted

File: `src/modules/jobs/jobsRepository.ts`

`updateJob` builds SQL column names directly from `Object.keys(patch)`:

```ts
const fields = Object.keys(patch);
const sets = fields.map((f, i) => `${f}=$${i+2}`).join(', ');
```

The values are parameterized, but column names are not. If arbitrary body keys reach this function, a malicious or accidental field name can break SQL or create injection risk.

Recommended fix:

- Maintain a server-side map of DTO fields to DB columns.
- Only include known fields.
- Reject unknown fields at validation.
- Never interpolate request-derived keys directly into SQL.

### 5. Job DTO fields do not match database column names

Files:

- `src/modules/jobs/jobValidation.ts`
- `src/modules/jobs/jobsRepository.ts`
- `src/types/jobTypes.ts`

Input schemas use camelCase fields like `skillId` and `durationDays`, while repository insert expects snake_case fields like `skill_id` and `duration_days`. `createJobService` passes `{ ...payload, employer_id }` directly into the repository, so `skillId` and `durationDays` will not persist as intended.

Recommended fix:

- Add a service mapper: `CreateJobInput -> CreateJobRowInput`.
- Keep API DTOs camelCase and DB rows snake_case, but map explicitly at the boundary.

### 6. Assignments are not wired into the API

Files:
  
- `src/modules/assignments/assignmentRoutes.ts`
- `src/modules/assignments/assignmentsService.ts`
- `src/modules/assignments/assignmentRepository.ts`

The assignment route exports an empty router. The service and repository exist, but there are no controllers or route handlers for invite/accept/reject/start/complete flows.

Recommended fix:

- Define assignment workflow endpoints.
- Add role checks.
- Add state transition validation.
- Add tests around ownership and invalid transitions.

### 7. Role authorization is implemented but underused

File: `src/middleware/authMiddleware.ts`

`authorize(...roles)` exists, but jobs routes only use `protect`. The comments say create/update/delete are employer-only, but the route does not enforce that.

Recommended fix:

- Use `authorize("employer")` for employer job creation/update/delete/invite actions.
- Use `authorize("professional")` for professional assignment acceptance/rejection actions.

### 8. Environment validation file is empty

File: `src/config/environment.ts`

The app relies on required runtime values like `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, `FRONTEND_URL`, and token expiry settings, but there is no startup validation. `jwt.ts` uses non-null assertions on secrets, so missing secrets become runtime failures.

Recommended fix:

- Implement Zod-based environment parsing.
- Export a typed `env` object.
- Fail fast during startup with a clear error if required config is missing.

### 9. Schema docs and migration reality are out of sync

Files:

- `docs/SCHEMA/SQL_SCHEMA.sql`
- `src/migrations/003_reconcile_jobs_assignments.sql`
- `src/types/jobTypes.ts`

The main SQL schema defines `job_postings` without `currency`, `duration_days`, `visibility`, and `deleted_at`; the migration adds those. Assignment column names also differ between schema and code/migration: `budget` versus `accepted_budget`, `created_at` versus `assigned_at`, etc.

Recommended fix:

- Establish a single source of truth for migrations.
- Make docs generated from or explicitly versioned against migrations.
- Add a migration runner or a documented manual migration sequence.

### 10. Test suite verification is currently unreliable

During this audit:

- `npm run build` passed when run outside the sandbox.
- `npm test -- --runInBand` timed out after roughly two minutes.

The tests appear to use a real database connection through `src/__tests__/setup.ts`. That is acceptable for integration tests, but the test command needs predictable setup, teardown, and maybe a separate test database lifecycle.

Recommended fix:

- Split unit and integration tests.
- Add `test:unit` and `test:integration`.
- Require `TEST_DATABASE_URL` for integration tests.
- Ensure every suite closes database handles.
- Consider per-suite cleanup for jobs/assignments/payments/reviews too, not only profile-related tables.

---

## Medium Priority Findings

### 1. `any` usage is concentrated around newer or boundary code

Examples:

- `jobService.ts`
- `jobController.ts`
- `assignmentsService.ts`
- `authController.ts`
- `errorMiddleware.ts`

Some `any` at framework boundaries is normal, but here it hides bugs such as user id/job id confusion and DTO/row mismatch.

Recommended fix:

- Use inferred Zod input types.
- Extend Express `Request` globally once and use `req.user` directly.
- Create explicit repository input types.

### 2. Duplicate validation middleware exists

There is a reusable `src/middleware/validationMiddleware.ts`, but also `src/modules/auth/validateMiddleware.ts`. Consolidating prevents drift.

### 3. Server entrypoint and package scripts are inconsistent

`package.json` has:

- `main`: `node dist/server.ts`
- `start`: `node dist/app.js`

After TypeScript compilation, the typical start file should be `dist/server.js`. Running `dist/app.js` imports the Express app but does not call `listen`.

Recommended fix:

- Set `main` to `dist/server.js`.
- Set `start` to `node dist/server.js`.

### 4. Auth refresh token rotation is stateless

Refresh tokens are signed and rotated, but not persisted or revocable server-side. This is acceptable for early MVP, but it limits logout-all-devices, compromised token revocation, and refresh reuse detection.

Recommended future improvement:

- Store hashed refresh token identifiers or session records.
- Rotate with reuse detection.
- Add device/session management if product risk warrants it.

### 5. Rate limiter timestamps are static in messages

The rate limiter `message` objects call `new Date().toISOString()` during module load, not per request. Minor issue, but responses may show stale timestamps.

Recommended fix:

- Use a handler function for rate limit responses.

### 6. Documentation encoding is corrupted in several files

Several docs show mojibake such as `ðŸ“¦` and `âœ…`. This does not affect runtime, but it reduces trust in the docs.

Recommended fix:

- Normalize documentation to UTF-8.
- Avoid excessive decorative symbols in technical docs.

---

## Coding Style and Patterns

What is working:

- Feature folders are intuitive.
- Controllers are generally thin.
- Services carry business rules.
- Repositories own SQL.
- DTO mapping is present.
- Zod schemas are readable.
- Comments explain intent in many places.

What needs tightening:

- Some comments are more verbose than the code needs. Prefer comments for non-obvious decisions, not every step.
- Naming is inconsistent in newer modules: `jobsRepository.ts` vs `assignmentRepository.ts`, `getJobs` vs `getJob`, `searchValidaition.ts` typo.
- Import quote style is mixed between single and double quotes.
- Job/assignment code formatting is less polished than the rest of the codebase.
- The code sometimes says "assume payload validated" while the route does not validate.

Recommended style baseline:

- Keep module shape consistent.
- Use one validation middleware.
- Use camelCase at API boundaries and snake_case only inside repository row types.
- Require explicit mappers between DTOs and DB rows.
- Use allowlisted update maps for partial updates.
- Avoid `as any` in service/controller code unless there is a specific framework limitation.

---

## Security Review

Good:

- Passwords are hashed with bcrypt.
- Passwords are not returned in auth responses.
- JWTs can be read from HTTP-only cookies.
- Helmet and CORS are configured.
- Rate limiting exists.
- Auth middleware handles cookie and Bearer token clients.

Needs work:

- Missing environment validation can lead to weak or broken auth configuration.
- Employer/professional role authorization is not consistently applied.
- Job update dynamic SQL needs allowlisting.
- Refresh token revocation is not implemented.
- Cookies use `sameSite: "lax"`, which is workable for many same-site deployments, but cross-site frontend/backend deployments may require a more explicit deployment-specific policy.
- There is no CSRF strategy documented for cookie-authenticated state-changing requests.

---

## Data Model Review

The data model fits the marketplace domain:

- `users`
- `professional_profiles`
- `skills`
- `professional_skills`
- `certifications`
- `portfolio_items`
- `job_postings`
- `job_assignments`
- future `payments`
- future `reviews`
- future `messages`

Main concern: workflow state consistency. Jobs and assignments need strict state machines. Without that, it becomes easy to accept a cancelled job, complete an unaccepted assignment, or pay a disputed/completed item twice.

Recommended state approach:

- Define allowed job statuses and assignment statuses in TypeScript and SQL.
- Centralize transitions in service functions.
- Reject invalid transitions.
- Add integration tests for every transition.

---

## API Design Review

Good:

- `/api/auth`
- `/api/profiles`
- `/api/skills`
- `/api/search`
- Profile subresources for certifications and portfolio under `/api/profiles`.

Needs reconsideration:

- `/api/jobs` is protected for reads. Marketplace job listings may need public or partially public reads depending on product choice.
- `/api/assignments` is mounted but empty.
- Search is public, which makes sense for discovery.
- Job routes need role-aware behavior.

Suggested near-term API shape:

- `POST /api/jobs` employer only.
- `GET /api/jobs` public or authenticated depending on product policy.
- `GET /api/jobs/:id` public or authenticated depending on product policy.
- `PUT /api/jobs/:id` owning employer only.
- `DELETE /api/jobs/:id` owning employer only.
- `GET /api/jobs/:id/matches` owning employer only.
- `POST /api/jobs/:id/invitations` owning employer only.
- `POST /api/assignments/:id/accept` assigned professional only.
- `POST /api/assignments/:id/reject` assigned professional only.
- `POST /api/assignments/:id/start` role/ownership checked.
- `POST /api/assignments/:id/complete` role/ownership checked.

---

## Testing Review

There is a meaningful amount of integration test coverage for auth/profile/skill/search/certification/portfolio. That is good and should be preserved.

Gaps:

- Job routes need coverage.
- Assignment routes need coverage once wired.
- Role authorization needs tests.
- Invalid ownership cases need tests.
- SQL update allowlisting needs tests.
- Migration/schema compatibility needs tests or at least a smoke script.
- Current full Jest run did not finish during audit.

Recommended test scripts:

```json
{
  "test:unit": "jest --runInBand src/**/*.test.ts",
  "test:integration": "jest --runInBand src/**/*.integration.test.ts",
  "test:jobs": "jest --runInBand src/__tests__/jobs"
}
```

---

## Immediate Action Plan

1. Fix jobs controller/service/repository contract.

- Use route params for job id.
- Use authenticated user id only as actor/owner id.
- Add validation middleware.
- Add role authorization.
- Map DTOs to DB rows explicitly.
- Allowlist update columns.

2. Wire assignments fully.

- Add controller.
- Add routes.
- Add validation.
- Add role checks.
- Add state transition rules.

3. Implement environment validation.

- Populate `src/config/environment.ts`.
- Replace direct `process.env` reads in core config with typed `env`.
- Fail startup on missing secrets/database URL.

4. Reconcile schema/migrations.

- Make `src/migrations` the source of truth.
- Update schema docs to match actual tables and columns.
- Add a short migration README.

5. Stabilize tests.

- Separate unit/integration test commands.
- Ensure test DB setup is explicit.
- Add jobs/assignments tests.
- Fix full suite timeout.

---

## Suggested Quality Gates

Before considering this backend production-ready:

- `npm run build` passes.
- `npm run lint` passes.
- Unit tests pass.
- Integration tests pass against a clean test database.
- All protected mutation routes enforce role and ownership.
- All request bodies/query/params are validated.
- No repository interpolates request-derived SQL identifiers.
- Environment validation runs before app startup.
- Start script launches `dist/server.js`.
- Docs and migrations agree.

---

## Final Assessment

This codebase is on a credible path. The core architecture is the right one for the product, and several modules show that the intended standard is already understood. The main problem is consistency: later additions around jobs and assignments have not yet been brought up to the same level as profile/search/portfolio/certification.

The next engineering milestone should not be adding payments, reviews, or messaging yet. The next milestone should be hardening the job and assignment workflow, because that is the center of the marketplace. Once that workflow is secure, validated, tested, and stateful, the rest of the product can grow on a much firmer base.

