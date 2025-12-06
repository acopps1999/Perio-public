-- ============================================================================
-- TEST BASIC QUERIES
-- ============================================================================
-- Run these to verify that basic SELECT queries work with anon role
-- ============================================================================

-- STEP 1: Test as postgres (should always work)
SELECT count(*) as "Total Procedures" FROM procedures;
SELECT count(*) as "Total Products" FROM products;
SELECT count(*) as "Total Categories" FROM categories;

-- ============================================================================

-- STEP 2: Test as anon user (this is what your app uses when not logged in)
SET ROLE anon;

SELECT count(*) as "Procedures (anon)" FROM procedures;
SELECT count(*) as "Products (anon)" FROM products;
SELECT count(*) as "Categories (anon)" FROM categories;

RESET ROLE;

-- If STEP 2 returns counts, public read access is working!

-- ============================================================================

-- STEP 3: Try the same query your app uses
SET ROLE anon;

SELECT 
  p.id,
  p.name,
  p.pitch_points,
  p.patient_type,
  c.name as category_name
FROM procedures p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.name
LIMIT 5;

RESET ROLE;

-- If STEP 3 returns rows, your app query should work!

-- ============================================================================

-- STEP 4: Check if any policies are blocking
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual as "USING"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'procedures'
ORDER BY policyname;

-- Should see:
-- - "admin_all_procedures" for authenticated role
-- - "public_read_procedures" for public role

-- ============================================================================
-- TROUBLESHOOTING:
-- ============================================================================
--
-- If STEP 2 returns 0 or error:
--   → RLS policies are blocking anon access
--   → Re-run rls-complete-refresh.sql
--
-- If STEP 3 returns error:
--   → Check error message for clues
--   → Might be a JOIN permission issue
--
-- If STEP 4 shows no policies:
--   → Policies weren't created
--   → Re-run rls-complete-refresh.sql
--
-- ============================================================================


