-- RLS Policies for all tables needed by the frontend
-- Run this in your Supabase SQL Editor

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_phase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_patient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_specific_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_product_research_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_specific_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "public_read_procedures" ON public.procedures;
DROP POLICY IF EXISTS "public_read_phases" ON public.phases;
DROP POLICY IF EXISTS "public_read_procedure_phases" ON public.procedure_phases;
DROP POLICY IF EXISTS "public_read_procedure_phase_products" ON public.procedure_phase_products;
DROP POLICY IF EXISTS "public_read_products" ON public.products;
DROP POLICY IF EXISTS "public_read_product_details" ON public.product_details;
DROP POLICY IF EXISTS "public_read_patient_types" ON public.patient_types;
DROP POLICY IF EXISTS "public_read_procedure_patient_types" ON public.procedure_patient_types;
DROP POLICY IF EXISTS "public_read_phase_specific_usage" ON public.phase_specific_usage;
DROP POLICY IF EXISTS "public_read_condition_product_research_articles" ON public.condition_product_research_articles;
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
DROP POLICY IF EXISTS "public_read_patient_specific_configs" ON public.patient_specific_configs;

-- Create fresh policies
CREATE POLICY "public_read_procedures" ON public.procedures FOR SELECT TO public USING (true);
CREATE POLICY "public_read_phases" ON public.phases FOR SELECT TO public USING (true);
CREATE POLICY "public_read_procedure_phases" ON public.procedure_phases FOR SELECT TO public USING (true);
CREATE POLICY "public_read_procedure_phase_products" ON public.procedure_phase_products FOR SELECT TO public USING (true);
CREATE POLICY "public_read_products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "public_read_product_details" ON public.product_details FOR SELECT TO public USING (true);
CREATE POLICY "public_read_patient_types" ON public.patient_types FOR SELECT TO public USING (true);
CREATE POLICY "public_read_procedure_patient_types" ON public.procedure_patient_types FOR SELECT TO public USING (true);
CREATE POLICY "public_read_phase_specific_usage" ON public.phase_specific_usage FOR SELECT TO public USING (true);
CREATE POLICY "public_read_condition_product_research_articles" ON public.condition_product_research_articles FOR SELECT TO public USING (true);
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "public_read_patient_specific_configs" ON public.patient_specific_configs FOR SELECT TO public USING (true);

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to anon and authenticated roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;