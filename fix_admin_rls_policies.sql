-- Fix RLS Policies for Admin Panel Operations
-- This script ensures admins can perform all CRUD operations while maintaining security
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Drop existing restrictive policies (if any)
-- =====================================================

-- Products table
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Admins can select products" ON products;

-- Procedures table
DROP POLICY IF EXISTS "Admins can insert procedures" ON procedures;
DROP POLICY IF EXISTS "Admins can update procedures" ON procedures;
DROP POLICY IF EXISTS "Admins can delete procedures" ON procedures;
DROP POLICY IF EXISTS "Admins can select procedures" ON procedures;

-- Procedure_phase_products table
DROP POLICY IF EXISTS "Admins can insert procedure_phase_products" ON procedure_phase_products;
DROP POLICY IF EXISTS "Admins can update procedure_phase_products" ON procedure_phase_products;
DROP POLICY IF EXISTS "Admins can delete procedure_phase_products" ON procedure_phase_products;
DROP POLICY IF EXISTS "Admins can select procedure_phase_products" ON procedure_phase_products;

-- Phases table
DROP POLICY IF EXISTS "Admins can insert phases" ON phases;
DROP POLICY IF EXISTS "Admins can update phases" ON phases;
DROP POLICY IF EXISTS "Admins can delete phases" ON phases;
DROP POLICY IF EXISTS "Admins can select phases" ON phases;

-- Procedure_phases table
DROP POLICY IF EXISTS "Admins can insert procedure_phases" ON procedure_phases;
DROP POLICY IF EXISTS "Admins can update procedure_phases" ON procedure_phases;
DROP POLICY IF EXISTS "Admins can delete procedure_phases" ON procedure_phases;
DROP POLICY IF EXISTS "Admins can select procedure_phases" ON procedure_phases;

-- Categories table
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
DROP POLICY IF EXISTS "Admins can select categories" ON categories;

-- Competitive advantage tables
DROP POLICY IF EXISTS "Admins can insert competitive_advantage_competitors" ON competitive_advantage_competitors;
DROP POLICY IF EXISTS "Admins can update competitive_advantage_competitors" ON competitive_advantage_competitors;
DROP POLICY IF EXISTS "Admins can delete competitive_advantage_competitors" ON competitive_advantage_competitors;
DROP POLICY IF EXISTS "Admins can select competitive_advantage_competitors" ON competitive_advantage_competitors;

DROP POLICY IF EXISTS "Admins can insert competitive_advantage_active_ingredients" ON competitive_advantage_active_ingredients;
DROP POLICY IF EXISTS "Admins can update competitive_advantage_active_ingredients" ON competitive_advantage_active_ingredients;
DROP POLICY IF EXISTS "Admins can delete competitive_advantage_active_ingredients" ON competitive_advantage_active_ingredients;
DROP POLICY IF EXISTS "Admins can select competitive_advantage_active_ingredients" ON competitive_advantage_active_ingredients;

-- Product_details table
DROP POLICY IF EXISTS "Admins can insert product_details" ON product_details;
DROP POLICY IF EXISTS "Admins can update product_details" ON product_details;
DROP POLICY IF EXISTS "Admins can delete product_details" ON product_details;
DROP POLICY IF EXISTS "Admins can select product_details" ON product_details;

-- Phase_specific_usage table
DROP POLICY IF EXISTS "Admins can insert phase_specific_usage" ON phase_specific_usage;
DROP POLICY IF EXISTS "Admins can update phase_specific_usage" ON phase_specific_usage;
DROP POLICY IF EXISTS "Admins can delete phase_specific_usage" ON phase_specific_usage;
DROP POLICY IF EXISTS "Admins can select phase_specific_usage" ON phase_specific_usage;

-- Condition_product_research_articles table
DROP POLICY IF EXISTS "Admins can insert condition_product_research_articles" ON condition_product_research_articles;
DROP POLICY IF EXISTS "Admins can update condition_product_research_articles" ON condition_product_research_articles;
DROP POLICY IF EXISTS "Admins can delete condition_product_research_articles" ON condition_product_research_articles;
DROP POLICY IF EXISTS "Admins can select condition_product_research_articles" ON condition_product_research_articles;

-- Procedure_dentists table
DROP POLICY IF EXISTS "Admins can insert procedure_dentists" ON procedure_dentists;
DROP POLICY IF EXISTS "Admins can update procedure_dentists" ON procedure_dentists;
DROP POLICY IF EXISTS "Admins can delete procedure_dentists" ON procedure_dentists;
DROP POLICY IF EXISTS "Admins can select procedure_dentists" ON procedure_dentists;

-- =====================================================
-- STEP 2: Create comprehensive admin policies
-- =====================================================

-- Helper function to check if user is admin (reusable in all policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Products table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select products"
  ON products FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Procedures table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select procedures"
  ON procedures FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert procedures"
  ON procedures FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update procedures"
  ON procedures FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete procedures"
  ON procedures FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Procedure_phase_products table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select procedure_phase_products"
  ON procedure_phase_products FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert procedure_phase_products"
  ON procedure_phase_products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update procedure_phase_products"
  ON procedure_phase_products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete procedure_phase_products"
  ON procedure_phase_products FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Phases table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select phases"
  ON phases FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert phases"
  ON phases FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update phases"
  ON phases FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete phases"
  ON phases FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Procedure_phases table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select procedure_phases"
  ON procedure_phases FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert procedure_phases"
  ON procedure_phases FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update procedure_phases"
  ON procedure_phases FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete procedure_phases"
  ON procedure_phases FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Categories table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Competitive_advantage_competitors - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select competitive_advantage_competitors"
  ON competitive_advantage_competitors FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert competitive_advantage_competitors"
  ON competitive_advantage_competitors FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update competitive_advantage_competitors"
  ON competitive_advantage_competitors FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete competitive_advantage_competitors"
  ON competitive_advantage_competitors FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Competitive_advantage_active_ingredients - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select competitive_advantage_active_ingredients"
  ON competitive_advantage_active_ingredients FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert competitive_advantage_active_ingredients"
  ON competitive_advantage_active_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update competitive_advantage_active_ingredients"
  ON competitive_advantage_active_ingredients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete competitive_advantage_active_ingredients"
  ON competitive_advantage_active_ingredients FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Product_details table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select product_details"
  ON product_details FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert product_details"
  ON product_details FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product_details"
  ON product_details FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete product_details"
  ON product_details FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Phase_specific_usage table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select phase_specific_usage"
  ON phase_specific_usage FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert phase_specific_usage"
  ON phase_specific_usage FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update phase_specific_usage"
  ON phase_specific_usage FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete phase_specific_usage"
  ON phase_specific_usage FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Condition_product_research_articles - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select condition_product_research_articles"
  ON condition_product_research_articles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert condition_product_research_articles"
  ON condition_product_research_articles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update condition_product_research_articles"
  ON condition_product_research_articles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete condition_product_research_articles"
  ON condition_product_research_articles FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- Procedure_dentists table - Admins have full access
-- =====================================================
CREATE POLICY "Admins can select procedure_dentists"
  ON procedure_dentists FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert procedure_dentists"
  ON procedure_dentists FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update procedure_dentists"
  ON procedure_dentists FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete procedure_dentists"
  ON procedure_dentists FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- VERIFICATION: Check that RLS is enabled
-- =====================================================
-- You can uncomment these to verify RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
