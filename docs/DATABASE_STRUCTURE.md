# Linkprosoft - Comprehensive Database Structure Documentation

**Version:** 1.0  
**Date:** April 2026  
**Platform:** PostgreSQL  
**Purpose:** Complete data model reference for Linkprosoft Platform  

---

## Table of Contents

1. [Overview](#overview)
2. [Database Entity Relationship Diagram](#database-entity-relationship-diagram)
3. [Complete Table Specifications](#complete-table-specifications)
4. [Data Types & Constraints](#data-types--constraints)
5. [Relationships & Integrity](#relationships--integrity)
6. [Indexes & Performance](#indexes--performance)
7. [Business Rules & Validations](#business-rules--validations)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

### Database Purpose
Linkprosoft is a two-sided marketplace connecting:
- **Professionals (Sellers):** Skilled workers offering services
- **Employers/Users (Buyers):** Individuals and businesses seeking services

### Core Domains
1. **Authentication & User Management** - User registration, login, session management
2. **Professional Profiles** - Skill portfolios, certifications, ratings
3. **Skill Catalog** - Skill categories, descriptions, pricing
4. **Job Posting & Matching** - Job creation, skill matching, assignments
5. **Payment Processing** - Secure transactions, commissions, payouts
6. **Reviews & Ratings** - Feedback system, professional ratings
7. **Messaging** - Communication between professionals and employers (Phase 2)

### Database Specifications
- **Engine:** PostgreSQL 13+
- **Character Set:** UTF-8
- **Time Zone:** UTC
- **Extensions:** citext (for case-insensitive email)
- **Connection Pooling:** pg-pool (Node.js backend)

---

## Database Entity Relationship Diagram

```
┌─────────────────────┐
│      USERS          │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ password            │
│ first_name          │
│ last_name           │
│ user_type           │ ◄────────┐
│ comp_name           │          │
│ phone               │          │
│ location            │          │
│ is_verified         │          │
│ created_at          │          │
│ updated_at          │          │
│ deleted_at          │          │
└──────────┬──────────┘          │
           │                     │
     ┌─────┴──────┬──────────────┴─────┐
     │            │                    │
     ▼            ▼                    ▼
┌──────────────┐ ┌──────────────────┐ ┌──────────────┐
│PROFESSIONAL  │ │ JOB_POSTINGS     │ │   PAYMENTS   │
│_PROFILES     │ │                  │ │              │
├──────────────┤ ├──────────────────┤ ├──────────────┤
│ id (PK)      │ │ id (PK)          │ │ id (PK)      │
│ user_id (FK) │ │ employer_id (FK) │ │ payer_id (FK)│
│ hourly_rate  │ │ skill_id (FK)    │ │ payee_id (FK)│
│ bio          │ │ title            │ │ job_assign...│
│ availability │ │ description      │ │ amount       │
│ response_time│ │ budget           │ │ commission   │
│ avg_rating   │ │ status           │ │ status       │
│ total_reviews│ │ location         │ │ method       │
│ created_at   │ │ created_at       │ │ reference    │
└──────────────┘ │ expires_at       │ │ created_at   │
       │         └──────────────────┘ └──────────────┘
       │                 │
       │                 ▼
       │          ┌──────────────────┐
       │          │ JOB_ASSIGNMENTS  │
       │          ├──────────────────┤
       │          │ id (PK)          │
       │          │ job_id (FK)      │
       │          │ professional_id  │
       │          │ budget           │
       │          │ status           │
       │          │ created_at       │
       └─────────►│ completed_at     │
                  └──────────────────┘
                          │
                          ▼
                  ┌──────────────────┐
                  │    REVIEWS       │
                  ├──────────────────┤
                  │ id (PK)          │
                  │ job_assign_id(FK)│
                  │ reviewed_prof_id │
                  │ reviewer_id (FK) │
                  │ rating (1-5)     │
                  │ comment          │
                  │ is_anonymous     │
                  │ created_at       │
                  └──────────────────┘

┌─────────────────┐
│     SKILLS      │
├─────────────────┤
│ id (PK)         │
│ name            │
│ category        │
│ description     │
│ created_at      │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ PROFESSIONAL_SKILLS      │
├──────────────────────────┤
│ id (PK)                  │
│ professional_id (FK)     │
│ skill_id (FK)            │
│ proficiency_level        │
│ years_of_experience      │
│ is_primary               │
│ created_at               │
│ UNIQUE(professional_id,  │
│         skill_id)        │
└──────────────────────────┘

┌──────────────────────┐
│  CERTIFICATIONS      │
├──────────────────────┤
│ id (PK)              │
│ professional_id (FK) │
│ title                │
│ issuer               │
│ issue_date           │
│ expiry_date          │
│ credential_url       │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│  PORTFOLIO_ITEMS     │
├──────────────────────┤
│ id (PK)              │
│ professional_id (FK) │
│ title                │
│ description          │
│ image_url            │
│ link_url             │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│    MESSAGES          │
├──────────────────────┤
│ id (PK)              │
│ sender_id (FK)       │
│ recipient_id (FK)    │
│ content              │
│ is_read              │
│ created_at           │
└──────────────────────┘
```

---

## Complete Table Specifications

### 1. USERS Table
**Purpose:** Core user management for both professionals and employers

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address (case-insensitive) |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `first_name` | VARCHAR(100) | NOT NULL | User's first name |
| `last_name` | VARCHAR(100) | NOT NULL | User's last name |
| `user_type` | VARCHAR(20) | NOT NULL, CHECK IN ('professional', 'employer') | Role type (two-sided marketplace) |
| `comp_name` | VARCHAR(255) | NULL | Company name (required if user_type='employer') |
| `phone` | VARCHAR(20) | NULL | Phone number for contact |
| `location` | VARCHAR(255) | NULL | City/location for skill matching |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Email verification status |
| `verification_token` | VARCHAR(255) | NULL | Token for email verification (Phase 2) |
| `password_reset_token` | VARCHAR(255) | NULL | Token for password reset flow |
| `password_reset_expires_at` | TIMESTAMP | NULL | Expiration time for reset token |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last profile update |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Business Rules:**
- Email must be unique and used for login
- Password stored as bcrypt hash (rounds: 12)
- `user_type` determines access rights and features
- If `user_type='employer'`, `comp_name` is required
- Soft delete: record not removed, just marked with `deleted_at`

**Example Data:**
```
id: 1, email: john@example.com, user_type: 'professional', location: 'Lagos'
id: 2, email: acme@example.com, user_type: 'employer', comp_name: 'ACME Corp'
```

---

### 2. PROFESSIONAL_PROFILES Table
**Purpose:** Extended profile data for professionals offering services

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Profile identifier |
| `user_id` | INTEGER | UNIQUE, NOT NULL, FK→users.id | Reference to user account |
| `hourly_rate` | DECIMAL(10,2) | NULL | Service rate per hour (NGN) |
| `bio` | TEXT | NULL | Professional biography/summary |
| `availability_status` | VARCHAR(20) | DEFAULT 'available', CHECK IN ('available', 'unavailable', 'away') | Current availability |
| `response_time_hours` | INTEGER | NULL | Typical response time in hours |
| `total_hours_worked` | INTEGER | DEFAULT 0 | Aggregate hours completed |
| `avg_rating` | DECIMAL(3,2) | DEFAULT 0.0 | Average rating from reviews (0-5) |
| `total_reviews` | INTEGER | DEFAULT 0 | Total count of reviews |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Profile creation date |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last profile modification |

**Business Rules:**
- One-to-one relationship with users (each professional has one profile)
- `hourly_rate` can be updated by professional
- `avg_rating` and `total_reviews` updated via trigger on review creation
- `availability_status` updated by professional in real-time
- UNIQUE on `user_id` ensures one profile per professional

**Example Data:**
```
id: 1, user_id: 1, hourly_rate: 5000.00, availability_status: 'available', avg_rating: 4.5
```

---

### 3. SKILLS Table
**Purpose:** Master list of available skill categories

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Skill identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Skill name (e.g., "Web Development") |
| `category` | VARCHAR(100) | NOT NULL | Skill category (e.g., "IT", "Design") |
| `description` | TEXT | NULL | Detailed skill description |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Skill entry creation date |

**Business Rules:**
- Skills are created by admin or seeded during setup
- Skills are referenced by job postings and professional skill associations
- Used for searching and matching professionals with jobs
- Name is unique to prevent duplicates

**Example Data:**
```
id: 1, name: "Web Development", category: "IT", description: "HTML, CSS, JavaScript, React..."
id: 2, name: "Graphic Design", category: "Design", description: "UI/UX, Adobe Suite..."
id: 3, name: "Plumbing", category: "Trades", description: "Installation and repair..."
```

---

### 4. PROFESSIONAL_SKILLS Table
**Purpose:** Many-to-many junction between professionals and their skills

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Record identifier |
| `professional_id` | INTEGER | NOT NULL, FK→professional_profiles.id | Reference to professional profile |
| `skill_id` | INTEGER | NOT NULL, FK→skills.id | Reference to skill |
| `proficiency_level` | VARCHAR(20) | DEFAULT 'intermediate', CHECK IN ('beginner', 'intermediate', 'expert') | Skill proficiency |
| `years_of_experience` | INTEGER | NULL | Years experienced in this skill |
| `is_primary` | BOOLEAN | DEFAULT FALSE | Whether this is primary skill (highlighted) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Association creation date |
| UNIQUE(professional_id, skill_id) | | | Prevents duplicate skill entries |

**Business Rules:**
- Links professionals with skills they possess
- Proficiency level indicates expertise: beginner/intermediate/expert
- Only one primary skill per professional (recommended)
- Used for skill matching in job searches
- Deletion of skill or professional cascades

**Example Data:**
```
id: 1, professional_id: 1, skill_id: 1, proficiency_level: 'expert', years_of_experience: 5, is_primary: true
id: 2, professional_id: 1, skill_id: 2, proficiency_level: 'intermediate', years_of_experience: 2
```

---

### 5. CERTIFICATIONS Table
**Purpose:** Professional certifications and credentials

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Certification identifier |
| `professional_id` | INTEGER | NOT NULL, FK→professional_profiles.id | Reference to professional |
| `title` | VARCHAR(255) | NOT NULL | Certification title |
| `issuer` | VARCHAR(255) | NULL | Organization issuing certification |
| `issue_date` | DATE | NULL | Date certification was issued |
| `expiry_date` | DATE | NULL | Date certification expires (if applicable) |
| `credential_url` | VARCHAR(500) | NULL | URL to verify certification online |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When added to profile |

**Business Rules:**
- Multiple certifications per professional allowed
- Used to validate professional credentials
- Expiry date can be null for non-expiring certs
- URL allows verification of authenticity
- Supports professional credibility building

**Example Data:**
```
id: 1, professional_id: 1, title: "AWS Solutions Architect", issuer: "Amazon", issue_date: 2023-01-15
id: 2, professional_id: 1, title: "Google UX Certificate", issuer: "Google", expiry_date: 2025-06-01
```

---

### 6. JOB_POSTINGS Table
**Purpose:** Job/gig postings created by employers

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Job posting identifier |
| `employer_id` | INTEGER | NOT NULL, FK→users.id | Reference to employer (user_type='employer') |
| `skill_id` | INTEGER | NULL, FK→skills.id | Primary skill required |
| `title` | VARCHAR(255) | NOT NULL | Job title |
| `description` | TEXT | NOT NULL | Detailed job description |
| `budget` | DECIMAL(10,2) | NULL | Job budget in NGN |
| `status` | VARCHAR(20) | DEFAULT 'posted', CHECK IN ('draft', 'posted', 'in_progress', 'completed', 'cancelled') | Job lifecycle status |
| `location` | VARCHAR(255) | NULL | Job location (for location-based matching) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When job was posted |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification |
| `expires_at` | TIMESTAMP | NULL | Job expiration (auto-removal or archival) |

**Business Rules:**
- Only employers can create job postings
- Status workflow: draft → posted → in_progress → completed
- Budget can be null for "to be negotiated" jobs
- Location used for geographic skill matching
- Soft delete via status='cancelled'
- `expires_at` for auto-archiving old postings

**Example Data:**
```
id: 1, employer_id: 2, skill_id: 1, title: "Build E-commerce Website", 
budget: 250000.00, status: 'posted', location: 'Lagos'
```

---

### 7. JOB_ASSIGNMENTS Table
**Purpose:** Track which professional is assigned to which job

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Assignment identifier |
| `job_id` | INTEGER | NOT NULL, FK→job_postings.id | Reference to job posting |
| `professional_id` | INTEGER | NOT NULL, FK→professional_profiles.id | Reference to professional assigned |
| `budget` | DECIMAL(10,2) | NULL | Negotiated budget for this assignment |
| `status` | VARCHAR(20) | DEFAULT 'pending', CHECK IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'disputed') | Assignment lifecycle |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When assignment was created |
| `completed_at` | TIMESTAMP | NULL | When assignment was completed |

**Business Rules:**
- Links a specific professional to a job posting
- Status flow: pending (invited) → accepted → in_progress → completed
- One professional per job (or multiple if multi-professional job)
- Budget can be different from job posting budget (negotiated)
- Enables payment trigger when completed
- Disputed status flags for manual review

**Example Data:**
```
id: 1, job_id: 1, professional_id: 1, status: 'in_progress', budget: 250000.00
```

---

### 8. PAYMENTS Table
**Purpose:** Financial transactions between employers and professionals

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Payment identifier |
| `job_assignment_id` | INTEGER | NOT NULL, FK→job_assignments.id | Reference to completed job |
| `payer_id` | INTEGER | NOT NULL, FK→users.id | Employer/buyer making payment |
| `payee_id` | INTEGER | NOT NULL, FK→users.id | Professional/seller receiving payment |
| `amount` | DECIMAL(10,2) | NOT NULL | Base payment amount (before commission) |
| `seller_commission` | DECIMAL(10,2) | NULL | Commission deducted from professional (15%) |
| `buyer_commission` | DECIMAL(10,2) | NULL | Commission deducted from employer (1%) |
| `seller_receives` | DECIMAL(10,2) | NULL | Amount professional receives after commission |
| `status` | VARCHAR(20) | DEFAULT 'pending', CHECK IN ('pending', 'processing', 'completed', 'failed', 'refunded') | Payment status |
| `payment_method` | VARCHAR(50) | DEFAULT 'paystack' | Payment gateway used |
| `paystack_reference` | VARCHAR(255) | NULL, UNIQUE | Paystack transaction reference |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Payment initiation time |
| `completed_at` | TIMESTAMP | NULL | When payment was completed |

**Commission Structure:**
- Seller commission: 15% (professional pays)
- Buyer commission: 1% (employer pays)
- Example: NGN 100,000 job
  - Seller receives: NGN 85,000 (15% to platform)
  - Buyer pays: NGN 101,000 (1% to platform)

**Business Rules:**
- Created when job_assignment reaches 'completed' status
- Payment gateway integration via Paystack
- Webhook handles payment confirmation
- Status tracking for payment processing
- Commission auto-calculated
- Supports refunds if disputes arise

**Example Data:**
```
id: 1, job_assignment_id: 1, payer_id: 2, payee_id: 1, amount: 100000.00,
seller_commission: 15000.00, buyer_commission: 1000.00, seller_receives: 85000.00,
status: 'completed', paystack_reference: 'ref_xxxxx'
```

---

### 9. REVIEWS Table
**Purpose:** Ratings and feedback after job completion

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Review identifier |
| `job_assignment_id` | INTEGER | NOT NULL, FK→job_assignments.id | Reference to completed job |
| `reviewed_professional_id` | INTEGER | NOT NULL, FK→professional_profiles.id | Professional being reviewed |
| `reviewer_id` | INTEGER | NOT NULL, FK→users.id | User leaving review (employer) |
| `rating` | INTEGER | NOT NULL, CHECK (rating >= 1 AND rating <= 5) | Star rating (1-5) |
| `comment` | TEXT | NULL | Review commentary |
| `is_anonymous` | BOOLEAN | DEFAULT FALSE | Hide reviewer identity (Phase 2) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Review submission date |
| UNIQUE(job_assignment_id) | | | One review per job assignment |

**Business Rules:**
- Only employers can review professionals
- One review per job assignment (reviewer: employer, reviewed: professional)
- Rating on 1-5 star scale
- Comments optional but recommended
- Anonymous reviews hide employer name (Phase 2)
- Trigger: Updates professional_profiles.avg_rating and total_reviews
- Used for professional credibility

**Example Data:**
```
id: 1, job_assignment_id: 1, reviewed_professional_id: 1, reviewer_id: 2,
rating: 5, comment: "Excellent work, delivered on time!", is_anonymous: false
```

---

### 10. PORTFOLIO_ITEMS Table
**Purpose:** Professional portfolio showcasing past work

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Portfolio item identifier |
| `professional_id` | INTEGER | NOT NULL, FK→professional_profiles.id | Reference to professional |
| `title` | VARCHAR(255) | NOT NULL | Project/portfolio title |
| `description` | TEXT | NULL | Project description |
| `image_url` | VARCHAR(500) | NULL | Project image or thumbnail URL |
| `link_url` | VARCHAR(500) | NULL | Link to live project or portfolio page |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When added to portfolio |

**Business Rules:**
- Multiple portfolio items per professional
- Used to showcase work and build credibility
- Images stored as URLs (external storage like S3)
- Links can be to live projects, GitHub, Dribbble, etc.
- Displayed on professional public profile

**Example Data:**
```
id: 1, professional_id: 1, title: "E-commerce Platform", 
description: "Full-stack web app using React and Node.js",
link_url: "https://projects.example.com/ecommerce"
```

---

### 11. MESSAGES Table
**Purpose:** Direct messaging between professionals and employers (Phase 2+)

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | SERIAL | PRIMARY KEY | Message identifier |
| `sender_id` | INTEGER | NOT NULL, FK→users.id | User sending message |
| `recipient_id` | INTEGER | NOT NULL, FK→users.id | User receiving message |
| `content` | TEXT | NOT NULL | Message body |
| `is_read` | BOOLEAN | DEFAULT FALSE | Whether recipient has read message |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Message sent time |

**Business Rules:**
- Enables real-time communication (Phase 2 with WebSocket)
- Supports conversation threading (group by sender/recipient pair)
- Read receipts for better UX
- Soft delete via archive (future enhancement)
- Consider implementing pagination for message history

**Example Data:**
```
id: 1, sender_id: 1, recipient_id: 2, content: "Hi, interested in your web dev project",
is_read: true, created_at: 2026-04-20 14:30:00
```

---

## Data Types & Constraints

### PostgreSQL Data Types Used

| Type | Use Cases | Example |
|------|-----------|---------|
| `SERIAL` | Auto-incrementing integers | User IDs, primary keys |
| `INTEGER` | Whole numbers | Years of experience, rating count |
| `VARCHAR(n)` | Variable-length strings | Names, emails, titles (limited) |
| `TEXT` | Large text | Descriptions, comments, bios |
| `DECIMAL(10,2)` | Monetary values | Prices, rates, commissions (precise) |
| `BOOLEAN` | True/false | Verification status, primary flags |
| `DATE` | Date only | Certification dates, issue dates |
| `TIMESTAMP` | Date + time | Created/updated timestamps |

### Constraint Types

| Constraint | Purpose | Example |
|-----------|---------|---------|
| `PRIMARY KEY` | Unique row identifier | `id SERIAL PRIMARY KEY` |
| `FOREIGN KEY` | Reference another table | `REFERENCES users(id)` |
| `UNIQUE` | Prevent duplicate values | `email VARCHAR(255) UNIQUE` |
| `NOT NULL` | Require value | `first_name VARCHAR(100) NOT NULL` |
| `DEFAULT` | Set default value | `DEFAULT CURRENT_TIMESTAMP` |
| `CHECK` | Validate value range | `CHECK (rating >= 1 AND rating <= 5)` |

---

## Relationships & Integrity

### Primary Relationships

#### 1. Users → Professional_Profiles (1:1)
- **Direction:** One user has zero or one professional profile
- **Constraint:** `FK professional_profiles.user_id REFERENCES users.id ON DELETE CASCADE`
- **Business:** Profiles only exist for professionals (user_type='professional')
- **Cascade:** If user deleted, profile deleted

#### 2. Professional_Profiles → Professional_Skills (1:N)
- **Direction:** One professional has many skills
- **Constraint:** `FK professional_skills.professional_id REFERENCES professional_profiles.id ON DELETE CASCADE`
- **Business:** Professional can possess multiple skills
- **Cascade:** If profile deleted, all skill associations deleted

#### 3. Skills → Professional_Skills (1:N)
- **Direction:** One skill type has many professional associations
- **Constraint:** `FK professional_skills.skill_id REFERENCES skills.id ON DELETE CASCADE`
- **Business:** Multiple professionals can have same skill

#### 4. Professional_Profiles → Certifications (1:N)
- **Direction:** One professional has many certifications
- **Constraint:** `FK certifications.professional_id REFERENCES professional_profiles.id ON DELETE CASCADE`
- **Cascade:** If profile deleted, certifications deleted

#### 5. Professional_Profiles → Portfolio_Items (1:N)
- **Direction:** One professional has many portfolio items
- **Constraint:** `FK portfolio_items.professional_id REFERENCES professional_profiles.id ON DELETE CASCADE`
- **Cascade:** If profile deleted, portfolios deleted

#### 6. Users → Job_Postings (1:N) [Employer]
- **Direction:** One employer posts many jobs
- **Constraint:** `FK job_postings.employer_id REFERENCES users.id`
- **Business:** Only users with user_type='employer' can post

#### 7. Job_Postings → Job_Assignments (1:N)
- **Direction:** One job has one or more professional assignments
- **Constraint:** `FK job_assignments.job_id REFERENCES job_postings.id ON DELETE CASCADE`
- **Business:** Single job can be assigned to one or multiple professionals

#### 8. Professional_Profiles → Job_Assignments (1:N)
- **Direction:** One professional can be assigned many jobs
- **Constraint:** `FK job_assignments.professional_id REFERENCES professional_profiles.id`
- **Business:** Professional can work on multiple jobs over time

#### 9. Job_Assignments → Reviews (1:1)
- **Direction:** One assignment gets one review (after completion)
- **Constraint:** `FK reviews.job_assignment_id REFERENCES job_assignments.id`
- **Business:** Review created after job completion
- **Unique:** Only one review per assignment

#### 10. Job_Assignments → Payments (1:1)
- **Direction:** One assignment has one payment
- **Constraint:** `FK payments.job_assignment_id REFERENCES job_assignments.id`
- **Business:** Payment processed after job completion

#### 11. Users → Messages (M:M) [Sender/Recipient]
- **Direction:** Users send and receive messages
- **Constraints:** 
  - `FK messages.sender_id REFERENCES users.id`
  - `FK messages.recipient_id REFERENCES users.id`
- **Business:** Enables two-way communication

---

## Indexes & Performance

### Primary Indexes for Query Performance

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_location ON users(location);

-- Professional profile lookups
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_profiles_availability ON professional_profiles(availability_status);

-- Skill lookups
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- Professional skills (skill matching)
CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_professional_skills_skill_id ON professional_skills(skill_id);
CREATE INDEX idx_professional_skills_proficiency ON professional_skills(proficiency_level);

-- Job postings (search & filtering)
CREATE INDEX idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- Job assignments (tracking)
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_professional_id ON job_assignments(professional_id);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);

-- Payments (financial reporting)
CREATE INDEX idx_payments_job_assignment_id ON payments(job_assignment_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paystack_reference ON payments(paystack_reference);

-- Reviews (rating lookups)
CREATE INDEX idx_reviews_reviewed_professional_id ON reviews(reviewed_professional_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_job_assignment_id ON reviews(job_assignment_id);

-- Certifications (professional search)
CREATE INDEX idx_certifications_professional_id ON certifications(professional_id);

-- Portfolio (professional search)
CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);

-- Messages (inbox queries)
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### Query Optimization Notes
- **Search Performance:** Use indexes on `email`, `skill name/category`, and `location`
- **Dashboard Queries:** Index on `employer_id`, `professional_id`, `user_id`
- **Financial Reports:** Index on `payer_id`, `payee_id`, `status`
- **Rating Updates:** Index on `reviewed_professional_id` for aggregation

---

## Business Rules & Validations

### User Registration Rules
1. Email must be unique and valid format
2. Password minimum 8 characters, bcrypt hashed
3. First and last names required, 2-100 characters
4. User type must be 'professional' or 'employer'
5. If employer, comp_name required
6. Location optional but recommended

### Professional Profile Rules
1. Only one profile per professional user
2. Hourly rate between 0.01 and 999,999.99 NGN
3. Bio max 500 characters
4. Availability: 'available', 'unavailable', 'away'
5. Response time in hours (0-72 recommended)
6. Total hours and reviews auto-calculated

### Job Posting Rules
1. Title required, 10-255 characters
2. Description required, min 50 characters
3. Budget optional, 0.01-999,999.99 NGN if provided
4. Status follows workflow: draft → posted → in_progress → completed
5. Expires_at can auto-archive old postings
6. Only employers can create

### Payment Rules
1. Amount must be positive decimal
2. Commission auto-calculated:
   - Seller: 15% of amount
   - Buyer: 1% of amount
3. Paystack reference must be unique
4. Status: pending → processing → completed
5. Webhook required for payment confirmation

### Review Rules
1. One review per job assignment maximum
2. Rating: integer 1-5 stars
3. Comment optional, max 1000 characters
4. Trigger: Updates professional avg_rating and total_reviews
5. Only employer can review professional

---

## Data Flow Diagrams

### User Registration Flow
```
User visits website
    ↓
User selects user_type (professional/employer)
    ↓
Form submitted → POST /api/auth/register
    ↓
Backend validation (Zod schema)
    ↓
Check email uniqueness → users table
    ↓
If employer: check comp_name provided
    ↓
Hash password with bcrypt (rounds: 12)
    ↓
INSERT INTO users table
    ↓
If professional: CREATE professional_profile (with user_id)
    ↓
Generate JWT token → HTTP-only cookie
    ↓
Response: { success: true, user: {...}, message: "..." }
    ↓
Frontend redirects to onboarding/dashboard
```

### Job Posting & Matching Flow
```
Employer POST /api/jobs
    ↓
Validate job data (title, description, skill_id)
    ↓
INSERT INTO job_postings (status='posted')
    ↓
Trigger: Find matching professionals
    SELECT professionals WHERE skill_id matches AND location matches
    ↓
Notify professionals (Phase 2: WebSocket/email)
    ↓
Professional views job → GET /api/jobs/:id
    ↓
Professional accepts → POST /api/assignments
    ↓
INSERT INTO job_assignments (status='accepted')
    ↓
Job status: 'in_progress'
    ↓
Professional completes work
    ↓
Professional marks complete → PUT /api/assignments/:id/complete
    ↓
job_assignments status: 'completed'
    ↓
Trigger: Create payment record
    ↓
Employer notified to pay
    ↓
Payment flow begins → Paystack integration
```

### Payment Flow
```
Job marked completed
    ↓
Payment record created (status: pending)
    ↓
Employer initiated payment → POST /api/payments/initiate
    ↓
Backend requests Paystack authorization URL
    ↓
Employer redirected to Paystack checkout
    ↓
Employer pays via card/bank transfer
    ↓
Paystack triggers webhook callback
    ↓
Backend verifies payment reference
    ↓
Update payment record (status: completed)
    ↓
Calculate commissions:
    - seller_commission = amount * 0.15
    - buyer_commission = amount * 0.01
    - seller_receives = amount - seller_commission
    ↓
Record in payments table
    ↓
Notify professional & employer
    ↓
Create payment receipt
```

### Review & Rating Flow
```
Job assignment completed
    ↓
Employer notified to leave review
    ↓
Employer submits review → POST /api/reviews
    ↓
Validate: rating (1-5), comment, assignment_id
    ↓
INSERT INTO reviews table
    ↓
Trigger: Update professional_profiles
    - Recalculate avg_rating from all reviews
    - Increment total_reviews count
    ↓
Professional notified of new review
    ↓
Review visible on professional public profile
```

---

## Summary Statistics

### Table Record Estimates (at scale)

| Table | Phase 1 | Phase 2 | Phase 3 |
|-------|---------|---------|---------|
| users | 1,000 | 10,000 | 100,000 |
| professional_profiles | 500 | 5,000 | 50,000 |
| skills | 50 | 100 | 200 |
| professional_skills | 2,000 | 20,000 | 200,000 |
| job_postings | 500 | 5,000 | 50,000 |
| job_assignments | 500 | 5,000 | 50,000 |
| payments | 200 | 2,000 | 20,000 |
| reviews | 100 | 1,000 | 10,000 |
| messages | 0 | 50,000 | 500,000 |

---

## Next Steps

1. **Create PostgreSQL Database:** Run SQL schema file (see SQL_SCHEMA.sql)
2. **Setup Migrations:** Use node-pg-migrate for version control
3. **Seed Data:** Load sample skills and test users
4. **Monitor Performance:** Use EXPLAIN ANALYZE for slow queries
5. **Scale Planning:** Redis caching, read replicas (Phase 3+)

---

**Document Version History:**
- v1.0 - April 2026 - Initial comprehensive database structure
