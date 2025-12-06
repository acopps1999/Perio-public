-- ============================================================================
-- PERFORMANCE DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this to check if your database is optimized for fast admin panel loads
-- ============================================================================

-- 1. Check if materialized view exists
SELECT
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname = 'procedures_complete';

-- Expected: Should return 1 row with ispopulated = true

-- 2. Check materialized view size (how much data it contains)
SELECT
  pg_size_pretty(pg_total_relation_size('public.procedures_complete')) as "View Size",
  (SELECT count(*) FROM public.procedures_complete) as "Row Count"
WHERE EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'procedures_complete');

-- 3. Check for indexes on key tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('procedures', 'products', 'categories', 'dentists', 'patient_types')
ORDER BY tablename, indexname;

-- 4. Check table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as "Size",
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::int as "Row Count"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('procedures', 'products', 'categories', 'dentists', 'patient_types')
ORDER BY table_name;

-- 5. Check if RLS is causing slowness (too many policies)
SELECT
  tablename,
  count(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('procedures', 'products', 'categories', 'dentists')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Should see 2-3 policies per table max

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
--
-- Query 1: If materialized view doesn't exist or ispopulated = false,
--          your queries will be slow. Run the Phase 1.2 migration.
--
-- Query 2: Shows how much data is in the view. Larger = slower initial load.
--
-- Query 3: Should see indexes on:
--          - procedures.id, procedures.category_id
--          - products.id, products.name
--          - categories.id
--          - dentists.id
--
-- Query 4: Shows table sizes. If any table has 1000+ rows, consider pagination.
--
-- Query 5: If any table has 5+ policies, RLS evaluation could be slow.
--
-- ============================================================================


