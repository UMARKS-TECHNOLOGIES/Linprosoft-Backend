-- 008_auth_data_migration.sql
-- Data migration for authentication system update
-- WARNING: This should be run carefully on a backup of the production database

-- Disable triggers and constraints temporarily if needed for performance
-- ALTER TABLE users DISABLE TRIGGER ALL;

-- Step 1: Backup original columns (in case we need to rollback)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS _first_name_backup VARCHAR(50),
  ADD COLUMN IF NOT EXISTS _last_name_backup VARCHAR(50),
  ADD COLUMN IF NOT EXISTS _comp_name_backup VARCHAR(100),
  ADD COLUMN IF NOT EXISTS _location_backup VARCHAR(100),
  ADD COLUMN IF NOT EXISTS _phone_backup VARCHAR(20),
  ADD COLUMN IF NOT EXISTS _deleted_at_backup TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS _is_verified_backup BOOLEAN;

-- Backup existing data
UPDATE users SET
  _first_name_backup = first_name,
  _last_name_backup = last_name,
  _comp_name_backup = comp_name,
  _location_backup = location,
  _phone_backup = phone,
  _deleted_at_backup = deleted_at,
  _is_verified_backup = is_verified;

-- Step 2: Update existing data to match new schema
-- Combine first_name and last_name into full_name
UPDATE users SET
  full_name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- Handle cases where both first_name and last_name are null
UPDATE users SET
  full_name = 'Unknown User'
WHERE full_name IS NULL OR full_name = ' ' OR full_name = '';

-- Trim extra spaces
UPDATE users SET
  full_name = TRIM(BOTH ' ' FROM full_name);

-- Map user_type to role
UPDATE users SET
  role = CASE
    WHEN user_type = 'employer' THEN 'employer'::user_role
    WHEN user_type = 'professional' THEN 'professional'::user_role
    ELSE 'employer'::user_role -- default fallback
  END
WHERE user_type IS NOT NULL;

-- Set auth_provider to email for all existing users
UPDATE users SET
  auth_provider = 'email'::auth_provider
WHERE auth_provider IS NULL;

-- Set professional_type to NULL for all existing users (will be set during onboarding/profile update)
UPDATE users SET
  professional_type = NULL
WHERE professional_type IS NULL;

-- Set is_email_verified from is_verified
UPDATE users SET
  is_email_verified = COALESCE(is_verified, false)
WHERE is_verified IS NOT NULL;

-- For any null is_verified, default to false
UPDATE users SET
  is_email_verified = false
WHERE is_verified IS NULL;

-- Set is_active to true for all existing users (assuming they're active unless deleted)
UPDATE users SET
  is_active = CASE
    WHEN deleted_at IS NOT NULL THEN false
    ELSE true
  END
WHERE is_active IS NULL;

-- Set onboarding_step to 0 for all existing users
UPDATE users SET
  onboarding_step = 0
WHERE onboarding_step IS NULL;

-- Step 3: Drop the backed up columns (after verifying migration worked)
-- ALTER TABLE users
--   DROP COLUMN _first_name_backup,
--   DROP COLUMN _last_name_backup,
--   DROP COLUMN _comp_name_backup,
--   DROP COLUMN _location_backup,
--   DROP COLUMN _phone_backup,
--   DROP COLUMN _deleted_at_backup,
--   DROP COLUMN _is_verified_backup;

-- Note: The above DROP COLUMN statements should be uncommented and run
-- only after verifying the migration was successful and data looks correct.

-- Verify migration results with a sample query:
-- SELECT id, full_name, email, role, auth_provider, is_email_verified, is_active, onboarding_step
-- FROM users
-- LIMIT 10;