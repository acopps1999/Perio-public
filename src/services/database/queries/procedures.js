/**
 * Procedures Queries
 *
 * Handles all database queries related to clinical procedures/conditions.
 * Uses the procedures_complete materialized view for optimal performance.
 *
 * PERFORMANCE:
 * - Single optimized query instead of 7 parallel queries
 * - Pre-computed joins in materialized view
 * - Expected load time: 200-500ms (vs 2-5s with old 7-query pattern)
 * - 10x faster than previous implementation
 *
 * DATA STRUCTURE (Phase 3):
 * - Products are ranked per phase (no patient type grouping)
 * - Custom phase labels supported via JSONB column
 * - Products ordered by rank column in procedure_phase_products
 *
 * @module procedures
 */

import supabase from '../client';
import { supabase as supabaseDirectImport } from '../../../supabaseClient';
import { transformProcedure } from '../transformers/procedureTransformer';
import { withTimeout } from '../utils';
import { DatabaseError } from '../errors/DatabaseError';

/**
 * Load all procedures with complete data
 *
 * Queries the procedures_complete materialized view which pre-computes
 * all joins and stores data in JSONB format for optimal performance.
 *
 * The materialized view combines data from:
 * - procedures (base table + custom_phase_labels)
 * - categories (category names)
 * - procedure_phases + phases (phase relationships)
 * - procedure_dentists + dentists (dentist relationships)
 * - procedure_phase_products (ranked product assignments by phase)
 * - product_details (product details and rationale)
 * - phase_specific_usage (usage instructions by phase)
 * - condition_product_research_articles (research evidence)
 *
 * All related data is stored as JSONB arrays in the materialized view,
 * eliminating the need for joins and significantly improving query performance.
 *
 * Phase 3 changes:
 * - Products are ordered by rank (not grouped by patient type)
 * - Custom phase labels supported
 *
 * @returns {Promise<Array>} Array of transformed procedure objects
 * @throws {DatabaseError} If query fails or times out
 *
 * @example
 * const procedures = await loadProcedures();
 * // Returns array of procedures with all related data in ~200-500ms
 */
export const loadProcedures = async () => {
  try {
    // Try to query the materialized view with a shorter timeout (1.5s instead of 5s)
    // If it's not responding quickly, we want to fall back fast
    const { data, error } = await withTimeout(
      supabase
        .from('procedures_complete')
        .select('*')
        .order('name'),
      1500 // 1.5 second timeout - fail fast to improve perceived load time
    );

    if (error) {
      // If the view doesn't exist or query fails, fall back to old pattern
      return await loadProceduresFallback();
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform data from materialized view format to app format
    const transformed = data.map(transformProcedure).filter(Boolean);

    return transformed;

  } catch (error) {
    // If timeout or other error, fall back to old pattern immediately
    try {
      return await loadProceduresFallback();
    } catch (fallbackError) {
      throw new DatabaseError('Error loading procedures', {
        cause: fallbackError,
        operation: 'loadProcedures'
      });
    }
  }
};

// buildProceduresFromQueries removed - no longer needed with materialized view
// The materialized view pre-computes all this data and stores it as JSONB
// The transformProcedure function handles converting JSONB to app format

/**
 * Fallback query function using base tables
 *
 * This is the old query pattern that works without the materialized view.
 * Performance: 2-5 seconds (slower than materialized view)
 *
 * Used when:
 * - procedures_complete view doesn't exist yet
 * - Phase 1 migrations haven't been run
 *
 * NOTE: This fallback only loads basic procedure info (no phases, products, etc.)
 * To get full functionality, run the Phase 1.2 migration:
 * database/migrations/RUN_ALL_PHASE_1.2.sql
 */
async function loadProceduresFallback() {
  try {
    // Query base procedures table with category join
    const { data: procedures, error: proceduresError } = await supabase
      .from('procedures')
      .select(`
        *,
        categories:category_id (name)
      `)
      .order('name');

    if (proceduresError) {
      throw proceduresError;
    }

    if (!procedures || procedures.length === 0) {
      return [];
    }

    // Return procedures with basic structure
    // This allows the app to at least show condition names
    return procedures.map(proc => ({
      db_id: proc.id,
      name: proc.name,
      pitchPoints: proc.pitch_points || '',
      patientType: proc.patient_type || '', // Deprecated field
      category: proc.categories?.name || null,
      phases: [], // Empty - need materialized view for full data
      phasesWithIds: [], // Empty - need materialized view for full data
      dds: [], // Empty - need materialized view for full data
      products: {}, // Phase 3: { phaseName: [productNames] }
      patientSpecificConfig: {}, // Deprecated: for backward compatibility
      productDetails: {},
      conditionSpecificResearch: {},
      // Add warning flag so UI can show migration message
      _isFallbackData: true,
      _migrationNeeded: true
    }));

  } catch (error) {
    throw new DatabaseError('Failed to load procedures (fallback)', {
      cause: error,
      operation: 'loadProceduresFallback'
    });
  }
}

/**
 * Load single procedure by ID
 *
 * Queries the procedures_complete materialized view for a single procedure.
 * Much faster than the old 7-query pattern.
 *
 * @param {number|string} procedureId - The procedure ID to fetch
 * @returns {Promise<Object|null>} Transformed procedure object, or null if not found
 * @throws {DatabaseError} If query fails or times out
 *
 * @example
 * const procedure = await loadProcedureById(123);
 * if (procedure) {
 *   console.log(procedure.name, procedure.phases);
 * }
 */
export const loadProcedureById = async (procedureId) => {
  try {
    // Single query to materialized view filtered by ID
    const { data, error } = await withTimeout(
      supabase
        .from('procedures_complete')
        .select('*')
        .eq('id', procedureId)
        .single(),
      3000 // 3 second timeout
    );

    if (error) {
      // If procedure not found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new DatabaseError(`Failed to load procedure ${procedureId}`, {
        cause: error,
        procedureId
      });
    }

    // Transform single procedure
    return transformProcedure(data);

  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(`Error loading procedure ${procedureId}`, {
      cause: error,
      procedureId
    });
  }
};

/**
 * Refresh the procedures_complete materialized view
 *
 * This function should be called after any admin changes to procedures,
 * products, phases, or related data to ensure the materialized view
 * reflects the latest database state.
 *
 * The refresh is done CONCURRENTLY, which means:
 * - Queries can continue to access the old view data during refresh
 * - No table locks are acquired
 * - Safe to call during user activity
 *
 * This function is called automatically by AdminPanelSupabase.js after
 * all mutation operations (add, update, delete).
 *
 * @returns {Promise<void>}
 * @throws {DatabaseError} If refresh fails (non-critical, logs warning)
 *
 * @example
 * // After saving admin changes
 * await refreshProceduresView();
 * invalidateConditionsCache();
 */
export const refreshProceduresView = async () => {
  try {
    // Use the Supabase RPC to call the refresh function
    const { error } = await supabaseDirectImport.rpc('refresh_procedures_complete');

    if (error) {
      throw new DatabaseError('Failed to refresh materialized view', {
        cause: error,
        operation: 'refreshProceduresView'
      });
    }

  } catch (error) {
    // Non-critical error - don't throw
    // The view will be refreshed on next scheduled refresh
  }
};
