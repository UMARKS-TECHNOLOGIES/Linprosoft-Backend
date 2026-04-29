# Linkprosoft Backend - Copilot Instructions

## Project Overview

Linkprosoft is a backend API for a marketplace platform connecting individuals with skilled professionals. Built with Express.js, TypeScript, PostgreSQL, and follows a layered architecture pattern.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (via `pg` library) |
| Validation | Zod |
| Authentication | JWT (HTTP-only cookies + Bearer fallback) |
| Security | Helmet, CORS, bcryptjs, express-rate-limit |
| Logging | Winston |
| Testing | Jest, ts-jest, supertest |

---

## Architecture Pattern

The project follows a **layered architecture** with clear separation of concerns:

```
Routes → Controllers → Services → Repositories → Database
```

### Module Structure

Each feature module follows this pattern:

```
src/modules/<module>/
├── <module>Routes.ts      # Express router definitions
├── <module>Controller.ts  # Request/response handling
├── <module>Service.ts     # Business logic
├── <module>Repository.ts  # Database queries
└── <module>Validation.ts  # Zod validation schemas
```

---

## Coding Conventions

### Naming Conventions

- **Files**: kebab-case (e.g., `authRoutes.ts`, `profileController.ts`)
- **Functions**: camelCase
- **Classes/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Database columns**: snake_case

### Type Definitions

- **DTOs**: `<Entity>ResponseDTO` for API responses
- **Database rows**: `<Entity>Row` for raw DB results
- **Input schemas**: `<Action>Input` (e.g., `SignupInput`, `LoginInput`)

### Response Format

All API responses use the standardized `ApiResponseHandler`:

```typescript
// Success response
ApiResponseHandler.success(res, data, "Success message", 200);

// Created response
ApiResponseHandler.created(res, data, "Created successfully");

// Error response
ApiResponseHandler.error(res, error, "Error message", 400);
```

### Error Handling

- Use custom `AppError` class for operational errors
- All async route handlers wrapped with `catchAsync`
- Global error middleware handles all errors consistently

```typescript
// Throwing errors
throw new AppError("User not found", 404);
throw new AppError("Invalid credentials", 401);
```

### Authentication

- JWT tokens stored in HTTP-only cookies (primary)
- Bearer token fallback for mobile/non-cookie clients
- `protect` middleware verifies tokens
- `authorize` middleware checks user roles

```typescript
// Protected route
router.get("/profile", protect, controller.getProfile);

// Role-based route
router.post("/admin", protect, authorize("admin"), controller.adminAction);
```

### Validation

- All request bodies validated with Zod schemas
- Use `validate()` middleware in routes
- Validation schemas defined in `<module>Validation.ts`

```typescript
// Route with validation
router.post("/signup", validate(signupSchema), controller.signup);
```

---

## Database Conventions

### Query Patterns

- Use parameterized queries (never string interpolation)
- Convert snake_case DB rows to camelCase DTOs
- Always filter by `deleted_at IS NULL` for soft deletes

```typescript
// Repository example
const query = `
  SELECT id, email, first_name, last_name
  FROM users
  WHERE email = $1 AND deleted_at IS NULL
`;
const result = await pool.query(query, [email]);
```

### Connection

- Database pool configured in `src/config/db.ts`
- Use `pool.query()` for direct queries

---

## Testing Conventions

### Integration Tests

- Use `supertest` for HTTP testing
- Create Express app instance in `beforeAll`
- Use unique emails per test run with timestamps

```typescript
const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const makeEmail = (prefix: string) => `${prefix}.${runId}@test.com`;
```

### Test Structure

```typescript
describe('Module Name', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    // Setup middleware and routes
  });
  
  describe('POST /endpoint', () => {
    it('should do something', async () => {
      const response = await request(app)
        .post('/api/module/endpoint')
        .send({ /* payload */ });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
```

---

## Middleware Order

In `app.ts`, middleware order matters:

1. Helmet (security headers)
2. express.json() (body parsing)
3. cookieParser()
4. CORS
5. Rate limiting
6. Request logging
7. Routes
8. Error handling

---

## Common Patterns

### Creating a New Module

1. Create folder in `src/modules/<module>/`
2. Create validation schema in `<module>Validation.ts`
3. Create repository in `<module>Repository.ts`
4. Create service in `<module>Service.ts`
5. Create controller in `<module>Controller.ts`
6. Create routes in `<module>Routes.ts`
7. Import and mount in `app.ts`

### Adding a New Endpoint

```typescript
// 1. Validation (moduleValidation.ts)
export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// 2. Controller (moduleController.ts)
export const createItem = catchAsync(async (req: Request, res: Response) => {
  const input = createItemSchema.parse(req.body);
  const item = await service.createItem(input);
  return ApiResponseHandler.created(res, item, "Item created");
});

// 3. Routes (moduleRoutes.ts)
router.post("/", protect, validate(createItemSchema), controller.createItem);

// 4. Export route in app.ts
import itemRoutes from "./modules/item/itemRoutes";
app.use("/api/items", itemRoutes);
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |

---

## Environment Variables

Required in `.env`:

```
PORT=5000
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app.ts` | Express app configuration |
| `src/server.ts` | Server entry point |
| `src/config/db.ts` | PostgreSQL connection pool |
| `src/middleware/authMiddleware.ts` | JWT authentication |
| `src/middleware/errorMiddleware.ts` | Global error handling |
| `src/middleware/validationMiddleware.ts` | Zod validation wrapper |
| `src/utils/response.ts` | Standardized response handler |
| `src/utils/appError.ts` | Custom error class |
| `src/utils/catchAsync.ts` | Async error wrapper |
| `src/utils/jwt.ts` | JWT token utilities |
| `src/utils/logger.ts` | Winston logger configuration |

---

## Important Notes

- Always use `catchAsync` wrapper for route handlers
- Never expose passwords in API responses
- Use HTTP-only cookies for JWT in browser clients
- Validate all user input with Zod schemas
- Use parameterized queries to prevent SQL injection
- Follow the existing code style and patterns