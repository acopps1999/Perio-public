# 🎯 PRISM Clinical Chart - Production-Ready Refactoring Plan
**AI/RAG-Enabled Application with Modern Best Practices**

---

## 📋 Executive Summary

**Current State**:
- 1862-line database layer with 7 parallel queries per page load
- Infinite loading issues due to fragile query dependencies
- No AI/RAG support
- 17 normalized tables requiring complex joins
- ~1600 lines of dead LLM code already removed

**Target State**:
- **Single optimized query** (200-500ms vs 2-5s) using materialized views
- **Production RAG architecture** with pgvector + HNSW indexing
- **Hybrid orchestration**: Vercel AI SDK (frontend) + optional n8n/LangChain (backend)
- **60% code reduction** (1862 → ~700 lines)
- **Cost-optimized AI**: Semantic caching + model routing (40-70% savings)
- **Comprehensive observability**: LangSmith or LangFuse integration

**Timeline**: 8 weeks (4 two-week sprints) - Quality over speed

**Tech Stack Decision** (Based on Research):
```
Frontend: React + Vercel AI SDK (streaming responses)
Database: Supabase (PostgreSQL + pgvector + Auth + Realtime)
Vector Storage: pgvector with HNSW indexes (11.4x faster than Qdrant at 50M vectors)
Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
LLM: GPT-4 Turbo with model routing (GPT-3.5 for simple queries)
Orchestration: Vercel AI SDK + optional LangChain for complex agents
Caching: Redis (3-tier: embedding + retrieval + answer cache)
Observability: LangSmith or LangFuse
```

---

## 🎯 Core Priorities (In Order)

1. **Database Performance** - Materialized views + HNSW indexes → 10x faster
2. **AI/RAG Foundation** - pgvector embeddings + hybrid search
3. **Cost Optimization** - Semantic caching (60-80% API cost reduction)
4. **Streaming UI** - React + Vercel AI SDK for responsive experience
5. **Production Reliability** - Error boundaries + monitoring + RLS
6. **Observability** - Query tracking + token usage + cache metrics

---

# 🧹 PHASE 0: AUDIT & CLEANUP (Week 1)

## Sprint 0.1: Code Audit & Dead Code Removal

### Step 0.1.1: Identify Unused Files
**Action**: Scan for unused imports, dead code, obsolete files

**Commands**:
```bash
# Check dependencies
npx depcheck

# Find unused TypeScript exports (if applicable)
npx ts-prune

# Check for unused components
grep -r "import.*from.*components" src/ | sort | uniq

# Check for unused service files
grep -r "import.*from.*services" src/ | sort | uniq
```

**Expected Removals**:
- ✅ `src/services/llmService.js` - Already removed (652 lines)
- ✅ `src/services/intelligentQueryService.js` - Already removed (548 lines)
- ✅ `src/services/queryExecutor.js` - Already removed (417 lines)
- `src/components/OllamaTestComponent.js` - Test component (~100 lines)
- Any unused modal components
- Unused admin panel tabs/features

**Estimated cleanup**: 200-300 lines

### Step 0.1.2: Remove Debug Logging
**Action**: Remove console.log statements, replace with proper monitoring

**Files to clean**:
- `ClinicalChartMockup.js` - Remove debug logs
- `AdminPanelSupabase.js` - Remove debug logs
- Replace console.warn/console.error with structured logging

**Structured Logging Pattern**:
```javascript
// Replace this:
console.log('Query result:', data);

// With this:
if (process.env.NODE_ENV === 'development') {
  console.log('[Query]', { operation: 'fetchProcedures', duration: Date.now() - start });
}
```

**Estimated cleanup**: 50-100 lines

### Step 0.1.3: Consolidate Duplicate Code
**Action**: Extract shared logic into utility modules

**Known Duplicates**:
1. **Patient type mapping** (appears 3x) → Extract to `src/utils/patientTypeUtils.js`
2. **Product detail transformation** (appears 2x) → Extract to `src/services/database/transformers/productTransformer.js`
3. **Cache invalidation patterns** → Extract to `src/services/database/cache/cacheInvalidation.js`

**Example Consolidation**:
```javascript
// src/utils/patientTypeUtils.js
export const PATIENT_TYPE_MAP = {
  1: 'Adult',
  2: 'Pediatric',
  3: 'All Ages'
};

export const mapPatientType = (typeId) => {
  return PATIENT_TYPE_MAP[typeId] || 'Unknown';
};

export const mapPatientTypes = (types) => {
  return types.map(type => ({
    ...type,
    displayName: mapPatientType(type.id)
  }));
};
```

**Estimated consolidation**: 150-200 lines

### Step 0.1.4: Archive Diagnostic SQL Files
**Action**: Clean up SQL directory

**Files to Archive** (move to `sql/archive/`):
```
✓ add_missing_foreign_keys.sql (superseded)
✓ add_phase_fk_only.sql (superseded)
✓ check_foreign_key.sql (diagnostic)
✓ check_rls_status.sql (diagnostic)
✓ check_staging_rls.sql (diagnostic)
✓ check_table_structure.sql (diagnostic)
✓ DISABLE_RLS_FOR_DATA.sql (temporary test)
✓ fix_admins_table_rls.sql (applied)
✓ test_rls_policies.sql (diagnostic)
```

**Keep in `sql/` root**:
- `supabase_schema.sql` (source of truth)
- `staging-schema.sql` (staging reference)
- `FINAL_SIMPLE_FIX.sql` (documented for history)

**Action**: 
```bash
mkdir -p sql/archive
mv sql/check_*.sql sql/archive/
mv sql/DISABLE_RLS_FOR_DATA.sql sql/archive/
mv sql/fix_admins_table_rls.sql sql/archive/
mv sql/test_rls_policies.sql sql/archive/
```

---

# 🗄️ PHASE 1: DATABASE FOUNDATION (Weeks 2-3)

## Sprint 1.1: pgvector Setup & Vector Indexes

### Step 1.1.1: Enable pgvector Extension
**Action**: Enable vector support in Supabase

**Script**: `sql/01_enable_pgvector.sql`
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance;
```

**Run in Supabase**:
1. Go to SQL Editor in Supabase dashboard
2. Execute the script
3. Verify output shows extension installed

### Step 1.1.2: Add Vector Columns to Procedures
**Action**: Add embedding storage with optimal dimensions

**Script**: `sql/02_add_vector_columns.sql`
```sql
-- Add embedding column (1536 dimensions for text-embedding-3-small)
ALTER TABLE procedures 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column for product details
ALTER TABLE product_details
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add metadata for embedding generation tracking
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

ALTER TABLE product_details
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
```

### Step 1.1.3: Create HNSW Indexes (Production Standard)
**Action**: Create fast vector similarity indexes

**Script**: `sql/03_create_vector_indexes.sql`
```sql
-- HNSW index for procedures (production standard for <50M vectors)
-- Configuration: m=16 (default), ef_construction=100 (build quality)
CREATE INDEX IF NOT EXISTS idx_procedures_embedding_hnsw 
ON procedures 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 100);

-- HNSW index for product_details
CREATE INDEX IF NOT EXISTS idx_product_details_embedding_hnsw 
ON product_details 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 100);

-- Note: For datasets >50M vectors, consider increasing m to 24-32
-- For faster builds with slightly lower recall, reduce ef_construction to 64

-- Verify indexes created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%';
```

**Expected Performance**:
- Query time: 0.5-3ms for 10K-100K vectors
- 11.4x faster than Qdrant at 50M vectors (research benchmark)
- Memory requirement: ~2-4 bytes per dimension per vector

### Step 1.1.4: Create Similarity Search Functions
**Action**: Build reusable vector search functions with threshold filtering

**Script**: `sql/04_vector_search_functions.sql`
```sql
-- Search procedures by embedding similarity
CREATE OR REPLACE FUNCTION match_procedures(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  category_id bigint,
  pitch_points text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.pitch_points,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM procedures p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search product details by embedding similarity
CREATE OR REPLACE FUNCTION match_product_details(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  product_id bigint,
  procedure_id bigint,
  clinical_evidence text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id,
    pd.product_id,
    pd.procedure_id,
    pd.clinical_evidence,
    1 - (pd.embedding <=> query_embedding) AS similarity
  FROM product_details pd
  WHERE pd.embedding IS NOT NULL
    AND 1 - (pd.embedding <=> query_embedding) > match_threshold
  ORDER BY pd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search combining semantic (vector) + keyword (full-text)
CREATE OR REPLACE FUNCTION hybrid_search_procedures(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  category_id bigint,
  pitch_points text,
  combined_score float
)
LANGUAGE sql
AS $$
  WITH semantic_search AS (
    SELECT 
      id,
      name,
      category_id,
      pitch_points,
      ROW_NUMBER() OVER (ORDER BY embedding <=> query_embedding) AS rank
    FROM procedures
    WHERE embedding IS NOT NULL
  ),
  keyword_search AS (
    SELECT 
      id,
      name,
      category_id,
      pitch_points,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(
        to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(pitch_points, '')),
        websearch_to_tsquery('english', query_text)
      ) DESC) AS rank
    FROM procedures
    WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(pitch_points, ''))
          @@ websearch_to_tsquery('english', query_text)
  )
  SELECT 
    COALESCE(s.id, k.id) AS id,
    COALESCE(s.name, k.name) AS name,
    COALESCE(s.category_id, k.category_id) AS category_id,
    COALESCE(s.pitch_points, k.pitch_points) AS pitch_points,
    -- Reciprocal Rank Fusion (production standard for hybrid search)
    (COALESCE(1.0 / (60 + s.rank), 0.0) * 0.7 + 
     COALESCE(1.0 / (60 + k.rank), 0.0) * 0.3) AS combined_score
  FROM semantic_search s
  FULL OUTER JOIN keyword_search k ON s.id = k.id
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_procedures TO authenticated, anon;
GRANT EXECUTE ON FUNCTION match_product_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION hybrid_search_procedures TO authenticated, anon;
```

**Usage Example**:
```javascript
// In your React app
const { data } = await supabase.rpc('match_procedures', {
  query_embedding: embeddingArray,
  match_threshold: 0.78,
  match_count: 5
});
```

## Sprint 1.2: Performance Indexes & Materialized Views

### Step 1.2.1: Add Performance Indexes
**Action**: Create indexes for frequently queried columns

**Script**: `sql/05_performance_indexes.sql`
```sql
-- === PRIMARY LOOKUP INDEXES ===
-- For joins in the existing 7-query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phases_procedure_id
  ON procedure_phases(procedure_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phases_phase_id
  ON procedure_phases(phase_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phase_products_procedure
  ON procedure_phase_products(procedure_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phase_products_phase
  ON procedure_phase_products(phase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phase_products_product
  ON procedure_phase_products(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phase_products_patient_type
  ON procedure_phase_products(patient_type_id);

-- Composite index for the most common query pattern (procedure + phase + patient type)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_phase_products_composite
  ON procedure_phase_products(procedure_id, phase_id, patient_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_details_procedure
  ON product_details(procedure_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_details_product
  ON product_details(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phase_specific_usage_procedure
  ON phase_specific_usage(procedure_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phase_specific_usage_product
  ON phase_specific_usage(product_id);

-- === FULL-TEXT SEARCH INDEXES ===
-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fuzzy search (supports LIKE '%term%')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedures_name_trgm
  ON procedures USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
  ON products USING gin(name gin_trgm_ops);

-- Full-text search indexes for natural language queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedures_fts
  ON procedures USING gin(to_tsvector('english', 
    COALESCE(name, '') || ' ' || COALESCE(pitch_points, '')));

-- === ANALYZE TABLES FOR QUERY PLANNER ===
ANALYZE procedures;
ANALYZE procedure_phases;
ANALYZE procedure_phase_products;
ANALYZE product_details;
ANALYZE phase_specific_usage;
```

**Note**: Using `CREATE INDEX CONCURRENTLY` allows indexes to be built without locking tables (important for production).

**Expected Improvement**: 5-10x faster joins

### Step 1.2.2: Create Optimized Materialized View
**Action**: Pre-compute all joins for single-query data loading

**Script**: `sql/06_materialized_view.sql`
```sql
-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS procedures_complete CASCADE;

-- Create comprehensive materialized view with all related data
CREATE MATERIALIZED VIEW procedures_complete AS
SELECT
  -- === Core procedure data ===
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  p.pitch_points,
  p.patient_type,
  p.embedding,
  p.embedding_generated_at,
  p.created_at,
  p.updated_at,

  -- === Aggregated phases (JSONB array) ===
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', ph.id,
      'name', ph.name,
      'description', ph.description
    ) ORDER BY jsonb_build_object('id', ph.id, 'name', ph.name, 'description', ph.description))
    FILTER (WHERE ph.id IS NOT NULL),
    '[]'::jsonb
  ) as phases,

  -- === Products by phase and patient type ===
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'procedure_id', ppp.procedure_id,
      'phase_id', ppp.phase_id,
      'phase_name', ph2.name,
      'product_id', ppp.product_id,
      'product_name', pr.name,
      'patient_type_id', ppp.patient_type_id,
      'patient_type_name', pt.name
    ) ORDER BY jsonb_build_object('procedure_id', ppp.procedure_id, 'phase_id', ppp.phase_id))
    FILTER (WHERE ppp.id IS NOT NULL),
    '[]'::jsonb
  ) as procedure_phase_products,

  -- === Product details (JSONB array) ===
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'product_id', pd.product_id,
      'product_name', pr2.name,
      'objection_handling', pd.objection_handling,
      'clinical_evidence', pd.clinical_evidence,
      'pitch_points', pd.pitch_points,
      'scientific_rationale', pd.scientific_rationale,
      'embedding', pd.embedding
    ) ORDER BY jsonb_build_object('product_id', pd.product_id))
    FILTER (WHERE pd.id IS NOT NULL),
    '[]'::jsonb
  ) as product_details

FROM procedures p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN procedure_phases pp ON p.id = pp.procedure_id
LEFT JOIN phases ph ON pp.phase_id = ph.id
LEFT JOIN procedure_phase_products ppp ON p.id = ppp.procedure_id
LEFT JOIN phases ph2 ON ppp.phase_id = ph2.id
LEFT JOIN products pr ON ppp.product_id = pr.id
LEFT JOIN patient_types pt ON ppp.patient_type_id = pt.id
LEFT JOIN product_details pd ON p.id = pd.procedure_id
LEFT JOIN products pr2 ON pd.product_id = pr2.id
GROUP BY p.id, p.name, p.category_id, c.name, p.pitch_points, 
         p.patient_type, p.embedding, p.embedding_generated_at, 
         p.created_at, p.updated_at;

-- Create index on materialized view for fast lookups
CREATE INDEX idx_procedures_complete_id ON procedures_complete(id);
CREATE INDEX idx_procedures_complete_category ON procedures_complete(category_id);

-- Enable HNSW search on materialized view
CREATE INDEX idx_procedures_complete_embedding 
ON procedures_complete 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 100);

-- Grant access
GRANT SELECT ON procedures_complete TO authenticated, anon;
```

### Step 1.2.3: Create Refresh Function with Scheduling
**Action**: Automate materialized view refresh

**Script**: `sql/07_refresh_scheduler.sql`
```sql
-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_procedures_complete()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY procedures_complete;
  
  -- Log refresh (optional)
  RAISE NOTICE 'Materialized view procedures_complete refreshed at %', NOW();
END;
$$;

-- Schedule refresh every 6 hours
SELECT cron.schedule(
  'refresh-procedures-complete',
  '0 */6 * * *',  -- Every 6 hours
  'SELECT refresh_procedures_complete();'
);

-- Manual refresh command (run after data changes)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY procedures_complete;
```

**Alternative for immediate refresh after data changes**:
```sql
-- Create trigger-based refresh (use cautiously - can slow writes)
CREATE OR REPLACE FUNCTION trigger_refresh_procedures_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use pg_notify to signal app to refresh asynchronously
  PERFORM pg_notify('refresh_materialized_view', 'procedures_complete');
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_procedure_update
  AFTER INSERT OR UPDATE OR DELETE ON procedures
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_procedures_complete();
```

## Sprint 1.3: Automatic Embeddings with Edge Functions

### Step 1.3.1: Create Embedding Queue System
**Action**: Set up queue for async embedding generation

**Script**: `sql/08_embedding_queue.sql`
```sql
-- Enable pgmq extension for message queue
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create embedding jobs queue
SELECT pgmq.create('embedding_jobs');

-- Create generic trigger function to queue embedding jobs
CREATE OR REPLACE FUNCTION util.queue_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  content_function text := TG_ARGV[0];
  embedding_column text := TG_ARGV[1];
BEGIN
  -- Queue job for embedding generation
  PERFORM pgmq.send(
    queue_name => 'embedding_jobs',
    msg => jsonb_build_object(
      'id', NEW.id,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'contentFunction', content_function,
      'embeddingColumn', embedding_column,
      'timestamp', NOW()
    )
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to procedures table
CREATE TRIGGER embed_procedures_on_insert
  AFTER INSERT OR UPDATE OF name, pitch_points ON procedures
  FOR EACH ROW
  WHEN (NEW.embedding IS NULL OR OLD.name IS DISTINCT FROM NEW.name OR OLD.pitch_points IS DISTINCT FROM NEW.pitch_points)
  EXECUTE FUNCTION util.queue_embeddings('embedding_content', 'embedding');

-- Attach trigger to product_details table
CREATE TRIGGER embed_product_details_on_insert
  AFTER INSERT OR UPDATE OF clinical_evidence, pitch_points ON product_details
  FOR EACH ROW
  WHEN (NEW.embedding IS NULL OR 
        OLD.clinical_evidence IS DISTINCT FROM NEW.clinical_evidence OR 
        OLD.pitch_points IS DISTINCT FROM NEW.pitch_points)
  EXECUTE FUNCTION util.queue_embeddings('embedding_content', 'embedding');

-- Create function to extract content for embedding
CREATE OR REPLACE FUNCTION embedding_content(rec anyelement)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- For procedures: combine name + pitch_points
  IF pg_typeof(rec) = 'procedures'::regtype THEN
    RETURN COALESCE((rec).name, '') || E'\n\n' || COALESCE((rec).pitch_points, '');
  END IF;
  
  -- For product_details: combine clinical_evidence + pitch_points
  IF pg_typeof(rec) = 'product_details'::regtype THEN
    RETURN COALESCE((rec).clinical_evidence, '') || E'\n\n' || COALESCE((rec).pitch_points, '');
  END IF;
  
  RETURN '';
END;
$$;
```

### Step 1.3.2: Create Supabase Edge Function for Embeddings
**Action**: Deploy Edge Function to process embedding queue

**File**: `supabase/functions/generate-embeddings/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? ''
});

interface EmbeddingJob {
  id: number;
  schema: string;
  table: string;
  contentFunction: string;
  embeddingColumn: string;
}

serve(async (req) => {
  try {
    // Fetch jobs from queue (max 10 at a time)
    const { data: jobs, error: queueError } = await supabase.rpc('pgmq.read', {
      queue_name: 'embedding_jobs',
      vt: 30, // Visibility timeout: 30 seconds
      qty: 10  // Fetch up to 10 jobs
    });

    if (queueError) throw queueError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No jobs in queue' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const job of jobs) {
      const jobData: EmbeddingJob = job.message;
      
      try {
        // Fetch content using custom function
        const { data: rows, error: fetchError } = await supabase
          .rpc(jobData.contentFunction, { rec: jobData.id });

        if (fetchError || !rows || rows.length === 0) {
          console.error('Failed to fetch content:', fetchError);
          continue;
        }

        const content = rows[0].content;

        // Generate embedding via OpenAI
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
          dimensions: 1536
        });

        const embedding = response.data[0].embedding;

        // Update row with embedding
        const { error: updateError } = await supabase
          .from(jobData.table)
          .update({
            [jobData.embeddingColumn]: embedding,
            embedding_generated_at: new Date().toISOString(),
            embedding_model: 'text-embedding-3-small'
          })
          .eq('id', jobData.id);

        if (updateError) throw updateError;

        // Delete job from queue
        await supabase.rpc('pgmq.delete', {
          queue_name: 'embedding_jobs',
          msg_id: job.msg_id
        });

        results.push({ id: jobData.id, status: 'success' });

      } catch (error) {
        console.error(`Error processing job ${jobData.id}:`, error);
        results.push({ id: jobData.id, status: 'error', error: error.message });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
```

### Step 1.3.3: Schedule Embedding Processing
**Action**: Use pg_cron to process queue regularly

**Script**: `sql/09_schedule_embeddings.sql`
```sql
-- Create wrapper function to call Edge Function
CREATE OR REPLACE FUNCTION process_embedding_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url text := 'YOUR_EDGE_FUNCTION_URL/generate-embeddings';
  api_key text := 'YOUR_SUPABASE_ANON_KEY';
BEGIN
  -- Call Edge Function via HTTP
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule processing every 5 minutes
SELECT cron.schedule(
  'process-embedding-queue',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT process_embedding_queue();'
);
```

**Manual trigger for immediate processing**:
```bash
# Call Edge Function directly
curl -X POST 'YOUR_EDGE_FUNCTION_URL/generate-embeddings' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

# ⚛️ PHASE 2: APPLICATION REFACTORING (Weeks 3-4)

## Sprint 2.1: React Query Integration

### Step 2.1.1: Install Dependencies
```bash
npm install @tanstack/react-query@5 @tanstack/react-query-devtools@5
npm install ai @ai-sdk/openai @ai-sdk/react  # Vercel AI SDK
npm install ioredis  # For caching (if using Redis)
```

### Step 2.1.2: Configure React Query Provider
**File**: `src/providers/QueryProvider.jsx`
```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

**Update**: `src/index.js` or `src/App.js`
```javascript
import { QueryProvider } from './providers/QueryProvider';

root.render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
```

### Step 2.1.3: Create Database Service Layer
**File**: `src/services/database/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'prism-clinical-chart'
    }
  }
});

// Performance monitoring wrapper
export async function timedQuery(queryName, queryFn) {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Query: ${queryName}] Duration: ${duration}ms`);
    }
    
    // Send to monitoring service (add in Phase 4)
    if (duration > 1000) {
      console.warn(`[Slow Query: ${queryName}] ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Query Error: ${queryName}] ${duration}ms`, error);
    throw error;
  }
}
```

### Step 2.1.4: Create Query Functions
**File**: `src/services/database/queries/procedureQueries.js`
```javascript
import { supabase, timedQuery } from '../supabaseClient';

/**
 * Fetch all procedures using optimized materialized view (single query)
 * Replaces 7 parallel queries with 1 pre-computed query
 */
export async function fetchAllProcedures() {
  return timedQuery('fetchAllProcedures', async () => {
    const { data, error } = await supabase
      .from('procedures_complete')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  });
}

/**
 * Fetch single procedure by ID
 */
export async function fetchProcedureById(id) {
  return timedQuery('fetchProcedureById', async () => {
    const { data, error } = await supabase
      .from('procedures_complete')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Fetch procedures by category
 */
export async function fetchProceduresByCategory(categoryId) {
  return timedQuery('fetchProceduresByCategory', async () => {
    const { data, error } = await supabase
      .from('procedures_complete')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');

    if (error) throw error;
    return data;
  });
}

/**
 * Search procedures by text (fuzzy match)
 */
export async function searchProcedures(searchTerm) {
  return timedQuery('searchProcedures', async () => {
    const { data, error } = await supabase
      .from('procedures_complete')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(20);

    if (error) throw error;
    return data;
  });
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearchProcedures(queryEmbedding, options = {}) {
  const {
    threshold = 0.78,
    limit = 10
  } = options;

  return timedQuery('semanticSearchProcedures', async () => {
    const { data, error } = await supabase.rpc('match_procedures', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) throw error;
    return data;
  });
}

/**
 * Hybrid search (semantic + keyword)
 */
export async function hybridSearchProcedures(query, queryEmbedding, options = {}) {
  const { limit = 10 } = options;

  return timedQuery('hybridSearchProcedures', async () => {
    const { data, error } = await supabase.rpc('hybrid_search_procedures', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: limit
    });

    if (error) throw error;
    return data;
  });
}
```

### Step 2.1.5: Create React Query Hooks
**File**: `src/hooks/useProcedures.js`
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllProcedures,
  fetchProcedureById,
  fetchProceduresByCategory,
  searchProcedures
} from '../services/database/queries/procedureQueries';

// Query keys (centralized for cache invalidation)
export const procedureKeys = {
  all: ['procedures'],
  lists: () => [...procedureKeys.all, 'list'],
  list: (filters) => [...procedureKeys.lists(), filters],
  details: () => [...procedureKeys.all, 'detail'],
  detail: (id) => [...procedureKeys.details(), id],
  search: (term) => [...procedureKeys.all, 'search', term],
};

/**
 * Hook to fetch all procedures
 * Uses materialized view for 10x performance improvement
 */
export function useProcedures(options = {}) {
  return useQuery({
    queryKey: procedureKeys.lists(),
    queryFn: fetchAllProcedures,
    staleTime: 10 * 60 * 1000, // 10 minutes (data changes infrequently)
    ...options,
  });
}

/**
 * Hook to fetch single procedure by ID
 */
export function useProcedure(id, options = {}) {
  return useQuery({
    queryKey: procedureKeys.detail(id),
    queryFn: () => fetchProcedureById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Hook to fetch procedures by category
 */
export function useProceduresByCategory(categoryId, options = {}) {
  return useQuery({
    queryKey: procedureKeys.list({ categoryId }),
    queryFn: () => fetchProceduresByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to search procedures (debounced)
 */
export function useSearchProcedures(searchTerm, options = {}) {
  return useQuery({
    queryKey: procedureKeys.search(searchTerm),
    queryFn: () => searchProcedures(searchTerm),
    enabled: searchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook for optimistic updates (for admin panel)
 */
export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('procedures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: procedureKeys.detail(id) });

      // Snapshot previous value
      const previous = queryClient.getQueryData(procedureKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(procedureKeys.detail(id), (old) => ({
        ...old,
        ...updates,
      }));

      return { previous };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(procedureKeys.detail(id), context.previous);
      }
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: procedureKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: procedureKeys.lists() });
    },
  });
}
```

### Step 2.1.6: Update Components to Use Hooks
**Example**: Update `ClinicalChartMockup.js`

**Before** (7 parallel queries):
```javascript
// OLD CODE - DO NOT USE
useEffect(() => {
  const fetchData = async () => {
    const [procedures, phases, products, ...] = await Promise.all([
      supabase.from('procedures').select('*'),
      supabase.from('phases').select('*'),
      supabase.from('products').select('*'),
      // ... 4 more queries
    ]);
    // Complex data transformation logic
  };
  fetchData();
}, []);
```

**After** (1 optimized query):
```javascript
import { useProcedures } from '../hooks/useProcedures';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';

function ClinicalChartMockup() {
  const { data: procedures, isLoading, error } = useProcedures();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ErrorBoundary>
      <div className="clinical-chart">
        {procedures.map(procedure => (
          <ProcedureCard key={procedure.id} procedure={procedure} />
        ))}
      </div>
    </ErrorBoundary>
  );
}
```

## Sprint 2.2: Data Transformation Layer

### Step 2.2.1: Create Transformers
**File**: `src/services/database/transformers/procedureTransformer.js`
```javascript
/**
 * Transform database format to application format
 * Handles JSONB parsing and data normalization
 */
export function transformProcedure(dbProcedure) {
  if (!dbProcedure) return null;

  return {
    id: dbProcedure.id,
    name: dbProcedure.name,
    categoryId: dbProcedure.category_id,
    categoryName: dbProcedure.category_name,
    pitchPoints: parsePitchPoints(dbProcedure.pitch_points),
    patientType: dbProcedure.patient_type,
    
    // Parse JSONB arrays
    phases: Array.isArray(dbProcedure.phases) 
      ? dbProcedure.phases 
      : [],
    
    products: Array.isArray(dbProcedure.procedure_phase_products)
      ? groupProductsByPhase(dbProcedure.procedure_phase_products)
      : {},
    
    productDetails: Array.isArray(dbProcedure.product_details)
      ? transformProductDetails(dbProcedure.product_details)
      : [],
    
    // AI/RAG metadata
    hasEmbedding: !!dbProcedure.embedding,
    embeddingGeneratedAt: dbProcedure.embedding_generated_at,
    
    createdAt: dbProcedure.created_at,
    updatedAt: dbProcedure.updated_at,
  };
}

/**
 * Parse pitch points from text or array
 */
function parsePitchPoints(pitchPoints) {
  if (!pitchPoints) return [];
  if (Array.isArray(pitchPoints)) return pitchPoints;
  if (typeof pitchPoints === 'string') {
    return pitchPoints.split('\n').filter(p => p.trim());
  }
  return [];
}

/**
 * Group products by phase for easier UI rendering
 */
function groupProductsByPhase(products) {
  return products.reduce((acc, product) => {
    const phaseId = product.phase_id;
    if (!acc[phaseId]) {
      acc[phaseId] = {
        phaseName: product.phase_name,
        products: []
      };
    }
    acc[phaseId].products.push({
      id: product.product_id,
      name: product.product_name,
      patientType: product.patient_type_name,
    });
    return acc;
  }, {});
}

/**
 * Transform product details with additional metadata
 */
function transformProductDetails(details) {
  return details.map(detail => ({
    productId: detail.product_id,
    productName: detail.product_name,
    objectionHandling: detail.objection_handling,
    clinicalEvidence: detail.clinical_evidence,
    pitchPoints: parsePitchPoints(detail.pitch_points),
    scientificRationale: detail.scientific_rationale,
    hasEmbedding: !!detail.embedding,
  }));
}

/**
 * Transform multiple procedures
 */
export function transformProcedures(dbProcedures) {
  if (!Array.isArray(dbProcedures)) return [];
  return dbProcedures.map(transformProcedure);
}
```

### Step 2.2.2: Update Hooks to Use Transformers
```javascript
// src/hooks/useProcedures.js
import { transformProcedures, transformProcedure } from '../services/database/transformers/procedureTransformer';

export function useProcedures(options = {}) {
  return useQuery({
    queryKey: procedureKeys.lists(),
    queryFn: async () => {
      const data = await fetchAllProcedures();
      return transformProcedures(data);  // Transform before caching
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useProcedure(id, options = {}) {
  return useQuery({
    queryKey: procedureKeys.detail(id),
    queryFn: async () => {
      const data = await fetchProcedureById(id);
      return transformProcedure(data);  // Transform before caching
    },
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}
```

---

# 🤖 PHASE 3: AI/RAG INTEGRATION (Week 5)

## Sprint 3.1: Embedding Generation

### Step 3.1.1: Create Embedding Service
**File**: `src/services/ai/embeddingService.js`
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: false  // Use backend proxy in production
});

// In-memory cache for embeddings (production: use Redis)
const embeddingCache = new Map();

/**
 * Generate embedding for text with caching
 * Uses text-embedding-3-small (1536 dimensions, optimal cost/performance)
 */
export async function generateEmbedding(text, options = {}) {
  const {
    model = 'text-embedding-3-small',
    dimensions = 1536,
    useCache = true
  } = options;

  // Check cache
  const cacheKey = `${model}:${text}`;
  if (useCache && embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  try {
    const response = await openai.embeddings.create({
      model,
      input: text,
      dimensions
    });

    const embedding = response.data[0].embedding;

    // Cache result
    if (useCache) {
      embeddingCache.set(cacheKey, embedding);
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * More efficient than individual calls
 */
export async function generateEmbeddings(texts, options = {}) {
  const {
    model = 'text-embedding-3-small',
    dimensions = 1536,
    batchSize = 100  // OpenAI limit
  } = options;

  const results = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await openai.embeddings.create({
      model,
      input: batch,
      dimensions
    });

    results.push(...response.data.map(d => d.embedding));
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1, embedding2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Chunk text into optimal sizes for embedding (400-500 tokens)
 */
export function chunkText(text, options = {}) {
  const {
    maxChunkSize = 500,  // characters
    overlap = 100        // character overlap between chunks
  } = options;

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}
```

### Step 3.1.2: Create Backend Proxy for Embeddings (Security Best Practice)
**File**: `src/api/embeddings.js` (if using Express backend)
```javascript
// Backend API route (NOT in React app)
import express from 'express';
import OpenAI from 'openai';
import Redis from 'ioredis';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = new Redis(process.env.REDIS_URL);

// POST /api/embeddings/generate
router.post('/generate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text input' });
    }

    // Check Redis cache first
    const cacheKey = `embedding:${text}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ embedding: JSON.parse(cached), cached: true });
    }

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });

    const embedding = response.data[0].embedding;

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(embedding));

    res.json({ embedding, cached: false });

  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

export default router;
```

### Step 3.1.3: Bulk Generate Embeddings for Existing Data
**File**: `scripts/generate-all-embeddings.js`
```javascript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import 'dotenv/config';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role key
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAllEmbeddings() {
  console.log('Starting embedding generation...');

  // Fetch all procedures without embeddings
  const { data: procedures, error } = await supabase
    .from('procedures')
    .select('id, name, pitch_points')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching procedures:', error);
    return;
  }

  console.log(`Found ${procedures.length} procedures without embeddings`);

  let processed = 0;
  let errors = 0;

  // Process in batches of 10 (avoid rate limits)
  for (let i = 0; i < procedures.length; i += 10) {
    const batch = procedures.slice(i, i + 10);

    await Promise.all(batch.map(async (procedure) => {
      try {
        // Combine name + pitch_points for embedding
        const content = `${procedure.name}\n\n${procedure.pitch_points || ''}`;

        // Generate embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
          dimensions: 1536
        });

        const embedding = response.data[0].embedding;

        // Update database
        const { error: updateError } = await supabase
          .from('procedures')
          .update({
            embedding: embedding,
            embedding_generated_at: new Date().toISOString(),
            embedding_model: 'text-embedding-3-small'
          })
          .eq('id', procedure.id);

        if (updateError) throw updateError;

        processed++;
        console.log(`✓ Processed ${procedure.name} (${processed}/${procedures.length})`);

      } catch (error) {
        errors++;
        console.error(`✗ Error processing ${procedure.name}:`, error.message);
      }
    }));

    // Wait 1 second between batches (respect rate limits)
    if (i + 10 < procedures.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total: ${procedures.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
}

generateAllEmbeddings()
  .then(() => {
    console.log('Embedding generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
```

**Run script**:
```bash
node scripts/generate-all-embeddings.js
```

## Sprint 3.2: RAG Implementation with Vercel AI SDK

### Step 3.2.1: Install Vercel AI SDK
```bash
npm install ai @ai-sdk/openai @ai-sdk/react
```

### Step 3.2.2: Create RAG Service
**File**: `src/services/ai/ragService.js`
```javascript
import { generateEmbedding } from './embeddingService';
import { supabase } from '../database/supabaseClient';

/**
 * Semantic cache for RAG queries (in-memory, production: use Redis)
 */
const semanticCache = new Map();

/**
 * Retrieve relevant procedures using hybrid search
 * Combines semantic (vector) and keyword (full-text) search
 */
export async function retrieveRelevantProcedures(query, options = {}) {
  const {
    limit = 5,
    threshold = 0.78,
    useCache = true
  } = options;

  // Check semantic cache (finds similar queries)
  if (useCache) {
    for (const [cachedQuery, cachedResults] of semanticCache.entries()) {
      // Simple similarity check (production: use embedding comparison)
      if (querySimilarity(query, cachedQuery) > 0.9) {
        console.log('✓ Semantic cache hit');
        return cachedResults;
      }
    }
  }

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Hybrid search (semantic + keyword)
    const { data, error } = await supabase.rpc('hybrid_search_procedures', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: limit
    });

    if (error) throw error;

    // Cache results
    if (useCache && data.length > 0) {
      semanticCache.set(query, data);
      
      // Limit cache size
      if (semanticCache.size > 100) {
        const firstKey = semanticCache.keys().next().value;
        semanticCache.delete(firstKey);
      }
    }

    return data;

  } catch (error) {
    console.error('Error retrieving procedures:', error);
    
    // Fallback to keyword search only
    const { data } = await supabase
      .from('procedures_complete')
      .select('*')
      .textSearch('name', query)
      .limit(limit);

    return data || [];
  }
}

/**
 * Simple query similarity (production: use embedding comparison)
 */
function querySimilarity(query1, query2) {
  const words1 = new Set(query1.toLowerCase().split(' '));
  const words2 = new Set(query2.toLowerCase().split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;  // Jaccard similarity
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(procedures) {
  return procedures.map((proc, idx) => {
    return `
[${idx + 1}] **${proc.name}** (${proc.category_name})
Pitch Points: ${Array.isArray(proc.pitch_points) ? proc.pitch_points.join(', ') : proc.pitch_points || 'N/A'}
Relevance: ${(proc.combined_score * 100).toFixed(1)}%

---
    `.trim();
  }).join('\n\n');
}

/**
 * Create RAG system prompt
 */
export function createRAGSystemPrompt() {
  return `You are a clinical dental assistant helping dental professionals recommend products and procedures.

CRITICAL RULES:
1. Answer ONLY using the provided context below
2. If the context doesn't contain relevant information, say "I don't have enough information to answer that"
3. Always cite sources using [1], [2], etc. based on the context numbering
4. Be concise and accurate
5. Focus on clinical evidence and practical recommendations

Your answers should be:
- Evidence-based and clinically sound
- Practical for dental professionals
- Clear about which specific procedures/products you're referencing
- Honest when information is insufficient`;
}

/**
 * Complete RAG query (retrieve + generate)
 */
export async function ragQuery(userQuery, options = {}) {
  const {
    retrievalOptions = {},
    systemPrompt = createRAGSystemPrompt()
  } = options;

  // Step 1: Retrieve relevant context
  const relevantProcedures = await retrieveRelevantProcedures(userQuery, retrievalOptions);

  if (relevantProcedures.length === 0) {
    return {
      answer: "I couldn't find any relevant procedures in the database for your query.",
      sources: [],
      cached: false
    };
  }

  // Step 2: Format context
  const context = formatContextForPrompt(relevantProcedures);

  // Step 3: Return context and sources (generation happens in component using Vercel AI SDK)
  return {
    context,
    sources: relevantProcedures,
    systemPrompt
  };
}
```

### Step 3.2.3: Create Chat Component with Streaming
**File**: `src/components/AI/RAGChatInterface.jsx`
```javascript
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { ragQuery } from '../../services/ai/ragService';

export function RAGChatInterface() {
  const [context, setContext] = useState(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      console.log('Response complete:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    body: {
      context: context?.context,
      systemPrompt: context?.systemPrompt
    }
  });

  const handleRAGSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Retrieve context before submitting to chat
    const ragContext = await ragQuery(input);
    setContext(ragContext);

    // Submit to chat API
    handleSubmit(e);
  };

  return (
    <div className="rag-chat-container">
      {/* Chat Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-role">
              {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            Error: {error.message}
          </div>
        )}
      </div>

      {/* Sources Panel */}
      {context?.sources && context.sources.length > 0 && (
        <div className="sources-panel">
          <h3>📚 Sources</h3>
          {context.sources.map((source, idx) => (
            <div key={idx} className="source-card">
              <span className="source-number">[{idx + 1}]</span>
              <span className="source-name">{source.name}</span>
              <span className="source-relevance">
                {(source.combined_score * 100).toFixed(0)}% match
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleRAGSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about dental procedures..."
          disabled={isLoading}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

### Step 3.2.4: Create API Route for Chat (Next.js or Express)
**File**: `pages/api/chat.js` (Next.js) or `routes/chat.js` (Express)

**Next.js Example**:
```javascript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, context, systemPrompt } = await req.json();

    // Add context to the last user message
    const messagesWithContext = [...messages];
    if (context && messagesWithContext.length > 0) {
      const lastMessage = messagesWithContext[messagesWithContext.length - 1];
      lastMessage.content = `CONTEXT:\n${context}\n\nQUESTION: ${lastMessage.content}`;
    }

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt || 'You are a helpful assistant.',
      messages: messagesWithContext,
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Step 3.2.5: Add Model Routing for Cost Optimization
**File**: `src/services/ai/modelRouter.js`
```javascript
/**
 * Intelligent model routing for cost optimization
 * Routes simple queries to cheaper models (40-70% cost savings)
 */
export function selectOptimalModel(query, options = {}) {
  const { forceModel } = options;
  
  if (forceModel) return forceModel;

  // Analyze query complexity
  const complexity = analyzeQueryComplexity(query);

  // Route based on complexity
  if (complexity === 'simple') {
    return 'gpt-3.5-turbo';  // $0.50 / 1M tokens
  } else if (complexity === 'medium') {
    return 'gpt-4-turbo';  // $10 / 1M tokens (input)
  } else {
    return 'gpt-4-turbo';  // For complex reasoning
  }
}

/**
 * Analyze query complexity
 */
function analyzeQueryComplexity(query) {
  const wordCount = query.split(/\s+/).length;
  const hasComparison = /compare|versus|vs|difference|better/i.test(query);
  const hasMultipleConcepts = /and|also|plus|additionally/i.test(query);
  const questionWords = /how|why|explain|describe|analyze/i.test(query);

  // Simple: Short queries with no comparisons
  if (wordCount < 10 && !hasComparison && !hasMultipleConcepts) {
    return 'simple';
  }

  // Complex: Multi-concept, comparison, or deep reasoning
  if (hasComparison || (hasMultipleConcepts && questionWords)) {
    return 'complex';
  }

  return 'medium';
}

/**
 * Usage in API route
 */
export function getModelConfig(query) {
  const model = selectOptimalModel(query);
  
  return {
    model,
    temperature: model === 'gpt-3.5-turbo' ? 0.5 : 0.7,
    maxTokens: model === 'gpt-3.5-turbo' ? 500 : 1000
  };
}
```

---

# 🧪 PHASE 4: TESTING & OBSERVABILITY (Week 6)

## Sprint 4.1: Testing Infrastructure

### Step 4.1.1: Install Testing Dependencies
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev msw  # Mock Service Worker for API mocking
```

### Step 4.1.2: Configure Vitest
**File**: `vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/index.js'
      ]
    }
  }
});
```

### Step 4.1.3: Create Test Utilities
**File**: `src/test/setup.js`
```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

**File**: `src/test/test-utils.jsx`
```javascript
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
export function renderWithProviders(ui, options = {}) {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';
```

### Step 4.1.4: Write Unit Tests for Query Functions
**File**: `src/services/database/queries/procedureQueries.test.js`
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllProcedures, fetchProcedureById } from './procedureQueries';
import { supabase } from '../supabaseClient';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  },
  timedQuery: vi.fn((name, fn) => fn())
}));

describe('procedureQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllProcedures', () => {
    it('should fetch all procedures from materialized view', async () => {
      const mockData = [
        { id: 1, name: 'Root Canal', category_id: 1 },
        { id: 2, name: 'Crown Prep', category_id: 1 }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await fetchAllProcedures();

      expect(supabase.from).toHaveBeenCalledWith('procedures_complete');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockData);
    });

    it('should throw error when query fails', async () => {
      const mockError = new Error('Database connection failed');

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError })
        })
      });

      await expect(fetchAllProcedures()).rejects.toThrow('Database connection failed');
    });
  });

  describe('fetchProcedureById', () => {
    it('should fetch single procedure by ID', async () => {
      const mockData = { id: 1, name: 'Root Canal', category_id: 1 };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await fetchProcedureById(1);

      expect(supabase.from).toHaveBeenCalledWith('procedures_complete');
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockData);
    });
  });
});
```

### Step 4.1.5: Write Integration Tests for Hooks
**File**: `src/hooks/useProcedures.test.js`
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProcedures, useProcedure } from './useProcedures';
import * as queries from '../services/database/queries/procedureQueries';

// Mock query functions
vi.mock('../services/database/queries/procedureQueries');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useProcedures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and cache procedures', async () => {
    const mockData = [
      { id: 1, name: 'Root Canal' },
      { id: 2, name: 'Crown Prep' }
    ];

    queries.fetchAllProcedures.mockResolvedValue(mockData);

    const { result } = renderHook(() => useProcedures(), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].name).toBe('Root Canal');
  });

  it('should handle errors gracefully', async () => {
    queries.fetchAllProcedures.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProcedures(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error.message).toBe('Network error');
  });
});

describe('useProcedure', () => {
  it('should fetch single procedure by ID', async () => {
    const mockData = { id: 1, name: 'Root Canal', category_id: 1 };

    queries.fetchProcedureById.mockResolvedValue(mockData);

    const { result } = renderHook(() => useProcedure(1), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.name).toBe('Root Canal');
  });

  it('should not fetch when ID is null', () => {
    const { result } = renderHook(() => useProcedure(null), {
      wrapper: createWrapper()
    });

    expect(result.current.isFetching).toBe(false);
    expect(queries.fetchProcedureById).not.toHaveBeenCalled();
  });
});
```

### Step 4.1.6: Write E2E Tests for Critical Flows
**File**: `src/test/e2e/clinical-chart.test.jsx`
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { ClinicalChartMockup } from '../../components/ClinicalChartMockup';
import * as queries from '../../services/database/queries/procedureQueries';

// Mock queries
vi.mock('../../services/database/queries/procedureQueries');

describe('Clinical Chart E2E', () => {
  const mockProcedures = [
    {
      id: 1,
      name: 'Root Canal',
      categoryName: 'Endodontics',
      phases: [{ id: 1, name: 'Diagnosis' }],
      products: {}
    }
  ];

  beforeEach(() => {
    queries.fetchAllProcedures.mockResolvedValue(mockProcedures);
  });

  it('should load and display procedures', async () => {
    renderWithProviders(<ClinicalChartMockup />);

    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for procedures to load
    const procedureName = await screen.findByText('Root Canal');
    expect(procedureName).toBeInTheDocument();
  });

  it('should filter procedures by search', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ClinicalChartMockup />);

    await screen.findByText('Root Canal');

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Crown');

    // Should filter results
    expect(screen.queryByText('Root Canal')).not.toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    queries.fetchAllProcedures.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<ClinicalChartMockup />);

    // Should show error message
    const errorMessage = await screen.findByText(/error/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
```

## Sprint 4.2: Observability & Monitoring

### Step 4.2.1: Install LangSmith or LangFuse
```bash
npm install langsmith  # For LangChain-based implementations
# OR
npm install langfuse   # For framework-agnostic monitoring
```

### Step 4.2.2: Configure LangSmith
**File**: `src/services/ai/monitoring.js`
```javascript
import { Client } from 'langsmith';

const langsmithClient = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
  apiUrl: process.env.LANGSMITH_API_URL || 'https://api.smith.langchain.com'
});

/**
 * Track RAG query performance
 */
export async function trackRAGQuery(data) {
  const {
    query,
    retrievedDocs,
    response,
    duration,
    tokensUsed,
    model,
    cached = false
  } = data;

  try {
    await langsmithClient.createRun({
      name: 'rag_query',
      run_type: 'chain',
      inputs: { query },
      outputs: { response, retrievedDocs: retrievedDocs.length },
      extra: {
        metadata: {
          model,
          tokensUsed,
          duration,
          cached,
          retrievalCount: retrievedDocs.length
        }
      }
    });
  } catch (error) {
    console.error('Error tracking with LangSmith:', error);
  }
}

/**
 * Track embedding generation
 */
export async function trackEmbeddingGeneration(data) {
  const {
    text,
    model,
    duration,
    cached = false
  } = data;

  try {
    await langsmithClient.createRun({
      name: 'generate_embedding',
      run_type: 'llm',
      inputs: { text: text.substring(0, 100) + '...' },
      extra: {
        metadata: {
          model,
          duration,
          cached,
          textLength: text.length
        }
      }
    });
  } catch (error) {
    console.error('Error tracking embedding:', error);
  }
}

/**
 * Track query performance metrics
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      queries: [],
      embeddings: [],
      ragQueries: []
    };
  }

  recordQuery(name, duration, success = true) {
    this.metrics.queries.push({
      name,
      duration,
      success,
      timestamp: Date.now()
    });

    // Keep only last 100 queries
    if (this.metrics.queries.length > 100) {
      this.metrics.queries.shift();
    }

    // Log slow queries
    if (duration > 1000) {
      console.warn(`[Slow Query] ${name}: ${duration}ms`);
    }
  }

  getAverageQueryTime() {
    if (this.metrics.queries.length === 0) return 0;
    
    const total = this.metrics.queries.reduce((sum, q) => sum + q.duration, 0);
    return total / this.metrics.queries.length;
  }

  getSlowQueries(threshold = 1000) {
    return this.metrics.queries.filter(q => q.duration > threshold);
  }

  getMetricsSummary() {
    return {
      totalQueries: this.metrics.queries.length,
      averageQueryTime: this.getAverageQueryTime(),
      slowQueries: this.getSlowQueries().length,
      successRate: this.metrics.queries.filter(q => q.success).length / this.metrics.queries.length
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

### Step 4.2.3: Add Error Boundaries
**File**: `src/components/ErrorBoundary.jsx`
```javascript
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 Something went wrong</h2>
            <p>We're sorry for the inconvenience. Please try refreshing the page.</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                <summary>Error Details (Development Only)</summary>
                <p>{this.state.error?.toString()}</p>
                <p>{this.state.errorInfo?.componentStack}</p>
              </details>
            )}
            
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 4.2.4: Create Monitoring Dashboard Component
**File**: `src/components/Admin/MonitoringDashboard.jsx`
```javascript
import { useState, useEffect } from 'react';
import { performanceMonitor } from '../../services/ai/monitoring';

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetricsSummary());
    }, 5000);  // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading metrics...</div>;

  return (
    <div className="monitoring-dashboard">
      <h2>📊 Performance Metrics</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Queries</h3>
          <div className="metric-value">{metrics.totalQueries}</div>
        </div>

        <div className="metric-card">
          <h3>Average Query Time</h3>
          <div className="metric-value">{metrics.averageQueryTime.toFixed(2)}ms</div>
        </div>

        <div className="metric-card">
          <h3>Slow Queries</h3>
          <div className="metric-value">{metrics.slowQueries}</div>
        </div>

        <div className="metric-card">
          <h3>Success Rate</h3>
          <div className="metric-value">
            {(metrics.successRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="slow-queries-list">
        <h3>⚠️ Recent Slow Queries (>1s)</h3>
        <table>
          <thead>
            <tr>
              <th>Query Name</th>
              <th>Duration</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {performanceMonitor.getSlowQueries().map((query, idx) => (
              <tr key={idx}>
                <td>{query.name}</td>
                <td>{query.duration}ms</td>
                <td>{new Date(query.timestamp).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

# 📚 PHASE 5: DOCUMENTATION (Week 7)

## Sprint 5.1: Technical Documentation

### Step 5.1.1: Create Comprehensive README
**File**: `docs/README.md`

```markdown
# PRISM Clinical Chart - Technical Documentation

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + Vite
- **State Management**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL 15 + pgvector)
- **Vector Search**: pgvector with HNSW indexes
- **AI/LLM**: OpenAI GPT-4 Turbo + text-embedding-3-small
- **Streaming**: Vercel AI SDK v5
- **Caching**: Redis (3-tier architecture)
- **Monitoring**: LangSmith or LangFuse

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Components   │  │ Vercel AI SDK│  │ React Query  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                  API Layer (Next.js/Express)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Chat API     │  │ Embeddings   │  │ Monitoring   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
┌───────▼────────┐                 ┌──────────▼──────────┐
│   Supabase     │                 │   OpenAI API        │
│  ┌──────────┐  │                 │  ┌──────────────┐  │
│  │PostgreSQL│  │                 │  │ GPT-4 Turbo  │  │
│  │+ pgvector│  │                 │  │ Embeddings   │  │
│  └──────────┘  │                 │  └──────────────┘  │
└────────────────┘                 └─────────────────────┘
```

### Database Schema

#### Materialized View: `procedures_complete`
Pre-computed view combining all procedure data with related entities.

**Columns**:
- `id`, `name`, `category_id`, `category_name`
- `pitch_points` (text array)
- `embedding` (vector(1536))
- `phases` (JSONB array)
- `procedure_phase_products` (JSONB array)
- `product_details` (JSONB array)

**Indexes**:
- HNSW index on `embedding` for fast vector search
- B-tree indexes on `id` and `category_id`

**Refresh Strategy**: Every 6 hours via pg_cron

#### Vector Search Functions

##### `match_procedures(query_embedding, match_threshold, match_count)`
Semantic search using cosine similarity.

**Parameters**:
- `query_embedding`: vector(1536)
- `match_threshold`: float (default 0.78)
- `match_count`: int (default 10)

**Returns**: Procedures with similarity scores above threshold

##### `hybrid_search_procedures(query_text, query_embedding, match_count)`
Combines semantic (vector) and keyword (full-text) search using Reciprocal Rank Fusion.

**Parameters**:
- `query_text`: text for keyword search
- `query_embedding`: vector(1536) for semantic search
- `match_count`: int (default 10)

**Returns**: Procedures ranked by combined score (0.7 semantic + 0.3 keyword)

### Performance Benchmarks

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Page load | 2-5s | 0.2-0.5s | **10x faster** |
| Database queries | 7+ | 1 | **7x fewer** |
| Code size | 1862 lines | ~700 lines | **60% reduction** |
| Query success rate | ~70% | 99.9% | **Highly reliable** |
| Vector search | N/A | 0.5-3ms | **Sub-millisecond** |
| RAG response time | N/A | 1-3s | **Production-ready** |

### Cost Optimization

#### Semantic Caching
**Savings**: 60-80% reduction in API costs

Implementation:
- Embedding cache (in-memory LRU)
- Retrieval cache (Redis, 1-hour TTL)
- Answer cache (semantic similarity matching)

#### Model Routing
**Savings**: 40-70% reduction through intelligent routing

Strategy:
- Simple queries → GPT-3.5 Turbo ($0.50/1M tokens)
- Complex queries → GPT-4 Turbo ($10/1M tokens)
- Classification based on word count, complexity, comparisons

### AI/RAG Features

#### Retrieval Strategy
**Hybrid Search** (production standard):
- 70% semantic (vector similarity)
- 30% keyword (BM25 full-text)
- Reciprocal Rank Fusion for result merging

#### Context Management
- **Chunk size**: 400-500 tokens (optimal for retrieval)
- **Overlap**: 10-20% between chunks
- **Top-K retrieval**: 5 documents (balance precision/context)
- **Similarity threshold**: 0.78 (filters low-relevance results)

#### Prompt Engineering
System prompt enforces:
- Answer only from provided context
- Cite sources using [1], [2] notation
- Admit insufficient information when relevant
- Focus on clinical evidence and practical recommendations

### Deployment

#### Environment Variables
```bash
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Backend only

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Redis (optional, for production caching)
REDIS_URL=your_redis_url

# Monitoring
LANGSMITH_API_KEY=your_langsmith_key  # Optional
```

#### Build & Deploy
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel deploy
```

### Monitoring & Observability

#### LangSmith Integration
Tracks:
- Query duration (P50/P95/P99)
- Token usage and costs
- Cache hit rates
- Error rates by model
- User satisfaction scores

#### Performance Monitoring
Built-in `PerformanceMonitor` class tracks:
- Average query time
- Slow queries (>1s)
- Success rate
- Error patterns

Access at: `/admin/monitoring`

### Security

#### Row Level Security (RLS)
All tables enforce RLS policies:
- Users access only their own data
- Admin users have elevated permissions
- Service role bypasses RLS for background jobs

#### API Key Management
- Never expose service role keys in frontend
- Use environment variables for all secrets
- Rotate keys quarterly
- Separate keys for prod/staging

### Maintenance

#### Daily
- Monitor error rates in production
- Check OpenAI API usage (cost tracking)
- Review slow queries

#### Weekly
- Review and optimize slow queries
- Check database performance metrics
- Analyze user feedback

#### Monthly
- Refresh materialized views (automated via pg_cron)
- Update embeddings for new/modified procedures
- Review and optimize API costs
- Security patches and dependency updates

### Troubleshooting

#### Common Issues

**Slow query performance**
- Check HNSW index exists: `SELECT * FROM pg_indexes WHERE indexname LIKE '%embedding%';`
- Verify materialized view is refreshed: `SELECT max(updated_at) FROM procedures_complete;`
- Analyze query plan: `EXPLAIN ANALYZE SELECT ...`

**Embedding generation failures**
- Check OpenAI API key is valid
- Verify queue is processing: `SELECT count(*) FROM pgmq.read('embedding_jobs', 30, 10);`
- Review Edge Function logs in Supabase dashboard

**Cache miss rate high**
- Increase Redis memory allocation
- Extend cache TTL (currently 1 hour)
- Implement semantic cache with embedding comparison

### Future Enhancements

- [ ] Fine-tune embeddings on clinical dental data (5-10% accuracy improvement)
- [ ] Add reranking with cross-encoder (10-15% precision boost)
- [ ] Implement agentic workflows using LangGraph
- [ ] Multi-modal support (process images, charts, diagrams)
- [ ] Continuous evaluation with RAGAS metrics
- [ ] Edge deployment for latency-sensitive queries
```

---

# 🚀 PHASE 6: GRADUAL ROLLOUT (Week 8)

## Sprint 6.1: Staging Deployment

### Step 6.1.1: Deploy to Staging Environment
```bash
# Apply all database migrations to staging
psql $STAGING_DATABASE_URL < sql/01_enable_pgvector.sql
psql $STAGING_DATABASE_URL < sql/02_add_vector_columns.sql
psql $STAGING_DATABASE_URL < sql/03_create_vector_indexes.sql
# ... apply remaining SQL scripts

# Generate embeddings for staging data
node scripts/generate-all-embeddings.js --env=staging

# Deploy application to staging
npm run build
# Deploy to staging server (e.g., Vercel preview)
vercel deploy --env=staging
```

### Step 6.1.2: Staging Testing Checklist

#### Functional Tests
- [ ] All procedures load correctly from materialized view
- [ ] Search functionality works (keyword + semantic)
- [ ] Admin panel CRUD operations work
- [ ] Embedding generation triggers on data changes
- [ ] RAG chat interface responds correctly
- [ ] Sources are cited properly in responses

#### Performance Tests
- [ ] Page load < 500ms
- [ ] Vector search < 100ms
- [ ] RAG response < 3s
- [ ] No infinite loading states
- [ ] Proper loading indicators

#### Error Handling
- [ ] Graceful fallbacks for failed queries
- [ ] Error boundaries catch component errors
- [ ] Network errors display user-friendly messages
- [ ] Cache invalidation works correctly

#### AI/RAG Tests
- [ ] Semantic search returns relevant results
- [ ] Hybrid search combines semantic + keyword correctly
- [ ] RAG responses are accurate and cite sources
- [ ] Model routing selects appropriate models
- [ ] Semantic caching reduces duplicate API calls

### Step 6.1.3: User Acceptance Testing (UAT)
Invite 3-5 beta users for testing:

**Test Scenarios**:
1. Search for a specific procedure
2. Browse procedures by category
3. Ask RAG chatbot clinical questions
4. Verify source citations are accurate
5. Test on mobile devices

**Feedback Collection**:
- Response time (subjective)
- Answer accuracy (clinical correctness)
- UI/UX issues
- Feature requests

## Sprint 6.2: Production Deployment

### Step 6.2.1: Pre-Deployment Checklist

#### Database Backup
```bash
# Backup production database
pg_dump $PRODUCTION_DATABASE_URL > backup-$(date +%Y%m%d).sql
```

#### Final Code Review
- [ ] All tests passing
- [ ] No console.log statements in production
- [ ] Environment variables configured
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Monitoring dashboard accessible

### Step 6.2.2: Production Migration

**Step 1: Database Schema Updates**
```bash
# Apply migrations during low-traffic window
psql $PRODUCTION_DATABASE_URL < sql/01_enable_pgvector.sql
psql $PRODUCTION_DATABASE_URL < sql/02_add_vector_columns.sql
# ... continue with remaining migrations

# Verify migrations
psql $PRODUCTION_DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
psql $PRODUCTION_DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE indexname LIKE '%embedding%';"
```

**Step 2: Generate Production Embeddings**
```bash
# Generate embeddings for all existing data
node scripts/generate-all-embeddings.js --env=production

# Monitor progress
tail -f embedding-generation.log
```

**Step 3: Deploy Application**
```bash
# Build production bundle
npm run build

# Deploy to production
vercel deploy --prod
```

**Step 4: Verify Deployment**
```bash
# Run smoke tests
npm run test:e2e --env=production

# Check application health
curl https://your-domain.com/api/health
```

### Step 6.2.3: Post-Deployment Monitoring (First 24 Hours)

#### Hour 1-4: Critical Monitoring
- [ ] Application loads correctly
- [ ] No 500 errors in logs
- [ ] Database connections stable
- [ ] API response times within SLA
- [ ] No spike in error rate

#### Hour 4-12: Performance Monitoring
- [ ] Average query time < 500ms
- [ ] Cache hit rate > 60%
- [ ] API costs tracking as expected
- [ ] No memory leaks (check server metrics)

#### Hour 12-24: User Feedback
- [ ] Collect user feedback
- [ ] Monitor support tickets
- [ ] Review error logs
- [ ] Check for edge cases

### Step 6.2.4: Rollback Plan (If Issues Occur)

**Database Rollback**:
```bash
# Restore from backup
psql $PRODUCTION_DATABASE_URL < backup-20251031.sql
```

**Application Rollback**:
```bash
# Revert to previous deployment
vercel rollback
```

---

# 📊 SUCCESS METRICS

## Performance Metrics
- ✅ **Page load time**: <500ms (target: 200-500ms)
- ✅ **Query success rate**: >99% (target: 99.9%)
- ✅ **Semantic search time**: <100ms
- ✅ **RAG response time**: <3s
- ✅ **Vector search recall**: >85% at threshold 0.78

## Code Quality Metrics
- ✅ **Code size reduction**: >50% (target: 60%)
- ✅ **Test coverage**: >80%
- ✅ **Zero console errors** in production
- ✅ **All tests passing** before deployment

## AI/RAG Metrics
- ✅ **Embedding generation**: <1 hour for full dataset
- ✅ **Semantic search accuracy**: >85%
- ✅ **RAG answer relevance**: >90%
- ✅ **Source citation accuracy**: 100%

## Cost Metrics
- ✅ **OpenAI API cost**: <$200/month for 10k queries
- ✅ **Database storage**: <1GB increase for embeddings
- ✅ **Caching effectiveness**: 60-80% API cost reduction

## User Experience Metrics
- ✅ **No infinite loading states**
- ✅ **Error recovery works smoothly**
- ✅ **Search returns results <1s**
- ✅ **Mobile responsive**

---

# 🔄 MAINTENANCE & ONGOING TASKS

## Daily
- Monitor error rates in production logs
- Check OpenAI API usage and costs
- Review slow query alerts
- Respond to critical issues

## Weekly
- Review slow queries (>1s) and optimize
- Check database performance metrics
- Analyze user feedback and feature requests
- Update project documentation

## Monthly
- Refresh materialized views (automated via pg_cron, verify)
- Update embeddings for new/modified procedures (automated via triggers, verify)
- Review and optimize API costs (model routing effectiveness)
- Security patches and dependency updates

## Quarterly
- Update dependencies (major versions)
- Review and optimize database indexes
- Fine-tune RAG system based on usage patterns
- Conduct security audit
- Rotate API keys

---

# 📝 SUMMARY

## What We're Building
Production-ready, AI-powered clinical dental recommendation system with:
- **10x faster** data loading (single materialized view query)
- **60% less** code to maintain (1862 → ~700 lines)
- **99.9%** reliability (React Query + error boundaries)
- **Full AI/RAG** support with hybrid search + streaming
- **60-80% cost savings** through semantic caching + model routing
- **Comprehensive** monitoring with LangSmith/LangFuse

## Tech Stack Decisions (Research-Backed)
1. **pgvector over Pinecone/Qdrant**: 11.4x throughput, 75% cost savings at scale
2. **Vercel AI SDK for streaming**: Best React integration, full TypeScript safety
3. **Hybrid search (0.7 semantic + 0.3 keyword)**: 10-15% precision improvement
4. **Model routing (GPT-3.5 + GPT-4)**: 40-70% cost optimization
5. **3-tier caching**: 60-80% API cost reduction
6. **HNSW indexes**: Production standard for <50M vectors, 0.5-3ms query time

## Timeline: 8 Weeks
- **Week 1**: Audit & Cleanup
- **Weeks 2-3**: Database Foundation (pgvector + materialized views)
- **Weeks 3-4**: Application Refactoring (React Query)
- **Week 5**: AI/RAG Integration (Vercel AI SDK + hybrid search)
- **Week 6**: Testing & Observability (Vitest + LangSmith)
- **Week 7**: Documentation
- **Week 8**: Production Deployment

## Team Commitment
- ✅ **Quality over speed** - No shortcuts
- ✅ **Test everything** - 80%+ coverage
- ✅ **Document everything** - Comprehensive docs
- ✅ **Monitor everything** - Real-time observability
- ✅ **No data loss** - Database backups before changes
- ✅ **Gradual rollout** - Staging → Beta → Production

---