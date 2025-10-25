# Services Layer - Context Documentation

## Overview

The services layer contains business logic for LLM integration, database querying, and data processing. This layer sits between the UI components and the Supabase client, providing abstraction and reusable logic.

**Total Lines:** ~1800 lines across 5 service files

**Current Status:** Partially implemented - multiple competing approaches exist but are not fully integrated.

---

## Service Files

### 1. llmService.js (~652 lines)
**Purpose:** Generate SQL queries from natural language using LLM providers

**Status:** Code exists but is **never called** by the application

**Supported Providers:**
- Ollama (local, free)
- OpenAI (cloud, paid)
- Anthropic (cloud, paid)
- HuggingFace (cloud, free)

**Key Methods:**
```javascript
class LLMService {
  async generateSQL(userQuery, conversationHistory = [])
  // Main entry point - generates SQL from natural language
  // Returns: { success, sql, error, provider }

  async _queryOllama(prompt)
  // Ollama-specific implementation
  // Base URL: http://localhost:11434

  async _queryOpenAI(prompt)
  // OpenAI GPT-4 / GPT-3.5

  async _queryAnthropic(prompt)
  // Claude 3 Sonnet

  async _queryHuggingFace(prompt)
  // Free hosted models
}
```

**Configuration:**
```javascript
const DEFAULT_CONFIG = {
  provider: LLM_PROVIDERS.OLLAMA,
  useIntelligentService: true,
  ollama: {
    baseUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.REACT_APP_OLLAMA_MODEL || 'llama3.2:1b',
    fallbackModel: process.env.REACT_APP_OLLAMA_FALLBACK || 'llama3.2:1b',
    timeout: 45000
  }
}
```

**Issues:**
- Never called by DatabaseChatbot component
- Invalid model names in .env (`sqlcoder:7b` doesn't exist)
- No connection testing or error handling
- Extensive debug logging (lines 331-442)

**Location:** `src/services/llmService.js`

---

### 2. queryExecutor.js (~417 lines)
**Purpose:** Safely execute raw SQL queries with validation and protection

**Status:** **Inactive** - only used by IntelligentQueryService (which is also inactive)

**Key Methods:**
```javascript
class QueryExecutor {
  async executeQuery(sql, metadata = {})
  // Main execution method
  // - Validates SQL
  // - 30-second timeout
  // - 100 result limit
  // - Returns: { success, data, error, executionTime }

  async _executeWithSupabase(sql)
  // Executes via Supabase RPC function

  _validateQuery(sql)
  // Checks for dangerous operations:
  // - DROP, DELETE, TRUNCATE, ALTER
  // - Multiple statements
  // - Comments (-- or /* */)

  _cleanQuery(sql)
  // Sanitizes query string

  _formatError(error)
  // User-friendly error messages
}
```

**Safety Features:**
- Query validation before execution
- Timeout protection (30s)
- Result limiting (100 rows)
- Error formatting
- Execution time tracking

**Issues:**
- Dead code - not used in production flow
- Validation could be more comprehensive
- No parameterized query support

**Location:** `src/services/queryExecutor.js`

---

### 3. intelligentQueryService.js (~548 lines)
**Purpose:** Advanced NLP-based query processing with multi-step planning

**Status:** **Completely unused** - comprehensive implementation but never called

**Architecture:**
```javascript
class IntelligentQueryService {
  // Main Components:
  - IntentClassifier
  - ContextRetriever
  - QueryPlanner
  - QueryExecutor
  - ConversationMemory

  async processQuestion(userQuestion, conversationHistory = [])
  // Main entry point
  // Returns: { success, answer, sql, confidence, metadata }
}
```

**Workflow:**
```
1. IntentClassifier.analyze(question)
   ↓ Detects intent (find_products, research, etc.)

2. ContextRetriever.getRelevantContext(intent)
   ↓ Fetches schema and sample data

3. QueryPlanner.createPlan(intent, context)
   ↓ Generates multi-step query plan

4. QueryExecutor.executeQuery(sql)
   ↓ Runs queries safely

5. Generate natural language response
   ↓ Formats results for user

6. ConversationMemory.add(exchange)
   ↓ Stores for context
```

**Features:**
- Intent classification
- Entity extraction
- Multi-step query planning
- Confidence scoring
- Conversation history
- Context-aware responses

**Issues:**
- 548 lines of dead code
- Never integrated with DatabaseChatbot
- Significant maintenance burden
- Should be removed or integrated

**Location:** `src/services/intelligentQueryService.js`

---

### 4. supabaseQueryService.js (~500+ lines)
**Purpose:** Convert natural language to Supabase query builder API calls

**Status:** **ACTIVE** - Currently used by DatabaseChatbot component

**Key Methods:**
```javascript
class SupabaseQueryService {
  async processQuestion(userQuestion)
  // Main entry point
  // Returns: { success, answer, sql, results, error }

  analyzeIntent(userQuestion)
  // Pattern matching for intent detection
  // Returns: { intent, entities, confidence }

  async executeQueries(analysis)
  // Routes to specific query methods based on intent

  formatResponse(userQuestion, results, analysis)
  // Converts query results to natural language
}
```

**Supported Intents:**
- Find products for condition
- Find research articles
- List procedures by category
- Find product details
- List categories

**Example Query:**
```javascript
// User: "What products are used for gingivitis?"
analyzeIntent() → { intent: 'find_products', entities: { condition: 'gingivitis' }}
executeQueries() → supabase.from('procedures').select(...)
formatResponse() → "For gingivitis, we recommend: [products]"
```

**Advantages:**
- Simple and works
- No LLM required
- Fast response times
- Uses Supabase query builder (safe)

**Limitations:**
- Pattern matching only (not true NLP)
- Limited query complexity
- Hard-coded intent patterns
- Can't handle complex questions

**Location:** `src/services/supabaseQueryService.js`

---

### 5. databaseContext.js (~300+ lines)
**Purpose:** Schema definitions, query templates, and context for LLM prompts

**Status:** Partially used by LLM services (but those services aren't called)

**Key Exports:**

#### COMPRESSED_SCHEMA
```javascript
{
  tables: {
    procedures: "id, name, category, pitch_points, ...",
    products: "id, name",
    categories: "id, name",
    // ... more tables
  },
  relationships: {
    "products→procedures": "JOIN procedure_phase_products...",
    // ... more relationships
  }
}
```

#### QUERY_TEMPLATES
```javascript
{
  findProductsForCondition: {
    sql: "SELECT p.name FROM products p ...",
    conditions: ["procedure_name", "phase_name", "patient_type"]
  },
  // ... more templates
}
```

#### CONDITION_MAPPINGS
```javascript
{
  gingivitis: ["gingivitis", "gum disease", "gum inflammation"],
  xerostomia: ["dry mouth", "xerostomia", "reduced saliva"],
  // ... more mappings
}
```

#### Helper Functions
```javascript
generateOptimizedPrompt(userQuery, schema)
// Creates LLM prompt with schema context

validateQuery(sql)
// Checks for dangerous SQL operations

extractEntities(userQuestion)
// NLP entity extraction
```

**Usage:**
- Provides schema context to LLM services
- Query templates for common patterns
- Entity extraction and validation

**Location:** `src/services/databaseContext.js`

---

## Service Architecture Issues

### Problem: Three Competing Approaches

#### Approach 1: SupabaseQueryService (ACTIVE)
**Pros:**
- Simple, works now
- Fast, no LLM latency
- Safe (uses query builder)

**Cons:**
- Limited to pattern matching
- Can't handle complex queries
- Hard-coded intent patterns

#### Approach 2: LLM Text-to-SQL (PARTIAL)
**Pros:**
- True natural language understanding
- Can handle complex queries
- Flexible

**Cons:**
- Requires LLM setup (Ollama/OpenAI)
- Slower response times
- SQL injection risk
- Never integrated

#### Approach 3: IntelligentQueryService (INACTIVE)
**Pros:**
- Advanced NLP processing
- Multi-step query planning
- Confidence scoring
- Conversation context

**Cons:**
- Most complex
- 548 lines of dead code
- Never used
- High maintenance

### Decision Required

**Option A: Keep SupabaseQueryService Only**
- Remove LLMService, IntelligentQueryService, QueryExecutor
- Accept limitations (pattern matching only)
- ~2000 lines of code removed
- Simplify codebase significantly

**Option B: Integrate LLM Properly**
- Choose LLMService OR IntelligentQueryService
- Remove the other
- Connect to DatabaseChatbot
- Add error handling and fallback
- Test thoroughly

**Option C: Hybrid Approach**
- Use SupabaseQueryService as default
- Fall back to LLM for complex queries
- Best of both worlds
- More complexity

---

## How Services Are Currently Used

### DatabaseChatbot Component Flow
```javascript
// DatabaseChatbot.js:63-122
const handleSendMessage = async () => {
  // Line 80: ONLY uses SupabaseQueryService
  const result = await queryServiceRef.current.processQuestion(currentMessage);

  // LLMService imported but never called
  // IntelligentQueryService never imported
  // QueryExecutor never imported
}
```

### Admin Panel Flow
```javascript
// AdminPanelCore.js uses AdminPanelSupabase.js functions
// No service layer - direct Supabase client calls
await loadConditionsFromSupabase();
await updateConditionInSupabase(condition);
```

### Main App Flow
```javascript
// ClinicalChartMockup.js
// No service layer - direct Supabase client calls
const { data } = await supabase.from('procedures').select('*');
```

**Pattern:** Services are only used by DatabaseChatbot, everywhere else uses Supabase client directly.

---

## Recommendations

### Short Term (Choose One)

#### Option 1: Simplify (Recommended for Stability)
1. Remove `intelligentQueryService.js` (548 lines of dead code)
2. Remove `queryExecutor.js` (417 lines, unused)
3. Remove `llmService.js` (652 lines, never called)
4. Keep `supabaseQueryService.js` and `databaseContext.js`
5. Document that chatbot uses pattern matching, not LLM

**Effort:** 2-3 hours
**Risk:** Low (removing unused code)
**Result:** ~1600 lines removed, much simpler codebase

#### Option 2: Integrate LLM (Recommended for Functionality)
1. Fix Ollama configuration (install, correct model names)
2. Connect LLMService to DatabaseChatbot
3. Remove IntelligentQueryService (too complex)
4. Keep QueryExecutor for SQL execution
5. Add error handling and fallback to SupabaseQueryService
6. Test thoroughly

**Effort:** 1-2 days
**Risk:** Medium (integration work, testing required)
**Result:** True LLM-powered chatbot

### Long Term
1. **Add Tests** - Unit tests for all services
2. **Add Monitoring** - Track query success/failure rates
3. **Improve Error Handling** - User-friendly error messages
4. **Add Caching** - Cache common queries
5. **Add Analytics** - Track popular queries

---

## Testing Recommendations

### Unit Tests Needed
```javascript
// llmService.test.js
describe('LLMService', () => {
  it('generates SQL from natural language', async () => {
    const sql = await llmService.generateSQL('What products for gingivitis?');
    expect(sql).toContain('SELECT');
  });

  it('handles Ollama connection failure', async () => {
    // Mock Ollama down
    const result = await llmService.generateSQL('test');
    expect(result.success).toBe(false);
  });
});

// queryExecutor.test.js
describe('QueryExecutor', () => {
  it('blocks dangerous queries', async () => {
    const result = await queryExecutor.executeQuery('DROP TABLE procedures');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('enforces timeout', async () => {
    // Long-running query
    const result = await queryExecutor.executeQuery('SELECT pg_sleep(60)');
    expect(result.error).toContain('timeout');
  });
});
```

### Integration Tests Needed
```javascript
describe('DatabaseChatbot Integration', () => {
  it('answers product questions', async () => {
    const result = await service.processQuestion('What products for implants?');
    expect(result.success).toBe(true);
    expect(result.answer).toContain('product');
  });

  it('handles unknown questions gracefully', async () => {
    const result = await service.processQuestion('What is the weather?');
    expect(result.error).toBeDefined();
  });
});
```

---

## Security Considerations

### SQL Injection Risks

**Vulnerable Code (intelligentQueryService.js:496-506):**
```javascript
// DANGEROUS: String concatenation
buildSearchConditions(searchTerms, fields) {
  const fieldConditions = fields.map(field =>
    `${field} ILIKE '%${term}%'`  // Direct string interpolation
  );
}
```

**Fix:** Use parameterized queries or Supabase query builder

**Safe Alternative:**
```javascript
// Use Supabase query builder
supabase
  .from('procedures')
  .select('*')
  .ilike('name', `%${term}%`);  // Supabase handles escaping
```

### Query Validation

**Current Validation (queryExecutor.js:120-149):**
```javascript
const dangerousPatterns = [
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE/i,
  /ALTER\s+TABLE/i
];

if (dangerousPatterns.some(pattern => pattern.test(sql))) {
  throw new Error('Query contains dangerous operations');
}
```

**Additional Checks Needed:**
- Check for multiple statements (`;`)
- Validate column names against schema
- Limit query complexity
- Check for union-based injection

---

## Performance Considerations

### Current Performance
- **SupabaseQueryService:** ~100-300ms per query
- **LLMService (if used):** ~2-5 seconds per query
- **IntelligentQueryService (if used):** ~3-10 seconds per query

### Optimization Opportunities
1. **Caching** - Cache common queries
2. **Batch Queries** - Combine related queries
3. **Query Optimization** - Add indexes, optimize joins
4. **Connection Pooling** - Reuse connections
5. **LLM Streaming** - Stream LLM responses

---

## Environment Variables

### Required for LLM Services
```env
# Ollama (Local, Free)
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=llama3.2
REACT_APP_OLLAMA_FALLBACK=llama3.1

# OpenAI (Paid)
REACT_APP_OPENAI_API_KEY=sk-...

# Anthropic (Paid)
REACT_APP_ANTHROPIC_API_KEY=...

# HuggingFace (Free)
REACT_APP_HUGGINGFACE_API_KEY=hf_...
```

### Current Issues
- Invalid model names in .env (`sqlcoder:7b`)
- Service role key exposed (should never be in frontend)
- No validation that required vars are set

---

## Migration Guide

### If Removing LLM Services

1. **Delete Files:**
   - `src/services/intelligentQueryService.js`
   - `src/services/queryExecutor.js`
   - `src/services/llmService.js`

2. **Update DatabaseChatbot.js:**
   ```javascript
   // Remove line 5:
   - import { llmService } from '../services/llmService';
   ```

3. **Update Environment:**
   ```bash
   # Remove from .env:
   - REACT_APP_OLLAMA_*
   - REACT_APP_OPENAI_API_KEY
   - REACT_APP_ANTHROPIC_API_KEY
   ```

4. **Update Documentation:**
   - Update README to remove LLM references
   - Delete LLM_INTEGRATION_README.md

### If Integrating LLM Services

1. **Install Ollama:**
   ```bash
   brew install ollama
   ollama serve
   ollama pull llama3.2
   ```

2. **Fix Configuration:**
   ```env
   REACT_APP_OLLAMA_MODEL=llama3.2
   REACT_APP_OLLAMA_FALLBACK=llama3.1
   ```

3. **Update DatabaseChatbot.js:**
   ```javascript
   // Line 80: Replace with LLM call
   const llmResult = await llmService.generateSQL(currentMessage);
   if (llmResult.success) {
     const queryResult = await queryExecutor.executeQuery(llmResult.sql);
     // Display results
   }
   ```

4. **Add Error Handling:**
   ```javascript
   try {
     const result = await llmService.generateSQL(query);
   } catch (error) {
     // Fallback to SupabaseQueryService
     const fallback = await supabaseQueryService.processQuestion(query);
   }
   ```

---

*Last Updated: January 2025*
*Document Status: Complete*
*Code Status: Needs Refactoring - Choose LLM or Simple Approach*
