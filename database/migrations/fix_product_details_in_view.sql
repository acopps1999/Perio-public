-- FIX: Add missing product_details columns to procedures_complete materialized view
-- Issue: clinical_evidence, pitch_points, objection_handling, scientific_rationale, fact_sheet_url
--        were not being selected from product_details table
--
-- Run this migration in Supabase SQL Editor to fix the ProductDrawer data loading issue.

-- Step 1: Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS procedures_complete CASCADE;

-- Step 2: Recreate with all product_details columns
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

  -- Product details as JSONB array - NOW INCLUDES ALL REQUIRED FIELDS
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

-- Step 3: Recreate indexes
CREATE UNIQUE INDEX idx_procedures_complete_id ON procedures_complete(id);
CREATE INDEX idx_procedures_complete_name ON procedures_complete(name);

-- Step 4: Grant permissions
GRANT SELECT ON procedures_complete TO anon, authenticated;

-- Step 5: Recreate the refresh function
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

-- Step 6: Refresh the view with the new data
REFRESH MATERIALIZED VIEW procedures_complete;

-- Verification: Check that product_details now includes all columns
-- Run this after migration to verify:
-- SELECT
--   name,
--   jsonb_array_length(product_details) as product_count,
--   product_details->0->>'clinical_evidence' as sample_evidence,
--   product_details->0->>'pitch_points' as sample_pitch
-- FROM procedures_complete
-- LIMIT 5;
