/**
 * RAG Service - Retrieval-Augmented Generation
 *
 * Combines semantic search (vector similarity) with LLM generation
 * to provide accurate, context-aware responses about dental procedures
 * and products.
 *
 * Architecture:
 * 1. User query → Generate embedding (OpenAI)
 * 2. Semantic search → Find relevant docs (pgvector)
 * 3. Build context → Format retrieved docs
 * 4. LLM generation → Answer with context (OpenAI)
 */

import { supabase } from '../../supabaseClient.js';
import { generateEmbedding, streamChatCompletion } from './openaiService.js';
import { understandQuery } from './queryUnderstandingService.js';
import { hybridSearchProcedures, hybridSearchProducts } from './hybridSearchService.js';
import { detectStructuredQuery, executeStructuredQuery, formatStructuredResult } from './structuredQueryService.js';
import { extractAndValidateEntities, canUseStructuredQuery } from './entityExtractionService.js';
import { RAG_CONFIG } from './ragConfig.js';

/**
 * Semantic search across procedures table
 * @param {string} userQuery - User's natural language query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Matching procedures with similarity scores
 */
export async function searchProcedures(userQuery, options = {}) {
  const {
    matchThreshold = 0.5, // Lowered threshold for better recall
    matchCount = 5,
  } = options;

  console.log('🔍 [RAG] Searching procedures for query:', userQuery);

  try {
    // Step 1: Generate embedding for user query
    console.log('📊 [RAG] Generating embedding for query...');
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log('✅ [RAG] Embedding generated, dimensions:', queryEmbedding.length);

    // Step 2: Search using pgvector function
    console.log('🔎 [RAG] Calling match_procedures RPC function...');
    console.log('   - match_threshold:', matchThreshold);
    console.log('   - match_count:', matchCount);

    const { data, error } = await supabase.rpc('match_procedures', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('❌ [RAG] RPC function error:', error);
      throw error;
    }

    console.log(`✅ [RAG] Found ${data?.length || 0} matching procedures`);
    if (data && data.length > 0) {
      console.log('   Top match:', data[0].name, `(${(data[0].similarity * 100).toFixed(1)}%)`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ [RAG] Procedure search error:', error);
    console.error('   Error details:', {
      message: error.message,
      hint: error.hint,
      details: error.details,
      code: error.code,
    });
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Semantic search across product details
 * @param {string} userQuery - User's natural language query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Matching products with similarity scores
 */
export async function searchProductDetails(userQuery, options = {}) {
  const {
    matchThreshold = 0.5, // Lowered threshold for better recall
    matchCount = 5,
  } = options;

  console.log('🔍 [RAG] Searching product details...');

  try {
    console.log('📊 [RAG] Generating embedding for product search...');
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log('✅ [RAG] Embedding generated');

    console.log('🔎 [RAG] Calling match_product_details RPC function...');
    const { data, error } = await supabase.rpc('match_product_details', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('❌ [RAG] RPC function error:', error);
      throw error;
    }

    console.log(`✅ [RAG] Found ${data?.length || 0} matching products`);
    if (data && data.length > 0) {
      console.log('   Top match:', data[0].product_name, `(${(data[0].similarity * 100).toFixed(1)}%)`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ [RAG] Product search error:', error);
    console.error('   Error details:', {
      message: error.message,
      hint: error.hint,
      details: error.details,
    });
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Semantic search across research articles
 * @param {string} userQuery - User's natural language query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Matching research articles
 */
export async function searchResearch(userQuery, options = {}) {
  const {
    matchThreshold = 0.5, // Lowered threshold for better recall
    matchCount = 3,
    searchField = 'title', // or 'abstract'
  } = options;

  console.log('🔍 [RAG] Searching research articles...');

  try {
    console.log('📊 [RAG] Generating embedding for research search...');
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log('✅ [RAG] Embedding generated');

    console.log('🔎 [RAG] Calling match_research_articles RPC function...');
    const { data, error } = await supabase.rpc('match_research_articles', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (error) {
      console.error('❌ [RAG] RPC function error:', error);
      throw error;
    }

    console.log(`✅ [RAG] Found ${data?.length || 0} matching articles`);

    return data || [];
  } catch (error) {
    console.error('❌ [RAG] Research search error:', error);
    console.error('   Error details:', {
      message: error.message,
      hint: error.hint,
      details: error.details,
    });
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Fetch products related to a specific procedure via junction table
 * This is a RELATIONAL query, not semantic search
 * Uses two-step approach: junction table → product details
 * @param {number} procedureId - Procedure ID
 * @returns {Promise<Array>} - Related products with details
 */
async function fetchRelatedProducts(procedureId) {
  try {
    console.log(`🔗 [RAG] Fetching products related to procedure ${procedureId}...`);

    // Step 1: Get product_ids from junction table with phase/patient_type info
    const { data: junctionData, error: junctionError } = await supabase
      .from('procedure_phase_products')
      .select(`
        product_id,
        phase_id,
        patient_type_id,
        products!inner(id, name),
        phases!inner(name),
        patient_types(name)
      `)
      .eq('procedure_id', procedureId);

    if (junctionError) {
      console.error('❌ [RAG] Error fetching junction data:', junctionError);
      return [];
    }

    if (!junctionData || junctionData.length === 0) {
      console.log('⚠️  [RAG] No products found in junction table for this procedure');
      return [];
    }

    console.log(`   Found ${junctionData.length} product relationships`);

    // Step 2: Get product details for each product
    const productIds = [...new Set(junctionData.map(item => item.product_id))];
    const { data: detailsData, error: detailsError } = await supabase
      .from('product_details')
      .select('product_id, clinical_evidence, pitch_points, rationale, product_name, procedure_name')
      .in('product_id', productIds);

    if (detailsError) {
      console.error('❌ [RAG] Error fetching product details:', detailsError);
    }

    // Create a map of product_id → details for quick lookup
    const detailsMap = {};
    if (detailsData) {
      detailsData.forEach(detail => {
        detailsMap[detail.product_id] = detail;
      });
    }

    // Step 3: Combine junction data with product details
    const products = junctionData.map(item => {
      const details = detailsMap[item.product_id] || {};
      return {
        product_id: item.product_id,
        product_name: item.products?.name || details.product_name || 'Unknown Product',
        procedure_name: details.procedure_name || '', // Include procedure context
        clinical_evidence: details.clinical_evidence || '',
        pitch_points: details.pitch_points || '',
        rationale: details.rationale || '',
        phase: item.phases?.name || '',
        patient_type: item.patient_types?.name || '',
        similarity: 1.0, // Direct relationship = 100% match
      };
    });

    console.log(`✅ [RAG] Found ${products.length} related products via junction table`);

    // Log a sample for debugging
    if (products.length > 0) {
      console.log(`   Sample: ${products[0].product_name} (${products[0].phase} phase)`);
    }

    return products;
  } catch (error) {
    console.error('❌ [RAG] Error in fetchRelatedProducts:', error);
    return [];
  }
}

/**
 * Detect if query is asking which procedures/conditions a PRODUCT treats
 * (i.e., Product → Procedure direction, REVERSE lookup)
 *
 * Examples that should return TRUE:
 * - "What conditions does AO ProVantage treat?"
 * - "Which procedures use Chlorhexidine?"
 * - "What is PerioChip used for?"
 *
 * Examples that should return FALSE:
 * - "What products treat gingivitis?" (asking for products, not procedures)
 * - "Products used for periodontitis" (asking for products)
 *
 * @param {string} query - User query
 * @returns {boolean}
 */
function isProductFocusedQuery(query) {
  const lowerQuery = query.toLowerCase();

  // If query explicitly asks for PRODUCTS, it's NOT product-focused (it's procedure-focused)
  const askingForProducts = [
    'what products',
    'which products',
    'show products',
    'list products',
    'products for',
    'products that',
    'products used',
  ];

  if (askingForProducts.some(phrase => lowerQuery.includes(phrase))) {
    return false; // User wants products, not procedures
  }

  // Check if query asks about conditions/procedures (product → procedure direction)
  const askingForProcedures = [
    'what conditions',
    'what procedures',
    'which conditions',
    'which procedures',
    'what does', // "What does AO ProVantage treat?"
    'what is', // "What is PerioChip used for?"
    'treats what',
    'used for what',
  ];

  return askingForProcedures.some(phrase => lowerQuery.includes(phrase));
}

/**
 * Find procedures that use a specific product (reverse lookup)
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} - Procedures that use this product
 */
async function findProceduresForProduct(productId) {
  try {
    console.log(`🔗 [RAG] Reverse lookup: Finding procedures for product ${productId}...`);

    const { data, error } = await supabase
      .from('procedure_phase_products')
      .select(`
        procedure_id,
        phase_id,
        patient_type_id,
        procedures!inner(id, name, pitch_points),
        phases!inner(name),
        patient_types(name)
      `)
      .eq('product_id', productId);

    if (error) {
      console.error('❌ [RAG] Error in reverse lookup:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️  [RAG] No procedures found for this product');
      return [];
    }

    // Transform to consistent format
    const procedures = data.map(item => ({
      id: item.procedures.id,
      name: item.procedures.name,
      pitch_points: item.procedures.pitch_points,
      phase: item.phases?.name || '',
      patient_type: item.patient_types?.name || '',
      similarity: 1.0, // Direct relationship
    }));

    // Deduplicate by procedure_id (a product may be used in multiple phases of same procedure)
    const uniqueProcedures = [];
    const seenIds = new Set();
    for (const proc of procedures) {
      if (!seenIds.has(proc.id)) {
        seenIds.add(proc.id);
        uniqueProcedures.push(proc);
      }
    }

    console.log(`✅ [RAG] Found ${uniqueProcedures.length} procedures via reverse lookup`);
    return uniqueProcedures;
  } catch (error) {
    console.error('❌ [RAG] Error in findProceduresForProduct:', error);
    return [];
  }
}

/**
 * Detect if query is asking about metadata (phases, patient types, categories)
 * instead of asking for product recommendations
 */
function isMetadataQuery(userQuery) {
  const query = userQuery.toLowerCase();

  // Patterns that indicate metadata queries
  const metadataPatterns = [
    /what\s+(phases|patient types|categories|stages|steps)\s+(are|exist|does)/i,
    /what\s+are\s+the\s+(phases|patient types|categories|stages|steps)/i,
    /list\s+(all\s+)?(phases|patient types|categories|stages|steps)/i,
    /show\s+me\s+(all\s+)?(phases|patient types|categories|stages|steps)/i,
    /which\s+(phases|patient types|categories|stages|steps)/i,
    /tell\s+me\s+about\s+the\s+(phases|patient types|categories|stages|steps)/i,
  ];

  for (const pattern of metadataPatterns) {
    if (pattern.test(query)) {
      const match = query.match(pattern);
      const metadataType = match[1]; // Extract what type of metadata
      return { isMetadata: true, type: metadataType };
    }
  }

  return { isMetadata: false };
}

/**
 * Extract unique metadata values from procedure relationships
 * Used for queries like "What phases are in X procedure?"
 */
async function extractProcedureMetadata(procedureId, metadataType) {
  console.log(`📊 [RAG] Extracting ${metadataType} metadata for procedure ${procedureId}...`);

  try {
    // Query the junction table to get all relationships
    const { data, error } = await supabase
      .from('procedure_phase_products')
      .select(`
        phases(id, name),
        patient_types(id, name),
        products(id, name)
      `)
      .eq('procedure_id', procedureId);

    if (error) {
      console.error('❌ [RAG] Error fetching metadata:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️  [RAG] No relationships found for this procedure');
      return [];
    }

    // Extract unique values based on metadata type
    const uniqueValues = new Set();

    if (metadataType.includes('phase') || metadataType.includes('stage') || metadataType.includes('step')) {
      data.forEach(item => {
        if (item.phases?.name) {
          uniqueValues.add(item.phases.name);
        }
      });
    } else if (metadataType.includes('patient type')) {
      data.forEach(item => {
        if (item.patient_types?.name) {
          uniqueValues.add(item.patient_types.name);
        }
      });
    }

    const values = Array.from(uniqueValues).sort();
    console.log(`✅ [RAG] Found ${values.length} unique ${metadataType} values:`, values);

    return values;

  } catch (err) {
    console.error('❌ [RAG] Exception extracting metadata:', err);
    return [];
  }
}

/**
 * Extract product mentions from a query using pattern matching
 * Handles various dental product naming conventions
 *
 * @param {string} query - User query (lowercased)
 * @returns {Array<string>} - Array of product mentions found
 */
function extractProductMentionsFromQuery(query) {
  const mentions = [];

  // Pattern 1: AO Pro products (provantage, protoothpaste, prorinse, etc.)
  const aoProPattern = /ao\s*pro\w+/gi;
  const aoMatches = query.match(aoProPattern) || [];
  mentions.push(...aoMatches.map((m) => m.toLowerCase().replace(/\s+/g, ' ').trim()));

  // Pattern 2: Perio products (periochip, perio protect, perioprotect, etc.)
  const perioPattern = /perio\s*(?:chip|protect|gel|guard|tray|rinse)\w*/gi;
  const perioMatches = query.match(perioPattern) || [];
  mentions.push(...perioMatches.map((m) => m.toLowerCase().replace(/\s+/g, ' ').trim()));

  // Pattern 3: Known standalone product names
  const knownProducts = [
    'arestin',
    'atridox',
    'chlorhexidine',
    'synvaza',
    'oraqix',
    'arrestin',
  ];
  for (const product of knownProducts) {
    if (query.includes(product)) {
      mentions.push(product);
    }
  }

  // Deduplicate
  return [...new Set(mentions)];
}

/**
 * Find a compound product that matches multiple mentions
 * E.g., "protoothpaste" and "prorinse" both match "AO ProToothpaste + AO ProRinse"
 *
 * @param {Array<string>} mentions - Product mentions from query
 * @param {Array} products - Available products to match against
 * @returns {Object|null} - Compound product that matches multiple mentions, or null
 */
function findCompoundProductMatch(mentions, products) {
  if (mentions.length < 2) return null;

  for (const product of products) {
    const prodName = product.product_name?.toLowerCase() || '';
    if (!prodName) continue;

    // Check if this product contains multiple mentions
    // Normalize for comparison
    const prodNorm = prodName.replace(/\s+/g, '');

    let matchCount = 0;
    for (const mention of mentions) {
      const mentionNorm = mention.replace(/\s+/g, '');

      // Extract distinctive parts for matching
      const mentionDistinctive = extractDistinctivePart(mentionNorm);

      // Check if this mention's distinctive part appears in the product name
      if (mentionDistinctive && mentionDistinctive.length >= 4) {
        if (prodNorm.includes(mentionDistinctive) || prodName.includes(mentionDistinctive)) {
          matchCount++;
        }
      }
    }

    // If multiple mentions match this single product, it's likely a compound product
    if (matchCount >= 2) {
      console.log(`   Found compound match: ${matchCount}/${mentions.length} mentions match "${product.product_name}"`);
      return product;
    }
  }

  return null;
}

/**
 * Find the best matching product for a query mention
 * Uses intelligent matching that considers distinctive parts of product names
 *
 * @param {string} mention - Product mention from query (e.g., "aoprotoothpaste")
 * @param {Array} products - Available products to match against
 * @returns {Object|null} - Best matching product or null
 */
function findBestProductMatch(mention, products) {
  const mentionNorm = mention.toLowerCase().replace(/\s+/g, '');

  let bestMatch = null;
  let bestScore = 0;

  for (const product of products) {
    const prodName = product.product_name?.toLowerCase() || '';
    if (!prodName) continue;

    const prodNorm = prodName.replace(/\s+/g, '');

    // Score 1: Exact match (highest priority)
    if (prodNorm === mentionNorm || prodNorm.replace(/gel|rinse|tray|paste$/i, '') === mentionNorm) {
      return product; // Perfect match, return immediately
    }

    // Score 2: Check if the DISTINCTIVE part matches
    // For "ao provantage gel" vs "aoprovantage" - the distinctive part is "vantage"
    // For "ao protoothpaste" vs "aoprotoothpaste" - the distinctive part is "toothpaste"
    const mentionDistinctive = extractDistinctivePart(mentionNorm);
    const prodDistinctive = extractDistinctivePart(prodNorm);

    if (mentionDistinctive && prodDistinctive) {
      // The distinctive parts must have significant overlap
      if (mentionDistinctive === prodDistinctive) {
        return product; // Distinctive parts match exactly
      }

      // Check for substantial substring match (not just "pro" or "ao")
      if (
        mentionDistinctive.length >= 4 &&
        prodDistinctive.length >= 4 &&
        (mentionDistinctive.includes(prodDistinctive) || prodDistinctive.includes(mentionDistinctive))
      ) {
        const overlap = Math.min(mentionDistinctive.length, prodDistinctive.length);
        if (overlap > bestScore) {
          bestScore = overlap;
          bestMatch = product;
        }
      }
    }

    // Score 3: Full name contains mention (but only if mention is specific enough)
    if (mentionNorm.length >= 8 && prodNorm.includes(mentionNorm)) {
      const score = mentionNorm.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }
  }

  return bestMatch;
}

/**
 * Extract the distinctive part of a product name
 * E.g., "aoprovantage" → "vantage", "aoprotoothpaste" → "toothpaste"
 *
 * @param {string} normalizedName - Product name with spaces removed, lowercased
 * @returns {string} - The distinctive part of the name
 */
function extractDistinctivePart(normalizedName) {
  // Remove common prefixes
  let distinctive = normalizedName
    .replace(/^ao/, '')
    .replace(/^pro/, '')
    .replace(/^perio/, '');

  // Remove common suffixes (but keep them if they ARE the distinctive part)
  const suffixMatch = distinctive.match(/(gel|rinse|tray|paste|chip|toothpaste)$/i);
  if (suffixMatch && distinctive.length > suffixMatch[1].length + 3) {
    // Only remove suffix if there's more content
    distinctive = distinctive.replace(/(gel|rinse|tray|paste|chip)$/i, '');
  }

  return distinctive;
}

/**
 * Filter procedures by relevance to avoid false positives
 * Uses two strategies from RAG_CONFIG:
 * 1. Minimum similarity threshold (MIN_PROCEDURE_SIMILARITY)
 * 2. Relevance gap detection (MAX_PROCEDURE_SIMILARITY_GAP)
 *
 * @param {Array} procedures - Procedures with similarity scores
 * @returns {Array} - Filtered procedures
 */
function filterRelevantProcedures(procedures) {
  if (!procedures || procedures.length === 0) {
    return [];
  }

  const MIN_SIMILARITY = RAG_CONFIG.MIN_PROCEDURE_SIMILARITY;
  const MAX_GAP = RAG_CONFIG.MAX_PROCEDURE_SIMILARITY_GAP;

  // Get top result's similarity
  const topSimilarity = procedures[0]?.similarity || 0;

  // Filter by minimum similarity AND gap from top result
  const filtered = procedures.filter((proc) => {
    const similarity = proc.similarity || 0;

    // Must meet minimum similarity threshold
    if (similarity < MIN_SIMILARITY) {
      console.log(`   ❌ Filtering out "${proc.name}" - similarity ${similarity.toFixed(3)} below threshold ${MIN_SIMILARITY}`);
      return false;
    }

    // Must not be too far from top result
    const gap = topSimilarity - similarity;
    if (gap > MAX_GAP) {
      console.log(`   ❌ Filtering out "${proc.name}" - gap ${gap.toFixed(3)} from top result (${topSimilarity.toFixed(3)} → ${similarity.toFixed(3)})`);
      return false;
    }

    console.log(`   ✅ Keeping "${proc.name}" - similarity ${similarity.toFixed(3)} (gap: ${gap.toFixed(3)})`);
    return true;
  });

  // Limit to max final procedures
  return filtered.slice(0, RAG_CONFIG.MAX_PROCEDURES_FINAL);
}

/**
 * Perform comprehensive RAG search across all data sources
 * Uses HYBRID approach: Semantic search for procedures + Relational queries for products
 * Supports BIDIRECTIONAL search: procedure→products AND product→procedures
 * @param {string} userQuery - User's question
 * @returns {Promise<Object>} - Retrieved context from all sources
 */
export async function retrieveContext(userQuery) {
  console.log('🚀 [RAG] Starting ENHANCED context retrieval for query:', userQuery);

  try {
    // STEP 0: Query Understanding - Reformulate query for better search
    console.log('🧠 [RAG] Step 0: Understanding query and reformulating...');
    const understoodQuery = await understandQuery(userQuery);

    console.log('✅ [RAG] Query understanding complete:');
    console.log('   Intent:', understoodQuery.intent);
    console.log('   Complexity:', understoodQuery.complexity);
    console.log('   Strategy:', understoodQuery.search_strategy);
    console.log('   Search keywords:', understoodQuery.search_keywords.slice(0, 5).join(', '));

    // STEP 0.5: Try LLM entity extraction for structured query (direct database lookup)
    console.log('🔍 [RAG] Step 0.5: Attempting LLM entity extraction...');
    const extraction = await extractAndValidateEntities(userQuery, supabase);

    if (extraction.isValid) {
      console.log('🎯 [RAG] LLM extraction successful! Found both product and condition in database.');
      console.log(`   Product: ${extraction.productMatch.name}`);
      console.log(`   Condition: ${extraction.conditionMatch.name}`);
      console.log(`   Intent: ${extraction.intent}`);
      console.log(`   Confidence: ${extraction.confidence}`);

      // Fetch product_details for this exact product + condition combo
      const { data: details, error: detailsError } = await supabase
        .from('product_details')
        .select('*')
        .eq('product_id', extraction.productMatch.id)
        .eq('procedure_id', extraction.conditionMatch.id)
        .limit(1);

      if (!detailsError && details && details.length > 0) {
        console.log('✅ [RAG] Found exact product_details record!');

        // Also fetch phase/patient type info
        const { data: phaseInfo } = await supabase
          .from('procedure_phase_products')
          .select(`
            phase_id,
            patient_type_id,
            phases(name),
            patient_types(name)
          `)
          .eq('procedure_id', extraction.conditionMatch.id)
          .eq('product_id', extraction.productMatch.id);

        // Return structured result immediately
        return {
          isStructured: true,
          extraction,
          procedures: [extraction.conditionMatch],
          products: [{
            product_id: extraction.productMatch.id,
            product_name: extraction.productMatch.name,
            ...details[0],
            phase: phaseInfo?.map(p => p.phases?.name).filter(Boolean).join(', '),
            patient_type: phaseInfo?.map(p => p.patient_types?.name).filter(Boolean).join(', ')
          }],
          research: [],
          totalResults: 1,
          queryType: extraction.intent
        };
      } else {
        console.log('⚠️  [RAG] No product_details found for this combination, falling back to semantic search');
      }
    } else {
      console.log('➡️  [RAG] LLM extraction not suitable for structured query - using semantic search');
      if (extraction.error) {
        console.log(`   Error: ${extraction.error}`);
      }
    }

    // Detect query direction: Is user asking about a specific product?
    const isProductQuery = isProductFocusedQuery(userQuery);
    let matchedProductNames = []; // Track which product(s) the user asked about
    let procedures = [];
    let relatedProducts = [];

    // Use centralized RAG config
    console.log(`🎛️  [RAG] Using thresholds from RAG_CONFIG: vector=${RAG_CONFIG.VECTOR_SEARCH_THRESHOLD_PROCEDURES}, text=${RAG_CONFIG.TEXT_SEARCH_THRESHOLD_PROCEDURES}`);

    if (isProductQuery) {
      console.log('🎯 [RAG] Detected product-focused query - searching PRODUCTS FIRST, then procedures via junction table');

      // STEP 1a: Search for products first
      console.log('⚡ [RAG] Step 1a: HYBRID search for products (to find which product user is asking about)...');
      const hybridProducts = await hybridSearchProducts(understoodQuery.search_keywords, {
        limit: RAG_CONFIG.MAX_PRODUCTS_RETRIEVED,
        vectorThreshold: RAG_CONFIG.VECTOR_SEARCH_THRESHOLD_PRODUCTS,
        textThreshold: RAG_CONFIG.TEXT_SEARCH_THRESHOLD_PRODUCTS,
        vectorBoost: RAG_CONFIG.VECTOR_BOOST,
        textBoost: RAG_CONFIG.TEXT_BOOST
      }).catch((err) => {
        console.warn('⚠️  [RAG] Hybrid products search failed:', err);
        return [];
      });

      if (hybridProducts.length > 0) {
        console.log(`✅ [RAG] Found ${hybridProducts.length} matching products`);

        // STEP 1b: For each product, find related procedures via junction table
        console.log('⚡ [RAG] Step 1b: Finding procedures that use these products (reverse lookup)...');
        for (const product of hybridProducts.slice(0, 3)) { // Top 3 products only
          const productProcedures = await findProceduresForProduct(product.product_id || product.id);
          procedures = [...procedures, ...productProcedures];
        }

        // Deduplicate procedures
        const uniqueProcedures = [];
        const seenIds = new Set();
        for (const proc of procedures) {
          if (!seenIds.has(proc.id)) {
            seenIds.add(proc.id);
            uniqueProcedures.push(proc);
          }
        }
        procedures = uniqueProcedures;

        console.log(`✅ [RAG] Found ${procedures.length} procedures via product reverse lookup`);
      } else {
        console.log('⚠️  [RAG] No products found, falling back to procedure search');
      }
    }

    // STEP 1: Hybrid Search for Procedures (Vector + Full-Text) - if not already found via product search
    if (procedures.length === 0) {
      console.log('⚡ [RAG] Step 1: HYBRID search for procedures (vector + full-text)...');
      console.log('   Search keywords:', understoodQuery.search_keywords);
      const allProcedures = await hybridSearchProcedures(understoodQuery.search_keywords, {
        limit: RAG_CONFIG.MAX_PROCEDURES_RETRIEVED,
        vectorThreshold: RAG_CONFIG.VECTOR_SEARCH_THRESHOLD_PROCEDURES,
        textThreshold: RAG_CONFIG.TEXT_SEARCH_THRESHOLD_PROCEDURES,
        vectorBoost: RAG_CONFIG.VECTOR_BOOST,
        textBoost: RAG_CONFIG.TEXT_BOOST
      }).catch((err) => {
        console.warn('⚠️  [RAG] Hybrid procedures search failed, falling back to semantic only:', err);
        return searchProcedures(userQuery, { matchCount: 3 }).catch(() => []);
      });

      // Filter procedures by relevance to avoid false positives
      console.log('🔍 [RAG] Filtering procedures by relevance...');
      procedures = filterRelevantProcedures(allProcedures);
      console.log(`✅ [RAG] Found ${procedures.length} relevant procedures (filtered from ${allProcedures.length})`);
    } else {
      console.log(`✅ [RAG] Using ${procedures.length} procedures from product reverse lookup`);
    }

    // Check if this is a metadata query (asking about phases, patient types, etc.)
    const metadataInfo = isMetadataQuery(userQuery);

    if (metadataInfo.isMetadata && procedures.length > 0) {
      console.log(`🎯 [RAG] Detected metadata query for: ${metadataInfo.type}`);

      // Extract metadata for the top procedure
      const topProcedure = procedures[0];
      const metadataValues = await extractProcedureMetadata(topProcedure.id, metadataInfo.type);

      if (metadataValues.length > 0) {
        // Return metadata-specific context
        return {
          isMetadataQuery: true,
          metadataType: metadataInfo.type,
          procedure: topProcedure,
          metadataValues: metadataValues,
          procedures: procedures,
          products: [],
          research: []
        };
      }

      // If no metadata found, continue with normal flow
      console.log('⚠️  [RAG] No metadata found, continuing with normal product search');
    }

    // STEP 2: For each found procedure, fetch related products via junction table
    console.log('⚡ [RAG] Step 2: Fetching related products for found procedures...');
    for (const proc of procedures) {
      const procProducts = await fetchRelatedProducts(proc.id);
      relatedProducts = [...relatedProducts, ...procProducts];
    }

    console.log(`   Found ${relatedProducts.length} products via junction table`);

    // STEP 3: Hybrid Search for Products (Vector + Full-Text)
    console.log('⚡ [RAG] Step 3: HYBRID search for products (vector + full-text)...');
    console.log('   Search keywords:', understoodQuery.search_keywords);
    const hybridProducts = await hybridSearchProducts(understoodQuery.search_keywords, {
      limit: RAG_CONFIG.MAX_PRODUCTS_RETRIEVED,
      vectorThreshold: RAG_CONFIG.VECTOR_SEARCH_THRESHOLD_PRODUCTS,
      textThreshold: RAG_CONFIG.TEXT_SEARCH_THRESHOLD_PRODUCTS,
      vectorBoost: RAG_CONFIG.VECTOR_BOOST,
      textBoost: RAG_CONFIG.TEXT_BOOST
    }).catch((err) => {
      console.warn('⚠️  [RAG] Hybrid products search failed, falling back to semantic only:', err);
      return searchProductDetails(userQuery, { matchCount: 5 }).catch(() => []);
    });

    // Convert hybrid product results to match expected format
    // Note: products table only has id, name, is_available
    const semanticProducts = hybridProducts.map(prod => ({
      product_id: prod.id,
      product_name: prod.name,
      is_available: prod.is_available,
      similarity: prod.combined_score || prod.similarity || 0.7,
      found_in: prod.found_in || ['hybrid']
    }));

    console.log(`✅ [RAG] Found ${semanticProducts.length} products via hybrid search`);

    // Combine relational + semantic products (deduplicate by product_id)
    const allProducts = [...relatedProducts];
    for (const prod of semanticProducts) {
      if (!allProducts.find(p => p.product_id === prod.product_id)) {
        allProducts.push(prod);
      }
    }

    console.log(`   Total products: ${allProducts.length} (${relatedProducts.length} relational + ${semanticProducts.length} semantic)`);

    // STEP 3.5: BIDIRECTIONAL SEARCH - If product-focused query, do reverse lookup
    let additionalProcedures = [];
    if (isProductQuery && semanticProducts.length > 0) {
      console.log('⚡ [RAG] Step 3.5: Reverse lookup - finding procedures for semantic products...');

      // Deduplicate products by product_id before doing reverse lookup
      const uniqueProductIds = new Set();
      const uniqueProducts = [];
      for (const product of semanticProducts) {
        if (product.product_id && !uniqueProductIds.has(product.product_id)) {
          uniqueProductIds.add(product.product_id);
          uniqueProducts.push(product);
        }
      }

      console.log(`   Deduped: ${semanticProducts.length} products → ${uniqueProducts.length} unique`);

      // Check if query mentions SPECIFIC product names
      // Use intelligent matching to find the right products
      let targetProducts = uniqueProducts;

      // Extract ALL product mentions from the query
      const queryLower = userQuery.toLowerCase();
      const productMentions = extractProductMentionsFromQuery(queryLower);

      console.log(`🔍 [RAG] Extracted product mentions from query: ${productMentions.length > 0 ? productMentions.join(', ') : 'none'}`);

      if (productMentions.length > 0) {
        // First, check if multiple mentions match a SINGLE compound product
        // E.g., "protoothpaste" and "prorinse" both match "AO ProToothpaste + AO ProRinse"
        const compoundMatch = findCompoundProductMatch(productMentions, uniqueProducts);

        if (compoundMatch) {
          console.log(`🎯 [RAG] Multiple mentions match compound product: "${compoundMatch.product_name}"`);
          targetProducts = [compoundMatch];
          matchedProductNames = [compoundMatch.product_name];
        } else {
          // Find matching products for each mention individually
          const matchedProducts = [];
          const matchedNames = new Set();

          for (const mention of productMentions) {
            const match = findBestProductMatch(mention, uniqueProducts);
            if (match && !matchedNames.has(match.product_name)) {
              matchedProducts.push(match);
              matchedNames.add(match.product_name);
              console.log(`   ✅ "${mention}" matched to "${match.product_name}"`);
            } else if (!match) {
              console.log(`   ❌ "${mention}" - no matching product found in results`);
            }
          }

          if (matchedProducts.length > 0) {
            console.log(`🎯 [RAG] Found ${matchedProducts.length} specific product(s) in query`);
            targetProducts = matchedProducts;
            matchedProductNames = matchedProducts.map(p => p.product_name);
          } else {
            console.log(`   No products matched, using all ${uniqueProducts.length} semantic results`);
          }
        }
      } else {
        console.log(`   No specific product detected in query, using all ${uniqueProducts.length} products`);
      }

      // For each target product, find which procedures use it
      for (const product of targetProducts) {
        const procs = await findProceduresForProduct(product.product_id);
        additionalProcedures = [...additionalProcedures, ...procs];
      }

      // Deduplicate and merge with existing procedures
      const addedCount = additionalProcedures.filter(proc => {
        if (!procedures.find(p => p.id === proc.id)) {
          procedures.push(proc);
          return true;
        }
        return false;
      }).length;

      if (addedCount > 0) {
        console.log(`✅ [RAG] Added ${addedCount} unique procedures via reverse lookup`);
      }
    }

    // STEP 4: Search research articles
    console.log('⚡ [RAG] Step 4: Semantic search for research...');
    const research = await searchResearch(userQuery, { matchCount: 2 }).catch(() => {
      console.warn('⚠️  [RAG] Research search failed, continuing with empty results');
      return [];
    });

    const totalResults = procedures.length + allProducts.length + research.length;
    console.log(`✅ [RAG] Enhanced context retrieval complete. Total results: ${totalResults}`);
    console.log(`   - Procedures: ${procedures.length}${additionalProcedures.length > 0 ? ` (+${additionalProcedures.length} from reverse lookup)` : ''}`);
    console.log(`   - Products: ${allProducts.length}`);
    console.log(`   - Research: ${research.length}`);

    return {
      procedures,
      products: allProducts,
      research,
      totalResults,
      understoodQuery, // Include query understanding results for debugging
      matchedProductNames, // Track which product(s) the user asked about
    };
  } catch (error) {
    console.error('❌ [RAG] Context retrieval error:', error);
    return {
      procedures: [],
      products: [],
      research: [],
      totalResults: 0,
      error: error.message,
    };
  }
}

/**
 * Parse query constraints (phase, patient type) to filter products
 * @param {string} query - User query
 * @returns {Object} - Extracted constraints
 */
function parseQueryConstraints(query) {
  const lowerQuery = query.toLowerCase();

  const constraints = {
    phase: null,
    patientType: null,
  };

  // Detect phase
  if (lowerQuery.includes('early') || lowerQuery.includes('prep')) {
    constraints.phase = 'Early';
  } else if (lowerQuery.includes('acute') || lowerQuery.includes('active')) {
    constraints.phase = 'Acute';
  } else if (lowerQuery.includes('maintenance') || lowerQuery.includes('supportive')) {
    constraints.phase = 'Maintenance';
  }

  // Detect patient type
  if (lowerQuery.includes('healthy') || lowerQuery.includes('type 1')) {
    constraints.patientType = 'Type 1';
  } else if (lowerQuery.includes('type 2')) {
    constraints.patientType = 'Type 2';
  } else if (lowerQuery.includes('type 3')) {
    constraints.patientType = 'Type 3';
  } else if (lowerQuery.includes('type 4')) {
    constraints.patientType = 'Type 4';
  }

  return constraints;
}

/**
 * Filter products based on query constraints
 * @param {Array} products - Products to filter
 * @param {Object} constraints - Phase and patient type constraints
 * @returns {Array} - Filtered products
 */
function filterProductsByConstraints(products, constraints) {
  if (!constraints.phase && !constraints.patientType) {
    // No constraints, return all products (but limit to prevent overflow)
    return products.slice(0, 20);
  }

  let filtered = products;

  // Filter by phase if specified
  if (constraints.phase) {
    filtered = filtered.filter(p =>
      p.phase && (
        p.phase.includes(constraints.phase) ||
        p.phase.includes('All Phases')
      )
    );
    console.log(`   Filtered by phase "${constraints.phase}": ${products.length} → ${filtered.length} products`);
  }

  // Filter by patient type if specified
  if (constraints.patientType) {
    filtered = filtered.filter(p =>
      p.patient_type && p.patient_type.includes(constraints.patientType)
    );
    console.log(`   Filtered by patient type "${constraints.patientType}": ${products.length} → ${filtered.length} products`);
  }

  // If filtering was too aggressive, fall back to top matches
  if (filtered.length === 0) {
    console.log('   ⚠️  Filters too strict, falling back to top 10 products');
    return products.slice(0, 10);
  }

  // Limit to 15 products max to prevent token overflow
  return filtered.slice(0, 15);
}

/**
 * Build RAG prompt with retrieved context
 * @param {string} userQuery - User's question
 * @param {Object} context - Retrieved documents
 * @returns {string} - Formatted prompt for LLM
 */
export function buildRAGPrompt(userQuery, context) {
  // Detect if query is asking about which procedures use a product
  const isProductToProc = isProductFocusedQuery(userQuery);

  // Parse query constraints and filter products
  const constraints = parseQueryConstraints(userQuery);
  console.log('🔍 [RAG] Query constraints:', constraints);

  if (context.products && context.products.length > 0 && (constraints.phase || constraints.patientType)) {
    context.products = filterProductsByConstraints(context.products, constraints);
  } else if (context.products && context.products.length > RAG_CONFIG.MAX_PRODUCTS_IN_PROMPT) {
    // Even without constraints, limit to prevent token overflow
    console.log(`   Limiting products: ${context.products.length} → ${RAG_CONFIG.MAX_PRODUCTS_IN_PROMPT} (no constraints)`);
    context.products = context.products.slice(0, RAG_CONFIG.MAX_PRODUCTS_IN_PROMPT);
  }

  let prompt = `You are a knowledgeable dental sales assistant specializing in periodontal procedures and products.

`;

  if (isProductToProc) {
    // Use the matched product name if available, otherwise generic placeholder
    const productName = context.matchedProductNames && context.matchedProductNames.length > 0
      ? context.matchedProductNames[0]
      : 'This product';

    prompt += `The user is asking WHICH CONDITIONS/PROCEDURES use a specific product.

IMPORTANT: The user is asking about "${productName}" - use this EXACT name in your response.

CRITICAL INSTRUCTIONS:
1. First line MUST list ALL procedures found: "${productName} is used for: [Procedure 1], [Procedure 2], [Procedure 3], ..."
2. Count how many procedures are in the context below and list EVERY SINGLE ONE by name
3. Then provide brief details about each procedure
4. DO NOT just pick one procedure - list ALL of them
5. DO NOT describe the product's benefits first - ANSWER THE QUESTION: which procedures?
6. ALWAYS refer to the product as "${productName}" - NOT any other product name

Format:
"${productName} is recommended for the following procedures:
1. [Procedure Name 1]
2. [Procedure Name 2]
3. [Procedure Name 3]
... (continue for ALL procedures in context)"

`;
  } else {
    // User is asking for products (procedure → product direction)
    prompt += `The user is asking about products for a dental condition.

INSTRUCTIONS:
1. Answer based on the context provided below
2. Use the "Pitch Points", "Clinical Evidence", and "Rationale" fields when available
3. If asking about a specific product, focus on that product's details
4. If asking which products to recommend, list the relevant products with their key benefits
5. Always mention phase and patient type when available
6. Be comprehensive - you have full details for all products in the context

`;
  }

  prompt += `Answer based ONLY on the provided context below.

CONTEXT:
`;

  // Add procedures context with ALL details (embeddings already limited to top results)
  if (context.procedures && context.procedures.length > 0) {
    // For product-to-procedure queries, include ALL procedures since user wants the full list
    // For other queries, limit to 5 to save tokens
    const maxProcedures = isProductToProc ? context.procedures.length : 5;
    const topProcedures = context.procedures.slice(0, maxProcedures);

    if (isProductToProc) {
      prompt += `\n## ALL Procedures Using This Product (${topProcedures.length} total):\n`;
      // For product-to-procedure, just list names clearly
      topProcedures.forEach((proc, idx) => {
        prompt += `${idx + 1}. ${proc.name}\n`;
      });
      prompt += `\nYou MUST list all ${topProcedures.length} procedures above in your answer.\n`;
    } else {
      prompt += `\n## Relevant Procedures (showing ${topProcedures.length} of ${context.procedures.length}):\n`;
      topProcedures.forEach((proc, idx) => {
        prompt += `${idx + 1}. **${proc.name}** (${(proc.similarity * 100).toFixed(0)}% match)\n`;

        // Include ALL available information (embeddings already limited result set)
        if (proc.category) {
          prompt += `   Category: ${proc.category}\n`;
        }
        if (proc.patient_type) {
          prompt += `   Patient Type: ${proc.patient_type}\n`;
        }
        if (proc.pitch_points) {
          prompt += `   Pitch Points: ${proc.pitch_points}\n`;
        }
      });
    }
  }

  // Add products context with ALL details (embeddings already limited to top results)
  if (context.products && context.products.length > 0) {
    prompt += `\n## Relevant Products (${context.products.length}):\n`;
    context.products.forEach((prod, idx) => {
      prompt += `${idx + 1}. **${prod.product_name}**`;

      // Add procedure name if available
      if (prod.procedure_name) {
        prompt += ` → ${prod.procedure_name}`;
      }

      // Add phase and patient type if available
      if (prod.phase && prod.patient_type) {
        prompt += ` (${prod.phase}, ${prod.patient_type})`;
      } else if (prod.phase) {
        prompt += ` (${prod.phase})`;
      } else if (prod.patient_type) {
        prompt += ` (Patient Type: ${prod.patient_type})`;
      }
      prompt += `\n`;

      // Include ALL available information (no truncation, no conditions)
      // Embeddings already limited us to only the most relevant products
      if (prod.pitch_points) {
        prompt += `   Pitch Points: ${prod.pitch_points}\n`;
      }

      if (prod.clinical_evidence) {
        prompt += `   Clinical Evidence: ${prod.clinical_evidence}\n`;
      }

      if (prod.rationale) {
        prompt += `   Rationale: ${prod.rationale}\n`;
      }
    });
  }

  // Add research context with full abstracts (embeddings already limited to top results)
  if (context.research && context.research.length > 0) {
    prompt += `\n## Relevant Research:\n`;
    context.research.forEach((article, idx) => {
      prompt += `${idx + 1}. **${article.title}** by ${article.author || 'Unknown'}\n`;
      if (article.abstract) {
        prompt += `   Abstract: ${article.abstract}\n`;
      }
      if (article.journal) {
        prompt += `   Journal: ${article.journal}\n`;
      }
      if (article.year) {
        prompt += `   Year: ${article.year}\n`;
      }
    });
  }

  // Final instruction based on query type
  if (isProductToProc) {
    prompt += `\n---\n\nQUESTION: ${userQuery}\n\nANSWER: List ALL procedures this product is used for. Start with a summary line, then list each procedure by name.`;
  } else {
    prompt += `\n---\n\nQUESTION: ${userQuery}\n\nANSWER: Provide a comprehensive answer using ALL the context provided above. Include pitch points, clinical evidence, and rationale when relevant. Be specific and detailed.`;
  }

  // Log final prompt stats
  const estimatedTokens = Math.ceil(prompt.length / 4); // Rough estimate: 1 token ≈ 4 chars
  console.log(`📊 [RAG] Prompt stats: ${prompt.length} chars, ~${estimatedTokens} tokens (limit: 16385)`);

  return prompt;
}

/**
 * Generate RAG response with streaming
 * @param {string} userQuery - User's question
 * @param {Function} onChunk - Callback for streaming chunks
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Response metadata
 */
export async function generateRAGResponse(userQuery, onChunk, options = {}) {
  const startTime = Date.now();
  console.log('🎯 [RAG] Starting RAG response generation');

  try {
    // Step 1: Retrieve relevant context
    console.log('📚 [RAG] Step 1: Retrieving context from database...');
    const context = await retrieveContext(userQuery);

    if (context.totalResults === 0) {
      console.log('⚠️  [RAG] No results found in database');
      onChunk("I couldn't find any relevant information in the database to answer your question. Could you try rephrasing or asking about a different topic?");
      return {
        success: true,
        context,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 2: Build RAG prompt
    console.log('🔨 [RAG] Step 2: Building RAG prompt with context...');

    let ragPrompt;
    if (context.isMetadataQuery) {
      // Metadata query - just list the metadata values
      console.log(`   Using metadata query format for: ${context.metadataType}`);
      ragPrompt = `You are answering a question about treatment metadata.

QUESTION: ${userQuery}

PROCEDURE: ${context.procedure.name}

${context.metadataType.toUpperCase()} FOR THIS PROCEDURE:
${context.metadataValues.map((val, idx) => `${idx + 1}. ${val}`).join('\n')}

INSTRUCTIONS:
- Answer the user's question directly and concisely
- List ONLY the ${context.metadataType} (do NOT list products)
- Use the exact names provided above
- Be brief - just list the ${context.metadataType} for this procedure

ANSWER:`;
    } else if (context.isStructured) {
      // Use structured query result format
      console.log('   Using structured query format (direct database lookup via LLM extraction)');

      const product = context.products[0];
      const procedure = context.procedures[0];

      ragPrompt = `You are answering a specific question about a product for a dental condition.

QUESTION: ${userQuery}

EXACT DATABASE RECORD FOUND:

## Product: ${product.product_name}
## Condition: ${procedure.name}
`;

      // Include ALL available fields
      if (product.pitch_points) {
        ragPrompt += `\n## Pitch Points:\n${product.pitch_points}\n`;
      }

      if (product.clinical_evidence) {
        ragPrompt += `\n## Clinical Evidence:\n${product.clinical_evidence}\n`;
      }

      if (product.rationale) {
        ragPrompt += `\n## Rationale:\n${product.rationale}\n`;
      }

      if (product.rationale_2) {
        ragPrompt += `\n## Additional Rationale:\n${product.rationale_2}\n`;
      }

      if (product.objection_handling) {
        ragPrompt += `\n## Objection Handling:\n${product.objection_handling}\n`;
      }

      // Add phase/patient type info
      if (product.phase || product.patient_type) {
        ragPrompt += `\n## Usage Information:\n`;
        if (product.phase) {
          ragPrompt += `- Recommended Phases: ${product.phase}\n`;
        }
        if (product.patient_type) {
          ragPrompt += `- Patient Types: ${product.patient_type}\n`;
        }
      }

      ragPrompt += `\n---

INSTRUCTIONS:
Answer the user's question comprehensively using the information above.
- Format pitch points as a clear bullet list
- Include clinical evidence if relevant to the question
- Be specific and detailed - this is for sales training
- Use the exact information from the database fields above

ANSWER:`;
    } else {
      // Use semantic search format
      console.log('   Using semantic search format');
      ragPrompt = buildRAGPrompt(userQuery, context);
    }

    console.log('   Prompt length:', ragPrompt.length, 'characters');

    // Adjust maxTokens based on number of products (need ~50 tokens per product for brief listing)
    const productCount = context.products?.length || 0;
    const procedureCount = context.procedures?.length || 0;
    const itemCount = Math.max(productCount, procedureCount);

    let adjustedMaxTokens = options.maxTokens || RAG_CONFIG.RESPONSE_MAX_TOKENS;

    if (itemCount > 5) {
      // Need more tokens for listing many items
      adjustedMaxTokens = Math.min(itemCount * 60 + 200, RAG_CONFIG.RESPONSE_MAX_TOKENS);
      console.log(`   Adjusting maxTokens: ${options.maxTokens || RAG_CONFIG.RESPONSE_MAX_TOKENS} → ${adjustedMaxTokens} (for ${itemCount} items)`);
    }

    // Step 3: Stream LLM response
    console.log('💬 [RAG] Step 3: Streaming response from OpenAI...');

    const systemMessage = context.isStructured
      ? 'You are a knowledgeable dental sales assistant. You have been given EXACT database information. Provide a detailed, comprehensive answer using all the information provided. Format pitch points as bullet lists for clarity.'
      : 'You are a concise dental sales assistant. List all relevant items from the context without lengthy explanations.';

    await streamChatCompletion(
      [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: ragPrompt,
        },
      ],
      onChunk,
      {
        ...options,
        maxTokens: adjustedMaxTokens,
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`✅ [RAG] Response generation complete in ${executionTime}ms`);

    return {
      success: true,
      context,
      executionTime,
    };
  } catch (error) {
    console.error('❌ [RAG] RAG generation error:', error);
    onChunk(`Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Generate suggested follow-up questions based on context
 * @param {Object} context - Retrieved context
 * @returns {Array<string>} - Suggested questions
 */
export function generateFollowUpQuestions(context) {
  const suggestions = [];

  if (context.procedures && context.procedures.length > 0) {
    const proc = context.procedures[0];
    suggestions.push(`What products are recommended for ${proc.name}?`);
    suggestions.push(`Tell me more about the phases of ${proc.name}`);
  }

  if (context.products && context.products.length > 0) {
    const prod = context.products[0];
    suggestions.push(`What's the clinical evidence for ${prod.product_name}?`);
    suggestions.push(`How does ${prod.product_name} compare to competitors?`);
  }

  if (context.research && context.research.length > 0) {
    suggestions.push('Show me more research articles on this topic');
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}
