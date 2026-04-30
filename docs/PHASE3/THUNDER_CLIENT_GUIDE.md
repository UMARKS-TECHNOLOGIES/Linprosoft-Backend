# Thunder Client Guide — Phase 3

**Version:** 1.1
**Date:** April 29, 2026
**Status:** Draft (finalizing)

---

This guide mirrors the Phase 2 Thunder Client guide structure but focuses on Phase 3 endpoints (Jobs & Assignments). It includes environment setup, recommended execution order, example requests for every endpoint introduced in Phase 3, pre-request/response scripts to capture tokens and ids, and example assertion tests you can paste into Thunder Client.

Required files
- Import: `Thunder-Client-Collection-Phase3.json` (collection of requests)

Environment variables (recommended)
- `base_url` — e.g., `http://localhost:5020/api`
- `token` — JWT access token or cookie value
- `employerId`, `professionalId`, `jobId`, `assignmentId`, `matchId`, `skillId`

Quick setup
1. Install Thunder Client extension in VS Code.
2. Open Thunder Client → Collections → Import → select `Thunder-Client-Collection-Phase3.json`.
3. Open the Environment panel and add the variables above (set `base_url`).
4. Start the backend server locally:
```bash
npm install
npm run dev
# server should run at http://localhost:5020
```

Authentication notes
- Phase 3 uses the same auth model as Phase 2. Authenticated endpoints require a cookie header `access_token={{token}}` or an `Authorization: Bearer {{token}}` header depending on the request in the collection.
- Use the Signup / Login requests in the collection to create test users and set `token`. Example response scripts below extract tokens and set env variables automatically.

Example response script to save token from login (Thunder Client test script area):
```js
// parse response JSON and set env var
const res = response.json();
if (res && res.data && res.data.accessToken) {
	pm.environment.set("token", res.data.accessToken);
}
// if server sets cookie in headers, you can extract it from response headers
const setCookie = response.headers["set-cookie"] || response.headers["Set-Cookie"];
if (setCookie) pm.environment.set("token", setCookie);
```

Recommended test order (run sequentially)
1. Health check
2. Signup/Login: create `employer` and `professional` users
3. Employer creates Job (POST /api/jobs)
4. List Jobs, Get Job by id, Update Job, Soft-delete Job
5. Get Matches for Job (GET /api/jobs/:id/matches)
6. Employer creates Assignment for a professional (POST /api/assignments)
7. Assignment lifecycle: GET, Accept, Reject, Start, Complete, Cancel

For each endpoint below you'll find:
- Request example (method, url)
- Required headers
- Example body
- Expected success response
- Example Thunder Client test assertions (JS)

---

## Health Check

GET `{{base_url}}/health` or `{{base_url}}/` (depending on server)

Headers: none

Success: 200 OK

Test assertions (Thunder Client):
```js
pm.test("status is 200", () => pm.response.to.have.status(200));
pm.test("body has uptime or ok", () => {
	const body = pm.response.json();
	pm.expect(body).to.be.an('object');
});
```

---

## Authentication (Signup / Login)

1) POST `{{base_url}}/api/auth/signup`

Headers:
Content-Type: application/json

Body example (Employer):
```json
{
	"email": "employer+tc@example.com",
	"password": "Password123!",
	"role": "employer",
	"name": "TC Employer"
}
```

Expected: 201 Created (or 200 depending on implementation) — response will contain user info and auth token or set-cookie header.

Test script (extract token and id):
```js
pm.test("signup success", () => pm.response.to.have.status(201));
const body = pm.response.json();
if (body && body.data && body.data.user) {
	pm.environment.set("employerId", body.data.user.id);
}
if (body && body.data && body.data.accessToken) {
	pm.environment.set("token", body.data.accessToken);
}
```

2) POST `{{base_url}}/api/auth/login`

Body example:
```json
{
	"email": "employer+tc@example.com",
	"password": "Password123!"
}
```

Test script (capture cookie or token):
```js
pm.test("login success", () => pm.response.to.have.status(200));
const res = pm.response.json();
if (res && res.data && res.data.accessToken) pm.environment.set('token', res.data.accessToken);
const cookie = pm.response.headers['set-cookie'] || pm.response.headers['Set-Cookie'];
if (cookie) pm.environment.set('token', cookie);
```

Use the same steps to create a Professional test account and set `professionalId` and `professionalToken` if you prefer separate tokens per role.

---

## Jobs Endpoints (Employer role)

1) Create Job — POST `{{base_url}}/api/jobs`

Headers:
Content-Type: application/json
Cookie: access_token={{token}}

Body example:
```json
{
	"title": "React Developer - 2 week contract",
	"description": "Build UI components",
	"skillId": 12,
	"budget": 150000,
	"currency": "NGN",
	"durationDays": 14,
	"location": "Remote",
	"visibility": "public"
}
```

Expected: 201 Created — response contains `data.id`.

Test assertions:
```js
pm.test('status 201', () => pm.response.to.have.status(201));
const body = pm.response.json();
pm.test('has job id', () => pm.expect(body.data.id).to.be.a('number'));
pm.environment.set('jobId', body.data.id);
```

2) List Jobs — GET `{{base_url}}/api/jobs?page=1&limit=10&skillId={{skillId}}`

Headers: none (public) or include cookie if listing private/owner-only

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('returns array', () => pm.expect(body.data.jobs).to.be.an('array'));
```

3) Get Job — GET `{{base_url}}/api/jobs/{{jobId}}`

Headers: none

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('job matches id', () => pm.expect(body.data.id || body.data.job.id).to.eql(Number(pm.environment.get('jobId'))));
```

4) Update Job — PUT `{{base_url}}/api/jobs/{{jobId}}`

Headers:
Content-Type: application/json
Cookie: access_token={{token}}

Body example:
```json
{
	"title": "React Developer - 3 week contract",
	"budget": 180000
}
```

Expected: 200 OK (job updated)

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('title updated', () => pm.expect(body.data.title).to.eql('React Developer - 3 week contract'));
```

5) Soft-delete Job — DELETE `{{base_url}}/api/jobs/{{jobId}}`

Headers: Cookie: access_token={{token}}

Expected: 204 No Content or 200 with success message depending on implementation

Test assertions (if 204):
```js
pm.test('status 204', () => pm.response.to.have.status(204));
```

If 200 with JSON:
```js
pm.test('deleted', () => pm.expect(pm.response.json().success).to.eql(true));
```

6) Matches — GET `{{base_url}}/api/jobs/{{jobId}}/matches`

Headers: Cookie: access_token={{token}} (owner) or public depending on implementation

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('matches array', () => pm.expect(body.data).to.be.an('array'));
```

---

## Assignments Endpoints (Invite / Lifecycle)

1) Create Assignment — POST `{{base_url}}/api/assignments`

Headers:
Content-Type: application/json
Cookie: access_token={{token}}  // employer token

Body example:
```json
{
	"jobId": {{jobId}},
	"professionalId": {{professionalId}},
	"message": "We'd like to invite you to this job.",
	"proposedBudget": 140000
}
```

Expected: 201 Created — response contains `data.id` (assignmentId)

Test assertions:
```js
pm.test('status 201', () => pm.response.to.have.status(201));
const body = pm.response.json();
pm.environment.set('assignmentId', body.data.id);
pm.test('assignment created', () => pm.expect(body.data.id).to.be.a('number'));
```

2) Get Assignment — GET `{{base_url}}/api/assignments/{{assignmentId}}`

Headers: Cookie: access_token={{token}} or professional token depending on role

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('assignment has correct job', () => pm.expect(body.data.jobId).to.eql(Number(pm.environment.get('jobId'))));
```

3) Accept Assignment — PUT `{{base_url}}/api/assignments/{{assignmentId}}/accept`

Headers: Cookie: access_token={{professionalToken}}

Body: none or optional acceptance note

Expected: 200 OK — assignment status becomes `accepted` or `invited->accepted`

Test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('status accepted', () => pm.expect(body.data.status).to.match(/accepted|in_progress/i));
```

4) Reject Assignment — PUT `{{base_url}}/api/assignments/{{assignmentId}}/reject`

Headers: Cookie: access_token={{professionalToken}}

Expected: 200 OK — status becomes `rejected`

5) Start Assignment — PUT `{{base_url}}/api/assignments/{{assignmentId}}/start`

Headers: Cookie: access_token={{professionalToken}}

Expected: 200 OK — status becomes `in_progress`, `startedAt` populated

6) Complete Assignment — PUT `{{base_url}}/api/assignments/{{assignmentId}}/complete`

Headers: Cookie: access_token={{professionalToken}}

Expected: 200 OK — status becomes `completed`, `completedAt` populated

7) Cancel Assignment — PUT `{{base_url}}/api/assignments/{{assignmentId}}/cancel`

Headers: Cookie: access_token={{token}} (employer or professional depending on rules)

Expected: 200 OK — status becomes `cancelled`

For each of the assignment lifecycle endpoints, use the same pattern of test assertions:
```js
pm.test('status 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('status updated', () => pm.expect(body.data.status).to.be.a('string'));
```

---

## Helpful Thunder Client snippets

1) Pre-request script to set `Authorization` header from env `token` (per request in Thunder Client, add in Pre-Request tab):
```js
if (pm.environment.get('token')) {
	const token = pm.environment.get('token');
	// If token is a cookie string, set Cookie header
	if (token.includes('access_token')) pm.request.headers.add({key: 'Cookie', value: token});
	else pm.request.headers.add({key: 'Authorization', value: 'Bearer ' + token});
}
```

2) Test snippet to assert pagination meta exists (for list endpoints):
```js
const body = pm.response.json();
pm.test('has meta', () => pm.expect(body.meta).to.have.property('page'));
pm.test('items array', () => pm.expect(body.data).to.be.an('array'));
```

3) Extract IDs from list response and save to env (example for jobs list):
```js
const body = pm.response.json();
if (body && Array.isArray(body.data) && body.data.length>0) {
	pm.environment.set('jobId', body.data[0].id);
}
```

---

## Collection notes and suggested tests to add to `Thunder-Client-Collection-Phase3.json`

- Add separate requests for: Signup Employer, Signup Professional, Login Employer, Login Professional.
- Add requests for Job create/list/get/update/delete and include pre-request script to set auth header.
- Add requests for Matches and store `matchId` when present.
- Add requests for Assignment create/get/accept/reject/start/complete/cancel with proper role tokens.
- For each request add test scripts shown above to set environment variables and assert responses.

---

## Troubleshooting
- If you get 401 Unauthorized in tests, ensure `token` is present in environment and the server has access to `JWT_SECRET` when running locally or in tests.
- Use the Login request and confirm the response shows `accessToken` or check `Set-Cookie` header; copy to `token` env variable.

---

If you want, I can now expand the `Thunder-Client-Collection-Phase3.json` file to include the complete set of requests and set the example pre-request/response scripts and tests automatically. Would you like me to generate/update the collection JSON next?
