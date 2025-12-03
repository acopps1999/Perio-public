-- Phase 3 Schema Migration - Part 2 (BREAKING CHANGES)
-- Run this ONLY AFTER all UI code has been updated to not use patient_type_id
-- Purpose: Drop deprecated patient_type columns and tables

-- ============================================
-- PRE-FLIGHT CHECKS
-- ============================================

-- Before running this script, verify:
-- 1. All UI code updated (no references to patient_type in frontend)
-- 2. All backend queries updated (no patient_type_id filtering)
-- 3. Application tested and working without patient types
-- 4. Database backup created

-- ============================================
-- STEP 0: DROP DEPENDENT VIEWS
-- These views reference patient_type_id and must be dropped first
-- ============================================

-- Drop deprecated RAG/LLM views (these are no longer used after RAG removal)
DROP VIEW IF EXISTS procedures_for_llm CASCADE;
DROP VIEW IF EXISTS products_for_llm CASCADE;
DROP VIEW IF EXISTS qa_pairs_for_rag CASCADE;

-- Drop and recreate procedures_complete materialized view (will rebuild after schema change)
DROP MATERIALIZED VIEW IF EXISTS procedures_complete CASCADE;

-- ============================================
-- STEP 1: DROP PATIENT_TYPE_ID FROM PROCEDURE_PHASE_PRODUCTS
-- ============================================

-- Remove the foreign key constraint first
ALTER TABLE procedure_phase_products
DROP CONSTRAINT IF EXISTS procedure_phase_products_patient_type_id_fkey;

-- Drop the column
ALTER TABLE procedure_phase_products
DROP COLUMN IF EXISTS patient_type_id;

-- Make rank NOT NULL and add unique constraint
ALTER TABLE procedure_phase_products
ALTER COLUMN rank SET NOT NULL;

-- Add unique constraint to prevent duplicate ranks within same procedure/phase
-- (Drop first if exists to handle reruns)
DROP INDEX IF EXISTS idx_ppp_unique_rank;
CREATE UNIQUE INDEX idx_ppp_unique_rank
ON procedure_phase_products(procedure_id, phase_id, rank);

-- ============================================
-- STEP 2: DROP ADMINS TABLE (duplicates user_profiles)
-- ============================================

-- The admins table is redundant with user_profiles.role = 'admin'
-- All admin checks should now use user_profiles
DROP TABLE IF EXISTS public.admins CASCADE;

-- ============================================
-- STEP 3: OPTIONAL - DROP DEPRECATED TABLES
-- (Uncomment these lines when ready to permanently remove)
-- ============================================

-- DROP TABLE IF EXISTS public.patient_specific_configs CASCADE;
-- DROP TABLE IF EXISTS public.procedure_patient_types CASCADE;
-- DROP TABLE IF EXISTS public.patient_types CASCADE;

-- ============================================
-- STEP 4: OPTIONAL - DROP LEGACY COLUMN
-- ============================================

-- Remove legacy patient_type text field from procedures
-- ALTER TABLE procedures DROP COLUMN IF EXISTS patient_type;

-- ============================================
-- STEP 5: RECREATE PROCEDURES_COMPLETE MATERIALIZED VIEW
-- Updated for Phase 3 - no patient_type_id, uses rank ordering
-- ============================================

CREATE MATERIALIZED VIEW procedures_complete AS
SELECT
  p.id,
  p.name,
  c.name AS category_name,
  p.pitch_points,
  p.patient_type,
  p.custom_phase_labels,

  -- Phases as JSONB array
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', ph.id, 'name', ph.name) ORDER BY ph.name)
     FROM procedure_phases pp
     JOIN phases ph ON pp.phase_id = ph.id
     WHERE pp.procedure_id = p.id),
    '[]'::jsonb
  ) AS phases,

  -- Dentists as JSONB array
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.name)
     FROM procedure_dentists pd
     JOIN dentists d ON pd.dentist_id = d.id
     WHERE pd.procedure_id = p.id),
    '[]'::jsonb
  ) AS dentists,

  -- Phase products as JSONB array (Phase 3: ordered by rank, no patient_type)
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'phase_name', ph.name,
         'product_name', pr.name,
         'product_id', pr.id,
         'rank', ppp.rank
       ) ORDER BY ph.name, ppp.rank
     )
     FROM procedure_phase_products ppp
     JOIN phases ph ON ppp.phase_id = ph.id
     JOIN products pr ON ppp.product_id = pr.id
     WHERE ppp.procedure_id = p.id),
    '[]'::jsonb
  ) AS procedure_phase_products,

  -- Product details as JSONB array - includes all sales/clinical fields
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'product_id', pd.product_id,
         'product_name', pr.name,
         'rationale', pd.rationale,
         'scientific_rationale', pd.rationale,
         'clinical_evidence', pd.clinical_evidence,
         'objection_handling', pd.objection_handling,
         'pitch_points', pd.pitch_points
       )
     )
     FROM product_details pd
     JOIN products pr ON pd.product_id = pr.id
     WHERE pd.procedure_id = p.id),
    '[]'::jsonb
  ) AS product_details,

  -- Phase-specific usage as JSONB array
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'product_id', psu.product_id,
         'phase_name', ph.name,
         'instructions', psu.instructions
       )
     )
     FROM phase_specific_usage psu
     JOIN phases ph ON psu.phase_id = ph.id
     WHERE psu.procedure_id = p.id),
    '[]'::jsonb
  ) AS phase_specific_usage,

  -- Research articles as JSONB array
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'product_id', cpra.product_id,
         'title', cpra.title,
         'author', cpra.author,
         'abstract', cpra.abstract,
         'url', cpra.url
       )
     )
     FROM condition_product_research_articles cpra
     WHERE cpra.procedure_id = p.id),
    '[]'::jsonb
  ) AS research_articles

FROM procedures p
LEFT JOIN categories c ON p.category_id = c.id;

-- Create index for faster lookups
CREATE UNIQUE INDEX idx_procedures_complete_id ON procedures_complete(id);
CREATE INDEX idx_procedures_complete_name ON procedures_complete(name);

-- Grant permissions
GRANT SELECT ON procedures_complete TO anon, authenticated;

-- Create or replace the refresh function
CREATE OR REPLACE FUNCTION refresh_procedures_complete()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY procedures_complete;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_procedures_complete() TO anon, authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify patient_type_id is gone
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'procedure_phase_products';

-- Verify rank constraint exists
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'procedure_phase_products' AND indexname = 'idx_ppp_unique_rank';

-- Verify admins table is dropped
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'admins';

-- Verify materialized view exists and has data
-- SELECT COUNT(*) FROM procedures_complete;
