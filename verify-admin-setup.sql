-- ============================================================================
-- VERIFY ADMIN SETUP
-- ============================================================================
-- This script checks if your admin account is properly configured
-- ============================================================================

-- STEP 1: Check if you have any admin records
SELECT 
  id,
  email,
  user_id,
  created_at
FROM public.admins
ORDER BY created_at DESC;

-- Expected: Should see at least one row with your email (austin@austincopps.com)
-- If empty, you need to create an admin record!

-- ============================================================================

-- STEP 2: Check what user_id your auth account has
-- Note: This query shows ALL auth users, find yours by email
SELECT 
  id as "User ID",
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'austin@austincopps.com'; -- Replace with your email

-- Copy the "User ID" from the result

-- ============================================================================

-- STEP 3: If your admin record doesn't exist, create it
-- Replace 'YOUR-USER-ID-HERE' with the actual UUID from STEP 2

-- INSERT INTO public.admins (user_id, email)
-- VALUES ('YOUR-USER-ID-HERE', 'austin@austincopps.com');

-- ============================================================================

-- STEP 4: Verify the admin record was created/exists
SELECT 
  a.id as "Admin ID",
  a.email as "Admin Email",
  a.user_id as "Auth User ID",
  u.email as "Auth Email",
  a.created_at
FROM public.admins a
JOIN auth.users u ON a.user_id = u.id
WHERE a.email = 'austin@austincopps.com'; -- Replace with your email

-- Expected: Should see one row linking your auth user to admin table

-- ============================================================================

-- STEP 5: Test RLS policies are working
-- Try to select from a table as if you were an anon user
SET ROLE anon;
SELECT count(*) as "Products visible to public" FROM products;
RESET ROLE;

-- Expected: Should return the count of products

-- ============================================================================

-- STEP 6: Check that policies exist
SELECT
  tablename,
  COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'categories', 'procedures')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have exactly 2 policies

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
--
-- STEP 1: Shows all admin records. If empty, you have no admins!
-- STEP 2: Shows your auth.users record and user_id
-- STEP 3: Creates admin record if needed (uncomment and run)
-- STEP 4: Verifies the link between auth.users and admins table
-- STEP 5: Tests that public can read data
-- STEP 6: Verifies policies were created correctly
--
-- Common Issues:
-- - No admin record: Run STEP 3 to create one
-- - Wrong user_id: Check auth.users table and update admins.user_id
-- - Policies not created: Re-run rls-complete-refresh.sql
-- ============================================================================


