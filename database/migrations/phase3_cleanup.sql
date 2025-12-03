-- PHASE 3 CLEANUP MIGRATION
-- Removes deprecated tables, columns, and fixes the materialized view
--
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE 404 ERROR
--
-- Changes:
-- 1. Recreates procedures_complete WITHOUT fact_sheet_url (column was deleted)
-- 2. Documents deprecated tables/columns for future cleanup

-- ============================================
-- STEP 1: FIX THE MATERIALIZED VIEW (URGENT)
-- The view broke because fact_sheet_url was deleted
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS procedures_complete CASCADE;

CREATE MATERIALIZED VIEW procedures_complete AS
SELECT
  p.id,
  p.name,
  c.name AS category_name,
  p.pitch_points,
  p.patient_type,  -- Keep for now, deprecated
  p.custom_phase_labels,

  -- Phases as JSONB array
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', ph.id, 'name', ph.name) ORDER BY ph.name)
     FROM procedure_phases pp
     JOIN phases ph ON pp.phase_id = ph.id
     WHERE pp.procedure_id = p.id),
    '[]'::jsonb
  ) AS phases,

  -- Dentists as JSONB array (keeping for backward compatibility)
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

  -- Product details as JSONB array (WITHOUT fact_sheet_url)
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

-- Recreate indexes
CREATE UNIQUE INDEX idx_procedures_complete_id ON procedures_complete(id);
CREATE INDEX idx_procedures_complete_name ON procedures_complete(name);

-- Grant permissions
GRANT SELECT ON procedures_complete TO anon, authenticated;

-- Recreate refresh function
CREATE OR REPLACE FUNCTION refresh_procedures_complete()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY procedures_complete;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_procedures_complete() TO anon, authenticated;

-- Refresh the view
REFRESH MATERIALIZED VIEW procedures_complete;

-- ============================================
-- STEP 2: VERIFY THE FIX
-- ============================================
-- Run this to verify the view works:
-- SELECT COUNT(*) FROM procedures_complete;
-- SELECT name, jsonb_array_length(product_details) FROM procedures_complete LIMIT 5;


-- ============================================
-- STEP 3: DEPRECATED TABLES (SAFE TO DROP LATER)
-- These are no longer used in Phase 3
-- ============================================

-- The following tables/columns are DEPRECATED but kept for now:
--
-- TABLES:
-- - patient_types (no longer used, products not grouped by patient type)
-- - procedure_patient_types (junction table, not used)
-- - patient_specific_configs (not used)
-- - dentists (not used in UI)
-- - procedure_dentists (not used in UI)
--
-- COLUMNS:
-- - procedures.patient_type (text field, deprecated)
-- - procedure_phase_products.patient_type_id (should be removed)
--
-- To drop these later, run:
--
-- DROP TABLE IF EXISTS patient_specific_configs CASCADE;
-- DROP TABLE IF EXISTS procedure_patient_types CASCADE;
-- DROP TABLE IF EXISTS procedure_dentists CASCADE;
-- DROP TABLE IF EXISTS patient_types CASCADE;
-- DROP TABLE IF EXISTS dentists CASCADE;
--
-- ALTER TABLE procedures DROP COLUMN IF EXISTS patient_type;
-- ALTER TABLE procedure_phase_products DROP COLUMN IF EXISTS patient_type_id;
