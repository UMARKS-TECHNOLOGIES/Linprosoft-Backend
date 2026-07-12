# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development server**: `npm run dev` (uses ts-node-dev for hot reloading)
- **Build**: `npm run build` (compiles TypeScript to dist/)
- **Start production**: `npm run start` (runs compiled dist/server.js)
- **Lint**: `npm run lint` (runs ESLint on src/**/*.ts)
- **Lint and fix**: `npm run lint:fix`
- **Run tests**: `npm test` (runs Jest with detectOpenHandles)
- **Test watch mode**: `npm run test:watch`
- **Test with coverage**: `npm run test:coverage`

## Project Structure

This is a Node.js/TypeScript Express application following a modular layered architecture.

### Core Structure
- `src/` - Source code
  - `config/` - Configuration (database, environment validation)
  - `middleware/` - Express middleware (authentication, validation, logging, error handling)
  - `modules/` - Feature modules (auth, jobs, payments, etc.)
  - `types` - TypeScript interfaces and types
  - `utils` - Utility functions (error handling, async wrappers, logging, response formatting)
  - `migrations` - SQL migration files
  - `server.ts` - Express application entry point
  - `__tests__` - Test files (integration and unit tests)

### Module Structure (each feature under src/modules/)
Each feature follows a consistent pattern:
- `*Controller.ts` - HTTP request handlers
- `*Service.ts` - Business logic
- `*Repository.ts` - Data access layer (raw SQL queries with pg)
- `*Routes.ts` - Express route definitions
- `*Validation.ts` - Zod validation schemas
- Additional files as needed (e.g., mappers, helpers)

### Key Technical Decisions
- **Database**: PostgreSQL with raw SQL queries (using pg parameterized queries for safety)
- **Authentication**: JWT-based with HttpOnly cookies (access and refresh tokens)
- **Validation**: Zod schema validation at middleware level
- **Error Handling**: Centralized error middleware with consistent response format
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston-based structured logging
- **Configuration**: Environment validation with Zod

### Data Access
Repositories use raw SQL queries with parameterized inputs to prevent SQL injection. 
Each repository typically includes CRUD operations and custom queries for the feature.

### API Architecture
RESTful API with versionless routes (consider adding versioning for future breaking changes).
Routes are mounted in `src/server.ts` via module routers.

### Development Guidelines
1. Follow the existing module structure when adding new features
2. Place validation schemas in `*Validation.ts` files
3. Use the `catchAsync` wrapper for async route handlers to avoid try/catch boilerplate
4. Throw `AppError` (from `utils/appError.ts`) for operational errors
5. Keep business logic in services, data access in repositories
6. Add logging via the logger utility (`utils/logger.ts`)
7. Write tests for new functionality (unit tests for services/repositories, integration tests for endpoints)
8. Ensure environment variables are defined in `.env.example` and validated in `src/config/environment.ts`

### Database Migrations
- SQL migrations are stored in `src/migrations/`
- New migrations should be created with descriptive names (e.g., `006_add_feature_name.sql`)
- Migrations are run manually; ensure they are backward compatible where possible
- Current migration state can be inspected in the database schema

### Testing
- Unit tests: Place in `__tests__` directories alongside the module or in `__tests__/unit/`
- Integration tests: In `__tests__` with suffix `.integration.test.ts`
- Use Supertest for HTTP endpoint testing
- Mock dependencies where appropriate
- Run tests with `npm test`; ensure no open handles are left

### Code Style
- Follows ESLint with TypeScript plugin
- Use Prettier formatting (configured via `.pretierrc` if exists, otherwise follow existing style)
- Import order: external, internal (absolute from src), relative
- Naming: camelCase for variables/functions, PascalCase for classes/types, UPPER_SNAKE for constants

### Environment Variables
- Copy `.env.example` to `.env` and fill in values
- Critical variables include database connection, JWT secrets, node environment, etc.
- Environment validation occurs at startup via `src/config/environment.ts`

### Git Workflow
- Create feature branches from `main`
- Write descriptive commit messages
- Ensure linting and tests pass before opening pull requests
- Squash commits when merging to maintain clean history

### Project Specific Notes
Based on the current analysis (Phase 4 implementation in progress), note that:
- Payment and reviews modules are actively being developed
- Some security and architectural gaps are being addressed (webhook security, role-based access, etc.)
- Refer to the latest analysis documents (`codebase-analysis-report.md`, `PHASE4_CODEBASE_ANALYSIS.md`) for detailed context on ongoing work

This CLAUDE.md is intended to provide a stable foundation for development. For the most current project status, consult the analysis documents and team communications.