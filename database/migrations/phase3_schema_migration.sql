-- Phase 3 Schema Migration
-- Purpose: Remove patient type system, add product ranking, extend roles
-- Run in Supabase SQL Editor

-- ============================================
-- PART 1: ADD RANK COLUMN TO PROCEDURE_PHASE_PRODUCTS
-- ============================================

-- Step 1.1: Add rank column (non-breaking)
ALTER TABLE procedure_phase_products
ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 1;

-- Step 1.2: Assign ranks to existing products (partition by procedure+phase, order by id)
WITH ranked_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY procedure_id, phase_id
      ORDER BY id
    ) as new_rank
  FROM procedure_phase_products
)
UPDATE procedure_phase_products ppp
SET rank = rp.new_rank
FROM ranked_products rp
WHERE ppp.id = rp.id;

-- Step 1.3: Create index for efficient rank queries
CREATE INDEX IF NOT EXISTS idx_ppp_procedure_phase_rank
ON procedure_phase_products(procedure_id, phase_id, rank);

-- ============================================
-- PART 2: ADD CUSTOM PHASE LABELS TO PROCEDURES
-- ============================================

ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS custom_phase_labels JSONB DEFAULT '{}'::jsonb;

-- Example usage: {"1": "Pre-Op", "2": "During Surgery", "3": "Post-Op"}
COMMENT ON COLUMN procedures.custom_phase_labels IS
'Custom display names for phases. Keys are phase_ids, values are custom names. Falls back to phases.name if not set.';

-- ============================================
-- PART 3: EXTEND ROLE ENUM (sales, clinician)
-- ============================================

-- Note: Adding enum values is safe and non-breaking
-- Check if values exist before adding (PostgreSQL 13+)
DO $$
BEGIN
  -- Add 'sales' role if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sales' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'sales';
  END IF;

  -- Add 'clinician' role if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clinician' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'clinician';
  END IF;
END $$;

-- ============================================
-- PART 4: ADD ROLE ASSIGNMENT TRACKING
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN user_profiles.role_assigned_by IS 'Admin who assigned/changed the role';
COMMENT ON COLUMN user_profiles.role_assigned_at IS 'Timestamp when role was last changed';

-- ============================================
-- PART 5: MARK DEPRECATED TABLES/COLUMNS
-- ============================================

-- Mark patient_types table as deprecated
COMMENT ON TABLE patient_types IS
'DEPRECATED (Phase 3): Patient type filtering removed. Table retained for historical data. DO NOT USE in new code.';

-- Mark procedure_patient_types as deprecated
COMMENT ON TABLE procedure_patient_types IS
'DEPRECATED (Phase 3): Patient type associations removed. Table retained for historical data. DO NOT USE in new code.';

-- Mark patient_specific_configs as deprecated
COMMENT ON TABLE patient_specific_configs IS
'DEPRECATED (Phase 3): Patient-specific configurations removed. Table retained for historical data. DO NOT USE in new code.';

-- Mark the patient_type_id column in procedure_phase_products as deprecated
-- (Will be dropped after UI is updated)
COMMENT ON COLUMN procedure_phase_products.patient_type_id IS
'DEPRECATED (Phase 3): Will be dropped after UI migration. Use rank column instead for ordering.';

-- Mark legacy patient_type text field in procedures
COMMENT ON COLUMN procedures.patient_type IS
'DEPRECATED: Legacy text field. Use procedure_patient_types table instead (also deprecated).';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check rank column was added and populated
-- SELECT procedure_id, phase_id, product_id, rank
-- FROM procedure_phase_products
-- ORDER BY procedure_id, phase_id, rank
-- LIMIT 20;

-- Check new enum values exist
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;

-- Check custom_phase_labels column exists
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'procedures' AND column_name = 'custom_phase_labels';
