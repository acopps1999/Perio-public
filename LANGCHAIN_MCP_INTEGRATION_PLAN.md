# LangChain & MCP Integration Plan

**Status:** Proposed
**Date:** 2025-12-02
**Purpose:** Evaluate and plan integration of LangChain and Model Context Protocol (MCP) to standardize and enhance PRISM's agentic search capabilities

---

## Executive Summary

After researching LangChain and MCP frameworks against your current implementation, here's the bottom line:

| Framework | Recommendation | Reasoning |
|-----------|----------------|-----------|
| **LangChain** | **Do Not Integrate** | Adds complexity without meaningful benefit for your use case |
| **MCP** | **Integrate (Hybrid)** | High value for standardization, developer experience, and future-proofing |

Your current agentic search (2 files, ~$5/mo) is already well-architected. The opportunity isn't replacing it—it's **wrapping it with MCP** to standardize tool interfaces and enable cross-application reuse.

---

## Part 1: Current State Assessment

### What You Have (agenticSearchService.js)

```
User Query → GPT-4o-mini → 5 SQL Tools → Supabase → Response
```

**Strengths:**
- Simple: 2 files (500 lines each)
- Cost-effective: ~$0.005/query
- Transparent: Users see which queries ran
- Fast: 800-1500ms typical
- Production-ready: Already deployed

**Gaps Identified:**
- 9 tools documented, only 5 implemented
- Conversation history disabled (no multi-turn)
- API key exposed to browser
- No caching for repeated queries
- Simulated streaming (not true SSE)

### Current SQL Tools

| Tool | Status | Description |
|------|--------|-------------|
| `search_products` | ✅ Implemented | Find products by name |
| `search_procedures` | ✅ Implemented | Find conditions by name |
| `get_product_details` | ✅ Implemented | Clinical evidence, rationale |
| `get_products_for_procedure` | ✅ Implemented | Phase/patient type recommendations |
| `get_competitive_advantages` | ✅ Implemented | Competitor comparisons |
| `get_procedures_for_product` | ❌ Missing | Reverse lookup |
| `get_phase_recommendations` | ❌ Missing | Phase-based recommendations |
| `get_patient_type_recommendations` | ❌ Missing | Risk-based recommendations |
| `search_research_articles` | ❌ Missing | Research paper search |

---

## Part 2: LangChain Analysis

### What LangChain Would Add

1. **Structured Output Parsing**: Zod schemas with validation
2. **Agent Abstractions**: ReAct patterns, tool-calling agents
3. **Memory Management**: Conversation buffer, summary memory
4. **Provider Flexibility**: Switch OpenAI ↔ Anthropic ↔ Google
5. **Observability**: LangSmith integration ($30+/mo)

### Why LangChain is NOT Recommended

| Factor | Your Current Approach | With LangChain |
|--------|----------------------|----------------|
| **Code complexity** | 500 lines | 1000+ lines |
| **Dependencies** | 3 packages | 50+ packages |
| **Debugging** | Direct, transparent | Framework abstraction layers |
| **Performance** | Native API calls | Framework overhead |
| **Learning curve** | Zero (you wrote it) | Weeks to master |
| **Breaking changes** | None (stable) | Frequent (v0.x → v1.0 migration coming) |

**Industry Consensus (2025):**
> "When you write raw API calls, you see exactly what's happening. No framework magic, no hidden abstractions, no surprise behaviors."

Your intentional simplification from 15-file RAG to 2-file agentic search **already follows this best practice**.

### If You Still Want LangChain Benefits

**Get them without LangChain:**

```javascript
// 1. Add Zod validation directly (no LangChain needed)
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_available: z.boolean()
});

async function searchProducts({ search_term }) {
  const results = await executeQuery(query);
  return results.map(r => ProductSchema.parse(r)); // Runtime validation
}

// 2. Add conversation memory (simple implementation)
const [conversationHistory, setConversationHistory] = useState([]);
const messages = [
  systemMessage,
  ...conversationHistory.slice(-5), // Last 5 turns
  { role: 'user', content: userQuery }
];

// 3. Add observability (your own analytics)
function logQuery(query, functionCalls, tokens, latency) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ query, functionCalls, tokens, latency })
  });
}
```

---

## Part 3: MCP Analysis

### What is MCP?

**Model Context Protocol** is Anthropic's open standard (Nov 2024) for connecting AI models to tools and data sources. Think of it as "USB for AI tools"—a universal interface.

```
┌─────────────────┐
│   MCP Client    │  ← Claude Desktop, Cursor, VS Code, ChatGPT
└────────┬────────┘
         │ (JSON-RPC over HTTP/WebSocket)
┌────────▼────────┐
│   MCP Server    │  ← Your tools/database exposed as standard interface
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase DB   │
└─────────────────┘
```

### Why MCP IS Recommended

| Benefit | Value to PRISM |
|---------|----------------|
| **Standardization** | Single tool definition works everywhere |
| **Developer Experience** | Query database in Claude Desktop during dev |
| **Future-Proofing** | OpenAI, Google, Anthropic all adopted MCP in 2025 |
| **Reusability** | Same tools work in multiple apps |
| **Ecosystem** | Leverage 1000s of community MCP servers |

### MCP Adoption Status (2025)

| Provider | MCP Support | Date |
|----------|-------------|------|
| Anthropic | ✅ Native | Nov 2024 |
| OpenAI | ✅ ChatGPT Desktop, Agents SDK | March 2025 |
| Google | ✅ Gemini models | April 2025 |
| Cursor | ✅ IDE integration | 2024 |
| VS Code | ✅ Copilot extensions | 2025 |

**MCP is becoming the industry standard for AI tool integration.**

---

## Part 4: Recommended Architecture

### Hybrid Approach: MCP + Existing Function Calling

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRISM AI (Hybrid)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PRODUCTION (Unchanged)           DEVELOPMENT (New)                │
│  ─────────────────────           ──────────────────                │
│                                                                     │
│  AgenticSearchWidget              Claude Desktop / Cursor           │
│         ↓                                  ↓                        │
│  agenticSearchService.js          PRISM MCP Server                 │
│         ↓                                  ↓                        │
│  GPT-4o-mini + Function Calling   Same SQL Tools via MCP           │
│         ↓                                  ↓                        │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                     Supabase Database                    │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  FUTURE OPTIONS                                                     │
│  ──────────────                                                    │
│  • Multi-provider: Anthropic Claude, Google Gemini                 │
│  • Cross-app: Share tools with other internal apps                 │
│  • Community: Let developers extend your MCP server                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### What This Achieves

1. **Zero Production Risk**: Existing agentic search untouched
2. **Developer Productivity**: Natural language DB queries in IDE
3. **Standardization**: Tools defined once, usable everywhere
4. **Future Flexibility**: Easy to migrate if needed

---

## Part 5: Implementation Plan

### Phase 1: MCP Server Setup (2-3 hours)

#### Step 1.1: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk zod
```

#### Step 1.2: Create MCP Server

**File:** `src/services/mcp/prismMcpServer.ts`

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Create MCP server
const server = new Server(
  {
    name: 'prism-clinical-database',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions with Zod schemas
const SearchProductsSchema = z.object({
  search_term: z.string().describe('Product name or keyword to search')
});

const GetProductDetailsSchema = z.object({
  product_id: z.number().describe('Product ID'),
  procedure_id: z.number().optional().describe('Optional procedure ID for context')
});

const GetProductsForProcedureSchema = z.object({
  procedure_id: z.number().describe('Procedure/condition ID'),
  phase: z.enum(['Prep', 'Acute', 'Maintenance']).optional(),
  patient_type: z.enum(['Type 1', 'Type 2', 'Type 3', 'Type 4']).optional()
});

const GetCompetitiveAdvantagesSchema = z.object({
  product_name: z.string().describe('Exact product name')
});

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'search_products',
      description: 'Find dental products by name. Returns product IDs and names.',
      inputSchema: {
        type: 'object',
        properties: {
          search_term: { type: 'string', description: 'Product name or keyword' }
        },
        required: ['search_term']
      }
    },
    {
      name: 'search_procedures',
      description: 'Find clinical procedures/conditions by name. Returns procedure IDs, names, and categories.',
      inputSchema: {
        type: 'object',
        properties: {
          search_term: { type: 'string', description: 'Condition name or keyword' }
        },
        required: ['search_term']
      }
    },
    {
      name: 'get_product_details',
      description: 'Get clinical evidence, rationale, and sales intelligence for a product.',
      inputSchema: {
        type: 'object',
        properties: {
          product_id: { type: 'number', description: 'Product ID' },
          procedure_id: { type: 'number', description: 'Optional procedure ID for context' }
        },
        required: ['product_id']
      }
    },
    {
      name: 'get_products_for_procedure',
      description: 'Get product recommendations for a procedure, optionally filtered by treatment phase and patient risk type.',
      inputSchema: {
        type: 'object',
        properties: {
          procedure_id: { type: 'number', description: 'Procedure/condition ID' },
          phase: { type: 'string', enum: ['Prep', 'Acute', 'Maintenance'] },
          patient_type: { type: 'string', enum: ['Type 1', 'Type 2', 'Type 3', 'Type 4'] }
        },
        required: ['procedure_id']
      }
    },
    {
      name: 'get_competitive_advantages',
      description: 'Get competitive advantages and active ingredient benefits for a product.',
      inputSchema: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: 'Exact product name' }
        },
        required: ['product_name']
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'search_products': {
      const { search_term } = SearchProductsSchema.parse(args);
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', `%${search_term}%`)
        .eq('is_available', true)
        .order('name')
        .limit(10);

      if (error) throw new Error(error.message);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'search_procedures': {
      const { search_term } = z.object({ search_term: z.string() }).parse(args);
      const { data, error } = await supabase
        .from('procedures')
        .select('id, name, category')
        .ilike('name', `%${search_term}%`)
        .order('name')
        .limit(10);

      if (error) throw new Error(error.message);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'get_product_details': {
      const { product_id, procedure_id } = GetProductDetailsSchema.parse(args);
      let query = supabase
        .from('product_details')
        .select(`
          product_id,
          products!inner(name),
          procedures(name),
          clinical_evidence,
          rationale,
          pitch_points,
          objection_handling,
          fact_sheet_url
        `)
        .eq('product_id', product_id);

      if (procedure_id) {
        query = query.eq('procedure_id', procedure_id);
      }

      const { data, error } = await query.limit(5);
      if (error) throw new Error(error.message);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'get_products_for_procedure': {
      const { procedure_id, phase, patient_type } = GetProductsForProcedureSchema.parse(args);
      let query = supabase
        .from('procedure_phase_products')
        .select(`
          products(id, name),
          phases(name),
          patient_types(name)
        `)
        .eq('procedure_id', procedure_id);

      if (phase) {
        query = query.eq('phases.name', phase);
      }
      if (patient_type) {
        query = query.eq('patient_types.name', patient_type);
      }

      const { data, error } = await query.limit(10);
      if (error) throw new Error(error.message);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    case 'get_competitive_advantages': {
      const { product_name } = GetCompetitiveAdvantagesSchema.parse(args);

      const [competitors, ingredients] = await Promise.all([
        supabase
          .from('competitive_advantage_competitors')
          .select('competitor_name, advantages')
          .eq('product_name', product_name)
          .limit(5),
        supabase
          .from('competitive_advantage_active_ingredients')
          .select('ingredient_name, advantages')
          .eq('product_name', product_name)
          .limit(5)
      ]);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            competitors: competitors.data || [],
            active_ingredients: ingredients.data || []
          }, null, 2)
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PRISM MCP Server running on stdio');
}

main().catch(console.error);
```

#### Step 1.3: Add NPM Script

**In `package.json`:**

```json
{
  "scripts": {
    "mcp:server": "npx tsx src/services/mcp/prismMcpServer.ts"
  }
}
```

### Phase 2: Claude Desktop Integration (10 minutes)

#### Step 2.1: Configure Claude Desktop

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "prism-database": {
      "command": "npm",
      "args": ["run", "mcp:server"],
      "cwd": "/Users/austincopps/Projects/PerioProject/Perio-stage",
      "env": {
        "SUPABASE_URL": "https://fjuczpoufvslbkaafmve.supabase.co",
        "SUPABASE_ANON_KEY": "<your-anon-key>"
      }
    }
  }
}
```

#### Step 2.2: Restart Claude Desktop

After config, restart Claude Desktop. You'll see "prism-database" in available tools.

#### Step 2.3: Test Queries

In Claude Desktop:
- "Search for products containing 'chlorhexidine'"
- "What procedures are in the Intra-Oral category?"
- "Get competitive advantages for PerioChip"

### Phase 3: Standardize Outputs with Zod (1-2 hours)

#### Step 3.1: Create Shared Schema File

**File:** `src/services/schemas/agenticSearchSchemas.ts`

```typescript
import { z } from 'zod';

// Product schemas
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_available: z.boolean().optional()
});

export const ProductDetailSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  procedure_name: z.string().optional(),
  clinical_evidence: z.string().nullable(),
  rationale: z.string().nullable(),
  pitch_points: z.string().nullable(),
  objection_handling: z.string().nullable(),
  fact_sheet_url: z.string().url().nullable()
});

// Procedure schemas
export const ProcedureSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string().nullable()
});

// Recommendation schemas
export const RecommendationSchema = z.object({
  product: ProductSchema,
  phase: z.object({ name: z.string() }),
  patient_type: z.object({ name: z.string() })
});

// Competitive intelligence schemas
export const CompetitorAdvantageSchema = z.object({
  competitor_name: z.string(),
  advantages: z.string()
});

export const IngredientAdvantageSchema = z.object({
  ingredient_name: z.string(),
  advantages: z.string()
});

export const CompetitiveIntelligenceSchema = z.object({
  competitors: z.array(CompetitorAdvantageSchema),
  active_ingredients: z.array(IngredientAdvantageSchema)
});

// Response wrapper for standardized output
export const AgenticResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  metadata: z.object({
    tool: z.string(),
    execution_time_ms: z.number(),
    result_count: z.number()
  })
});

// Type exports
export type Product = z.infer<typeof ProductSchema>;
export type ProductDetail = z.infer<typeof ProductDetailSchema>;
export type Procedure = z.infer<typeof ProcedureSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type CompetitiveIntelligence = z.infer<typeof CompetitiveIntelligenceSchema>;
export type AgenticResponse = z.infer<typeof AgenticResponseSchema>;
```

#### Step 3.2: Update agenticSearchService.js

Add validation to existing functions:

```javascript
import { ProductSchema, ProcedureSchema, ProductDetailSchema } from '../schemas/agenticSearchSchemas';

async function searchProducts({ search_term }) {
  const startTime = Date.now();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_available')
    .ilike('name', `%${search_term}%`)
    .eq('is_available', true)
    .order('name')
    .limit(5);

  if (error) throw new Error(error.message);

  // Validate each result
  const validated = data.map(item => ProductSchema.parse(item));

  return {
    success: true,
    data: validated,
    metadata: {
      tool: 'search_products',
      execution_time_ms: Date.now() - startTime,
      result_count: validated.length
    }
  };
}
```

### Phase 4: Add Missing Tools (2-3 hours)

Implement the 4 missing tools documented in AGENTIC_SEARCH.md:

#### Step 4.1: get_procedures_for_product

```javascript
{
  type: 'function',
  function: {
    name: 'get_procedures_for_product',
    description: 'Find which procedures/conditions use a specific product',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'Product ID' }
      },
      required: ['product_id']
    }
  }
}

async function getProceduresForProduct({ product_id }) {
  const { data, error } = await supabase
    .from('procedure_phase_products')
    .select(`
      procedures(id, name, category),
      phases(name),
      patient_types(name)
    `)
    .eq('product_id', product_id)
    .limit(10);

  if (error) throw new Error(error.message);
  return data;
}
```

#### Step 4.2: search_research_articles

```javascript
{
  type: 'function',
  function: {
    name: 'search_research_articles',
    description: 'Find research publications by product, procedure, or keyword',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'number' },
        procedure_id: { type: 'number' },
        search_term: { type: 'string' },
        limit: { type: 'number', default: 5 }
      }
    }
  }
}

async function searchResearchArticles({ product_id, procedure_id, search_term, limit = 5 }) {
  let query = supabase
    .from('condition_product_research_articles')
    .select('title, author, abstract, url, products(name), procedures(name)');

  if (product_id) query = query.eq('product_id', product_id);
  if (procedure_id) query = query.eq('procedure_id', procedure_id);
  if (search_term) query = query.or(`title.ilike.%${search_term}%,abstract.ilike.%${search_term}%`);

  const { data, error } = await query.limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
```

### Phase 5: Optional Enhancements

#### 5.1: Enable Conversation Memory

```javascript
// In agenticSearchService.js - uncomment and modify
const MAX_HISTORY_MESSAGES = 6; // 3 user + 3 assistant

function buildMessages(userQuery, conversationHistory) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-MAX_HISTORY_MESSAGES),
    { role: 'user', content: userQuery }
  ];
}
```

#### 5.2: Add Response Caching

```javascript
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const queryCache = new Map();

async function cachedSearch(query, searchFn) {
  const cacheKey = JSON.stringify(query);
  const cached = queryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await searchFn(query);
  queryCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
```

#### 5.3: Move API Key to Backend

Create a simple API route (if using Next.js or add Express):

```javascript
// pages/api/agentic-search.js (Next.js example)
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { query, history } = req.body;

  // Your existing agentic search logic here
  const response = await agenticSearch(query, history);

  res.json(response);
}
```

---

## Part 6: Cost/Benefit Analysis

### Implementation Costs

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: MCP Server | 2-3 hours | Low |
| Phase 2: Claude Desktop | 10 minutes | None |
| Phase 3: Zod Schemas | 1-2 hours | Low |
| Phase 4: Missing Tools | 2-3 hours | Low |
| Phase 5: Enhancements | 4-8 hours | Medium |

**Total Initial Effort:** 6-8 hours (Phases 1-4)

### Benefits

| Benefit | Value |
|---------|-------|
| **Developer Productivity** | Query DB in Claude Desktop during development |
| **Standardization** | Same tools work in PRISM, Claude, Cursor, VS Code |
| **Type Safety** | Zod validation catches bugs early |
| **Future-Proofing** | Ready for multi-provider (OpenAI + Anthropic + Google) |
| **Documentation** | MCP tool definitions are self-documenting |

### What NOT to Do

| Anti-Pattern | Why |
|--------------|-----|
| Replace function calling with LangChain | Adds complexity without benefit |
| Build custom MCP client in React app | use-mcp library does this |
| Deploy MCP server to production | Dev tool only (for now) |
| Remove existing agenticSearchService | Production system is working fine |

---

## Part 7: Success Metrics

### Phase 1 Success Criteria

- [ ] MCP server starts without errors
- [ ] All 5 tools respond correctly in Claude Desktop
- [ ] Query response time < 2 seconds
- [ ] No breaking changes to production app

### Phase 2 Success Criteria

- [ ] Developers can query DB from Claude Desktop
- [ ] Tool discovery works (list_tools shows all 5)
- [ ] Error handling returns useful messages

### Phase 3 Success Criteria

- [ ] Zod schemas validate all tool outputs
- [ ] Type errors caught at runtime with clear messages
- [ ] Response format standardized across all tools

### Long-term Success Criteria

- [ ] All 9 documented tools implemented
- [ ] Conversation memory enabled (optional)
- [ ] Response caching reduces API costs by 20%+
- [ ] Zero production incidents from changes

---

## Part 8: Decision Matrix

### Should You Proceed?

| Factor | Weight | Score (1-5) | Weighted |
|--------|--------|-------------|----------|
| Immediate value (dev productivity) | 30% | 4 | 1.2 |
| Future value (standardization) | 25% | 5 | 1.25 |
| Implementation effort | 20% | 4 | 0.8 |
| Risk to production | 15% | 5 | 0.75 |
| Maintenance burden | 10% | 4 | 0.4 |
| **Total** | **100%** | | **4.4/5** |

**Recommendation: Proceed with MCP integration (Phases 1-4)**

---

## Part 9: Next Steps

### Immediate (This Week)

1. [ ] Install `@modelcontextprotocol/sdk` and `zod`
2. [ ] Create `src/services/mcp/prismMcpServer.ts`
3. [ ] Configure Claude Desktop
4. [ ] Test with sample queries

### Short-term (Next 2 Weeks)

5. [ ] Add Zod schemas for all tools
6. [ ] Implement 4 missing tools
7. [ ] Update AGENTIC_SEARCH.md documentation

### Medium-term (Next Month)

8. [ ] Evaluate enabling conversation memory
9. [ ] Add response caching
10. [ ] Consider API key migration to backend

---

## Appendix A: Reference Links

### MCP Resources
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Supabase MCP Server](https://supabase.com/docs/guides/getting-started/mcp)

### LangChain Resources (For Reference Only)
- [LangChain.js Docs](https://js.langchain.com/docs/)
- [LangChain Structured Output](https://js.langchain.com/docs/how_to/structured_output/)

### Zod Resources
- [Zod Documentation](https://zod.dev/)
- [Zod with TypeScript](https://github.com/colinhacks/zod)

---

## Appendix B: Full MCP Server Code

See Phase 1, Step 1.2 for complete implementation.

---

*Last Updated: 2025-12-02*
*Author: Claude Code Research*
