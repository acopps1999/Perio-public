-- Production RLS Policies Summary
-- Date: 2025-12-01
--
-- This file documents all RLS policies applied to production database
-- to enable admin access via user_profiles.role
--
-- IMPORTANT: These policies have already been applied to production.
-- This file is for reference only.

-- ============================================================================
-- STEP 1: Update is_admin() function (ALREADY APPLIED)
-- ============================================================================

-- This function checks user_profiles.role instead of admins table
/*
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
*/

-- ============================================================================
-- STEP 2: Admin INSERT/UPDATE/DELETE Policies (ALREADY APPLIED)
-- ============================================================================

-- Applied to these tables:
-- procedures, categories, patient_types, phases, products,
-- procedure_phases, procedure_phase_products, product_details,
-- phase_specific_usage, condition_product_research_articles,
-- patient_specific_configs, procedure_patient_types, research_articles

/*
Example for procedures table:

CREATE POLICY "admin_insert_procedures" ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_procedures" ON public.procedures
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_procedures" ON public.procedures
  FOR DELETE TO authenticated
  USING (public.is_admin());
*/

-- ============================================================================
-- STEP 3: Public SELECT Policies (ALREADY APPLIED)
-- ============================================================================

-- All clinical tables have public read access:
/*
CREATE POLICY "public_read_procedures" ON public.procedures
  FOR SELECT
  USING (true);
*/

-- ============================================================================
-- Verify All Policies
-- ============================================================================

-- Check policy counts per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'procedures', 'categories', 'patient_types', 'phases', 'products',
  'procedure_phases', 'procedure_phase_products', 'product_details',
  'phase_specific_usage', 'condition_product_research_articles',
  'patient_specific_configs', 'procedure_patient_types', 'research_articles'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected: 4 policies per table (1 SELECT + 3 admin policies)

-- ============================================================================
-- Granting Admin Access to Users
-- ============================================================================

-- To make a user an admin:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'user@example.com';

-- To revoke admin access:
-- UPDATE user_profiles SET role = 'user' WHERE email = 'user@example.com';

-- To check who has admin access:
-- SELECT id, email, role, full_name FROM user_profiles WHERE role = 'admin';

-- ============================================================================
-- Security Notes
-- ============================================================================

-- 1. Public users can READ all clinical data (by design)
-- 2. Only authenticated users with role='admin' can INSERT/UPDATE/DELETE
-- 3. is_admin() function uses SECURITY DEFINER to bypass RLS when checking user_profiles
-- 4. All write operations are logged via Supabase audit trail
-- 5. The admins table is now deprecated (admin verification uses user_profiles.role)
