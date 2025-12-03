# Phase 1: Database Views & Functions - Deployment Guide

## Overview
This phase creates the semantic layer foundation for the hybrid RAG system by pre-joining related data into efficient views and creating optimized vector search functions.

## Files Created
1. `views/v_product_procedure_complete.sql` - Complete product-procedure relationships view
2. `views/v_research_complete.sql` - Research articles with procedure/product links
3. `functions/match_product_procedure_complete.sql` - Vector search on complete view

## Deployment Steps

### Step 1: Deploy Product-Procedure Complete View
```bash
# In Supabase SQL Editor, run:
database/views/v_product_procedure_complete.sql
```

**What this does:**
- Creates `v_product_procedure_complete` view joining:
  - products + product_details
  - procedures
  - phases + patient_types
  - All embeddings for semantic search
- Creates/verifies HNSW indexes for fast vector search
- Grants permissions to authenticated users

**Verification:**
```sql
SELECT COUNT(*) as total_rows FROM v_product_procedure_complete;
-- Expected: Should return the number of product-procedure combinations
```

### Step 2: Deploy Research Complete View
```bash
# In Supabase SQL Editor, run:
database/views/v_research_complete.sql
```

**What this does:**
- Creates `v_research_complete` view joining:
  - research_articles
  - condition_product_research_articles (for embeddings)
  - procedures + products
- Creates/verifies embedding indexes
- Grants permissions

**Verification:**
```sql
SELECT COUNT(*) as total_articles FROM v_research_complete;
-- Expected: Should return the number of research articles
```

### Step 3: Deploy Vector Search Function
```bash
# In Supabase SQL Editor, run:
database/functions/match_product_procedure_complete.sql
```

**What this does:**
- Creates `match_product_procedure_complete()` function
- Enables semantic search across complete product-procedure view
- Returns enriched results with similarity scores
- Grants execute permissions

**Verification:**
```sql
-- Test the function (requires embeddings to exist)
SELECT
  product_name,
  procedure_name,
  similarity
FROM match_product_procedure_complete(
  query_embedding := (SELECT embedding FROM product_details WHERE embedding IS NOT NULL LIMIT 1),
  match_threshold := 0.4,
  match_count := 5
);
-- Expected: Should return 5 similar product-procedure pairs
```

## Performance Expectations

With proper indexes:
- View creation: Instant (views are virtual)
- Vector search query: 100-500ms typical
- Index build (if not exists): 1-5 seconds per index

## Troubleshooting

### "view already exists"
- SQL includes `DROP VIEW IF EXISTS` - should not happen
- If it does: manually drop view and re-run

### "index already exists"
- SQL includes `CREATE INDEX IF NOT EXISTS` - safe to ignore
- Existing indexes will be preserved

### "permission denied"
- Ensure you're running as a superuser or database owner
- Check Supabase project permissions

### Slow queries after deployment
- Check indexes were created: `\di` in psql
- Verify embeddings exist: `SELECT COUNT(embedding) FROM product_details;`
- If no embeddings, vector search will return no results (expected)

## Next Steps

After successful deployment:
1. ✅ Views are ready for structured queries (Phase 3)
2. ✅ Vector search is ready for semantic search (Phase 4)
3. ✅ Proceed to Phase 2: Build Smart Router

## Rollback

If you need to rollback:
```sql
DROP VIEW IF EXISTS v_product_procedure_complete CASCADE;
DROP VIEW IF EXISTS v_research_complete CASCADE;
DROP FUNCTION IF EXISTS match_product_procedure_complete CASCADE;
```

**Note:** This will not affect base tables or existing data.
