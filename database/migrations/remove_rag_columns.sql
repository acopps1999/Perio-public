-- =====================================================
-- RAG System Removal Migration
-- Purpose: Remove vector embeddings, full-text search, and related infrastructure
-- Execute in Supabase SQL Editor after transitioning to agentic search
-- =====================================================
-- IMPORTANT: This script removes RAG infrastructure but preserves ALL business data
-- Estimated space savings: 50-200MB+ depending on data volume
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop Vector Search Functions
-- =====================================================
-- These functions performed semantic similarity search using pgvector
-- No longer needed with GPT-4o agentic search using direct SQL queries

DROP FUNCTION IF EXISTS match_procedures(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_product_details(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_products(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_research_articles(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_product_procedure_complete(vector, float, int) CASCADE;

-- Full-text search function (replaced by ILIKE pattern matching)
DROP FUNCTION IF EXISTS search_procedures_fulltext(text, int) CASCADE;

-- Helper functions for embedding statistics
DROP FUNCTION IF EXISTS count_procedures_with_embeddings() CASCADE;
DROP FUNCTION IF EXISTS count_products_with_embeddings() CASCADE;
DROP FUNCTION IF EXISTS count_research_with_embeddings() CASCADE;

-- =====================================================
-- STEP 2: Drop Vector Indexes (HNSW)
-- =====================================================
-- These indexes enabled fast vector similarity search
-- Removing them saves significant storage (20-30% of column size)

DROP INDEX IF EXISTS procedures_embedding_idx;
DROP INDEX IF EXISTS products_embedding_idx;
DROP INDEX IF EXISTS product_details_embedding_idx;
DROP INDEX IF EXISTS product_details_clinical_evidence_embedding_idx;
DROP INDEX IF EXISTS product_details_scientific_rationale_embedding_idx;
DROP INDEX IF EXISTS research_articles_title_embedding_idx;
DROP INDEX IF EXISTS research_articles_abstract_embedding_idx;

-- =====================================================
-- STEP 3: Drop Embedding Columns from procedures
-- =====================================================
-- Removes: 4 columns (embedding, metadata, search_vector)
-- Keeps: All business data (name, category, pitch_points, etc.)

ALTER TABLE procedures
  DROP COLUMN IF EXISTS embedding CASCADE,
  DROP COLUMN IF EXISTS embedding_generated_at CASCADE,
  DROP COLUMN IF EXISTS embedding_model CASCADE,
  DROP COLUMN IF EXISTS search_vector CASCADE;

-- =====================================================
-- STEP 4: Drop Embedding Columns from products
-- =====================================================
-- Removes: 4 columns (embedding, metadata, search_vector)
-- Keeps: All product data (name, is_available, etc.)

ALTER TABLE products
  DROP COLUMN IF EXISTS embedding CASCADE,
  DROP COLUMN IF EXISTS embedding_generated_at CASCADE,
  DROP COLUMN IF EXISTS embedding_model CASCADE,
  DROP COLUMN IF EXISTS search_vector CASCADE;

-- =====================================================
-- STEP 5: Drop Embedding Columns from product_details
-- =====================================================
-- Removes: 5 columns (3 embeddings + 2 metadata)
-- CRITICAL: Keeps all sales data (clinical_evidence, pitch_points, rationale, objection_handling)

ALTER TABLE product_details
  DROP COLUMN IF EXISTS embedding CASCADE,
  DROP COLUMN IF EXISTS clinical_evidence_embedding CASCADE,
  DROP COLUMN IF EXISTS scientific_rationale_embedding CASCADE,
  DROP COLUMN IF EXISTS embedding_generated_at CASCADE,
  DROP COLUMN IF EXISTS embedding_model CASCADE;

-- =====================================================
-- STEP 6: Drop Embedding Columns from research articles
-- =====================================================
-- Removes: 4 columns (2 embeddings + 2 metadata)
-- CRITICAL: Keeps all research data (title, author, abstract, url)

ALTER TABLE condition_product_research_articles
  DROP COLUMN IF EXISTS title_embedding CASCADE,
  DROP COLUMN IF EXISTS abstract_embedding CASCADE,
  DROP COLUMN IF EXISTS embedding_generated_at CASCADE,
  DROP COLUMN IF EXISTS embedding_model CASCADE;

-- =====================================================
-- STEP 7: Refresh Materialized View (if exists)
-- =====================================================
-- The v_product_procedure_complete view may reference dropped columns
-- Refresh to ensure it uses only remaining columns

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname = 'v_product_procedure_complete'
  ) THEN
    REFRESH MATERIALIZED VIEW v_product_procedure_complete;
  END IF;
END $$;

-- =====================================================
-- STEP 8: Verification Queries
-- =====================================================
-- These queries verify the migration was successful

-- Check 1: No embedding columns should remain
DO $$
DECLARE
  embedding_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO embedding_count
  FROM information_schema.columns
  WHERE column_name LIKE '%embedding%'
    AND table_schema = 'public';

  IF embedding_count > 0 THEN
    RAISE WARNING 'WARNING: % embedding columns still exist', embedding_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All embedding columns removed';
  END IF;
END $$;

-- Check 2: No vector search functions should remain
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE (routine_name LIKE 'match_%' OR routine_name LIKE '%embedding%')
    AND routine_schema = 'public';

  IF function_count > 0 THEN
    RAISE WARNING 'WARNING: % vector search functions still exist', function_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All vector search functions removed';
  END IF;
END $$;

-- Check 3: Verify business data is intact
DO $$
DECLARE
  proc_count INTEGER;
  prod_count INTEGER;
  details_count INTEGER;
  research_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO proc_count FROM procedures;
  SELECT COUNT(*) INTO prod_count FROM products;
  SELECT COUNT(*) INTO details_count FROM product_details;
  SELECT COUNT(*) INTO research_count FROM condition_product_research_articles;

  RAISE NOTICE 'Data integrity check:';
  RAISE NOTICE '  - procedures: % rows', proc_count;
  RAISE NOTICE '  - products: % rows', prod_count;
  RAISE NOTICE '  - product_details: % rows', details_count;
  RAISE NOTICE '  - research_articles: % rows', research_count;
END $$;

-- =====================================================
-- OPTIONAL: Remove pgvector extension
-- =====================================================
-- Only run this if pgvector is not used elsewhere in your database
-- Uncomment the line below to remove the extension:

-- DROP EXTENSION IF EXISTS vector CASCADE;

COMMIT;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Next steps:
-- 1. Update staging-schema.sql to reflect clean state
-- 2. Deploy new agentic search service
-- 3. Delete old RAG service files
-- 4. Update documentation
-- =====================================================
