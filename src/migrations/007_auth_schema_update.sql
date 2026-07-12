-- 007_auth_schema_update.sql
-- Authentication system schema update to support OTP-based flow
-- This migration focuses on schema changes only. Data migration is handled in 008_auth_data_migration.sql.

-- Drop existing types if they exist (for clean migration)
-- Note: These types are not yet used in any column, so safe to drop.
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS professional_type;
DROP TYPE IF EXISTS auth_provider;
DROP TYPE IF EXISTS otp_purpose;

-- Create new ENUM types as per spec
CREATE TYPE user_role AS ENUM ('client', 'professional');
CREATE TYPE professional_type AS ENUM ('digital', 'non_digital');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple');
CREATE TYPE otp_purpose AS ENUM ('email_verification', 'password_reset');

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alter users table to match specification (schema changes only)
-- Note: Data population and final constraints will be handled in 008_auth_data_migration.sql

-- Rename columns
ALTER TABLE users RENAME COLUMN password TO password_hash;
ALTER TABLE users RENAME COLUMN user_type TO role;

-- Update email column to CITEXT and enforce NOT NULL
ALTER TABLE users ALTER COLUMN email TYPE CITEXT USING email::CITEXT;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Add new columns (nullable where appropriate, defaults set for boilerplate fields)
-- full_name will be populated by 008_auth_data_migration.sql from first_name + last_name
ALTER TABLE users ADD COLUMN full_name VARCHAR(150) NULL;
-- auth_provider defaults to 'email' for existing users (updated in 008 if needed)
ALTER TABLE users ADD COLUMN auth_provider auth_provider NOT NULL DEFAULT 'email';
-- professional_type will be set to NULL for existing users in 008
ALTER TABLE users ADD COLUMN professional_type professional_type NULL;
-- Boolean flags with sensible defaults
ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN onboarding_step SMALLINT NOT NULL DEFAULT 0;

-- Ensure email uniqueness (check first to avoid errors if constraint already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_email_unique'
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END $$;

-- Create otp_codes table
-- Note: id uses UUID for global uniqueness; user_id references users.id (assumed BIGINT)
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    purpose otp_purpose NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_codes(user_id, purpose);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create auth_audit_log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: Data migration script (008_auth_data_migration.sql) handles:
-- 1. Combining first_name + last_name into full_name
-- 2. Mapping user_type values to new role values (then altering role column to user_role enum)
-- 3. Setting auth_provider = 'email' for existing users
-- 4. Setting professional_type = NULL for existing users
-- 5. Setting is_email_verified = is_verified (from existing is_verified column)
-- 6. Setting is_active = true for existing users (unless deleted)
-- 7. Setting onboarding_step = 0 for existing users
-- Note: Integer ID to UUID conversion for users table is NOT performed in this migration.
--       If required, it should be handled in a separate staged migration after updating
--       all foreign key references, to preserve data integrity.