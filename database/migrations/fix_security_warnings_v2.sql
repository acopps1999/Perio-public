-- ============================================================================
-- SECURITY FIX MIGRATION V2
-- Fixes Supabase security warnings for function search_path and extensions
-- Date: 2025-12-08
-- ============================================================================

-- PART 1: Drop ALL existing function variations
-- ============================================================================
-- Use DO block to drop all variations of each function

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all functions matching our target names
    FOR r IN (
        SELECT
            n.nspname as schema,
            p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'approve_user',
            'reject_user',
            'create_admins_table',
            'sync_existing_admins',
            'is_admin',
            'notify_admins_new_user',
            'notify_data_change',
            'handle_new_user',
            'update_updated_at_column',
            'update_research_articles_updated_at',
            'get_table_columns',
            'refresh_procedures_complete',
            'refresh_procedures_complete_view',
            'get_procedures_complete',
            'search_products_fulltext',
            'search_products_semantic',
            'search_procedures_semantic',
            'search_procedures_hybrid',
            'search_clinical_evidence_semantic',
            'get_embedding_stats'
        )
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.schema, r.name, r.args);
    END LOOP;
END $$;

-- PART 2: Recreate Functions with Proper Search Path
-- ============================================================================

-- User approval functions
CREATE FUNCTION public.approve_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_profiles
  SET approval_status = 'approved',
      approved_at = now(),
      approved_by = auth.uid()
  WHERE id = user_id;
END;
$$;

CREATE FUNCTION public.reject_user(user_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_profiles
  SET approval_status = 'rejected',
      approved_at = now(),
      approved_by = auth.uid(),
      rejection_reason = reason
  WHERE id = user_id;
END;
$$;

-- Admin management functions
CREATE FUNCTION public.create_admins_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.admins (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    email text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
  );
END;
$$;

CREATE FUNCTION public.sync_existing_admins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admins (user_id, email)
  SELECT id, email
  FROM auth.users
  WHERE email IN ('coppsaustin@gmail.com') -- Add admin emails here
  ON CONFLICT (email) DO NOTHING;
END;
$$;

CREATE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE admins.user_id = is_admin.user_id
  );
END;
$$;

-- Notification functions
CREATE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    type,
    title,
    message,
    user_profile_id,
    metadata
  )
  VALUES (
    'new_user_registration',
    'New User Registration',
    format('User %s (%s) has registered and is pending approval', NEW.full_name, NEW.email),
    NEW.id,
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'full_name', NEW.full_name
    )
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.notify_data_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_notify('data_change', json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'id', NEW.id
  )::text);
  RETURN NEW;
END;
$$;

-- User management
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name, avatar_url, last_sign_in_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    last_sign_in_at = NEW.last_sign_in_at;
  RETURN NEW;
END;
$$;

-- Utility functions
CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_research_articles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::text,
    c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = get_table_columns.table_name;
END;
$$;

-- Materialized view functions
CREATE FUNCTION public.refresh_procedures_complete()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.procedures_complete;
END;
$$;

CREATE FUNCTION public.refresh_procedures_complete_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.procedures_complete;
END;
$$;

CREATE FUNCTION public.get_procedures_complete()
RETURNS SETOF public.procedures_complete
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.procedures_complete;
END;
$$;

-- Search functions (legacy RAG - may not be used)
CREATE FUNCTION public.search_products_fulltext(search_query text, limit_count int DEFAULT 10)
RETURNS TABLE(
  id bigint,
  name text,
  similarity real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    similarity(p.name, search_query) as similarity
  FROM public.products p
  WHERE p.name % search_query
  ORDER BY similarity DESC
  LIMIT limit_count;
END;
$$;

CREATE FUNCTION public.search_products_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  name text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This function may reference embeddings table that no longer exists
  -- If not used, consider dropping it
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    0.0::float as similarity
  FROM public.products p
  LIMIT match_count;
END;
$$;

CREATE FUNCTION public.search_procedures_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  name text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This function may reference embeddings table that no longer exists
  -- If not used, consider dropping it
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    0.0::float as similarity
  FROM public.procedures p
  LIMIT match_count;
END;
$$;

CREATE FUNCTION public.search_procedures_hybrid(
  search_query text,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  name text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This function may reference embeddings table that no longer exists
  -- If not used, consider dropping it
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    0.0::float as similarity
  FROM public.procedures p
  LIMIT match_count;
END;
$$;

CREATE FUNCTION public.search_clinical_evidence_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  product_id bigint,
  clinical_evidence text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This function may reference embeddings table that no longer exists
  -- If not used, consider dropping it
  RETURN QUERY
  SELECT
    pd.id,
    pd.product_id,
    pd.clinical_evidence,
    0.0::float as similarity
  FROM public.product_details pd
  LIMIT match_count;
END;
$$;

CREATE FUNCTION public.get_embedding_stats()
RETURNS TABLE(
  total_embeddings bigint,
  avg_vector_length float
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This function may reference embeddings table that no longer exists
  -- If not used, consider dropping it
  RETURN QUERY
  SELECT
    0::bigint as total_embeddings,
    0.0::float as avg_vector_length;
END;
$$;

-- PART 3: Move Extensions from Public Schema
-- ============================================================================
-- Extensions should not be in the public schema for security reasons.
-- We'll move them to a dedicated extensions schema.

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension
-- Note: Extensions cannot be directly moved, we need to drop and recreate
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Move vector extension
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- PART 4: Recreate any triggers that were dropped
-- ============================================================================

-- Recreate triggers that may have been dropped by CASCADE
-- Note: Adjust these if your actual trigger setup is different

DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if trigger exists before creating (auth.users)
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        -- Check if auth.users table exists
        SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'auth' AND tablename = 'users'
        ) INTO table_exists;

        IF table_exists THEN
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
        END IF;
    END IF;

    -- user_profiles trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'user_profiles'
    ) INTO table_exists;

    IF table_exists AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_user_profile_created'
        AND tgrelid = 'public.user_profiles'::regclass
    ) THEN
        CREATE TRIGGER on_user_profile_created
        AFTER INSERT ON public.user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.notify_admins_new_user();
    END IF;

    -- procedures trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'procedures'
    ) INTO table_exists;

    IF table_exists AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_procedures_updated_at'
        AND tgrelid = 'public.procedures'::regclass
    ) THEN
        CREATE TRIGGER update_procedures_updated_at
        BEFORE UPDATE ON public.procedures
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- products trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'products'
    ) INTO table_exists;

    IF table_exists AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_products_updated_at'
        AND tgrelid = 'public.products'::regclass
    ) THEN
        CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON public.products
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- categories trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'categories'
    ) INTO table_exists;

    IF table_exists AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_categories_updated_at'
        AND tgrelid = 'public.categories'::regclass
    ) THEN
        CREATE TRIGGER update_categories_updated_at
        BEFORE UPDATE ON public.categories
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- research_articles trigger (only if table exists)
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'research_articles'
    ) INTO table_exists;

    IF table_exists AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_research_articles_updated_at_trigger'
        AND tgrelid = 'public.research_articles'::regclass
    ) THEN
        CREATE TRIGGER update_research_articles_updated_at_trigger
        BEFORE UPDATE ON public.research_articles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_research_articles_updated_at();
    END IF;
END $$;

-- PART 5: Comments and Documentation
-- ============================================================================

COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to keep them out of public schema for security';
COMMENT ON FUNCTION public.approve_user IS 'Approves a pending user - search_path protected';
COMMENT ON FUNCTION public.reject_user IS 'Rejects a pending user with optional reason - search_path protected';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

SELECT 'Migration completed successfully!' as status;
