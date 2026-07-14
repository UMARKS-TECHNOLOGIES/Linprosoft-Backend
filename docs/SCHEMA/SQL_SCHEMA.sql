-- ============================================================================
-- LINKPROSOFT DATABASE SCHEMA - OTP BASED AUTHENTICATION
-- Version: 2.1
-- Date: July 2026
-- Purpose: Updated PostgreSQL schema for OTP-based authentication flow with phone and location fields
-- Technology: Node.js + Express + TypeScript + PostgreSQL 13+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext"; -- For case-insensitive email

-- ============================================================================
-- ENUM TYPE DEFINITIONS
-- ============================================================================

-- Drop existing types if they exist (for clean application)
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS professional_type;
DROP TYPE IF EXISTS auth_provider;
DROP TYPE IF EXISTS otp_purpose;

-- Create new ENUM types as per spec
CREATE TYPE user_role AS ENUM ('employer', 'professional');
CREATE TYPE professional_type AS ENUM ('digital', 'non_digital');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple');
CREATE TYPE otp_purpose AS ENUM ('email_verification', 'password_reset');

-- ============================================================================
-- TABLE: USERS (Core user management with OTP authentication)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    auth_provider auth_provider NOT NULL DEFAULT 'email',
    role user_role NOT NULL,
    professional_type professional_type,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_step SMALLINT NOT NULL DEFAULT 0,
    phone VARCHAR(20),
    location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_verified ON users(is_email_verified);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Comments for documentation
COMMENT ON TABLE users IS 'Core user management for both professionals and clients with OTP-based authentication';
COMMENT ON COLUMN users.email IS 'Unique email identifier, case-insensitive for login';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (null for social login)';
COMMENT ON COLUMN users.full_name IS 'Full name of the user';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email, google, apple';
COMMENT ON COLUMN users.role IS 'Role type: professional (service provider) or client (service seeker)';
COMMENT ON COLUMN users.professional_type IS 'For professionals only: digital (tech/online) or non_digital (offline/physical) services';
COMMENT ON COLUMN users.is_email_verified IS 'Email verification status for account activation';
COMMENT ON COLUMN users.is_active IS 'Account activation status';
COMMENT ON COLUMN users.onboarding_step IS 'Onboarding progress tracker (0-5)';
COMMENT ON COLUMN users.phone IS 'Phone number for contact';
COMMENT ON COLUMN users.location IS 'Location (city, region) for service availability';

-- ============================================================================
-- TABLE: OTP_CODES (One-time password storage for verification)
-- ============================================================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    purpose otp_purpose NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for otp_codes table
CREATE INDEX idx_otp_user_purpose ON otp_codes(user_id, purpose);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_otp_consumed ON otp_codes(consumed_at);

-- Comments for documentation
COMMENT ON TABLE otp_codes IS 'Storage for hashed OTP codes used for email verification and password reset';
COMMENT ON COLUMN otp_codes.code_hash IS 'Bcrypt hash of the OTP code (never stores plaintext)';
COMMENT ON COLUMN otp_codes.purpose IS 'Purpose of OTP: email_verification or password_reset';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of verification attempts made';
COMMENT ON COLUMN otp_codes.max_attempts IS 'Maximum allowed attempts before lockout';
COMMENT ON COLUMN otp_codes.expires_at IS 'Expiration timestamp for the OTP';
COMMENT ON COLUMN otp_codes.consumed_at IS 'Timestamp when OTP was successfully used (null if unused)';

-- ============================================================================
-- TABLE: REFRESH_TOKENS (Refresh token storage for session management)
-- ============================================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for refresh_tokens table
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_revoked ON refresh_tokens(revoked_at);

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Storage for hashed refresh tokens enabling token rotation and session management';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Bcrypt hash of the refresh token';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User agent string from the client device';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address of the client when token was issued';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Expiration timestamp for the refresh token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp when token was revoked (null if active)';

-- ============================================================================
-- TABLE: PASSWORD_RESET_TOKENS (Password reset token storage)
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for password_reset_tokens table
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_used ON password_reset_tokens(used_at);

-- Comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Storage for hashed password reset tokens (single-use, short-lived)';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'Bcrypt hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Expiration timestamp for the reset token';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (null if unused)';

-- ============================================================================
-- TABLE: AUTH_AUDIT_LOG (Authentication audit logging)
-- ============================================================================
CREATE TABLE auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for auth_audit_log table
CREATE INDEX idx_audit_user ON auth_audit_log(user_id);
CREATE INDEX idx_audit_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_audit_created_at ON auth_audit_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE auth_audit_log IS 'Audit log for authentication-related security events';
COMMENT ON COLUMN auth_audit_log.event_type IS 'Type of auth event: login_success, login_failed, otp_sent, otp_verified, password_reset, etc.';
COMMENT ON COLUMN auth_audit_log.metadata IS 'Additional context stored as JSON (IP, user agent, attempt counts, etc.)';

-- ============================================================================
-- TABLE: PROFESSIONAL_PROFILES (Extended profile for professionals)
-- ============================================================================
CREATE TABLE professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2),
    bio TEXT,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (
        availability_status IN ('available', 'unavailable', 'away')
    ),
    response_time_hours INTEGER,
    total_hours_worked INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for professional_profiles table
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_profiles_availability ON professional_profiles(availability_status);

-- Comments for documentation
COMMENT ON TABLE professional_profiles IS 'Extended profile information for professionals offering services';
COMMENT ON COLUMN professional_profiles.hourly_rate IS 'Service rate in NGN per hour';
COMMENT ON COLUMN professional_profiles.avg_rating IS 'Aggregate rating from reviews (0-5 scale)';
COMMENT ON COLUMN professional_profiles.total_reviews IS 'Count of reviews received';

-- ============================================================================
-- TABLE: SKILLS (Master list of available skills)
-- ============================================================================
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for skills table
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- Comments for documentation
COMMENT ON TABLE skills IS 'Master list of skill types available on the platform';
COMMENT ON COLUMN skills.name IS 'Unique skill name (e.g., Web Development, Plumbing)';
COMMENT ON COLUMN skills.category IS 'Skill category for grouping (e.g., IT, Trades, Design)';

-- ============================================================================
-- TABLE: PROFESSIONAL_SKILLS (Many-to-many junction between professionals and skills)
-- ============================================================================
CREATE TABLE professional_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (
        proficiency_level IN ('beginner', 'intermediate', 'expert')
    ),
    years_of_experience INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(professional_id, skill_id)
);

-- Indexes for professional_skills table
CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_professional_skills_skill_id ON professional_skills(skill_id);
CREATE INDEX idx_professional_skills_proficiency ON professional_skills(proficiency_level);

-- Comments for documentation
COMMENT ON TABLE professional_skills IS 'Links professionals to their skills with proficiency levels';
COMMENT ON COLUMN professional_skills.proficiency_level IS 'Expertise level: beginner, intermediate, or expert';
COMMENT ON COLUMN professional_skills.is_primary IS 'Highlights primary/featured skill on profile';

-- ============================================================================
-- TABLE: CERTIFICATIONS (Professional certifications and credentials)
-- ============================================================================
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for certifications table
CREATE INDEX idx_certifications_professional_id ON certifications(professional_id);

-- Comments for documentation
COMMENT ON TABLE certifications IS 'Professional certifications and credentials for validation';
COMMENT ON COLUMN certifications.credential_url IS 'URL to verify certification online';

-- ============================================================================
-- TABLE: PORTFOLIO_ITEMS (Professional portfolio showcasing past work)
-- ============================================================================
CREATE TABLE portfolio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    description text,
    image_url varchar(500),
    link_url varchar(500),
    created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Indexes for portfolio_items table
CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);

-- Comments for documentation
COMMENT ON TABLE portfolio_items IS 'Portfolio items showcasing professional past work';
COMMENT ON COLUMN portfolio_items.image_url IS 'URL to project image/thumbnail (external storage like S3)';
COMMENT ON COLUMN portfolio_items.link_url IS 'URL to live project or portfolio page';

-- ============================================================================
-- TABLE: JOB_POSTINGS (Job/gig postings created by clients)
-- ============================================================================
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'posted' CHECK (
        status IN ('draft', 'posted', 'in_progress', 'completed', 'cancelled')
    ),
    location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes for job_postings table
CREATE INDEX idx_job_postings_client_id ON job_postings(client_id);
CREATE INDEX idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE job_postings IS 'Job/gig postings created by clients seeking services';
COMMENT ON COLUMN job_postings.skill_id IS 'Primary skill required, used for matching';
COMMENT ON COLUMN job_postings.status IS 'Workflow: draft → posted → in_progress → completed';
COMMENT ON COLUMN job_postings.expires_at IS 'Auto-expire old postings for archival';

-- ============================================================================
-- TABLE: JOB_ASSIGNMENTS (Track which professional is assigned to which job)
-- ============================================================================
CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    budget DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'disputed')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for job_assignments table
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_professional_id ON job_assignments(professional_id);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);

-- Comments for documentation
COMMENT ON TABLE job_assignments IS 'Links professionals to job postings they are assigned to';
COMMENT ON COLUMN job_assignments.status IS 'Workflow: pending (invited) → accepted → in_progress → completed';
COMMENT ON COLUMN job_assignments.budget IS 'Negotiated budget for this specific assignment';

-- ============================================================================
-- TABLE: PAYMENTS (Financial transactions between clients and professionals)
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_assignment_id UUID NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    provider_payout DECIMAL(10, 2) GENERATED ALWAYS AS (amount - platform_fee) STORED,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        STATUS IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')
    ),
    payment_method VARCHAR(50) DEFAULT 'paystack',
    payment_reference VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for payments table
CREATE INDEX idx_payments_job_assignment_id ON payments(job_assignment_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_reference ON payments(payment_reference);

-- Comments for documentation
COMMENT ON TABLE payments IS 'Financial transactions between clients and professionals';
COMMENT ON COLUMN payments.platform_fee IS 'Platform fee percentage (dynamic based on subscription tier)';
COMMENT ON COLUMN payments.provider_payout IS 'Amount professional receives after platform fee';
COMMENT ON COLUMN payments.payment_reference IS 'Unique reference for payment gateway transaction';

-- ============================================================================
-- TABLE: REVIEWS (Ratings and feedback after job completion)
-- ============================================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_assignment_id UUID NOT NULL UNIQUE REFERENCES job_assignments(id) ON DELETE CASCADE,
    reviewed_professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reviews table
CREATE INDEX idx_reviews_reviewed_professional_id ON reviews(reviewed_professional_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_job_assignment_id ON reviews(job_assignment_id);

-- Comments for documentation
COMMENT ON TABLE reviews IS 'Ratings and feedback left by clients for professionals after job completion';
COMMENT ON COLUMN reviews.rating IS 'Star rating on 1-5 scale';
COMMENT ON COLUMN reviews.is_anonymous IS 'Hide reviewer identity in anonymous reviews';

-- ============================================================================
-- TABLE: MESSAGES (Direct messaging between professionals and clients)
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for messages table
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE messages IS 'Direct messaging system between professionals and clients';
COMMENT ON COLUMN messages.is_read IS 'Read receipt for message delivery confirmation';

-- ============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- Trigger to update updated_at timestamp on users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Trigger to update updated_at timestamp on professional_profiles
CREATE OR REPLACE FUNCTION update_professional_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_profiles_updated_at
BEFORE UPDATE ON professional_profiles
FOR EACH ROW
EXECUTE FUNCTION update_professional_profiles_updated_at();

-- Trigger to update updated_at timestamp on job_postings
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_postings_updated_at
BEFORE UPDATE ON job_postings
FOR EACH ROW
EXECUTE FUNCTION update_job_postings_updated_at();

-- Trigger to update professional rating and review count when review is created
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE professional_profiles
    SET
        avg_rating = (
            SELECT AVG(rating)::DECIMAL(3, 2)
            FROM reviews
            WHERE reviewed_professional_id = NEW.reviewed_professional_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewed_professional_id = NEW.reviewed_professional_id
        ),
        updated_at = NOW()
    WHERE id = NEW.reviewed_professional_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_professional_rating();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Professional summary with user details and rating
CREATE OR REPLACE VIEW professional_summary AS
SELECT
    u.id as user_id,
    u.email,
    u.split_part(full_name, ' ', 1) as first_name,
    u.split_part(full_name, ' ', 2) as last_name,
    u.phone,
    u.location,
    pp.id as profile_id,
    pp.hourly_rate,
    pp.bio,
    pp.avg_rating,
    pp.total_reviews,
    pp.availability_status,
    COUNT(ps.skill_id) as skill_count
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
WHERE u.role = 'professional'
GROUP BY u.id, pp.id;

-- View: Job posting summary with client info
CREATE OR REPLACE VIEW job_posting_summary AS
SELECT
    jp.id,
    jp.title,
    jp.description,
    jp.budget,
    jp.status,
    jp.location,
    jp.created_at,
    s.name as required_skill,
    u.email as client_email,
    u.split_part(full_name, ' ', 1) as client_first_name,
    u.split_part(full_name, ' ', 2) as client_last_name,
    COUNT(ja.id) as assignment_count
FROM job_postings jp
LEFT JOIN skills s ON jp.skill_id = s.id
LEFT JOIN users u ON jp.client_id = u.id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
GROUP BY jp.id, s.id, u.id;

-- View: Payment summary with user details
CREATE OR REPLACE VIEW payment_summary AS
SELECT
    p.id,
    p.amount,
    p.platform_fee,
    p.provider_payout,
    p.status,
    p.created_at,
    p.completed_at,
    payer.email as payer_email,
    payer.split_part(payer.full_name, ' ', 1) as payer_first_name,
    payee.email as payee_email,
    payee.split_part(payee.full_name, ' ', 1) as payee_first_name,
    ja.budget as negotiated_budget,
    jp.title as job_title
FROM payments p
LEFT JOIN users payer ON p.payer_id = payer.id
LEFT JOIN users payee ON p.payee_id = payee.id
LEFT JOIN job_assignments jp ON p.job_assignment_id = ja.id
LEFT JOIN job_postings jp ON ja.job_id = jp.id;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION (Additional composite indexes)
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_users_verified_active ON users(is_email_verified, is_active);
CREATE INDEX idx_otp_purpose_expires ON otp_codes(purpose, expires_at);
CREATE INDEX idx_refresh_user_expires ON refresh_tokens(user_id, expires_at);
CREATE INDEX idx_password_reset_user_expires ON password_reset_tokens(user_id, expires_at);

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================

-- Summary statistics:
-- Total Tables: 12
-- Total Views: 3
-- Total Triggers: 4
-- Total Indexes: 35+
-- Core Auth Tables: 4 (users, otp_codes, refresh_tokens, password_reset_tokens)
-- Audit Tables: 1 (auth_audit_log)
-- Profile Tables: 4 (professional_profiles, skills, professional_skills, certifications, portfolio_items)
-- Job/Marketplace Tables: 4 (job_postings, job_assignments, payments, reviews, messages)

-- Next steps:
-- 1. Connect from Node.js backend using pg library with UUID support
-- 2. Ensure application code handles UUID types properly (string representation in TS)
-- 3. Verify OTP service integration with email provider
-- 4. Test authentication flow: signup → verify email → login → token refresh
-- 5. Monitor performance with EXPLAIN ANALYZE on critical queries