# Product Data Sources Reference

This document describes where and how the application retrieves product-related information for display in the UI, specifically focusing on **Competitive Advantage** and **Scientific Rationale** sections.

---

## Table of Contents

1. [Competitive Advantage Data](#competitive-advantage-data)
2. [Scientific Rationale Data](#scientific-rationale-data)
3. [Clinical Evidence Data](#clinical-evidence-data)
4. [Other Product Information](#other-product-information)
5. [Database Schema Summary](#database-schema-summary)
6. [Troubleshooting](#troubleshooting)

---

## Competitive Advantage Data

### Database Tables

Competitive advantage information is stored in **two separate tables**:

#### 1. `competitive_advantage_competitors`
**Location:** [staging-schema.sql:28-36](staging-schema.sql#L28-L36)

```sql
CREATE TABLE public.competitive_advantage_competitors (
  id integer PRIMARY KEY,
  product_name character varying NOT NULL,
  competitor_name character varying NOT NULL,
  advantages text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Stores competitive advantages against specific competitor products.

**Key Fields:**
- `product_name` - Your product name (must exactly match products table)
- `competitor_name` - Name of competing product
- `advantages` - Text describing advantages over this competitor

---

#### 2. `competitive_advantage_active_ingredients`
**Location:** [staging-schema.sql:19-27](staging-schema.sql#L19-L27)

```sql
CREATE TABLE public.competitive_advantage_active_ingredients (
  id integer PRIMARY KEY,
  product_name character varying NOT NULL,
  ingredient_name character varying NOT NULL,
  advantages text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Stores competitive advantages of your product's active ingredients.

**Key Fields:**
- `product_name` - Your product name (must exactly match products table)
- `ingredient_name` - Name of active ingredient
- `advantages` - Text describing advantages of this ingredient

---

### Data Fetching Implementation

**Location:** [ConditionDetails.js:99-150](src/components/ConditionDetails.js#L99-L150)

**Function:** `loadCompetitiveAdvantageData(productName)`

**Method:** Raw `fetch()` API (bypasses Supabase client)

**Query Structure:**
```javascript
// Competitors query
const competitorsUrl = `${SUPABASE_URL}/rest/v1/competitive_advantage_competitors?select=competitor_name,advantages&product_name=eq.${productName}`;

// Active Ingredients query
const ingredientsUrl = `${SUPABASE_URL}/rest/v1/competitive_advantage_active_ingredients?select=ingredient_name,advantages&product_name=eq.${productName}`;
```

**Headers Required:**
```javascript
{
  'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
}
```

**Data Transformation:**
```javascript
// Raw data from Supabase
{ competitor_name: "Product X", advantages: "Text..." }
// Transformed to
{ name: "Product X", advantages: "Text..." }
```

---

### UI Component

**Location:** [CompetitiveAdvantageModal.js](src/components/CompetitiveAdvantageModal.js)

**Expected Data Format:**
```javascript
{
  competitors: [
    { name: "Competitor Name", advantages: "Advantages text..." }
  ],
  activeIngredients: [
    { name: "Ingredient Name", advantages: "Advantages text..." }
  ]
}
```

**User Flow:**
1. User selects a product card
2. Clicks "Competitive Advantage" button
3. Data is fetched from both tables
4. Modal opens with two tabs (Competitors | Active Ingredients)
5. User clicks item in left panel to view advantages in right panel

---

## Scientific Rationale Data

### Database Table

Scientific rationale is stored in the **`product_details`** table.

**Location:** [staging-schema.sql:170-187](staging-schema.sql#L170-L187)

```sql
CREATE TABLE public.product_details (
  id bigint PRIMARY KEY,
  product_id bigint,
  product_name text,
  procedure_id integer,
  procedure_name text,
  scientific_rationale text,
  clinical_evidence text,
  objection_handling text,
  pitch_points text,
  rationale text,
  fact_sheet_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scientific_rationale_embedding vector(1536),
  clinical_evidence_embedding vector(1536),
  CONSTRAINT product_details_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.products(id)
);
```

**Key Fields for Scientific Rationale:**
- `product_name` - Product name (matches products table)
- `procedure_name` - Associated clinical condition/procedure
- `scientific_rationale` - Main scientific rationale text
- `rationale` - Additional rationale (legacy field)

---

### Data Fetching Implementation

**Location:** [procedureTransformer.js:251](src/services/database/transformers/procedureTransformer.js#L251)

**Method:** Data is fetched as part of the main conditions query and transformed

**Query Path:**
1. Main query fetches procedures with product_details joined
2. Data goes through `procedureTransformer.transformProcedureData()`
3. Scientific rationale extracted per product

**Transformation:**
```javascript
// Product-specific rationale
detailsMap[productName] = {
  scientificRationale: pd.scientific_rationale || '',
  clinicalEvidence: pd.clinical_evidence || '',
  handlingObjections: pd.objection_handling || '',
  pitchPoints: pd.pitch_points || '',
  rationale: pd.rationale || '',
  // ... other fields
};

// Also extracted at condition level (uses first product's rationale)
scientificRationale: extractFirstProductField(raw.product_details, 'scientific_rationale')
```

**Location in State:**
```javascript
selectedCondition.productDetails[productName].scientificRationale
```

---

### UI Display

**Location:** [ConditionDetails.js:400-410](src/components/ConditionDetails.js#L400-L410)

**Component:** `ProductDetailsModal`

**Modal Section:** `'scientificRationale'`

**User Flow:**
1. User selects a product card
2. Clicks "Scientific Rationale" button
3. Modal opens with content from `product_details.scientific_rationale`
4. Content is displayed in a formatted modal

---

## Clinical Evidence Data

### Database Source

**Table:** `product_details`
**Field:** `clinical_evidence`

**Location:** [staging-schema.sql:177](staging-schema.sql#L177)

### Data Access

Same pattern as Scientific Rationale:
- Fetched with main conditions query
- Transformed by `procedureTransformer`
- Stored at: `selectedCondition.productDetails[productName].clinicalEvidence`

### UI Display

**Location:** [ConditionDetails.js:412-423](src/components/ConditionDetails.js#L412-L423)

**Modal Section:** `'clinicalEvidence'`

---

## Other Product Information

All stored in `product_details` table and accessed via same pattern:

| UI Label | Database Field | Modal Section |
|----------|----------------|---------------|
| **Handling Objections** | `objection_handling` | `'handlingObjections'` |
| **Key Pitch Points** | `pitch_points` | `'pitchPoints'` |
| **Fact Sheet URL** | `fact_sheet_url` | N/A (direct link) |
| **Usage Instructions** | Separate table (see below) | Displayed above products |

### Phase-Specific Usage Instructions

**Table:** `phase_specific_usage`

**Location:** [staging-schema.sql:91-98](staging-schema.sql#L91-L98)

```sql
CREATE TABLE public.phase_specific_usage (
  id bigint PRIMARY KEY,
  product_id bigint NOT NULL,
  procedure_id bigint NOT NULL,
  phase_id bigint NOT NULL,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Accessed via:** `selectedCondition.productDetails[productName].usage[phaseName]`

**Displayed:** [ConditionDetails.js:275-296](src/components/ConditionDetails.js#L275-L296) (above product cards)

---

## Database Schema Summary

### Tables Involved in Product Information

```
products (main product catalog)
  ├── product_details (scientific rationale, clinical evidence, objections, pitch points)
  ├── phase_specific_usage (usage instructions per phase)
  ├── competitive_advantage_competitors (competitor comparisons)
  └── competitive_advantage_active_ingredients (ingredient advantages)
```

### Relationships

```
products.id → product_details.product_id (one-to-many)
products.id → phase_specific_usage.product_id (one-to-many)
products.name → competitive_advantage_competitors.product_name (string match)
products.name → competitive_advantage_active_ingredients.product_name (string match)
```

⚠️ **Important:** Competitive advantage tables use **string matching** on product names, not foreign keys!

---

## Troubleshooting

### Competitive Advantage Not Loading

**Symptoms:** Modal opens but shows "No competitors/ingredients available"

**Common Causes:**

1. **Product name mismatch**
   - Check: Product name in `products` table vs `product_name` in competitive tables
   - Case-sensitive matching
   - Extra spaces or special characters

   **Debug Query:**
   ```sql
   -- Check product names
   SELECT name FROM products WHERE name ILIKE '%search%';

   -- Check competitive data
   SELECT product_name FROM competitive_advantage_competitors
   WHERE product_name ILIKE '%search%';
   ```

2. **Missing environment variables**
   - `REACT_APP_SUPABASE_URL` not set
   - `REACT_APP_SUPABASE_ANON_KEY` not set

   **Fix:** Check `.env` file exists and is loaded

3. **Network/API errors**
   - Open browser DevTools → Network tab
   - Look for requests to `/rest/v1/competitive_advantage_*`
   - Check status code (should be 200)
   - Inspect response body

   **Common errors:**
   - 401: Authentication failed (check anon key)
   - 404: Table doesn't exist
   - 500: Server error (check Supabase logs)

4. **RLS policies blocking access**
   - Current schema has NO RLS on these tables
   - If RLS enabled, ensure anon role has SELECT permission

   **Check RLS:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename LIKE 'competitive%';
   ```

5. **No data in tables**
   ```sql
   SELECT COUNT(*) FROM competitive_advantage_competitors;
   SELECT COUNT(*) FROM competitive_advantage_active_ingredients;
   ```

---

### Scientific Rationale Not Loading

**Symptoms:** "Scientific Rationale" button shows empty content

**Common Causes:**

1. **Missing product_details record**
   ```sql
   SELECT * FROM product_details
   WHERE product_name = 'Your Product Name'
   AND procedure_name = 'Your Condition';
   ```

2. **NULL or empty field**
   ```sql
   SELECT
     product_name,
     procedure_name,
     LENGTH(scientific_rationale) as length,
     scientific_rationale IS NULL as is_null
   FROM product_details
   WHERE product_name = 'Your Product Name';
   ```

3. **Transformer not extracting data**
   - Check: [procedureTransformer.js:251](src/services/database/transformers/procedureTransformer.js#L251)
   - Add debug logs to see raw data

4. **State not updated**
   - Check React DevTools → Components → ConditionDetails
   - Inspect `selectedCondition.productDetails[productName]`

---

### General Debugging Steps

1. **Check Database**
   ```sql
   -- Verify tables exist
   \dt competitive_advantage*
   \dt product_details

   -- Check data exists
   SELECT * FROM competitive_advantage_competitors LIMIT 5;
   SELECT * FROM product_details LIMIT 5;
   ```

2. **Check Network Requests**
   - Open DevTools → Network
   - Filter by "supabase"
   - Check request/response for each API call

3. **Check Console Errors**
   - Open DevTools → Console
   - Look for error messages
   - Current code has `console.error()` in catch blocks

4. **Check Environment**
   ```bash
   # In project root
   cat .env | grep SUPABASE

   # Should show:
   # REACT_APP_SUPABASE_URL=https://...
   # REACT_APP_SUPABASE_ANON_KEY=eyJ...
   ```

5. **Check Product Name Exactly**
   ```javascript
   // In ConditionDetails.js, add temporary log
   console.log('Loading competitive data for:', selectedProduct);

   // Compare with database
   SELECT DISTINCT product_name FROM competitive_advantage_competitors;
   ```

---

## Key Implementation Notes

### Why Raw Fetch Instead of Supabase Client?

**Location:** [ConditionDetails.js:101](src/components/ConditionDetails.js#L101)

**Comment in code:** "Use raw fetch to bypass broken Supabase client"

- Original Supabase client had issues
- Raw fetch provides more control
- Direct REST API access is reliable

### Why String Matching for Competitive Tables?

- No foreign key constraints on competitive advantage tables
- More flexible for manual data entry
- Allows for product name variations (though can cause issues)

**Best Practice:** Keep product names consistent across all tables

### Data Fetching Patterns

**Competitive Advantage:**
- Fetched on-demand when modal opens
- Uses raw fetch API
- Separate queries for competitors and ingredients

**Scientific Rationale:**
- Fetched with main conditions data
- Part of procedures query
- Transformed and cached in state

---

## Related Files

- [staging-schema.sql](staging-schema.sql) - Database schema
- [ConditionDetails.js](src/components/ConditionDetails.js) - Main component
- [CompetitiveAdvantageModal.js](src/components/CompetitiveAdvantageModal.js) - Modal UI
- [ProductDetailsModal.js](src/components/ProductDetailsModal.js) - Scientific rationale modal
- [procedureTransformer.js](src/services/database/transformers/procedureTransformer.js) - Data transformation

---

*Last Updated: 2025-01-10*
*Version: 1.0*
