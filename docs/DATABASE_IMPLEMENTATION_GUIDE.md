# Linkprosoft Database Implementation Guide

**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Quick reference for implementing the Linkprosoft database

---

## Quick Start

### Files Created

1. **DATABASE_STRUCTURE.md** - Comprehensive database structure documentation
2. **SQL_SCHEMA.sql** - Complete PostgreSQL schema ready to execute
3. **DATABASE_IMPLEMENTATION_GUIDE.md** - This file (implementation steps)

---

## Database Overview

### Platform Type
Two-sided marketplace connecting:
- **Professionals (Sellers)** - Service providers
- **Employers/Users (Buyers)** - Service seekers

### Core Components

#### 1. Authentication & User Management (3 tables)
- `users` - Base user accounts for both professionals and employers
- `professional_profiles` - Extended profile for professionals
- Related: All other tables via user_id

#### 2. Skill Catalog (2 tables)
- `skills` - Master list of available skill types
- `professional_skills` - Maps professionals to their skills

#### 3. Professional Credibility (2 tables)
- `certifications` - Professional certifications
- `portfolio_items` - Showcase of past work

#### 4. Job & Assignment Workflow (2 tables)
- `job_postings` - Jobs posted by employers
- `job_assignments` - Professional assignments to jobs

#### 5. Financial Transactions (1 table)
- `payments` - Payment processing with commission tracking
  - Seller commission: 15%
  - Buyer commission: 1%

#### 6. Feedback System (1 table)
- `reviews` - Ratings and comments after job completion

#### 7. Communication (1 table)
- `messages` - Direct messaging (Phase 2+)

---

## Implementation Steps

### Step 1: Install PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
```

**Linux (Ubuntu):**
```bash
sudo apt-get install postgresql postgresql-contrib
```

### Step 2: Create Database

```bash
# Start PostgreSQL service
# Windows: psql is available in Command Prompt/PowerShell
# macOS/Linux: ensure PostgreSQL service is running

# Create database
createdb linkprosoft_dev

# Or connect to PostgreSQL and run:
# CREATE DATABASE linkprosoft_dev;
```

### Step 3: Execute SQL Schema

```bash
# Using psql from command line
psql -U postgres -d linkprosoft_dev -f SQL_SCHEMA.sql

# Or from PostgreSQL terminal
\i SQL_SCHEMA.sql
```

### Step 4: Verify Schema

```bash
# Connect to database
psql -U postgres -d linkprosoft_dev

# List all tables
\dt

# Expected output:
# - users
# - professional_profiles
# - skills
# - professional_skills
# - certifications
# - portfolio_items
# - job_postings
# - job_assignments
# - payments
# - reviews
# - messages

# List views
\dv

# Expected views:
# - professional_summary
# - job_posting_summary
# - payment_summary

# Exit
\q
```

---

## Connection Configuration

### Node.js Backend Setup

**Install pg driver:**
```bash
cd backend
npm install pg dotenv
```

**Environment variables (.env):**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkprosoft_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Connection pool (config/database.ts):**
```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

**Example query:**
```typescript
import pool from './config/database';

const getUserById = async (id: number) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};
```

---

## Table Specifications Summary

### USERS (Authentication)
| Field | Type | Key | Notes |
|-------|------|-----|-------|
| id | SERIAL | PK | Auto-increment |
| email | CITEXT | UNIQUE | Case-insensitive |
| password | VARCHAR | | Bcrypt hashed |
| first_name | VARCHAR | | Required |
| last_name | VARCHAR | | Required |
| user_type | VARCHAR | CHECK | 'professional' or 'employer' |
| comp_name | VARCHAR | | Required if employer |
| phone | VARCHAR | | Optional |
| location | VARCHAR | | For skill matching |
| is_verified | BOOLEAN | | Email verification |
| created_at | TIMESTAMP | | Record creation |
| updated_at | TIMESTAMP | | Last update |
| deleted_at | TIMESTAMP | | Soft delete |

### PROFESSIONAL_PROFILES (Extended Profile)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| user_id | INTEGER | FK→users, UNIQUE |
| hourly_rate | DECIMAL | Service price in NGN |
| bio | TEXT | Professional summary |
| availability_status | VARCHAR | 'available', 'unavailable', 'away' |
| response_time_hours | INTEGER | Typical response time |
| total_hours_worked | INTEGER | Aggregate hours |
| avg_rating | DECIMAL | Auto-calculated from reviews |
| total_reviews | INTEGER | Review count |

### SKILLS (Master Catalog)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR | UNIQUE skill name |
| category | VARCHAR | 'IT', 'Design', 'Trades', etc. |
| description | TEXT | Skill overview |

### PROFESSIONAL_SKILLS (Many-to-Many)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| professional_id | INTEGER | FK→professional_profiles |
| skill_id | INTEGER | FK→skills |
| proficiency_level | VARCHAR | 'beginner', 'intermediate', 'expert' |
| years_of_experience | INTEGER | Experience duration |
| is_primary | BOOLEAN | Featured skill |

### CERTIFICATIONS (Credentials)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| professional_id | INTEGER | FK→professional_profiles |
| title | VARCHAR | Certificate name |
| issuer | VARCHAR | Issuing organization |
| issue_date | DATE | Issued date |
| expiry_date | DATE | Expiration (nullable) |
| credential_url | VARCHAR | Verification URL |

### PORTFOLIO_ITEMS (Past Work)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| professional_id | INTEGER | FK→professional_profiles |
| title | VARCHAR | Project title |
| description | TEXT | Project details |
| image_url | VARCHAR | Image URL (S3/external) |
| link_url | VARCHAR | Live project URL |

### JOB_POSTINGS (Job Listings)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| employer_id | INTEGER | FK→users (must be employer) |
| skill_id | INTEGER | FK→skills |
| title | VARCHAR | Job title |
| description | TEXT | Job details |
| budget | DECIMAL | Price in NGN |
| status | VARCHAR | 'draft', 'posted', 'in_progress', 'completed', 'cancelled' |
| location | VARCHAR | Job location |
| expires_at | TIMESTAMP | Auto-archive old jobs |

### JOB_ASSIGNMENTS (Assignments)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| job_id | INTEGER | FK→job_postings |
| professional_id | INTEGER | FK→professional_profiles |
| budget | DECIMAL | Negotiated amount |
| status | VARCHAR | 'pending', 'accepted', 'in_progress', 'completed', 'disputed' |
| completed_at | TIMESTAMP | Completion time |

### PAYMENTS (Financial)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| job_assignment_id | INTEGER | FK→job_assignments |
| payer_id | INTEGER | FK→users (employer) |
| payee_id | INTEGER | FK→users (professional) |
| amount | DECIMAL | Base amount |
| seller_commission | DECIMAL | 15% of amount |
| buyer_commission | DECIMAL | 1% of amount |
| seller_receives | DECIMAL | amount - seller_commission |
| status | VARCHAR | 'pending', 'processing', 'completed', 'failed', 'refunded' |
| paystack_reference | VARCHAR | Paystack transaction ID |

### REVIEWS (Feedback)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| job_assignment_id | INTEGER | FK→job_assignments, UNIQUE |
| reviewed_professional_id | INTEGER | FK→professional_profiles |
| reviewer_id | INTEGER | FK→users (employer) |
| rating | INTEGER | 1-5 stars |
| comment | TEXT | Review text |
| is_anonymous | BOOLEAN | Hide reviewer name |

### MESSAGES (Communication)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | PK |
| sender_id | INTEGER | FK→users |
| recipient_id | INTEGER | FK→users |
| content | TEXT | Message body |
| is_read | BOOLEAN | Read status |

---

## Key Features

### Relationships

```
users
  ├─ professional_profiles (1:1 optional, for professionals only)
  │  ├─ professional_skills (1:N)
  │  ├─ certifications (1:N)
  │  ├─ portfolio_items (1:N)
  │  ├─ job_assignments (1:N)
  │  └─ reviews (1:N) [as reviewed professional]
  ├─ job_postings (1:N, for employers only)
  ├─ payments (1:N, as payer)
  ├─ payments (1:N, as payee)
  ├─ reviews (1:N, as reviewer)
  ├─ messages (1:N, as sender)
  └─ messages (1:N, as recipient)

skills
  └─ professional_skills (1:N)
  └─ job_postings (1:N)

job_postings
  └─ job_assignments (1:N)

job_assignments
  ├─ payments (1:1)
  └─ reviews (1:1)
```

### Indexes for Performance

**User queries:**
- `idx_users_email` - Login lookups
- `idx_users_user_type` - Filter by role
- `idx_users_location` - Location-based queries

**Professional discovery:**
- `idx_professional_profiles_rating` - Sort by rating
- `idx_professional_skills_skill_id` - Find professionals with skill

**Job search:**
- `idx_job_postings_status` - Filter by status
- `idx_job_postings_location` - Location matching
- `idx_job_postings_created_at` - Recent jobs

**Financial reporting:**
- `idx_payments_payer_id` - Employer payments
- `idx_payments_payee_id` - Professional earnings
- `idx_payments_paystack_reference` - Payment verification

### Triggers & Automation

1. **Professional Rating Update**
   - Automatically recalculates `avg_rating` and `total_reviews` when review created
   - Keeps professional profile ratings current

2. **Timestamp Management**
   - Auto-updates `updated_at` on every row modification
   - Tracks data changes for audit trails

### Views for Common Queries

1. **professional_summary** - Professional with skills count
2. **job_posting_summary** - Job with employer details
3. **payment_summary** - Payment with both user details

---

## Commission Calculation

**Example: NGN 100,000 Job**

```
Job Amount: NGN 100,000.00
├─ Seller Commission (15%): NGN 15,000.00
│  └─ Professional Receives: NGN 85,000.00
└─ Buyer Commission (1%): NGN 1,000.00
   └─ Total Cost to Employer: NGN 101,000.00

Platform Revenue: NGN 16,000.00 per transaction
```

**Stored in payments table:**
- `amount`: 100,000.00
- `seller_commission`: 15,000.00
- `buyer_commission`: 1,000.00
- `seller_receives`: 85,000.00

---

## Data Migration Path

### Phase 1 (MVP) - Current Schema
- Users, profiles, skills
- Job posting & assignment workflow
- Basic payments & reviews

### Phase 2 (Enhancement)
- Messaging system integration
- Email notifications
- Real-time location tracking
- Advanced search with full-text indexing

### Phase 3+ (Growth)
- Payment method diversification
- Advanced analytics & reporting
- Redis caching for performance
- Elasticsearch for complex search
- Read replicas for scaling

---

## Security Considerations

1. **Password Hashing**
   - Bcrypt with 12 rounds
   - Never store plaintext passwords

2. **Email Uniqueness**
   - Case-insensitive with CITEXT type
   - Prevents duplicate accounts

3. **Role-Based Access**
   - `user_type` field enforces professional vs employer
   - Backend validates role on every request

4. **Soft Deletes**
   - `deleted_at` timestamp preserves data
   - No permanent deletion of user data

5. **Data Integrity**
   - Foreign keys with cascade delete/update
   - Check constraints on enum-like fields
   - Unique constraints prevent duplicates

---

## Performance Optimization

### Query Optimization Tips

1. **Use indexes on frequent filters:**
   ```sql
   -- Find professionals with skill in location
   SELECT * FROM professional_profiles pp
   JOIN professional_skills ps ON pp.id = ps.professional_id
   JOIN skills s ON ps.skill_id = s.id
   WHERE s.name = 'Web Development' AND pp.location = 'Lagos'
   -- Uses: idx_professional_skills_skill_id, idx_skills_name
   ```

2. **Pagination for large result sets:**
   ```sql
   SELECT * FROM job_postings
   WHERE status = 'posted'
   ORDER BY created_at DESC
   LIMIT 20 OFFSET 0;
   -- Uses: idx_job_postings_status, idx_job_postings_created_at
   ```

3. **Aggregate queries:**
   ```sql
   -- Professional earnings report
   SELECT payee_id, SUM(seller_receives) FROM payments
   WHERE status = 'completed'
   GROUP BY payee_id;
   -- Uses: idx_payments_payee_id, idx_payments_status
   ```

### Connection Pooling

```typescript
// pg pool configuration
{
  min: 2,           // Minimum connections
  max: 10,          // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

---

## Maintenance & Monitoring

### Regular Maintenance

```bash
# Backup database
pg_dump linkprosoft_dev > backup_$(date +%Y%m%d).sql

# Restore from backup
psql linkprosoft_dev < backup_20260420.sql

# Analyze table statistics (for query optimizer)
ANALYZE;

# Identify slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Monitoring Queries

```sql
-- Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check for missing indexes
SELECT schemaname, tablename, attname
FROM pg_stat_user_tables t
JOIN pg_attribute a ON t.relid = a.attrelid
WHERE seq_scan > 1000 AND indexrelname IS NULL;
```

---

## Troubleshooting

### Common Issues

**Issue: "FATAL: Ident authentication failed"**
```bash
# Edit pg_hba.conf to use md5 or password authentication
# Usually at: /etc/postgresql/13/main/pg_hba.conf
# Change: local   all   postgres   ident
# To:     local   all   postgres   md5
```

**Issue: "Role does not exist"**
```sql
-- Create user if not exists
CREATE USER linkprosoft_app WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE linkprosoft_dev TO linkprosoft_app;
```

**Issue: Slow queries**
```sql
-- Check query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Add missing index if needed
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

---

## Next Steps

1. ✅ Execute `SQL_SCHEMA.sql` to create database
2. ✅ Verify schema with `\dt` in psql
3. ✅ Setup environment variables in backend `.env`
4. ✅ Initialize connection pool in Node.js
5. ✅ Create repository layer for data access
6. ✅ Write service layer for business logic
7. ✅ Build API controllers for endpoints
8. ✅ Setup migrations for schema changes
9. ✅ Monitor performance with indexes
10. ✅ Plan Phase 2+ enhancements

---

## Files Reference

| File | Purpose |
|------|---------|
| DATABASE_STRUCTURE.md | Complete documentation of database design |
| SQL_SCHEMA.sql | Ready-to-execute PostgreSQL schema |
| DATABASE_IMPLEMENTATION_GUIDE.md | Step-by-step implementation (this file) |

---

**Document Created:** April 2026  
**Last Updated:** April 20, 2026  
**Version:** 1.0
