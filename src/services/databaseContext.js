/**
 * Database Context System for LLM Integration
 * Provides comprehensive schema information and context for intelligent querying
 */

export const DATABASE_SCHEMA_CONTEXT = {
  // Core business entities and their purposes
  entities: {
    procedures: {
      description: "Dental/periodontal procedures and surgical treatments",
      columns: ["id", "name", "category", "pitch_points", "category_id", "patient_type"],
      relationships: ["categories", "phases", "products", "patient_types", "dentists"],
      sampleQueries: [
        "Find all procedures in a specific category",
        "Get procedures suitable for a patient type",
        "List procedures with their pitch points"
      ]
    },
    products: {
      description: "Medical/dental products used in procedures",
      columns: ["id", "name"],
      relationships: ["procedures", "phases", "product_details", "research_articles"],
      sampleQueries: [
        "Find products used in a specific procedure",
        "Get product details and clinical evidence",
        "Find products for a specific phase of treatment"
      ]
    },
    categories: {
      description: "Categories of dental procedures",
      columns: ["id", "name"],
      relationships: ["procedures"],
      sampleQueries: [
        "List all procedure categories",
        "Find procedures in a category"
      ]
    },
    phases: {
      description: "Treatment phases (pre-operative, operative, post-operative, etc.)",
      columns: ["id", "name"],
      relationships: ["procedures", "products"],
      sampleQueries: [
        "Find products for pre-operative phase",
        "Get all phases for a procedure"
      ]
    },
    patient_types: {
      description: "Types of patients (adult, pediatric, geriatric, etc.)",
      columns: ["id", "name", "description"],
      relationships: ["procedures"],
      sampleQueries: [
        "Find procedures for pediatric patients",
        "Get patient type descriptions"
      ]
    },
    research_articles: {
      description: "Scientific research articles supporting procedures and products",
      columns: ["id", "procedure_name", "product_name", "title", "author", "abstract", "url"],
      sampleQueries: [
        "Find research for a specific procedure",
        "Get articles about a product",
        "Search abstracts for keywords"
      ]
    },
    product_details: {
      description: "Detailed information about products including clinical evidence and objection handling",
      columns: ["id", "product_id", "objection_handling", "clinical_evidence", "pitch_points", "scientific_rationale"],
      sampleQueries: [
        "Get clinical evidence for a product",
        "Find objection handling for a product",
        "Get scientific rationale for product use"
      ]
    }
  },

  // Key relationships that the LLM should understand
  relationships: {
    "procedures_to_products": {
      description: "Products can be used in multiple procedures, procedures can use multiple products",
      via: "procedure_phase_products",
      context: "Includes specific phases and patient types"
    },
    "procedures_to_phases": {
      description: "Procedures have multiple phases of treatment",
      via: "procedure_phases",
      context: "Each phase may have specific products and instructions"
    },
    "procedures_to_categories": {
      description: "Procedures belong to categories (direct foreign key)",
      via: "category_id",
      context: "Helps organize and classify procedures"
    },
    "products_to_research": {
      description: "Research articles support product use in procedures",
      via: "condition_product_research_articles",
      context: "Links scientific evidence to product applications"
    }
  },

  // Common query patterns the LLM should recognize
  queryPatterns: {
    productRecommendation: {
      description: "User asking for product recommendations for a procedure/condition",
      example: "What products should I use for gingivitis treatment?",
      approach: "JOIN procedures, procedure_phase_products, products WHERE procedure matches condition"
    },
    clinicalEvidence: {
      description: "User asking for research or evidence",
      example: "What research supports using this product?",
      approach: "SELECT from research_articles or product_details WHERE product/procedure matches"
    },
    procedureInformation: {
      description: "User asking about procedure details",
      example: "Tell me about periodontal surgery phases",
      approach: "JOIN procedures, procedure_phases, phases WHERE procedure matches"
    },
    competitiveAdvantage: {
      description: "User asking about product advantages",
      example: "How is this product better than competitors?",
      approach: "SELECT from competitive_advantage_* tables"
    },
    phaseSpecificGuidance: {
      description: "User asking about treatment phases",
      example: "What should I do in the post-operative phase?",
      approach: "SELECT from phase_specific_usage WHERE phase matches"
    }
  },

  // Safety rules for query generation
  safetyRules: {
    allowedOperations: ["SELECT"],
    forbiddenOperations: ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"],
    requireWhere: true,
    maxResults: 100,
    allowedTables: [
      "procedures", "products", "categories", "phases", "patient_types",
      "research_articles", "product_details", "procedure_phase_products",
      "procedure_phases", "condition_product_research_articles",
      "competitive_advantage_active_ingredients", "competitive_advantage_competitors",
      "phase_specific_usage", "procedure_dentists", "procedure_patient_types"
    ]
  }
};

export const SCHEMA_PROMPT_TEMPLATE = `You are a dental/periodontal database assistant. You help users find information about procedures, products, research, and treatment guidance.

DATABASE SCHEMA:
${JSON.stringify(DATABASE_SCHEMA_CONTEXT.entities, null, 2)}

KEY RELATIONSHIPS:
${JSON.stringify(DATABASE_SCHEMA_CONTEXT.relationships, null, 2)}

SAFETY RULES:
- Only generate SELECT queries
- Always include WHERE clauses to limit results
- Use proper JOINs for related data
- Limit results to 100 rows maximum
- Only query approved tables

RESPONSE FORMAT:
1. First, understand what the user is asking for
2. Generate a safe SQL query
3. Provide a natural language explanation of what you're looking for
4. If the query might return many results, suggest ways to narrow it down

Examples:
User: "What products are used for gingivitis treatment?"
SQL: SELECT DISTINCT p.name as product_name, pd.clinical_evidence 
     FROM products p 
     JOIN procedure_phase_products ppp ON p.id = ppp.product_id 
     JOIN procedures pr ON ppp.procedure_id = pr.id 
     LEFT JOIN product_details pd ON p.id = pd.product_id 
     WHERE pr.name ILIKE '%gingivitis%' 
     LIMIT 100;

User: "Show me research about chlorhexidine"
SQL: SELECT title, author, abstract, url 
     FROM research_articles 
     WHERE product_name ILIKE '%chlorhexidine%' OR abstract ILIKE '%chlorhexidine%' 
     LIMIT 100;
`;

export const generateContextPrompt = (userQuery) => {
  return `${SCHEMA_PROMPT_TEMPLATE}

USER QUERY: "${userQuery}"

Please generate a SQL query to answer this question and explain what information you're retrieving.`;
};

export const validateQuery = (sqlQuery) => {
  const query = sqlQuery.toLowerCase().trim();
  
  // Check for forbidden operations
  const forbiddenOps = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate'];
  for (const op of forbiddenOps) {
    if (query.includes(op)) {
      return { valid: false, error: `Forbidden operation: ${op}` };
    }
  }
  
  // Must be a SELECT query
  if (!query.startsWith('select')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }
  
  // Should have a WHERE clause (basic check)
  if (!query.includes('where') && !query.includes('limit')) {
    return { valid: false, error: 'Query should include WHERE clause or LIMIT to prevent large result sets' };
  }
  
  // Check for proper LIMIT
  if (!query.includes('limit')) {
    return { valid: false, error: 'Query must include LIMIT clause' };
  }
  
  return { valid: true };
}; 