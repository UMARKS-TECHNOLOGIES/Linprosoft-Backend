# Linkprosoft Database Documentation - Complete Index

**Version:** 1.0  
**Date:** April 2026  
**Platform:** Linkprosoft - Two-sided Skill Marketplace  

---

## 📋 Documentation Files Overview

This package contains comprehensive database documentation for the Linkprosoft platform. Here's what each file contains and how to use them:

### Core Documentation Files

| File | Purpose | When to Use |
|------|---------|-----------|
| **DATABASE_STRUCTURE.md** | Complete ERD, table specs, relationships, business rules | Understanding the full database design and architecture |
| **SQL_SCHEMA.sql** | Ready-to-execute PostgreSQL schema with all DDL | Creating the database for the first time |
| **DATABASE_IMPLEMENTATION_GUIDE.md** | Step-by-step setup and integration instructions | Implementing the database in your environment |
| **SQL_QUERIES_REFERENCE.sql** | Common SQL queries organized by feature | Writing backend logic and queries |
| **DATABASE_DOCUMENTATION_INDEX.md** | This file - Navigation guide | Getting started and finding information |

---

## 🗂️ Quick Navigation

### By Use Case

**I want to...**

- **Understand the database design**
  → Read: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - Start with "Overview" and "ERD" sections

- **Create the database from scratch**
  → Use: [SQL_SCHEMA.sql](SQL_SCHEMA.sql) - Execute entire file in PostgreSQL

- **Set up the database in my environment**
  → Follow: [DATABASE_IMPLEMENTATION_GUIDE.md](DATABASE_IMPLEMENTATION_GUIDE.md) - Section "Implementation Steps"

- **Write queries for backend logic**
  → Reference: [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Find query in appropriate section

- **Connect from Node.js**
  → See: [DATABASE_IMPLEMENTATION_GUIDE.md](DATABASE_IMPLEMENTATION_GUIDE.md) - Section "Connection Configuration"

- **Understand user authentication flow**
  → Read: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - Section "USERS Table" and "Data Flow Diagrams"

- **Set up professional profiles**
  → Follow: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - "PROFESSIONAL_PROFILES Table"
  → Queries: [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 2

- **Implement job posting**
  → Read: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - "JOB_POSTINGS Table"
  → Queries: [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 5

- **Process payments**
  → Study: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - "PAYMENTS Table" and "Commission Calculation"
  → Queries: [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 7

- **Implement reviews & ratings**
  → Learn: [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) - "REVIEWS Table"
  → Queries: [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 8

---

## 📊 Database Structure Summary

### 11 Core Tables

```
Authentication & Users:
├─ users (All users: professionals & employers)
└─ professional_profiles (Extended profile for professionals)

Skills Catalog:
├─ skills (Master list of skills)
└─ professional_skills (Links professionals to skills)

Professional Credibility:
├─ certifications (Professional certifications)
└─ portfolio_items (Portfolio showcase)

Job Workflow:
├─ job_postings (Job listings)
└─ job_assignments (Professional assignments)

Transactions:
├─ payments (Payment processing & commissions)
├─ reviews (Ratings & feedback)

Communication:
└─ messages (Direct messaging - Phase 2+)
```

### 3 Database Views (for common queries)

- `professional_summary` - Professional with skills count
- `job_posting_summary` - Job with employer info
- `payment_summary` - Payment with both parties

### 4 Automatic Triggers

- `trigger_update_professional_rating` - Auto-calculates average rating
- `trigger_update_users_updated_at` - Maintains updated timestamps
- `trigger_update_professional_profiles_updated_at` - Profile timestamps
- `trigger_update_job_postings_updated_at` - Job posting timestamps

---

## 🔑 Key Relationships

### User Flows

**Professional User Path:**
```
User Registration (email, password, user_type='professional')
    ↓
Create Professional Profile (hourly_rate, bio, availability)
    ↓
Add Skills (link to skill master list)
    ↓
Add Certifications & Portfolio Items
    ↓
Browse & Accept Job Postings
    ↓
Complete Job Assignment
    ↓
Receive Payment & Review
```

**Employer User Path:**
```
User Registration (email, password, user_type='employer', comp_name)
    ↓
Post Job (title, description, skill requirement, budget)
    ↓
Search & Select Professionals
    ↓
Create Job Assignment (invite professional)
    ↓
Professional accepts
    ↓
Job execution & completion
    ↓
Process Payment via Paystack
    ↓
Leave Review
```

**Payment Flow:**
```
Job marked completed
    ↓
Payment record created (status='pending')
    ↓
Employer initiates payment (Paystack)
    ↓
Payment webhook received
    ↓
Commissions calculated:
    - Seller: 15%
    - Buyer: 1%
    ↓
Payment marked completed
    ↓
Professional receives earnings
```

---

## 📈 Commission Structure

**All transactions follow this commission model:**

| Party | Commission | Example (NGN 100,000) |
|-------|-----------|----------------------|
| Professional (Seller) | 15% | Pays NGN 15,000 → Receives NGN 85,000 |
| Employer (Buyer) | 1% | Pays additional NGN 1,000 (total NGN 101,000) |
| **Platform Revenue** | **16%** | **NGN 16,000 per transaction** |

**Stored in payments table:**
- `amount`: 100,000.00 (base)
- `seller_commission`: 15,000.00
- `buyer_commission`: 1,000.00
- `seller_receives`: 85,000.00

---

## 🔍 Query Examples by Feature

### User Authentication (Section 1)
```sql
SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL;
```

### Professional Discovery (Section 2, 3)
```sql
SELECT professionals WHERE location = $1 AND skill_id = $2 ORDER BY avg_rating DESC;
```

### Job Search (Section 5)
```sql
SELECT jobs WHERE status = 'posted' AND location = $1 AND skill_id = $2;
```

### Job Assignment (Section 6)
```sql
INSERT INTO job_assignments (job_id, professional_id, status) VALUES ($1, $2, 'pending');
```

### Payment Processing (Section 7)
```sql
INSERT INTO payments (assignment_id, amount) WITH COMMISSION VALUES;
```

### Review & Rating (Section 8)
```sql
INSERT INTO reviews (assignment_id, rating, comment) TRIGGERING RATING UPDATE;
```

### Analytics (Section 10)
```sql
SELECT platform_statistics, user_dashboards, trending_skills;
```

---

## 🛠️ Implementation Phases

### Phase 1 (MVP - Current)
✅ User authentication (professionals & employers)  
✅ Professional profiles & skills  
✅ Job posting & assignment workflow  
✅ Payment processing (Paystack integration)  
✅ Reviews & ratings system  
✅ Skill search & matching  

### Phase 2 (Enhancement)
🔄 Messaging system with WebSocket  
🔄 Email notifications  
🔄 Real-time location tracking  
🔄 Advanced search with full-text indexing  
🔄 User analytics dashboard  

### Phase 3+ (Growth)
📅 Elasticsearch for complex search  
📅 Redis caching for performance  
📅 Read replicas for database scaling  
📅 Admin dashboard & reporting  
📅 Advanced payment methods  

---

## 📋 Table Reference Card

### Quick Table Lookup

**USERS** - Core user accounts
- Stores both professionals and employers
- Key field: `user_type` ('professional' or 'employer')
- Security: Password hashed with bcrypt
- Soft delete via `deleted_at` timestamp

**PROFESSIONAL_PROFILES** - Extended professional info
- Links 1:1 to users where user_type='professional'
- Stores: hourly rate, bio, availability, ratings
- Auto-calculated: `avg_rating`, `total_reviews` via trigger

**SKILLS** - Master skill catalog
- Predefined list (45+ skills seeded)
- Organized by category (IT, Design, Trades, etc.)
- Referenced by job postings and professionals

**PROFESSIONAL_SKILLS** - Skills-Professional mapping
- Many-to-many relationship
- Tracks: proficiency level, years of experience
- Can mark one as `is_primary` (featured)

**CERTIFICATIONS** - Professional credentials
- Multiple per professional
- Tracks: issuer, dates, verification URL
- Supports credential verification

**PORTFOLIO_ITEMS** - Professional past work
- Multiple per professional
- Stores: title, description, images, links
- Showcases professional capabilities

**JOB_POSTINGS** - Job listings
- Created by employers
- Status workflow: draft → posted → in_progress → completed
- Auto-expires old jobs via `expires_at`

**JOB_ASSIGNMENTS** - Who's assigned to what job
- Links job to professional
- Status: pending → accepted → in_progress → completed
- Enables payment triggering

**PAYMENTS** - Financial transactions
- One per completed job assignment
- Stores both commission amounts
- Paystack integration: `paystack_reference` unique key

**REVIEWS** - Ratings & feedback
- One per job assignment (after completion)
- Rating: 1-5 stars
- Triggers professional rating recalculation

**MESSAGES** - Direct communication
- Sender & recipient (both users)
- Read status tracking
- Phase 2 enhancement with WebSocket

---

## 🔒 Security Features

**Built-in:**
- ✅ Password hashing (bcrypt rounds: 12)
- ✅ Case-insensitive email (CITEXT) prevents duplicates
- ✅ Foreign key constraints maintain referential integrity
- ✅ Soft deletes preserve audit trail
- ✅ Check constraints validate enum fields
- ✅ Unique constraints prevent duplicates

**Application-level (implement in backend):**
- 🔐 JWT tokens in HTTP-only cookies
- 🔐 Role-based access control (RBAC)
- 🔐 SQL parameterization (prevents injection)
- 🔐 Input validation with Zod schemas
- 🔐 Rate limiting on auth endpoints
- 🔐 Audit logging for sensitive actions

---

## ⚡ Performance Optimization

### Indexes Provided (30+ total)
- User queries: email lookup, user_type filtering, location
- Professional discovery: rating sorting, availability, skill matching
- Job search: status filtering, location, creation date
- Payment reporting: payer/payee, status, reference
- Review aggregation: professional ratings

### Query Optimization Tips
1. **Always use parameterized queries** → Prevents SQL injection
2. **Use indexes for WHERE clauses** → Faster filtering
3. **Paginate large result sets** → Reduces memory usage
4. **Join with indexes** → Optimized table traversal
5. **Aggregate at database level** → Reduces data transfer

### Connection Pooling
```
Min connections: 2
Max connections: 10
Idle timeout: 30 seconds
Connection timeout: 2 seconds
```

---

## 📞 Common Support Scenarios

### "How do I...?"

**...set up the database?**
→ [DATABASE_IMPLEMENTATION_GUIDE.md](DATABASE_IMPLEMENTATION_GUIDE.md) - Steps 1-3

**...connect from Node.js?**
→ [DATABASE_IMPLEMENTATION_GUIDE.md](DATABASE_IMPLEMENTATION_GUIDE.md) - "Connection Configuration"

**...get professionals by skill?**
→ [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 3.8

**...process a payment?**
→ [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 7.2

**...calculate professional earnings?**
→ [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 7.6, 7.7

**...track job assignments?**
→ [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 6

**...get platform statistics?**
→ [SQL_QUERIES_REFERENCE.sql](SQL_QUERIES_REFERENCE.sql) - Section 10.1

**...debug a slow query?**
→ [DATABASE_IMPLEMENTATION_GUIDE.md](DATABASE_IMPLEMENTATION_GUIDE.md) - "Troubleshooting"

---

## 📚 Document Reading Order

**For First-Time Setup:**
1. Read: DATABASE_STRUCTURE.md (Overview section)
2. Execute: SQL_SCHEMA.sql (create database)
3. Follow: DATABASE_IMPLEMENTATION_GUIDE.md (Steps 1-4)
4. Reference: SQL_QUERIES_REFERENCE.sql (for coding)

**For Backend Development:**
1. Skim: DATABASE_STRUCTURE.md (your feature area)
2. Use: SQL_QUERIES_REFERENCE.sql (copy/paste queries)
3. Adjust: Queries for your specific needs
4. Test: Use `EXPLAIN ANALYZE` if slow

**For Troubleshooting:**
1. Check: DATABASE_IMPLEMENTATION_GUIDE.md (Troubleshooting section)
2. Search: SQL_QUERIES_REFERENCE.sql (maintenance queries)
3. Verify: DATABASE_STRUCTURE.md (relationships & constraints)

---

## 📦 What's Included

```
Linkprosoft/
├── DATABASE_STRUCTURE.md              [Comprehensive design doc]
├── SQL_SCHEMA.sql                     [Ready to execute]
├── DATABASE_IMPLEMENTATION_GUIDE.md   [Setup instructions]
├── SQL_QUERIES_REFERENCE.sql          [Common queries]
└── DATABASE_DOCUMENTATION_INDEX.md    [This file]
```

**Total Documentation:**
- 4 comprehensive markdown files
- 2 complete SQL files
- 100+ code examples
- 45+ seeded skills
- 30+ performance indexes
- 4 automated triggers
- 3 helpful views

---

## 🎯 Quick Start Checklist

- [ ] Read DATABASE_STRUCTURE.md (Overview + ERD)
- [ ] Install PostgreSQL if not already installed
- [ ] Create database: `createdb linkprosoft_dev`
- [ ] Execute SQL_SCHEMA.sql to create schema
- [ ] Verify tables: `\dt` in psql
- [ ] Setup Node.js connection pool from DATABASE_IMPLEMENTATION_GUIDE.md
- [ ] Start building backend endpoints
- [ ] Reference SQL_QUERIES_REFERENCE.sql while coding
- [ ] Test queries with `EXPLAIN ANALYZE`
- [ ] Monitor performance with provided indexes

---

## 📞 Support Resources

**For PostgreSQL:**
- Official docs: https://www.postgresql.org/docs/
- psql commands: `\?` in psql terminal
- Performance tuning: https://wiki.postgresql.org/wiki/Performance_Optimization

**For Node.js/pg:**
- pg library: https://node-postgres.com/
- Connection pooling: https://node-postgres.com/features/pooling
- Query examples: https://node-postgres.com/features/queries

**For Linkprosoft:**
- PRD: Linkprosoft-PRD.md
- Architecture: ARCHITECTURE_BLUEPRINT.md, BACKEND_ARCHITECTURE.md
- Frontend: Front-end/ directory

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 20, 2026 | Initial comprehensive database documentation |

---

## 🎓 Learning Resources

### Understanding Two-Sided Marketplaces
This database supports a platform economy model where professionals and employers interact. Key concepts:
- **Sellers (Professionals):** Create profiles, offer skills, complete work
- **Buyers (Employers):** Post jobs, hire professionals, pay for work
- **Platform (Linkprosoft):** Facilitates transactions, takes commission, manages disputes

### Database Design Principles Used
- **Normalization:** Organized to reduce redundancy
- **Referential Integrity:** Foreign keys ensure data consistency
- **Scalability:** Indexes and views for performance
- **Auditability:** Timestamps and soft deletes for compliance
- **Flexibility:** Extensible for Phase 2+ features

---

**Last Updated:** April 20, 2026  
**Total Documentation Pages:** 10+  
**Total Lines of SQL:** 1000+  
**Total Queries Reference:** 80+  

---

**Ready to get started?** Start with [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) or jump straight to [SQL_SCHEMA.sql](SQL_SCHEMA.sql) to create your database!
