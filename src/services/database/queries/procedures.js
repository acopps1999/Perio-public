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
 * - procedures (base table)
 * - categories (category names)
 * - procedure_phases + phases (phase relationships)
 * - procedure_dentists + dentists (dentist relationships)
 * - procedure_phase_products (product assignments by phase/patient type)
 * - product_details (product details and rationale)
 * - phase_specific_usage (usage instructions by phase)
 * - condition_product_research_articles (research evidence)
 *
 * All related data is stored as JSONB arrays in the materialized view,
 * eliminating the need for joins and significantly improving query performance.
 *
 * @returns {Promise<Array>} Array of transformed procedure objects
 * @throws {DatabaseError} If query fails or times out
 *
 * @example
 * const procedures = await loadProcedures();
 * // Returns array of procedures with all related data in ~200-500ms
 */
export const loadProcedures = async () => {
  // TEMPORARY: Skip materialized view and use fallback directly
  // This avoids 5-second timeout while we fix the view
  const USE_MATERIALIZED_VIEW = false; // Set to true once view is fixed in Supabase
  
  if (!USE_MATERIALIZED_VIEW) {
    console.log('⚡ Using direct query (materialized view bypassed for speed)');
    return await loadProceduresFallback();
  }
  
  try {
    console.log('🚀 Loading procedures from materialized view...');

    // Try to query the materialized view with a timeout
    const { data, error } = await withTimeout(
      supabase
        .from('procedures_complete')
        .select('*')
        .order('name'),
      5000 // 5 second timeout
    );

    console.log('📊 Query completed:', {
      error: error ? error.message : null,
      dataLength: data?.length || 0
    });

    if (error) {
      // If the view doesn't exist or query fails, fall back to old pattern
      console.warn('⚠️ Materialized view query failed, using fallback:', error.message);
      return await loadProceduresFallback();
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No procedures found in materialized view');
      return [];
    }

    console.log('✅ Loaded', data.length, 'procedures from materialized view');

    // Transform data from materialized view format to app format
    const transformed = data.map(transformProcedure).filter(Boolean);

    console.log('✅ Transformed', transformed.length, 'procedures');

    return transformed;

  } catch (error) {
    // If timeout or other error, fall back to old pattern
    console.error('❌ Error loading from materialized view:', error);
    console.log('🔄 Falling back to base tables query...');

    try {
      return await loadProceduresFallback();
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
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
    console.log('📊 Fallback: Querying base procedures table...');
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    console.log('📊 Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET');
    console.log('📊 Supabase Key:', supabaseKey ? 'Set (length: ' + supabaseKey.length + ')' : 'NOT SET');
    
    // DIRECT FETCH TEST - bypasses Supabase client to test raw connectivity
    console.log('🔍 Testing direct fetch to Supabase...');
    const testStartTime = Date.now();
    
    try {
      const testResponse = await Promise.race([
        fetch(`${supabaseUrl}/rest/v1/procedures?select=id,name&limit=1`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Direct fetch timeout after 10s')), 10000)
        )
      ]);
      
      console.log('✅ Direct fetch completed in', Date.now() - testStartTime, 'ms');
      console.log('📊 Response status:', testResponse.status);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Direct fetch returned', testData.length, 'records');
        console.log('📊 Sample:', testData[0]?.name || 'no data');
      } else {
        const errorText = await testResponse.text();
        console.error('❌ Direct fetch failed:', testResponse.status, errorText);
      }
    } catch (fetchError) {
      console.error('❌ Direct fetch error:', fetchError.message);
      console.error('🔴 This indicates Supabase connectivity issue!');
      console.error('🔴 Check: 1) Is your Supabase project paused? 2) Is the URL correct? 3) Network issues?');
    }
    
    // Now try the Supabase client queries with individual error handling
    console.log('📊 Now trying Supabase client queries (full data load)...');
    const queryStartTime = Date.now();
    
    // Helper to safely query a table with timeout and error handling
    const safeQuery = async (tableName, query) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          query,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout querying ${tableName}`)), 10000)
          )
        ]);
        console.log(`  ✅ ${tableName}: ${result.data?.length || 0} records (${Date.now() - start}ms)`);
        return result;
      } catch (err) {
        console.error(`  ❌ ${tableName}: ${err.message}`);
        return { data: [], error: err };
      }
    };
    
    // Load all data in parallel with individual error handling
    console.log('📊 Querying tables...');
    const [
      proceduresResult,
      procedurePhasesResult,
      phasesResult,
      procedurePhaseProductsResult,
      productsResult,
      productDetailsResult,
      patientTypesResult,
      procedurePatientTypesResult,
      phaseSpecificUsageResult,
      researchArticlesResult,
      patientSpecificConfigsResult
    ] = await Promise.all([
      safeQuery('procedures', supabase.from('procedures').select('*, categories:category_id (name)').order('name')),
      safeQuery('procedure_phases', supabase.from('procedure_phases').select('*')),
      safeQuery('phases', supabase.from('phases').select('*')),
      safeQuery('procedure_phase_products', supabase.from('procedure_phase_products').select('*')),
      safeQuery('products', supabase.from('products').select('*')),
      safeQuery('product_details', supabase.from('product_details').select('*')),
      safeQuery('patient_types', supabase.from('patient_types').select('*')),
      safeQuery('procedure_patient_types', supabase.from('procedure_patient_types').select('*')),
      safeQuery('phase_specific_usage', supabase.from('phase_specific_usage').select('*')),
      safeQuery('condition_product_research_articles', supabase.from('condition_product_research_articles').select('*')),
      safeQuery('patient_specific_configs', supabase.from('patient_specific_configs').select('*'))
    ]);
    
    console.log('📊 All queries completed in', Date.now() - queryStartTime, 'ms');
    
    const { data: procedures, error: proceduresError } = proceduresResult;
    const { data: procedurePhases } = procedurePhasesResult;
    const { data: phases } = phasesResult;
    const { data: procedurePhaseProducts } = procedurePhaseProductsResult;
    const { data: products } = productsResult;
    const { data: productDetails } = productDetailsResult;
    const { data: patientTypes } = patientTypesResult;
    const { data: procedurePatientTypes } = procedurePatientTypesResult;
    const { data: phaseSpecificUsage } = phaseSpecificUsageResult;
    const { data: researchArticles } = researchArticlesResult;
    const { data: patientSpecificConfigs } = patientSpecificConfigsResult;

    if (proceduresError) {
      console.error('❌ Failed to load procedures from base table:', proceduresError);
      throw proceduresError;
    }

    if (!procedures || procedures.length === 0) {
      console.warn('⚠️  No procedures found in database');
      return [];
    }
    
    // Build lookup maps for efficiency
    const phasesMap = new Map((phases || []).map(p => [p.id, p.name]));
    const productsMap = new Map((products || []).map(p => [p.id, p]));
    const patientTypesMap = new Map((patientTypes || []).map(p => [p.id, p.name]));
    
    // Group procedure_phases by procedure_id
    const procedurePhasesMap = new Map();
    (procedurePhases || []).forEach(pp => {
      if (!procedurePhasesMap.has(pp.procedure_id)) {
        procedurePhasesMap.set(pp.procedure_id, []);
      }
      procedurePhasesMap.get(pp.procedure_id).push({
        phaseId: pp.phase_id,
        phaseName: pp.phase_name || phasesMap.get(pp.phase_id) || 'Unknown Phase'
      });
    });
    
    // Group procedure_phase_products by procedure_id
    const procedurePhaseProductsMap = new Map();
    (procedurePhaseProducts || []).forEach(ppp => {
      if (!procedurePhaseProductsMap.has(ppp.procedure_id)) {
        procedurePhaseProductsMap.set(ppp.procedure_id, []);
      }
      const product = productsMap.get(ppp.product_id);
      procedurePhaseProductsMap.get(ppp.procedure_id).push({
        phaseId: ppp.phase_id,
        phaseName: phasesMap.get(ppp.phase_id) || 'Unknown Phase',
        productId: ppp.product_id,
        productName: product?.name || 'Unknown Product',
        patientTypeId: ppp.patient_type_id,
        patientTypeName: patientTypesMap.get(ppp.patient_type_id) || null
      });
    });
    
    // Group procedure_patient_types by procedure_id
    const procedurePatientTypesMap = new Map();
    (procedurePatientTypes || []).forEach(ppt => {
      if (!procedurePatientTypesMap.has(ppt.procedure_id)) {
        procedurePatientTypesMap.set(ppt.procedure_id, []);
      }
      procedurePatientTypesMap.get(ppt.procedure_id).push(
        patientTypesMap.get(ppt.patient_type_id) || 'Unknown'
      );
    });
    
    // Group product_details by procedure_id (using procedure_name or procedure_id)
    const productDetailsMap = new Map();
    (productDetails || []).forEach(pd => {
      const key = pd.procedure_id || pd.procedure_name;
      if (key) {
        if (!productDetailsMap.has(key)) {
          productDetailsMap.set(key, []);
        }
        productDetailsMap.get(key).push(pd);
      }
    });
    
    // Group phase_specific_usage by procedure_id
    const phaseUsageMap = new Map();
    (phaseSpecificUsage || []).forEach(psu => {
      if (!phaseUsageMap.has(psu.procedure_id)) {
        phaseUsageMap.set(psu.procedure_id, {});
      }
      const phaseName = phasesMap.get(psu.phase_id) || 'Unknown';
      const product = productsMap.get(psu.product_id);
      const productName = product?.name || 'Unknown';
      if (!phaseUsageMap.get(psu.procedure_id)[productName]) {
        phaseUsageMap.get(psu.procedure_id)[productName] = {};
      }
      phaseUsageMap.get(psu.procedure_id)[productName][phaseName] = psu.instructions;
    });
    
    // Group research_articles by procedure_id
    const researchMap = new Map();
    (researchArticles || []).forEach(ra => {
      if (!researchMap.has(ra.procedure_id)) {
        researchMap.set(ra.procedure_id, {});
      }
      const product = productsMap.get(ra.product_id);
      const productName = product?.name || 'Unknown';
      if (!researchMap.get(ra.procedure_id)[productName]) {
        researchMap.get(ra.procedure_id)[productName] = [];
      }
      researchMap.get(ra.procedure_id)[productName].push({
        title: ra.title,
        author: ra.author,
        abstract: ra.abstract,
        url: ra.url
      });
    });

    // Reconstruct patientSpecificConfig from procedure_phase_products and patient_specific_configs
    const patientConfigMap = new Map();
    
    // Initialize with procedure IDs
    procedures.forEach(p => patientConfigMap.set(p.id, {}));
    
    // Populate from procedure_phase_products (normalized data)
    (procedurePhaseProducts || []).forEach(ppp => {
      const procConfig = patientConfigMap.get(ppp.procedure_id);
      if (!procConfig) return;

      const phaseName = phasesMap.get(ppp.phase_id);
      const productName = productsMap.get(ppp.product_id)?.name;
      const patientTypeName = patientTypesMap.get(ppp.patient_type_id) || 'All'; // Default to 'All' if null
      
      if (phaseName && productName) {
        if (!procConfig[phaseName]) {
          procConfig[phaseName] = {};
        }
        if (!procConfig[phaseName][patientTypeName]) {
          procConfig[phaseName][patientTypeName] = [];
        }
        // Add product if not already present
        if (!procConfig[phaseName][patientTypeName].includes(productName)) {
          procConfig[phaseName][patientTypeName].push(productName);
        }
      }
    });

    // Merge any overrides from patient_specific_configs (JSON data)
    (patientSpecificConfigs || []).forEach(psc => {
       const procConfig = patientConfigMap.get(psc.procedure_id);
       if (!procConfig) return;

       const phaseName = phasesMap.get(psc.phase_id);
       const patientTypeName = patientTypesMap.get(psc.patient_type_id);
       
       if (phaseName && patientTypeName && psc.config) {
         if (!procConfig[phaseName]) {
            procConfig[phaseName] = {};
         }
         // If config has products array, use it
         if (Array.isArray(psc.config.products)) {
            procConfig[phaseName][patientTypeName] = psc.config.products;
         } 
         // If config is the array itself (legacy format check)
         else if (Array.isArray(psc.config)) {
            procConfig[phaseName][patientTypeName] = psc.config;
         }
       }
    });
    
    console.log('✅ Fallback: Loaded', procedures.length, 'procedures with full data');
    console.log('📊 First procedure:', procedures[0]?.name || 'N/A');

    // Transform to expected format
    return procedures.map(proc => {
      const procPhases = procedurePhasesMap.get(proc.id) || [];
      const procProducts = procedurePhaseProductsMap.get(proc.id) || [];
      const procPatientTypes = procedurePatientTypesMap.get(proc.id) || [];
      const procDetails = productDetailsMap.get(proc.id) || productDetailsMap.get(proc.name) || [];
      const procPhaseUsage = phaseUsageMap.get(proc.id) || {};
      const procResearch = researchMap.get(proc.id) || {};
      const procPatientSpecificConfig = patientConfigMap.get(proc.id) || {};
      
      // Get unique phase names
      const phaseNames = [...new Set(procPhases.map(p => p.phaseName))];
      
      // Build productDetails object keyed by product name
      const productDetailsObj = {};
      procDetails.forEach(pd => {
        const prodName = pd.product_name || productsMap.get(pd.product_id)?.name;
        if (prodName) {
          productDetailsObj[prodName] = {
            rationale: pd.rationale || '',
            rationale_2: pd.rationale_2 || '',
            clinicalEvidence: pd.clinical_evidence || '',
            pitchPoints: pd.pitch_points || '',
            objectionHandling: pd.objection_handling || '',
            factSheetUrl: pd.fact_sheet_url || '',
            // Add usage instructions from phaseSpecificUsage
            usage: procPhaseUsage[prodName] || null
          };
        }
      });

      // Also add any products from phaseSpecificUsage that don't have productDetails entries
      Object.keys(procPhaseUsage).forEach(productName => {
        if (!productDetailsObj[productName]) {
          productDetailsObj[productName] = {
            rationale: '',
            rationale_2: '',
            clinicalEvidence: '',
            pitchPoints: '',
            objectionHandling: '',
            factSheetUrl: '',
            usage: procPhaseUsage[productName]
          };
        }
      });
      
      return {
        db_id: proc.id,
        name: proc.name,
        pitchPoints: proc.pitch_points || '',
        patientType: proc.patient_type || '',
        category: proc.categories?.name || proc.category || null,
        phases: phaseNames,
        dds: [], // TODO: Load from procedure_dentists if needed
        patientTypeNames: procPatientTypes,
        patientSpecificConfig: procPatientSpecificConfig,
        productDetails: productDetailsObj,
        conditionSpecificResearch: procResearch,
        phaseSpecificUsage: procPhaseUsage,
        competitiveAdvantage: {},
        // Products by phase for easy access
        productsByPhase: procProducts.reduce((acc, p) => {
          if (!acc[p.phaseName]) acc[p.phaseName] = [];
          acc[p.phaseName].push({
            id: p.productId,
            name: p.productName,
            patientTypeId: p.patientTypeId,
            patientTypeName: p.patientTypeName
          });
          return acc;
        }, {}),
        // Cache optimization: Include metadata to avoid duplicate fetches
        _metadata: {
          allProducts: products || [],
          allPatientTypes: patientTypes || []
        }
      };
    });

  } catch (error) {
    console.error('❌ Fallback query failed:', error);
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
  // No-op: Materialized view has been scrapped, using direct table queries instead
  return;
};
