# Search by Profession Name Implementation Plan

## Goal
Add a new query field to the professional search controller so callers can search by profession name, such as `Carpenter`, `Plumber`, or `Electrician`, and receive all matching professionals.

This should work in the main search endpoint:

```http
GET /api/search/professionals?profession=Carpenter&page=1&limit=20
```

It should return all professionals whose `profession` value matches or closely matches the supplied term.

---

## Recommended request contract

Use a new optional query field named `profession`:

```http
GET /api/search/professionals?profession=Carpenter&location=Lagos&minRating=4&page=1&limit=20
```

If the profession is absent, the existing filters continue to work exactly as they do today.

---

## 1) Update validation schema

File: `src/modules/search/searchValidaition.ts`

Add `profession` to the existing search query schema.

```ts
export const searchQuerySchema = z
  .object({
    profession: z.string().trim().max(100).optional(),
    skills: skillsParser,
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    minRate: z.coerce.number().min(0).optional(),
    maxRate: z.coerce.number().min(0).optional(),
    availabilityStatus: z.enum(["available", "unavailable", "away"]).optional(),
    sortBy: z.enum(["rating_desc", "rate_asc", "recent_desc"]).default("rating_desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((data) => data.minRate === undefined || data.maxRate === undefined || data.minRate <= data.maxRate, {
    message: "minRate cannot be greater than maxRate",
    path: ["minRate"],
  })
  .refine(
    (data) => data.minRating === undefined || data.maxRating === undefined || data.minRating <= data.maxRating,
    {
      message: "minRating cannot be greater than maxRating",
      path: ["minRating"],
    }
  );
```

This makes the field accepted and keeps the existing validation logic intact.

---

## 2) Extend the filters type

File: `src/types/searchTypes.ts`

Add a field to the search filter contract:

```ts
export interface SearchFilters {
  profession?: string;
  skills?: number[];
  minRating?: number;
  maxRating?: number;
  minRate?: number;
  maxRate?: number;
  availabilityStatus?: AvailabilityStatus;
  sortBy: SearchSortBy;
  page: number;
  limit: number;
  inferredProfession?: string;
  inferredSkill?: string;
  inferredKeywords?: string[];
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
}
```

This ensures the controller and repository can carry the profession filter through the full pipeline without type errors.

---

## 3) Pass profession through the controller

File: `src/modules/search/searchController.ts`

The main search controller already sends `req.query` directly to the service. We can make the profession query explicit and normalized before it reaches the service.

```ts
export const searchProfessionals = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as Record<string, unknown>;

  const filters: SearchFilters = {
    ...(query.profession ? { profession: String(query.profession).trim() } : {}),
    ...(query.skills ? { skills: Array.isArray(query.skills) ? query.skills.map(Number) : [Number(query.skills)] } : {}),
    ...(query.minRating !== undefined ? { minRating: Number(query.minRating) } : {}),
    ...(query.maxRating !== undefined ? { maxRating: Number(query.maxRating) } : {}),
    ...(query.minRate !== undefined ? { minRate: Number(query.minRate) } : {}),
    ...(query.maxRate !== undefined ? { maxRate: Number(query.maxRate) } : {}),
    ...(query.availabilityStatus ? { availabilityStatus: query.availabilityStatus as any } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy as SearchSortBy } : { sortBy: "rating_desc" }),
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 20),
  };

  const result = await searchService.searchProfessionals(filters);

  return ApiResponseHandler.success(
    res,
    {
      professionals: result.professionals,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    },
    "Search results fetched successfully"
  );
});
```

This is the safest place to normalize the profession string before the repository executes SQL.

---

## 4) Add SQL filter for profession matching

File: `src/modules/search/searchRepository.ts`

Update the `buildWhereClause` helper to include profession matching using a case-insensitive partial match.

```ts
if (filters.profession) {
  values.push(`%${filters.profession.trim()}%`);
  conditions.push(`LOWER(COALESCE(pp.profession, '')) ILIKE LOWER($${values.length})`);
}
```

This means the following searches all return profession-related matches:

```http
GET /api/search/professionals?profession=carpenter
GET /api/search/professionals?profession=Carpenter
GET /api/search/professionals?profession=carp
```

The database uses `ILIKE` so matching is case-insensitive and partial matches are supported.

---

## 5) Full repository example

Here is the complete `buildWhereClause` pattern to merge in:

```ts
const buildWhereClause = (filters: SearchFilters): QueryBuildResult => {
  const conditions: string[] = ["u.deleted_at IS NULL"];
  const values: Array<number | number[] | string | string[]> = [];

  if (filters.profession) {
    values.push(`%${filters.profession.trim()}%`);
    conditions.push(`LOWER(COALESCE(pp.profession, '')) ILIKE LOWER($${values.length})`);
  }

  if (filters.skills && filters.skills.length > 0) {
    values.push(filters.skills);
    conditions.push(`EXISTS (
      SELECT 1
      FROM professional_skills psf
      WHERE psf.professional_id = pp.id
        AND psf.skill_id = ANY($${values.length}::int[])
    )`);
  }

  if (filters.minRating !== undefined) {
    values.push(filters.minRating);
    conditions.push(`COALESCE(pp.avg_rating, 0) >= $${values.length}`);
  }

  if (filters.maxRating !== undefined) {
    values.push(filters.maxRating);
    conditions.push(`COALESCE(pp.avg_rating, 0) <= $${values.length}`);
  }

  if (filters.minRate !== undefined) {
    values.push(filters.minRate);
    conditions.push(`COALESCE(pp.hourly_rate, 0) >= $${values.length}`);
  }

  if (filters.maxRate !== undefined) {
    values.push(filters.maxRate);
    conditions.push(`COALESCE(pp.hourly_rate, 0) <= $${values.length}`);
  }

  if (filters.availabilityStatus) {
    values.push(filters.availabilityStatus);
    conditions.push(`pp.availability_status = $${values.length}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};
```

This ensures the profession search is deeply integrated with the existing filters rather than being bolted on separately.

---

## 6) Example searches

### Exact profession name

```http
GET /api/search/professionals?profession=Carpenter
```

### Partial profession name

```http
GET /api/search/professionals?profession=carp
```

### Profession + city + rating

```http
GET /api/search/professionals?profession=Carpenter&location=Lagos&minRating=4.5&page=1&limit=20
```

### Profession + hourly rate filter

```http
GET /api/search/professionals?profession=Plumber&minRate=100&maxRate=500&sortBy=rate_asc
```

---

## 7) Tests to add

File: `src/__tests__/search/search.integration.test.ts`

```ts
describe("GET /api/search/professionals - Search by profession name", () => {
  it("returns all professionals whose profession matches Carpenter", async () => {
    const res = await request(app)
      .get("/api/search/professionals")
      .query({ profession: "Carpenter", page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.data.professionals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ profession: expect.stringMatching(/Carpenter/i) })
      ])
    );
  });

  it("supports partial profession match", async () => {
    const res = await request(app)
      .get("/api/search/professionals")
      .query({ profession: "carp", page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.data.professionals.length).toBeGreaterThan(0);
  });
});
```

---

## 8) Suggested implementation order

1. Add `profession` to `searchQuerySchema`.
2. Add `profession?: string` to `SearchFilters`.
3. Update `searchController.searchProfessionals` to pass the profession into the service.
4. Add `profession` handling to the repository `WHERE` clause using `ILIKE`.
5. Run the search tests and validate one carpenter/plumber search on seeded data.
6. Confirm pagination and sorting still work with the new filter.

---

## Final note

This is the cleanest pattern because it keeps the feature aligned with the existing search architecture instead of creating a separate route. The user can search by profession name using the same professional discovery endpoint and still combine it with filters like rating, rate, and location.
