/**
 * Agentic Search Service - GPT-4o with SQL Function Calling
 *
 * Replaces traditional RAG with direct database queries via function calling.
 * GPT-4o decides which SQL queries to run based on user questions.
 *
 * Architecture:
 * - No embeddings or vector search
 * - No routing/retrieval pipeline
 * - Direct SQL queries via Supabase
 * - Streaming responses for better UX
 *
 * Benefits:
 * - Simpler (1 service vs 15 files)
 * - Faster (direct SQL vs embedding pipeline)
 * - Smarter (GPT-4o reasoning > hardcoded routing)
 * - Transparent (see exactly which queries run)
 */

import OpenAI from 'openai';
import { supabase } from '../../supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'gpt-4o-mini'; // Use mini for cost efficiency (10x cheaper, still has function calling)
const MAX_TOKENS = 1000; // Reduce max tokens
const TEMPERATURE = 0.7;
const QUERY_TIMEOUT_MS = 5000; // 5 second timeout for SQL queries
const MAX_RESULTS_PER_QUERY = 5; // Limit results to save tokens

// Minimal schema - keep token usage low
const DB_INFO = `Tables: products, procedures, product_details, procedure_phase_products, competitive_advantage_competitors, research_articles. Phases: Prep/Acute/Maintenance. Patient types: Type 1-4.`;

// =====================================================
// FUNCTION DEFINITIONS (Tools for GPT-4o)
// =====================================================

// Simplified tools - reduce token usage
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Find products by name',
      parameters: {
        type: 'object',
        properties: {
          search_term: { type: 'string' },
        },
        required: ['search_term'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_procedures',
      description: 'Find procedures/conditions by name',
      parameters: {
        type: 'object',
        properties: {
          search_term: { type: 'string' },
        },
        required: ['search_term'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get clinical evidence, rationale, pitch points for a product',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'integer' },
          procedure_id: { type: 'integer' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products_for_procedure',
      description: 'Get products for procedure, optionally filter by phase/patient type',
      parameters: {
        type: 'object',
        properties: {
          procedure_id: { type: 'integer' },
          phase: { type: 'string', enum: ['Prep', 'Acute', 'Maintenance'] },
          patient_type: { type: 'string', enum: ['Type 1', 'Type 2', 'Type 3', 'Type 4'] },
        },
        required: ['procedure_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_competitive_advantages',
      description: 'Get competitive advantages vs competitors',
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
        },
        required: ['product_name'],
      },
    },
  },
];

// =====================================================
// SQL QUERY FUNCTIONS (Implementations)
// =====================================================

/**
 * Execute a Supabase query with timeout
 */
async function executeQuery(queryBuilder, timeoutMs = QUERY_TIMEOUT_MS) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );

  try {
    const result = await Promise.race([queryBuilder, timeoutPromise]);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Search products by name - LIMIT RESULTS TO SAVE TOKENS
 */
async function searchProducts({ search_term }) {
  const query = supabase
    .from('products')
    .select('id, name')
    .ilike('name', `%${search_term}%`)
    .eq('is_available', true)
    .order('name')
    .limit(MAX_RESULTS_PER_QUERY);

  return await executeQuery(query);
}

/**
 * Search procedures by name - LIMIT RESULTS
 */
async function searchProcedures({ search_term }) {
  const query = supabase
    .from('procedures')
    .select('id, name, category')
    .ilike('name', `%${search_term}%`)
    .order('name')
    .limit(MAX_RESULTS_PER_QUERY);

  return await executeQuery(query);
}

/**
 * Get product details - TRUNCATE TEXT TO SAVE TOKENS
 */
async function getProductDetails({ product_id, procedure_id }) {
  let query = supabase
    .from('product_details')
    .select('product_name, procedure_name, clinical_evidence, rationale, fact_sheet_url')
    .eq('product_id', product_id)
    .limit(1);

  if (procedure_id) {
    query = query.eq('procedure_id', procedure_id);
  }

  const results = await executeQuery(query);

  // Truncate long text fields to save tokens
  return results.map(r => ({
    product_name: r.product_name,
    procedure_name: r.procedure_name,
    clinical_evidence: r.clinical_evidence?.substring(0, 300) + '...',
    rationale: r.rationale?.substring(0, 200) + '...',
    fact_sheet_url: r.fact_sheet_url,
  }));
}

/**
 * Get products for procedure - SIMPLIFIED AND LIMITED
 */
async function getProductsForProcedure({ procedure_id, phase, patient_type }) {
  let query = supabase
    .from('procedure_phase_products')
    .select('products:product_id (id, name), phases:phase_id (name), patient_types:patient_type_id (name)')
    .eq('procedure_id', procedure_id)
    .limit(MAX_RESULTS_PER_QUERY);

  if (phase) {
    const phaseResult = await supabase.from('phases').select('id').eq('name', phase).single();
    if (phaseResult.data) query = query.eq('phase_id', phaseResult.data.id);
  }

  if (patient_type) {
    const ptResult = await supabase.from('patient_types').select('id').eq('name', patient_type).single();
    if (ptResult.data) query = query.eq('patient_type_id', ptResult.data.id);
  }

  return await executeQuery(query);
}

/**
 * Get competitive advantages - TRUNCATE TO SAVE TOKENS
 */
async function getCompetitiveAdvantages({ product_name }) {
  const [competitors, ingredients] = await Promise.all([
    executeQuery(
      supabase
        .from('competitive_advantage_competitors')
        .select('competitor_name, advantages')
        .eq('product_name', product_name)
        .limit(3)
    ),
    executeQuery(
      supabase
        .from('competitive_advantage_active_ingredients')
        .select('ingredient_name, advantages')
        .eq('product_name', product_name)
        .limit(3)
    ),
  ]);

  // Truncate advantages text
  return {
    product_name,
    competitors: competitors.map(c => ({
      competitor_name: c.competitor_name,
      advantages: c.advantages?.substring(0, 150) + '...',
    })),
    ingredients: ingredients.map(i => ({
      ingredient_name: i.ingredient_name,
      advantages: i.advantages?.substring(0, 150) + '...',
    })),
  };
}

// Map function names to implementations (ONLY 5 FUNCTIONS)
const FUNCTION_MAP = {
  search_products: searchProducts,
  search_procedures: searchProcedures,
  get_product_details: getProductDetails,
  get_products_for_procedure: getProductsForProcedure,
  get_competitive_advantages: getCompetitiveAdvantages,
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Truncate function results to save tokens
 * Only send back essential data to the model
 */
function truncateResults(results) {
  const MAX_RESULT_STRING_LENGTH = 2000; // Max chars for entire result
  const resultString = JSON.stringify(results);

  if (resultString.length <= MAX_RESULT_STRING_LENGTH) {
    return results;
  }

  // If results is an array, limit to first 3 items
  if (Array.isArray(results)) {
    return results.slice(0, 3);
  }

  // If results is an object, truncate string values
  if (typeof results === 'object') {
    const truncated = {};
    for (const [key, value] of Object.entries(results)) {
      if (typeof value === 'string' && value.length > 100) {
        truncated[key] = value.substring(0, 100) + '...';
      } else if (Array.isArray(value)) {
        truncated[key] = value.slice(0, 3);
      } else {
        truncated[key] = value;
      }
    }
    return truncated;
  }

  return results;
}

// =====================================================
// MAIN AGENTIC SEARCH FUNCTION
// =====================================================

/**
 * Execute agentic search with streaming
 * @param {string} userQuery - User's question
 * @param {Function} onChunk - Callback for each streamed text chunk
 * @param {Function} onFunctionCall - Callback when function is called
 * @param {Array} conversationHistory - Previous messages (optional)
 * @returns {Promise<Object>} - Final response with metadata
 */
export async function agenticSearch(
  userQuery,
  onChunk,
  onFunctionCall,
  conversationHistory = []
) {
  const startTime = Date.now();
  const functionCalls = [];
  let totalTokens = 0;

  try {
    // Build messages array - NO HISTORY TO SAVE TOKENS
    const messages = [
      {
        role: 'system',
        content: `You help dental sales reps find products, procedures, and competitive info. ${DB_INFO} Be concise. Use functions to query data.`,
      },
      // DISABLED: conversationHistory (saves massive tokens)
      {
        role: 'user',
        content: userQuery,
      },
    ];

    // Initial API call
    let response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      stream: false, // We'll handle streaming in the final response
    });

    let assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    // Handle function calls (may be multiple rounds)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute all function calls in parallel
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          // Notify UI about function call
          if (onFunctionCall) {
            onFunctionCall({
              name: functionName,
              arguments: functionArgs,
            });
          }

          // Execute function
          const functionToCall = FUNCTION_MAP[functionName];
          let functionResult;

          try {
            functionResult = await functionToCall(functionArgs);
            functionCalls.push({
              name: functionName,
              arguments: functionArgs,
              result: functionResult,
              success: true,
            });
          } catch (error) {
            functionResult = {
              error: error.message,
            };
            functionCalls.push({
              name: functionName,
              arguments: functionArgs,
              error: error.message,
              success: false,
            });
          }

          // Truncate results before sending back to model to save tokens
          const truncatedResult = truncateResults(functionResult);

          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(truncatedResult),
          };
        })
      );

      // Add function results to messages
      messages.push(...toolResults);

      // Get next response from model
      response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        stream: false,
      });

      assistantMessage = response.choices[0].message;
      messages.push(assistantMessage);
    }

    // Stream final response
    if (assistantMessage.content && onChunk) {
      // Simulate streaming for consistent UX
      const words = assistantMessage.content.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        await new Promise((resolve) => setTimeout(resolve, 20)); // 20ms delay for smooth streaming
      }
    }

    totalTokens = response.usage?.total_tokens || 0;

    return {
      response: assistantMessage.content,
      functionCalls,
      executionTime: Date.now() - startTime,
      totalTokens,
      model: MODEL,
      conversationHistory: messages,
    };
  } catch (error) {
    throw new Error(`Agentic search failed: ${error.message}`);
  }
}

/**
 * Check if agentic search is configured
 */
export function checkAgenticSearchStatus() {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return {
      configured: false,
      error: 'Missing required environment variables',
    };
  }

  return {
    configured: true,
    ready: true,
    model: MODEL,
  };
}
