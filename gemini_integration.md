# Gemini File Search Integration Plan

**Status:** Proposed
**Date:** 2025-12-02
**Purpose:** Enhance PRISM AI with Google's managed RAG system for document search

---

## Executive Summary

Google's new Gemini File Search API (Nov 2025) offers a fully managed RAG system that could significantly enhance PRISM's AI capabilities. By combining our existing SQL-based agentic search with Gemini's document search, users could query both structured database content AND unstructured documents (PDFs, research papers, fact sheets).

---

## Current System Analysis

### What We Have (agenticSearchService.js)

| Aspect | Details |
|--------|---------|
| **Model** | GPT-4o-mini with function calling |
| **Architecture** | 2 files (down from 15-file RAG system) |
| **Cost** | ~$0.005/query (~$5/month for 1000 queries) |
| **Strengths** | Fast SQL queries, transparent, simple |

**5 SQL Tools:**
- `search_products` - Find products by name
- `search_procedures` - Find procedures/conditions
- `get_product_details` - Clinical evidence, rationale, pitch points
- `get_products_for_procedure` - Products by phase/patient type
- `get_competitive_advantages` - Competitor comparisons

### Current Limitations

Our database stores **references** to documents but can't search **inside** them:

```sql
-- Document URLs in database (metadata only)
product_overviews.fact_sheet_url        -- PDF fact sheets
research_articles.url                    -- Research paper links
condition_product_research_articles.url  -- Procedure-specific research
```

Users can only search titles and abstracts, not actual document content.

---

## Google Gemini File Search API

### Overview

Announced November 2025, File Search is a fully managed RAG system built into the Gemini API:

- **Automatic chunking** - Optimal document splitting
- **Embedding generation** - Uses Gemini Embedding model
- **Vector storage** - Managed vector database (no pgvector needed)
- **Semantic search** - Find info by meaning, not just keywords
- **Citations** - Responses include source document locations

### Pricing

| Component | Cost |
|-----------|------|
| **Indexing** | $0.15 per 1M tokens (one-time per document) |
| **Storage** | Free |
| **Query-time retrieval** | Free (retrieved tokens billed as context) |

### Storage Limits

| Tier | Storage |
|------|---------|
| Free | 1 GB |
| Tier 1 | 10 GB |
| Tier 2 | 100 GB |
| Tier 3 | 1 TB |

**Per-file limit:** 100 MB
**Max stores per project:** 10

### Supported File Types

- PDF, DOCX, TXT, JSON
- Programming files (.py, .js, etc.)

---

## Proposed Architecture

### Hybrid Search System

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRISM AI (Hybrid Search)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │  Gemini 2.5 Flash    │     │  SQL Function Tools  │         │
│  │  (Orchestrator)      │────▶│  (Database Queries)  │         │
│  └──────────┬───────────┘     └──────────────────────┘         │
│             │                                                    │
│  ┌──────────▼───────────┐                                       │
│  │ Gemini File Search   │                                       │
│  │ ─────────────────    │                                       │
│  │ • Fact sheet PDFs    │                                       │
│  │ • Research papers    │                                       │
│  │ • Clinical guides    │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Query
    │
    ▼
Gemini 2.5 Flash (decides which tools to use)
    │
    ├──▶ File Search Tool ──▶ PDF content, research papers
    │
    └──▶ SQL Functions ──▶ Products, procedures, competitive data
    │
    ▼
Combined Response with Citations
```

---

## Implementation Options

### Option A: Full Migration to Gemini (Recommended)

Replace OpenAI entirely with Gemini 2.5 Flash.

**Pros:**
- Single provider (simpler)
- Lower cost (~$0.003/query vs $0.005)
- Native File Search integration
- Gemini 2.5 Flash has excellent function calling

**Cons:**
- Migration effort required
- Learning new API

### Option B: Hybrid Providers

Keep GPT-4o-mini for SQL queries, add Gemini for documents.

**Pros:**
- Preserves working system
- Incremental approach

**Cons:**
- Two API providers to manage
- More complex routing logic
- Higher total cost

---

## Implementation Plan (Option A)

### Phase 1: Setup (1-2 hours)

1. **Get Gemini API Key**
   - Enable Generative Language API in Google Cloud Console
   - Create API key with appropriate restrictions

2. **Install Dependencies**
   ```bash
   npm install @google/genai
   ```

3. **Environment Variables**
   ```env
   REACT_APP_GOOGLE_API_KEY=your_gemini_api_key
   ```

### Phase 2: Document Collection (2-3 hours)

1. **Export document URLs from database**
   ```sql
   SELECT DISTINCT fact_sheet_url FROM product_overviews WHERE fact_sheet_url IS NOT NULL;
   SELECT DISTINCT url FROM research_articles WHERE url IS NOT NULL;
   ```

2. **Download PDFs** (script needed)
   - Fetch each URL
   - Save to local/cloud storage
   - Track which documents belong to which products/procedures

3. **Estimate indexing cost**
   - ~1000 tokens per page of PDF
   - $0.15 per 1M tokens
   - Example: 100 PDFs × 10 pages = ~1M tokens = $0.15 one-time

### Phase 3: Create File Search Store (1 hour)

```javascript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.REACT_APP_GOOGLE_API_KEY });

// Create store for clinical documents
const store = await client.fileSearchStores.create({
  config: { displayName: 'prism_clinical_docs' }
});

// Upload documents
for (const doc of documents) {
  await client.fileSearchStores.uploadToFileSearchStore({
    file: doc.path,
    fileSearchStoreName: store.name,
    config: { displayName: doc.name }
  });
}
```

### Phase 4: Migrate Agentic Search Service (3-4 hours)

Create new `geminiSearchService.js`:

```javascript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.REACT_APP_GOOGLE_API_KEY });

const MODEL = 'gemini-2.5-flash';
const FILE_SEARCH_STORE = 'stores/prism_clinical_docs';

// SQL function tools (same as current)
const SQL_TOOLS = [
  {
    name: 'search_products',
    description: 'Find products by name',
    parameters: {
      type: 'object',
      properties: {
        search_term: { type: 'string' }
      },
      required: ['search_term']
    }
  },
  // ... other SQL tools
];

export async function geminiSearch(userQuery, onChunk, onFunctionCall) {
  const response = await client.models.generateContent({
    model: MODEL,
    contents: userQuery,
    config: {
      tools: [
        // Document search
        {
          fileSearch: {
            fileSearchStoreNames: [FILE_SEARCH_STORE]
          }
        },
        // SQL function calling
        ...SQL_TOOLS.map(tool => ({ functionDeclarations: [tool] }))
      ]
    }
  });

  // Handle function calls (same logic as current)
  // Return response with citations
}
```

### Phase 5: Update UI for Citations (1-2 hours)

Modify `AgenticSearchWidget.js` to display document citations:

```jsx
{message.citations && message.citations.length > 0 && (
  <div className="mt-2 pt-2 border-t">
    <p className="text-xs font-medium">Sources:</p>
    {message.citations.map((citation, i) => (
      <a key={i} href={citation.url} className="text-xs text-blue-600">
        {citation.title} (p. {citation.page})
      </a>
    ))}
  </div>
)}
```

### Phase 6: Testing (2 hours)

Test queries that should hit both systems:

```
1. "What products work for Type 2 gingivitis?" → SQL only
2. "What does the PerioChip fact sheet say about pocket depth?" → File Search
3. "Compare clinical evidence for chlorhexidine vs minocycline" → Both
```

---

## Cost Analysis

### Current vs Proposed

| Metric | Current (OpenAI) | Proposed (Gemini) |
|--------|------------------|-------------------|
| **Per query** | $0.005 | $0.003-0.004 |
| **Monthly (1000 queries)** | $5.00 | $3.00-4.00 |
| **One-time indexing** | N/A | ~$0.15-1.00 |
| **Document search** | Not available | Included |

**Net savings:** ~$1-2/month + document search capability

### Document Indexing Cost Estimate

| Content | Est. Pages | Est. Tokens | Cost |
|---------|------------|-------------|------|
| Product fact sheets (50) | 500 | 500K | $0.08 |
| Research articles (100) | 1000 | 1M | $0.15 |
| Clinical guidelines (20) | 200 | 200K | $0.03 |
| **Total** | 1700 | 1.7M | **$0.26** |

---

## Example User Interactions

### Before (Current System)

**User:** "What clinical studies support using chlorhexidine for deep pockets?"

**System:** Searches `research_articles.title` and `research_articles.abstract` only.

**Response:** "Found 3 articles mentioning chlorhexidine..." (limited to metadata)

### After (With Gemini File Search)

**User:** "What clinical studies support using chlorhexidine for deep pockets?"

**System:**
1. Searches File Search store (actual PDF content)
2. Queries `research_articles` table for metadata

**Response:**
> "According to the Jeffcoat et al. study (page 4), patients with pockets ≥6mm showed
> a mean reduction of 1.2mm after PerioChip treatment vs 0.4mm with SRP alone.
> The study enrolled 118 patients across 5 centers..."
>
> **Sources:**
> - PerioChip Clinical Study (Jeffcoat 2000), page 4
> - Product Fact Sheet, page 2

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **API changes** | Gemini API is new; monitor for breaking changes |
| **Document quality** | Pre-screen PDFs for OCR quality before indexing |
| **Latency** | File Search adds ~200-500ms; cache common queries |
| **Cost overruns** | Set up billing alerts; monitor token usage |

---

## Success Metrics

1. **Query coverage** - % of queries that can now access document content
2. **Response quality** - User satisfaction with cited answers
3. **Cost per query** - Should decrease from $0.005 to ~$0.003
4. **Response time** - Should stay under 2 seconds

---

## Next Steps

1. [ ] Approve approach (Option A or B)
2. [ ] Set up Google Cloud project and API key
3. [ ] Audit existing document URLs in database
4. [ ] Create document download/indexing script
5. [ ] Implement `geminiSearchService.js`
6. [ ] Update UI for citations
7. [ ] Test with sample queries
8. [ ] Deploy to staging

---

## References

- [Introducing the File Search Tool in Gemini API](https://blog.google/technology/developers/file-search-gemini-api/)
- [Gemini API File Search: The Easy Way to Build RAG](https://www.analyticsvidhya.com/blog/2025/11/gemini-api-file-search/)
- [RAG just got much easier with File Search Tool](https://medium.com/google-cloud/rag-just-got-much-easier-with-file-search-tool-in-gemini-api-6494f5b1c6bc)
- [Current PRISM Agentic Search Architecture](./AGENTIC_SEARCH.md)

---

*Last Updated: 2025-12-02*
