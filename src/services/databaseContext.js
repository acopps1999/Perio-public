/**
 * Database Context System for LLM Integration
 * Optimized for minimal token usage and maximum efficiency
 */

// Compressed schema - only essential information
export const COMPRESSED_SCHEMA = {
  tables: {
    procedures: "id,name,category,pitch_points,category_id,patient_type",
    products: "id,name", 
    categories: "id,name",
    phases: "id,name",
    patient_types: "id,name,description",
    research_articles: "id,procedure_name,product_name,title,author,abstract,url",
    product_details: "id,product_id,clinical_evidence,procedure_name,product_name",
    procedure_phase_products: "procedure_id,phase_id,product_id,patient_type_id"
  },
  relationships: {
    "products→procedures": "JOIN procedure_phase_products ON product_id",
    "procedures→categories": "JOIN categories ON category_id", 
    "procedures→research": "JOIN research_articles ON procedure_name",
    "products→details": "JOIN product_details ON product_id"
  }
};

// Pre-built query templates for common patterns
export const QUERY_TEMPLATES = {
  findProductsForCondition: {
    sql: `SELECT DISTINCT p.name as product_name, pd.clinical_evidence, pr.name as procedure_name, c.name as category
     FROM products p 
     JOIN procedure_phase_products ppp ON p.id = ppp.product_id 
     JOIN procedures pr ON ppp.procedure_id = pr.id 
     LEFT JOIN categories c ON pr.category_id = c.id
     LEFT JOIN product_details pd ON p.id = pd.product_id 
     WHERE {conditions}
     LIMIT 50`,
    conditions: {
      gingivitis: "pr.name ILIKE '%gingivitis%' OR pr.name ILIKE '%periodontal%' OR pr.name ILIKE '%gum disease%' OR pr.pitch_points ILIKE '%gingivitis%' OR pr.pitch_points ILIKE '%periodontal%' OR c.name ILIKE '%periodontal%'",
      periodontitis: "pr.name ILIKE '%periodontitis%' OR pr.name ILIKE '%periodontal surgery%' OR pr.name ILIKE '%deep cleaning%' OR pr.pitch_points ILIKE '%periodontitis%' OR c.name ILIKE '%periodontal%'",
      implant: "pr.name ILIKE '%implant%' OR pr.name ILIKE '%oral surgery%' OR pr.pitch_points ILIKE '%implant%' OR c.name ILIKE '%oral surgery%'",
      extraction: "pr.name ILIKE '%extraction%' OR pr.name ILIKE '%oral surgery%' OR pr.name ILIKE '%surgical removal%' OR pr.pitch_points ILIKE '%extraction%'",
      cleaning: "pr.name ILIKE '%cleaning%' OR pr.name ILIKE '%prophylaxis%' OR pr.name ILIKE '%scaling%' OR pr.name ILIKE '%polishing%' OR pr.pitch_points ILIKE '%cleaning%'"
    }
  },
  
  findResearch: {
    sql: `SELECT title, author, abstract, url, procedure_name, product_name
     FROM research_articles 
     WHERE {conditions}
     LIMIT 50`,
    conditions: {
      byProduct: "product_name ILIKE '%{term}%' OR abstract ILIKE '%{term}%' OR title ILIKE '%{term}%'",
      byProcedure: "procedure_name ILIKE '%{term}%' OR abstract ILIKE '%{term}%' OR title ILIKE '%{term}%'"
    }
  },
  
  findProductDetails: {
    sql: `SELECT p.name as product_name, pd.clinical_evidence, pd.objection_handling, pd.scientific_rationale
     FROM products p 
     JOIN product_details pd ON p.id = pd.product_id 
     WHERE {conditions}
     LIMIT 50`,
    conditions: {
      byName: "p.name ILIKE '%{term}%' OR pd.product_name ILIKE '%{term}%'"
    }
  },
  
  listCategories: {
    sql: `SELECT c.name as category, COUNT(p.id) as procedure_count
     FROM categories c 
     LEFT JOIN procedures p ON c.id = p.category_id 
     GROUP BY c.name 
     ORDER BY procedure_count DESC
     LIMIT 20`
  }
};

// Smart condition detection
export const CONDITION_MAPPINGS = {
  gingivitis: ["gingivitis", "gum disease", "gum inflammation"],
  periodontitis: ["periodontitis", "advanced gum disease", "bone loss"],
  implant: ["implant", "dental implant", "tooth replacement"],
  extraction: ["extraction", "tooth removal", "pulling tooth"],
  cleaning: ["cleaning", "prophylaxis", "dental hygiene", "scaling"],
  whitening: ["whitening", "bleaching", "tooth brightening"],
  filling: ["filling", "restoration", "cavity treatment"],
  crown: ["crown", "cap", "tooth restoration"]
};

// Minimal, efficient prompt template
export const MINIMAL_PROMPT_TEMPLATE = `You are a dental database assistant. Generate PostgreSQL SELECT queries only.

SCHEMA: {tables: procedures(name,category,pitch_points), products(name), categories(name), product_details(clinical_evidence,product_name), research_articles(title,abstract,product_name,procedure_name)}

JOINS: products↔procedures via procedure_phase_products, procedures↔categories via category_id

DENTAL TERMS: gingivitis→periodontal/gum disease, implant→oral surgery, extraction→surgical removal, cleaning→prophylaxis/scaling

RULES: SELECT only, include WHERE+LIMIT, search multiple fields with ILIKE, use OR for related terms

Examples:
Q: "products for gingivitis?" 
A: SELECT DISTINCT p.name, pd.clinical_evidence FROM products p JOIN procedure_phase_products ppp ON p.id=ppp.product_id JOIN procedures pr ON ppp.procedure_id=pr.id LEFT JOIN product_details pd ON p.id=pd.product_id WHERE pr.name ILIKE '%gingivitis%' OR pr.name ILIKE '%periodontal%' OR pr.pitch_points ILIKE '%gum disease%' LIMIT 50;

Q: "research on chlorhexidine?"
A: SELECT title, author, abstract FROM research_articles WHERE product_name ILIKE '%chlorhexidine%' OR abstract ILIKE '%chlorhexidine%' LIMIT 50;

USER: "{query}"
SQL:`;

// Intelligent query builder
export class QueryBuilder {
  static detectQueryType(userQuery) {
    const query = userQuery.toLowerCase();
    
    if (query.includes('product') && (query.includes('for') || query.includes('treat'))) {
      return 'findProductsForCondition';
    }
    if (query.includes('research') || query.includes('study') || query.includes('article')) {
      return 'findResearch';
    }
    if (query.includes('evidence') || query.includes('clinical') || query.includes('objection')) {
      return 'findProductDetails';
    }
    if (query.includes('categor') || query.includes('list') || query.includes('types')) {
      return 'listCategories';
    }
    
    return 'findProductsForCondition'; // default
  }
  
  static detectCondition(userQuery) {
    const query = userQuery.toLowerCase();
    
    for (const [condition, terms] of Object.entries(CONDITION_MAPPINGS)) {
      if (terms.some(term => query.includes(term))) {
        return condition;
      }
    }
    
    // Extract key terms if no direct match
    const words = query.split(' ').filter(w => w.length > 3);
    return words.find(w => 
      ['gingivitis', 'periodontitis', 'implant', 'extraction', 'cleaning'].includes(w)
    ) || 'general';
  }
  
  static buildQuery(userQuery) {
    const queryType = this.detectQueryType(userQuery);
    const condition = this.detectCondition(userQuery);
    const template = QUERY_TEMPLATES[queryType];
    
    if (!template) {
      return this.fallbackQuery(userQuery);
    }
    
    if (queryType === 'findProductsForCondition') {
      const conditionSQL = template.conditions[condition] || template.conditions.gingivitis;
      return template.sql.replace('{conditions}', conditionSQL);
    }
    
    if (queryType === 'findResearch') {
      const term = this.extractSearchTerm(userQuery);
      const conditionType = userQuery.toLowerCase().includes('product') ? 'byProduct' : 'byProcedure';
      const conditionSQL = template.conditions[conditionType].replace(/{term}/g, term);
      return template.sql.replace('{conditions}', conditionSQL);
    }
    
    if (queryType === 'findProductDetails') {
      const term = this.extractSearchTerm(userQuery);
      const conditionSQL = template.conditions.byName.replace(/{term}/g, term);
      return template.sql.replace('{conditions}', conditionSQL);
    }
    
    return template.sql;
  }
  
  static extractSearchTerm(userQuery) {
    // Extract the main search term from the query
    const query = userQuery.toLowerCase();
    
    // Look for quoted terms first
    const quotedMatch = query.match(/"([^"]+)"/);
    if (quotedMatch) return quotedMatch[1];
    
    // Look for product names or conditions
    const terms = query.split(' ').filter(w => w.length > 3);
    return terms.find(t => 
      !['what', 'products', 'used', 'treatment', 'research', 'about', 'show', 'find'].includes(t)
    ) || 'general';
  }
  
  static fallbackQuery(userQuery) {
    const term = this.extractSearchTerm(userQuery);
    return `SELECT DISTINCT p.name as product_name, pd.clinical_evidence 
     FROM products p 
     LEFT JOIN product_details pd ON p.id = pd.product_id 
            WHERE p.name ILIKE '%${term}%' OR pd.product_name ILIKE '%${term}%' 
            LIMIT 50;`;
  }
}

// Efficient context generator
export const generateOptimizedPrompt = (userQuery) => {
  // Try intelligent query building first
  const builtQuery = QueryBuilder.buildQuery(userQuery);
  
  if (builtQuery && !userQuery.toLowerCase().includes('explain')) {
    // Return pre-built query directly for efficiency
    return {
      usePrebuilt: true,
      sql: builtQuery,
      explanation: `Generated optimized query for: ${userQuery}`
    };
  }
  
  // Fall back to minimal LLM prompt
  return {
    usePrebuilt: false,
    prompt: MINIMAL_PROMPT_TEMPLATE.replace('{query}', userQuery)
  };
};

// Legacy exports for backward compatibility
export const DATABASE_SCHEMA_CONTEXT = {
  entities: {
    procedures: {
      description: "Dental/periodontal procedures and surgical treatments",
      columns: ["id", "name", "category", "pitch_points", "category_id", "patient_type"]
    },
    products: {
      description: "Medical/dental products used in procedures", 
      columns: ["id", "name"]
    }
  }
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
  
  // Should have a WHERE clause or LIMIT
  if (!query.includes('where') && !query.includes('limit')) {
    return { valid: false, error: 'Query should include WHERE clause or LIMIT to prevent large result sets' };
  }
  
  // Check for proper LIMIT
  if (!query.includes('limit')) {
    return { valid: false, error: 'Query must include LIMIT clause' };
  }
  
  return { valid: true };
}; 