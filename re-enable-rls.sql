-- Re-enable RLS on all tables (was disabled for testing)
-- Run this in Supabase SQL Editor

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_phase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_specific_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_product_research_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_specific_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_patient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_articles ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'procedures', 'products', 'phases', 'categories', 'patient_types',
    'procedure_phases', 'procedure_phase_products', 'product_details',
    'phase_specific_usage', 'condition_product_research_articles',
    'patient_specific_configs', 'procedure_patient_types', 'research_articles'
  )
ORDER BY tablename;
