# CLAUDE.md - AI Assistant Instructions

## Project Brief

**PRISM Clinical Chart** is a React-based clinical decision support tool for dental sales representatives. It provides condition browsing, phase-based product recommendations, patient risk profiling, competitive intelligence, and research integration.

**Tech Stack:**
- React 18 + Tailwind CSS + Radix UI
- Supabase (PostgreSQL + Auth + RLS)
- Currently refactoring for production readiness

**Current State:** Mid-refactor (Phase 1-2). React Query partially integrated. Database materialized view needed but causing timeout issues.

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
Dental sales reps use this to:
- Browse clinical conditions (procedures)
- Get product recommendations by treatment phase (Prep/Acute/Maintenance)
- Match products to patient risk types (Type 1-4)
- Access competitive intelligence and research

### Current Refactor Status
- ✅ React Query installed (Step 2.1.1)
- ⚠️ Materialized view created but timing out (RLS disabled, permissions granted)
- ⚠️ App falls back to slow base table queries
- 🎯 **Immediate goal**: Fix view timeout, complete Phase 1 database foundation

### Key Files
- **Main app**: `src/components/ClinicalChartMockup.js`
- **Admin**: `src/components/AdminPanel/AdminPanelCore.js` (1168 lines - needs refactoring)
- **Database**: `src/components/AdminPanel/AdminPanelSupabase.js` (1000+ lines)
- **Queries**: `src/services/database/queries/procedures.js`
- **Schema**: `staging-schema.sql`

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
- `procedures` - Clinical conditions
- `products` - Product catalog
- `categories` - Condition categories
- `patient_types` - Risk profiles (Type 1-4)
- `phases` - Treatment phases (3 phases)
- `procedure_phase_products` - Junction table (procedure + phase + patient type → products)

---

## Current Issues (Priority Order)

### 🔴 Critical
1. **Materialized view timeout** - View exists, has data, query is fast (0.017ms), but app times out after 5s
2. **No RLS blocking** - RLS disabled on procedures, permissions granted, still timing out
3. **Fetch interceptor** - `supabaseClient.js:29` has fetch logger - check if requests even fire

### 🟡 High Priority
1. **Zero test coverage** - No tests exist
2. **Large functions** - AdminPanelCore.js needs refactoring
3. **Dead code** - ~1600 lines of LLM code removed, more cleanup needed

### 🟢 Medium Priority
1. **Console.log everywhere** - Remove for production
2. **No error boundaries** - App crashes completely on errors
3. **Security issues** - Auth in localStorage (should be httpOnly cookies)

---

## What NOT to Do

- ❌ Create new README/GUIDE files (we have too many)
- ❌ Add more query services (we already have 3 competing ones)
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

---

*Last Updated: 2025-01-06*
*Version: 2.0 (Streamlined)*
