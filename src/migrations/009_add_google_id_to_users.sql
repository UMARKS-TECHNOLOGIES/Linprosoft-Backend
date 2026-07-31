-- 009_add_google_id_to_users.sql
-- Add google_id column to users table for Google OAuth authentication

-- Add google_id column to store Google user ID
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Make google_id unique (optional, but recommended for security)
-- Only create this constraint if you want to enforce that each Google ID
-- can only be associated with one account
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_google_id_unique'
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
    END IF;
END $$;