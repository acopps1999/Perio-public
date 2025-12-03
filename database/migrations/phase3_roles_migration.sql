-- PHASE 3 ROLES MIGRATION
-- Adds 'sales' and 'clinician' roles to the user_role enum
-- Updates existing 'user' roles to 'sales'

-- STEP 1: Add new enum values
-- Note: In PostgreSQL, you cannot easily modify an enum in a transaction
-- You must add values one at a time

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinician';

-- STEP 2: Update existing 'user' roles to 'sales'
-- This migrates all existing general users to the sales role
UPDATE user_profiles
SET role = 'sales'
WHERE role = 'user';

-- STEP 3: Add role assignment tracking columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;

-- STEP 4: Set role_assigned_at for existing users
UPDATE user_profiles
SET role_assigned_at = COALESCE(approved_at, created_at)
WHERE role_assigned_at IS NULL;

-- STEP 5: Create index for role queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- STEP 6: Add comment documenting the role system
COMMENT ON COLUMN user_profiles.role IS 'User role: admin (full access), sales (sales features + clinical), clinician (clinical only)';
COMMENT ON COLUMN user_profiles.role_assigned_by IS 'Admin who assigned this role';
COMMENT ON COLUMN user_profiles.role_assigned_at IS 'When the role was assigned';
