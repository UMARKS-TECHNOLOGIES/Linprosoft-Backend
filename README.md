# Linprosoft-Backend

**A modular Node.js/TypeScript Express backend for the Linprosoft platform providing authentication, payments, reviews, and core business functionality.**

## Key Features

���🔐 **Authentication System**
- JWT-based auth with HttpOnly cookies (access & refresh tokens)
- Google OAuth integration
- Email verification with OTP
- Password reset functionality
- Role-based access control (employer, professional, admin)

���💰 **Payment Processing** 
- Paystack integration for secure payments
- Webhook handling with signature verification
- Admin approval workflow for payments
- Escrow system for held funds
- Payment dispute resolution

��⭐ **Reviews & Ratings**
- Employer review system for completed work
- Automatic average rating calculation
- Review eligibility validation (requires satisfaction approval)

���👥 **Core Modules**
- User profiles & professional types
- Job assignments & matching
- Skill & certification management
- Portfolio items
- Search functionality

## Tech Stack & Dependencies

| Category | Technology | Version/Purpose |
|----------|------------|-----------------|
| **Runtime** | Node.js | >=18.x |
| **Language** | TypeScript | ^5.9.3 |
| **Framework** | Express.js | ^4.18.2 |
| **Database** | PostgreSQL | ^8.20.0 (pg client) |
| **ORM/Query** | Raw SQL | Parameterized queries for safety |
| **Authentication** | JSON Web Tokens | ^9.0.2 |
| **Password Hashing** | bcryptjs | ^3.0.3 |
| **Validation** | Zod | ^4.3.6 |
| **Security** | Helmet, CORS, Rate Limiting | Configured middleware |
| **Logging** | Winston | ^3.19.0 (structured logging) |
| **Email** | Resend | ^6.17.2 (OTP delivery) |
| **HTTP Client** | Axios | ^1.18.1 (external API calls) |
| **Dev Tools** | Jest, Supertest, ESLint | Testing & linting |

## Prerequisites

Before installing Linprosoft-Backend, ensure you have:

- **Node.js** >= 18.x installed
- **PostgreSQL** >= 12.x running and accessible
- **Git** for version control
- **npm** or **yarn** package manager

## Step-by-Step Installation & Setup

Follow these exact steps to get the development environment running:

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Linprosoft-Backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration:
# - Database connection details
# - JWT secrets
# - Port configuration
# - Frontend URL for CORS
# - Paystack API keys (for payments)
# - Google OAuth credentials
# - Resend API key (for email)
```

### 4. Set Up Database
```bash
# Create the database (if not exists)
createdb linprosoft_backend  # or use your preferred method

# Run migrations (check src/migrations/ for SQL files)
# Migrations need to be run manually - apply them in order:
# psql -d linprosoft_backend -f src/migrations/001_initial.sql
# psql -d linprosoft_backend -f src/migrations/002_add_feature.sql
# ... continue through all migration files
```

### 5. Verify Installation
```bash
# Check that the build compiles correctly
npm run build

# Start the development server
npm run dev
```

The server should start on http://localhost:${PORT} (default PORT from .env)

## Environment Variables

Copy `.env.example` to `.env` and configure these variables:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `linprosoft_backend` |
| `ACCESS_TOKEN_EXPIRES_SECONDS` | Access token expiry | `1800` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Refresh token expiry | `7` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-google-client-secret` |
| `GOOGLE_REDIRECT_URI_DEV` | Google OAuth redirect URI (dev) | `http://localhost:5000/api/auth/google/callback` |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI (prod) | `https://yourdomain.com/api/auth/google/callback` |
| `RESEND_API_KEY` | Resend API key for email | `your-resend-key` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | `your-paystack-secret-key` |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | `your-paystack-public-key` |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret | `your-webhook-secret` |

## Usage Examples

### Development Server
```bash
# Start with hot reloading
npm run dev

# Server will restart automatically on file changes
```

### Production Build & Start
```bash
# Compile TypeScript to JavaScript
npm run build

# Start the compiled application
npm run start
```

### Running Tests
```bash
# Run all tests with open handle detection
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Code Quality
```bash
# Lint the codebase
npm run lint

# Automatically fix linting errors
npm run lint:fix
```

## Core Architecture

Linprosoft-Backend follows a **modular layered architecture** with clear separation of concerns:

```
src/
├── config/          # Environment & database configuration
├── middleware/      # Custom Express middleware (auth, validation, logging, etc.)
├── modules/         # Feature modules (auth, payments, reviews, etc.)
│   ├── *Controller.ts   # HTTP request handlers
│   ├── *Service.ts      # Business logic
│   ├── *Repository.ts   # Data access layer (raw SQL)
│   ├── *Routes.ts       # Express route definitions
│   └── *Validation.ts   # Zod validation schemas
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions (error handling, logging, etc.)
├── migrations/      # SQL migration files
├── server.ts        # Express application entry point
�└── app.ts           # Express app configuration & middleware setup
```

### Data Flow
1. **HTTP Request** → Express App → Middleware Pipeline
2. **Middleware** → Authentication, Validation, Logging, etc.
3. **Route Handler** → Controller → Service → Repository → Database
4. **Response** → Flows back through the chain with centralized error handling

### Module Structure
Each feature module (`src/modules/[feature]/`) contains:
- **Controller**: Handles HTTP requests and responses
- **Service**: Contains business logic and orchestrates operations
- **Repository**: Manages data access with raw SQL queries
- **Routes**: Defines Express route endpoints
- **Validation**: Zod schemas for input validation

## Database Schema

The backend uses PostgreSQL with raw SQL queries. Key tables include:
- `users` - User accounts and profiles
- `payments` - Payment transactions and escrow management
- `reviews` - Employer reviews for completed work
- `job_assignments` - Matching employers with professionals
- `skills`, `certifications` - Skill and certification management
- `portfolios` - Professional portfolio items
- Plus tables for assignments, sessions, webhook logs, etc.

Refer to `src/migrations/` for the complete schema evolution.

## API Reference

API endpoints are organized by feature module under `/api/`:
- **Authentication**: `/api/auth/*` (signup, login, OAuth, password reset)
- **Profiles**: `/api/profiles/*` (CRUD operations)
- **Skills**: `/api/skills/*` (skill management)
- **Certifications**: `/api/certifications/*` (certification tracking)
- **Portfolio**: `/api/portfolio/*` (portfolio items)
- **Jobs**: `/api/jobs/*` (job listings and applications)
- **Assignments**: `/api/assignments/*` (job agreements)
- **Payments**: `/api/payments/*` (payment processing)
- **Admin Payments**: `/api/admin/payments/*` (admin approval workflow)
- **Reviews**: `/api/reviews/*` (review system)
- **Search**: `/api/search/*` (search functionality)

## License

This project is licensed under the MIT License - see the LICENSE file for details.