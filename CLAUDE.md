# CLAUDE.md - AI Assistant Instructions

## Project Brief

**PRISM Clinical Chart** is a React-based clinical decision support tool for dental sales representatives. It provides condition browsing, phase-based product recommendations, patient risk profiling, competitive intelligence, and research integration.

**Tech Stack:**
- React 18 + Tailwind CSS + Radix UI
- Supabase (PostgreSQL + Auth + RLS)
- Currently refactoring for production readiness

**Current State:** Phase 3 complete (Dec 2024). Role-based access control, simplified product ranking, custom phase labels implemented.

---

## Core Rules

### 1. Task Management
- **For complex tasks**: Create a plan, then spawn parallel subagents using the Task tool to maximize efficiency
- **Track progress**: Update `progress.md` after any significant changes (max 350 lines, rolling window)
- **Use TodoWrite**: Track all multi-step tasks and mark completed immediately

### 2. File Hygiene
- **No AI slop**: Only create necessary markdown files
- **Delete one-offs**: Remove temporary files (TEST_*.js, FIX_*.sql, etc.) after use
- **No duplicate docs**: We have too many README/guide files already - don't add more

### 3. Context Sources (Check These FIRST)
Before searching entire codebase, check:
1. **`staging-schema.sql`** - Database structure (ground truth)
2. **`ARCHITECTURE.md`** - System architecture overview
3. **Context files**:
   - `src/components/AdminPanel/CONTEXT.md` - Admin panel details
   - `src/services/CONTEXT.md` - Service layer (when created)
   - `src/components/CONTEXT.md` - Component docs (when created)

### 4. Development Workflow
```bash
npm run dev          # Port 3000
npm run build:prod   # Production build (4GB memory allocated)
```

### 5. Never Commit Unless Explicitly Asked
Do not run git commands unless user explicitly requests it.

---

## Quick Context

### What This Does
Dental sales reps and clinicians use this to:
- Browse clinical conditions (procedures)
- Get ranked product recommendations by treatment phase (Prep/Acute/Maintenance)
- Access competitive intelligence (sales only) and research
- Role-based access: Admin sees all, Sales sees sales features, Clinician sees clinical only

### Phase 3 Features (Completed Dec 2024)
- ✅ **Role System**: Admin, Sales, Clinician roles with feature visibility control
- ✅ **Product Ranking**: Drag-and-drop ranking per phase (no more patient type grouping)
- ✅ **Custom Phase Labels**: Rename "Prep/Acute/Maintenance" per procedure
- ✅ **DynamicTextarea**: Expandable, draggable text editor with formatting
- ✅ **Feature Visibility**: Central config for role-based UI filtering

### Key Files
- **Main app**: `src/components/ClinicalChartMockup.js`
- **Admin**: `src/components/AdminPanel/AdminPanelCore.js`
- **Database**: `src/components/AdminPanel/AdminPanelSupabase.js`
- **Queries**: `src/services/database/queries/procedures.js`
- **Transformer**: `src/services/database/transformers/procedureTransformer.js`
- **Schema**: `staging-schema.sql`
- **AI Chatbot**: `src/services/ai/agenticSearchService.js`
- **Feature Visibility**: `src/config/featureVisibility.js` (role-based access)
- **Auth Context**: `src/contexts/AuthContext.js` (role helpers)

### Agentic Search (AI Chatbot)
- ✅ **Replaced RAG system** (Jan 2025) - Removed complex 3-stage pipeline (15 files) in favor of simple GPT-4o agentic search (2 files)
- **How it works**: GPT-4o with function calling → direct SQL queries → no embeddings needed
- **9 SQL tools**: search_products, search_procedures, get_product_details, get_competitive_advantages, etc.
- **Transparent**: Users see which queries ran
- **Cost**: ~$0.005/query (~$5/month for 1000 queries)
- **Docs**: See `AGENTIC_SEARCH.md` for full architecture details

---

## Common Tasks

### Database Operations
- **Schema changes**: Update `staging-schema.sql`, run in Supabase dashboard, test, document
- **Query debugging**: Check `src/services/database/queries/` first
- **RLS issues**: RLS is DISABLED on procedures table (check `staging-schema.sql`)

### Component Work
- **Admin panel**: See `src/components/AdminPanel/CONTEXT.md` - complex state management
- **Main app**: `ClinicalChartMockup.js` - handles filters, conditions, products
- **Styling**: Tailwind utility classes, dark mode via `ThemeContext`

### Refactoring
- Break large functions (AdminPanelCore.js has 183-line functions)
- Remove console.log statements (production issue)
- Add error boundaries (currently missing)
- Test as you go (0% coverage currently)

---

## Architecture Quick Reference

### Data Flow
```
Supabase (procedures_complete view - timing out)
    ↓
React Query (useConditions hook)
    ↓
ClinicalChartMockup (main state)
    ↓
FiltersSection → ConditionsList → ConditionDetails
```

### State Management
- **Local**: useState for component state
- **Global**: AuthContext, ThemeContext
- **Cache**: localStorage (1-hour TTL for conditions)
- **Server**: Supabase (source of truth)

### Database Schema (Core)
- `procedures` - Clinical conditions (+ `custom_phase_labels` JSONB)
- `products` - Product catalog
- `categories` - Condition categories
- `phases` - Treatment phases (3 phases)
- `procedure_phase_products` - Junction table (procedure + phase + product + rank)
- `user_profiles` - Users with role (admin/sales/clinician)
- `product_details` - Clinical evidence, pitch points, objection handling

### Role System
- **Admin**: Full access to all features and admin panel
- **Sales**: Sales features (competitive advantage, pitch points, objections) + clinical
- **Clinician**: Clinical evidence only (no sales features)

Use `hasFeatureAccess(feature, userRole)` from `src/config/featureVisibility.js`

---

## Current Issues (Priority Order)

### 🟡 High Priority
1. **Run materialized view fix** - Run `database/migrations/fix_product_details_in_view.sql` to include all product_details columns
2. **Test coverage** - Unit tests added for featureVisibility and productRanking
3. **Large functions** - AdminPanelCore.js could use refactoring

### 🟢 Medium Priority
1. **No error boundaries** - App crashes completely on errors
2. **Security issues** - Auth in localStorage (should be httpOnly cookies)
3. **Browser compatibility testing** - Needs testing across browsers

---

## What NOT to Do

- ❌ Create new README/GUIDE files (we have too many)
- ❌ Add more AI/RAG complexity (agentic search is simple on purpose - 2 files total)
- ❌ Modify schema without checking dependencies
- ❌ Add features without tests
- ❌ Commit .env files
- ❌ Git commit unless explicitly asked
- ❌ Create temporary test files and forget to delete them
- ❌ Use console.log for anything (cleaned up Jan 2025)

---

## Getting Unstuck

### Database not loading?
1. Check `staging-schema.sql` for actual schema
2. Check `src/services/database/queries/procedures.js` for query logic
3. Check browser Network tab for actual Supabase requests
4. Check Supabase dashboard logs

### Admin panel broken?
1. See `src/components/AdminPanel/CONTEXT.md` - full documentation
2. Check if cache needs invalidation: `invalidateConditionsCache()`
3. Check if RLS policies blocking writes

### Refactor guidance needed?
1. Check `ARCHITECTURE.md` for patterns
2. Check `refactorplan_new.md` for phase-by-phase plan
3. Ask user for priorities (significant technical debt exists)

---

## Environment Variables

```env
# Required
REACT_APP_SUPABASE_URL=https://fjuczpoufvslbkaafmve.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<key>

# Optional (LLM features - currently inactive)
REACT_APP_OLLAMA_MODEL=llama3.2
REACT_APP_OPENAI_API_KEY=sk-...
```

---

## Contact

**Developer**: Austin Copps (coppsaustin@gmail.com)
**Project Status**: Active refactoring for production readiness
**Started**: Early in developer's coding journey ("vibe coding" phase)
**Goal**: Production-ready, secure, tested application

- when performing git commit, NEVER put anything related to "written by claude" in the commit message.
---

*Last Updated: 2024-12-02*
*Version: 3.0 (Phase 3 Complete)*
