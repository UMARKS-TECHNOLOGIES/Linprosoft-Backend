# AI Search frontend integration guide

This guide covers the natural-language professional search endpoint exposed by the backend.

## Endpoint

```http
POST /api/search/professionals
Content-Type: application/json
Accept: application/json
```

The route is public and does not require an authentication token. It is mounted under `/api/search` in the Express application. Use the configured API origin in production, for example:

```text
https://api.example.com/api/search/professionals
```

## Request body

```ts
interface ProfessionalSearchRequest {
  query: string;       // required, 1–500 characters
  location?: string;   // optional, maximum 100 characters
  rating?: string;     // optional: "0+ Stars" through "5+ Stars"
  budget?: string;     // optional natural-language amount/range, max 50 characters
  page?: number;       // optional, 1-based; defaults to 1
  limit?: number;      // optional, 1–100; defaults to 20
}
```

`query` should contain what the user wants in ordinary language. It can be a profession (`"electrician"`) or a task (`"Someone to fix my leaking sink"`). The parser understands common trade terms and uses a model only when the taxonomy cannot confidently classify the request.

Examples:

```json
{
  "query": "I need someone to fix my fridge",
  "location": "Lagos",
  "rating": "4+ Stars",
  "budget": "₦5,000 - ₦20,000",
  "page": 1,
  "limit": 20
}
```

```json
{
  "query": "Need a plumber to unclog my kitchen sink",
  "location": "Abuja"
}
```

```json
{
  "query": "affordable painter for my bedroom",
  "page": 2,
  "limit": 10
}
```

### Filter formats

- `rating` must match `N Stars` or `N+ Stars`, where `N` is 0–5. For example, `"4+ Stars"` becomes `ratingMin: 4`.
- `budget` may contain comma-separated numbers and currency symbols. `"Under ₦5,000"` becomes `budgetMin: 0, budgetMax: 5000`; `"₦5,000 - ₦20,000"` becomes `budgetMin: 5000, budgetMax: 20000`.
- `location` is trimmed and compared case-insensitively by the backend. An explicitly supplied location takes precedence over a location inferred from the query.
- `page` is 1-based. `limit` is capped at 100.

## Successful response

The backend returns HTTP `200` with the project’s standard response envelope:

```ts
interface ProfessionalSearchResponse {
  success: true;
  message: string;
  data: {
    professionals: Professional[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    parsedQuery: ParsedQuery;
  };
  timestamp: string;
}
```

The `Professional` object uses the existing professional-search DTO returned by the backend. Common fields include `id`, `userId`, `hourlyRate`, `bio`, `profession`, `availabilityStatus`, `avgRating`, `totalReviews`, `createdAt`, `updatedAt`, `user`, and `skills`. Treat additional fields as forward-compatible.

`totalPages` is `0` when there are no matches. Otherwise it is `Math.ceil(total / limit)`.

### Parsed query shape

```ts
interface ParsedQuery {
  intent: "search_professional";
  primaryProfession: string | null;
  primarySkill: string | null;
  keywords: string[];
  locationHint: string | null;
  priceIntent: "cheap" | "mid" | "premium" | null;
  confidence: number;       // 0–1
  parserSource: "rule" | "groq" | "fallback";
  rawQuery: string;
  normalizedQuery: string;
  filters: {
    location?: string;
    ratingMin?: number;
    budgetMin?: number;
    budgetMax?: number;
    budgetRange?: string;
  };
}
```

The same parser source is also returned in the `X-Parser-Source` response header. It is useful for diagnostics, but the UI should not change behavior based on it:

- `rule`: deterministic taxonomy match; normally fastest and highest confidence.
- `groq`: ambiguous text was classified by the configured Groq model.
- `fallback`: the model was unavailable or invalid, so the backend searched using normalized raw keywords.

Example response:

```json
{
  "success": true,
  "message": "Search results fetched successfully",
  "data": {
    "professionals": [],
    "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 },
    "parsedQuery": {
      "intent": "search_professional",
      "primaryProfession": "electrician",
      "primarySkill": "electrical repair",
      "keywords": ["fridge", "repair"],
      "locationHint": "Lagos",
      "priceIntent": null,
      "confidence": 0.9,
      "parserSource": "rule",
      "rawQuery": "I need someone to fix my fridge",
      "normalizedQuery": "fix fridge",
      "filters": {
        "location": "Lagos",
        "ratingMin": 4,
        "budgetMin": 5000,
        "budgetMax": 20000,
        "budgetRange": "5000-20000"
      }
    }
  },
  "timestamp": "2026-08-12T09:00:00.000Z"
}
```

## Frontend request example

```ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function searchProfessionals(
  input: ProfessionalSearchRequest,
  signal?: AbortSignal,
): Promise<ProfessionalSearchResponse> {
  const response = await fetch(`${API_URL}/api/search/professionals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  const body = await response.json();
  if (!response.ok || body.success !== true) {
    throw new Error(body.message ?? "Professional search failed");
  }
  return body as ProfessionalSearchResponse;
}
```

Use an `AbortController` to cancel the previous request when the user submits a new search. For a search box, debounce submissions on the client and submit on Enter or explicit Search; do not send a request for an empty string.

Pagination example:

```ts
const result = await searchProfessionals({
  query: searchText,
  location: selectedLocation || undefined,
  rating: selectedRating || undefined,
  budget: selectedBudget || undefined,
  page: nextPage,
  limit: 20,
});

setProfessionals(result.data.professionals);
setTotalPages(result.data.meta.totalPages);
```

When changing the query or any filter, reset `page` to `1`. When loading another page, preserve all of the original query and filter values.

## Loading, empty, and error states

Recommended UI states:

1. Before the first submission: show the search form and suggestions.
2. While pending: show a loading indicator and disable duplicate submissions.
3. Success with results: render cards and pagination.
4. Success with `professionals.length === 0`: show an empty-state message and offer broader filters or a revised query.
5. Error: preserve the submitted input, show a retry action, and do not discard the last successful results unless that is the intended UX.

Validation errors use HTTP `400` and the standard shape:

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Too small: expected string to have >=1 characters",
  "statusCode": 400,
  "timestamp": "2026-08-12T09:00:00.000Z"
}
```

Common status handling:

| Status | Meaning | Frontend action |
|---|---|---|
| `200` | Search completed, possibly with zero results | Render `data.professionals` and `data.meta` |
| `400` | Invalid body, rating, budget length, page, or limit | Show field-level validation and correct the input |
| `429` | Search rate limit | Tell the user to wait briefly and retry |
| `500` | Unexpected backend/database failure | Show a retryable generic error |
| `503` | Search dependency unavailable | Show a temporary-unavailable state |

The backend’s NLP fallback is transparent to the frontend: a missing or failing Groq service should still produce a successful search when the database is available.

## Backward compatibility

The existing GET endpoint remains available:

```http
GET /api/search/professionals?page=1&limit=20&minRating=4
```

Use POST for all natural-language searches and new UI work. Keep GET only for existing screens or legacy clients that already use structured query parameters. The POST response includes `totalPages`; the legacy GET response may expose its older `pages` property.

## UX guidance for parsed metadata

`parsedQuery` is intended for optional explanations and debugging, not as a replacement for the result list. Possible uses include:

- displaying “Showing electricians for appliance repair”;
- showing the normalized location/filter chips;
- capturing parser-source telemetry in development builds;
- offering a “ broaden search” action when confidence is low.

Do not expose raw model comments or promise that a profession is guaranteed when `confidence` is low. A `fallback` parse can have `primaryProfession: null` and still return useful keyword matches.

## Local integration checklist

1. Set `VITE_API_URL` (or the equivalent frontend environment variable) to the backend origin.
2. Confirm the backend is running with `npm.cmd run build` and `npm.cmd start`.
3. Apply `src/migrations/007_search_nlp_tables.sql` to the configured PostgreSQL database.
4. Verify a taxonomy query such as `"fix my fridge"` returns `parserSource: "rule"`.
5. Verify an ambiguous query still returns HTTP `200` when `GROQ_API_KEY` is absent; it should use `parserSource: "fallback"`.
6. Test invalid input, empty results, pagination, cancellation, and retry behavior.

## Caveats

- Search matching is limited to the professions, skills, and database fields currently supported by the backend taxonomy/repository.
- Budget values are interpreted as professional hourly-rate bounds; the UI should label budget controls consistently with that backend meaning.
- The parser cache and parse logs are backend concerns. The frontend does not need to send cache keys or parser configuration.
- Never place `GROQ_API_KEY` in frontend environment variables or ship it to the browser. Only the backend may call Groq.
