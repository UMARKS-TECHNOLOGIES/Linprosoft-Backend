# NLP professional search

The existing TypeScript Express app now supports `POST /api/search/professionals`. It parses a natural-language request with the versioned taxonomy first, calls Groq only for ambiguous requests, then applies the resulting filters to the existing PostgreSQL professional search.

Required configuration is in `.env`; copy `.env.example` and set `DATABASE_URL`, application secrets, and optionally `GROQ_API_KEY`. Without a Groq key, ambiguous queries use keyword fallback. `GROQ_MODEL`, `GROQ_TIMEOUT_MS`, and `GROQ_MAX_RETRIES` are optional.

Apply the NLP migration:

```powershell
psql $env:DATABASE_URL -f src/migrations/007_search_nlp_tables.sql
```

Example request:

```powershell
curl.exe -X POST http://localhost:3000/api/search/professionals `
  -H "Content-Type: application/json" `
  -d '{"query":"I need someone to fix my fridge","location":"Lagos","rating":"4+ Stars","budget":"₦5,000 - ₦20,000","page":1,"limit":20}'
```

Run the isolated NLP tests with no database or Groq service:

```powershell
npm.cmd run test:nlp
npm.cmd run build
npm.cmd start
```

The focused Groq fallback diagnostics are included in `test:nlp`. To run only that diagnostic file:

```powershell
npx.cmd jest --config jest.nlp.config.js src/modules/search/__tests__/groqFallback.diagnostic.test.ts --runInBand
```

To exercise each Groq failure mode explicitly:

```powershell
npx.cmd jest --config jest.nlp.config.js src/modules/search/__tests__/groqFailureModes.diagnostic.test.ts --runInBand
```

This covers a model response with `profession: null`, invalid JSON, a missing key, a 401 invalid-key response, and network/timeout failure. Every parser-level failure must return `parserSource: "fallback"`, preserve raw keywords, and continue to the professional search path.

The test deliberately mocks the Groq HTTP response, so it does not consume API quota or require a valid key. It distinguishes these cases:

- taxonomy correctly misses `fix chair` and the parser forwards it to Groq;
- a valid Groq `carpenter` response becomes `primaryProfession: "carpenter"`;
- invalid JSON is rejected by the client;
- a valid model response with `profession: null` intentionally becomes the keyword fallback.

The existing `npm test` command remains the full database-backed test suite. Cache and parse-log persistence is best effort; a missing/unmigrated NLP table never prevents search results.
