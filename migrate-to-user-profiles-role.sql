-- Migration: Switch from admins table to user_profiles.role for admin verification
-- Date: 2025-12-01
--
-- This migration updates the is_admin() function to check user_profiles.role
-- instead of the admins table, consolidating user role management.

-- ============================================================================
-- STEP 1: Update is_admin() function to check user_profiles.role
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current authenticated user has admin role in user_profiles
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, fail closed (return false)
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

COMMENT ON FUNCTION public.is_admin() IS
  'Checks if the current authenticated user has admin role in user_profiles table';

-- ============================================================================
-- STEP 2: Verify the migration works
-- ============================================================================

-- Test the function (should return true if you're an admin, false otherwise)
SELECT public.is_admin() as "Am I Admin?";

-- Show all admin users from user_profiles
SELECT id, email, role, full_name, created_at
FROM public.user_profiles
WHERE role = 'admin'
ORDER BY created_at;

-- ============================================================================
-- STEP 3: (OPTIONAL) Drop admins table after verifying everything works
-- ============================================================================

-- UNCOMMENT THESE LINES ONLY AFTER:
-- 1. Confirming admin login works with user_profiles.role
-- 2. Confirming RLS policies still work correctly
-- 3. Taking a backup of the admins table data

-- -- Drop foreign key constraints first
-- ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_read_by_fkey;
--
-- -- Drop the admins table
-- DROP TABLE IF EXISTS public.admins CASCADE;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- The admins table is now deprecated. All admin verification happens through
-- user_profiles.role column instead.
--
-- To grant admin access to a user:
--   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'user@example.com';
--
-- To revoke admin access:
--   UPDATE public.user_profiles SET role = 'user' WHERE email = 'user@example.com';
--
-- All RLS policies that use is_admin() will automatically use the new logic.
