/**
 * Procedure Data Transformer
 *
 * Transforms procedure data from the database format (procedures_complete materialized view)
 * to the application format expected by UI components.
 *
 * Database Format (JSONB from materialized view):
 * - phases: JSONB array of { id, name }
 * - dentists: JSONB array of { id, name }
 * - procedure_phase_products: JSONB array with phase/product/rank info
 * - product_details: JSONB array with product information
 * - phase_specific_usage: JSONB array with usage instructions
 * - research_articles: JSONB array with research data
 * - custom_phase_labels: JSONB object { phaseId: customName }
 *
 * App Format (used by ClinicalChartMockup and components):
 * - phases: String array of phase names (with custom labels applied)
 * - dds: String array of dentist type names
 * - products: Object { phaseName: [productNames] } - ranked product lists per phase
 * - productDetails: Object map { productName: { details, usage, researchArticles } }
 * - conditionSpecificResearch: Object map { productName: [articles] }
 *
 * @module procedureTransformer
 */

/**
 * Transform a single procedure from database format to application format
 *
 * @param {Object} raw - Raw procedure data from procedures_complete materialized view
 * @returns {Object|null} Transformed procedure in app format, or null if input is invalid
 *
 * @example
 * const raw = {
 *   id: 1,
 *   name: 'Gingivitis',
 *   category_name: 'Periodontal Disease',
 *   pitch_points: 'Key selling points...',
 *   patient_type: 'Types 1 to 4',
 *   phases: [{ id: 1, name: 'Prep' }, { id: 2, name: 'Acute' }],
 *   dentists: [{ id: 1, name: 'General Dentist' }],
 *   procedure_phase_products: [...],
 *   product_details: [...],
 *   phase_specific_usage: [...],
 *   research_articles: [...]
 * };
 *
 * const transformed = transformProcedure(raw);
 * // Returns app-formatted object with phases, productDetails, patientSpecificConfig, etc.
 */
export const transformProcedure = (raw) => {
  if (!raw) return null;

  // Extract phase info with custom labels applied
  const customLabels = raw.custom_phase_labels || {};
  const phasesWithIds = Array.isArray(raw.phases)
    ? raw.phases.map(p => ({
        id: p.id,
        name: customLabels[p.id] || p.name // Use custom label if available
      }))
    : [];

  // Extract just phase names for backward compatibility
  const phases = phasesWithIds.map(p => p.name);

  // Extract dentist type names from JSONB array
  const dds = Array.isArray(raw.dentists)
    ? raw.dentists.map(d => d.name)
    : [];

  // Build ranked product lists per phase (no patient type grouping)
  // Structure: { phaseName: [productNames] } ordered by rank
  const products = buildRankedProducts(
    raw.procedure_phase_products || [],
    phasesWithIds
  );

  // Build product details map with usage instructions and research articles
  // Structure: { productName: { scientificRationale, usage, researchArticles, ... } }
  const productDetails = buildProductDetailsMap(
    raw.product_details || [],
    raw.phase_specific_usage || [],
    raw.research_articles || []
  );

  // Build research articles map grouped by product
  // Structure: { productName: [articles] }
  const conditionSpecificResearch = buildResearchMap(
    raw.research_articles || [],
    raw.product_details || []
  );

  // Build legacy patientSpecificConfig for backward compatibility
  // TODO: Remove this once all UI components are updated
  const patientSpecificConfig = buildLegacyPatientSpecificConfig(products);

  return {
    name: raw.name,
    db_id: raw.id,
    category: raw.category_name || null,
    pitchPoints: raw.pitch_points || '',
    patientType: raw.patient_type || '', // Deprecated field
    phases,
    phasesWithIds, // New: includes id for custom label editing
    dds,
    products, // New simplified structure: { phaseName: [productNames] }
    productDetails,
    patientSpecificConfig, // Deprecated: for backward compatibility
    conditionSpecificResearch,
    // Condition-level fields extracted from first product
    scientificRationale: extractFirstProductField(raw.product_details, 'scientific_rationale'),
    clinicalEvidence: extractFirstProductField(raw.product_details, 'clinical_evidence'),
    handlingObjections: extractFirstProductField(raw.product_details, 'objection_handling')
  };
};

/**
 * Build ranked product lists per phase from procedure_phase_products JSONB array
 *
 * Phase 3 simplified structure - no patient type grouping, just ranked products per phase.
 *
 * @param {Array} phaseProducts - Array of procedure_phase_product records from JSONB
 * @param {Array} phasesWithIds - Array of { id, name } phase objects
 * @returns {Object} Map of phase names to ranked product name arrays
 *
 * @example
 * phaseProducts = [
 *   { phase_name: 'Prep', product_name: 'Product A', rank: 1 },
 *   { phase_name: 'Prep', product_name: 'Product B', rank: 2 },
 *   { phase_name: 'Acute', product_name: 'Product C', rank: 1 }
 * ]
 *
 * Returns:
 * {
 *   'Prep': ['Product A', 'Product B'],
 *   'Acute': ['Product C']
 * }
 */
const buildRankedProducts = (phaseProducts, phasesWithIds) => {
  const products = {};

  // Initialize structure with all phases
  phasesWithIds.forEach(phase => {
    products[phase.name] = [];
  });

  if (!Array.isArray(phaseProducts)) {
    return products;
  }

  // Group products by phase with their ranks
  const phaseProductsMap = {};
  phaseProducts.forEach(item => {
    const phaseName = item.phase_name;
    const productName = item.product_name;
    const rank = item.rank || 999; // Default high rank for unranked items

    if (phaseName && productName) {
      if (!phaseProductsMap[phaseName]) {
        phaseProductsMap[phaseName] = [];
      }
      // Avoid duplicates
      if (!phaseProductsMap[phaseName].some(p => p.name === productName)) {
        phaseProductsMap[phaseName].push({ name: productName, rank });
      }
    }
  });

  // Sort by rank and extract just the product names
  Object.keys(phaseProductsMap).forEach(phaseName => {
    products[phaseName] = phaseProductsMap[phaseName]
      .sort((a, b) => a.rank - b.rank)
      .map(p => p.name);
  });

  return products;
};

/**
 * Build legacy patientSpecificConfig for backward compatibility
 *
 * Converts the new simplified products structure back to the old nested format
 * so existing UI components continue to work during migration.
 *
 * @param {Object} products - New format { phaseName: [productNames] }
 * @returns {Object} Legacy format { phaseName: { 'All': [productNames] } }
 */
const buildLegacyPatientSpecificConfig = (products) => {
  const config = {};

  Object.keys(products).forEach(phaseName => {
    config[phaseName] = {
      'All': products[phaseName] || []
    };
  });

  return config;
};

/**
 * @deprecated Use buildRankedProducts instead
 * Build patient-specific product configuration from procedure_phase_products JSONB array
 *
 * Transforms flat array of product assignments into nested structure:
 * { phaseName: { patientTypeName: [productNames] } }
 *
 * @param {Array} phaseProducts - Array of procedure_phase_product records from JSONB
 * @param {Array} phases - Array of phase names for this procedure
 * @returns {Object} Nested configuration object
 */
const buildPatientSpecificConfig = (phaseProducts, phases) => {
  const config = {};
  const allProductNames = new Set();

  // Initialize structure with all phases
  phases.forEach(phaseName => {
    config[phaseName] = {};
  });

  // Collect all unique patient types from the data
  const patientTypes = new Set();
  if (Array.isArray(phaseProducts)) {
    phaseProducts.forEach(item => {
      if (item.patient_type_name) {
        patientTypes.add(item.patient_type_name);
      }
      if (item.product_name) {
        allProductNames.add(item.product_name);
      }
    });
  }

  // Initialize all patient types for all phases (ensures consistent structure)
  phases.forEach(phaseName => {
    patientTypes.forEach(ptName => {
      config[phaseName][ptName] = [];
    });
  });

  // Populate with actual product assignments
  if (Array.isArray(phaseProducts)) {
    phaseProducts.forEach(item => {
      const phaseName = item.phase_name;
      const ptName = item.patient_type_name;
      const productName = item.product_name;

      // Only add if we have all required fields and the phase exists in config
      if (phaseName && ptName && productName && config[phaseName]) {
        // Ensure patient type key exists
        if (!config[phaseName][ptName]) {
          config[phaseName][ptName] = [];
        }

        // Add product if not already in array (prevent duplicates)
        if (!config[phaseName][ptName].includes(productName)) {
          config[phaseName][ptName].push(productName);
        }
      }
    });
  }

  return config;
};

/**
 * Build product details map with usage instructions and research articles
 *
 * Combines data from product_details, phase_specific_usage, and research_articles
 * into a comprehensive product information object.
 *
 * @param {Array} productDetails - Array of product_detail records from JSONB
 * @param {Array} phaseUsage - Array of phase_specific_usage records from JSONB
 * @param {Array} research - Array of research_article records from JSONB
 * @returns {Object} Map of product names to detail objects
 *
 * @example
 * Returns:
 * {
 *   'Product A': {
 *     scientificRationale: '...',
 *     clinicalEvidence: '...',
 *     handlingObjections: '...',
 *     pitchPoints: '...',
 *     rationale: '...',
 *     factSheetUrl: '...',
 *     usage: {
 *       'Prep': 'Instructions for prep phase...',
 *       'Acute': 'Instructions for acute phase...'
 *     },
 *     researchArticles: [
 *       { title: '...', author: '...', abstract: '...', url: '...' }
 *     ]
 *   }
 * }
 */
const buildProductDetailsMap = (productDetails, phaseUsage, research) => {
  const detailsMap = {};

  // Process each product detail record
  if (Array.isArray(productDetails)) {
    productDetails.forEach(pd => {
      const productName = pd.product_name;
      const productId = pd.product_id;

      if (!productName) {
        return; // Skip if no product name
      }

      // Build usage instructions organized by phase
      const usageByPhase = {};
      if (Array.isArray(phaseUsage)) {
        phaseUsage
          .filter(pu => pu.product_id === productId)
          .forEach(pu => {
            if (pu.phase_name && pu.instructions) {
              usageByPhase[pu.phase_name] = pu.instructions;
            }
          });
      }

      // Get research articles for this specific product
      const productResearch = Array.isArray(research)
        ? research.filter(r => r.product_id === productId)
        : [];

      // Build complete product details object
      detailsMap[productName] = {
        scientificRationale: pd.scientific_rationale || '',
        clinicalEvidence: pd.clinical_evidence || '',
        handlingObjections: pd.objection_handling || '',
        pitchPoints: pd.pitch_points || '',
        rationale: pd.rationale || '',
        usage: usageByPhase,
        researchArticles: productResearch
      };
    });
  }

  return detailsMap;
};

/**
 * Build research articles map grouped by product name
 *
 * Creates a map of product names to their associated research articles.
 * Uses product_details to map product IDs to product names.
 *
 * @param {Array} research - Array of research_article records from JSONB
 * @param {Array} productDetails - Array of product_detail records (for ID to name mapping)
 * @returns {Object} Map of product names to arrays of research articles
 *
 * @example
 * Returns:
 * {
 *   'Product A': [
 *     { title: 'Study 1', author: 'Dr. Smith', abstract: '...', url: '...' },
 *     { title: 'Study 2', author: 'Dr. Jones', abstract: '...', url: '...' }
 *   ],
 *   'Product B': [...]
 * }
 */
const buildResearchMap = (research, productDetails) => {
  const map = {};

  // Create product ID to name mapping
  const productIdToName = {};
  if (Array.isArray(productDetails)) {
    productDetails.forEach(pd => {
      if (pd.product_id && pd.product_name) {
        productIdToName[pd.product_id] = pd.product_name;
      }
    });
  }

  // Group research articles by product name
  if (Array.isArray(research)) {
    research.forEach(article => {
      const productId = article.product_id;
      const productName = productIdToName[productId];

      if (productName) {
        if (!map[productName]) {
          map[productName] = [];
        }
        map[productName].push({
          title: article.title || '',
          author: article.author || '',
          abstract: article.abstract || '',
          url: article.url || ''
        });
      }
    });
  }

  return map;
};

/**
 * Extract a field value from the first product in the product_details array
 *
 * Used to populate condition-level fields (scientificRationale, clinicalEvidence, handlingObjections)
 * from the first product's details, matching the existing AdminPanel behavior.
 *
 * @param {Array} productDetails - Array of product_detail records from JSONB
 * @param {string} field - Field name to extract (e.g., 'scientific_rationale')
 * @returns {string} Field value from first product, or empty string if not found
 *
 * @example
 * extractFirstProductField(productDetails, 'scientific_rationale')
 * // Returns: "The scientific basis for treatment..." or ""
 */
const extractFirstProductField = (productDetails, field) => {
  if (!Array.isArray(productDetails) || productDetails.length === 0) {
    return '';
  }
  return productDetails[0][field] || '';
};

/**
 * Transform multiple procedures in batch
 *
 * @param {Array} procedures - Array of raw procedure objects
 * @returns {Array} Array of transformed procedures
 *
 * @example
 * const rawProcedures = await supabase.from('procedures_complete').select('*');
 * const transformed = transformProcedures(rawProcedures);
 */
export const transformProcedures = (procedures) => {
  if (!Array.isArray(procedures)) {
    return [];
  }
  return procedures.map(transformProcedure).filter(Boolean);
};

/**
 * Transform procedure for database insertion (reverse transformation)
 *
 * NOTE: This is a placeholder for future implementation.
 * Current admin operations use the existing AdminPanelSupabase functions
 * which handle the app-to-DB transformation inline.
 *
 * @param {Object} procedureData - Application format procedure data
 * @returns {Object} Database format procedure object
 */
export const transformProcedureForDB = (procedureData) => {
  // TODO: Implement reverse transformation for database insertion
  // This will be needed when we refactor the admin panel to use the new service layer
  return procedureData;
};

// Export helper functions for testing
export const _testing = {
  buildRankedProducts,
  buildLegacyPatientSpecificConfig,
  buildPatientSpecificConfig, // Deprecated
  buildProductDetailsMap,
  buildResearchMap,
  extractFirstProductField
};
