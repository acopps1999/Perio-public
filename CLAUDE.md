# CLAUDE.md - AI Assistant Guidelines for PRISM Clinical Chart

## Project Overview

**PRISM Clinical Chart** is a React-based clinical decision support tool for dental sales representatives. It provides condition browsing, phase-based product recommendations, patient risk profiling, competitive intelligence, and research integration.

**Current Status:** Feature-complete but requires refactoring and production hardening before deployment.

**Branch:** `feature/llm-supabase-query-assistant` (working on LLM database chatbot integration)

---

## Quick Context

### What This Application Does
- Helps dental sales reps recommend products based on clinical conditions, patient risk profiles (Type 1-4), and treatment phases (Prep/Acute/Maintenance)
- Provides competitive intelligence and clinical research integration
- Includes comprehensive admin panel for data management
- **In Progress:** Natural language database chatbot for querying clinical data

### Tech Stack
- **Frontend:** React 18, Tailwind CSS, Radix UI components
- **Backend:** Supabase (PostgreSQL) with Row Level Security
- **Authentication:** Supabase Auth with custom admin table
- **Build:** Create React App with custom production config
- **LLM Integration (Partial):** Ollama local models, OpenAI/Anthropic support

### Current State (Jan 2025)
- Core features are functional
- **LLM code removed** (Jan 2025 cleanup) - uses simple pattern matching chatbot
- Database chatbot functional with SupabaseQueryService
- Multiple documentation files exist (README, PRODUCTION_SETUP, etc.)
- Significant technical debt and security issues identified (see SECURITY_FIXES.md)
- No test coverage
- Production readiness score: 25/100
- **~1600 lines of dead code removed** in cleanup

---

## Critical Issues to Be Aware Of

### 1. LLM Chatbot - Simplified (Jan 2025) ✅
**Location:** `src/components/DatabaseChatbot.js`, `src/services/supabaseQueryService.js`

**Status:** CLEANED UP - LLM code removed, chatbot functional with pattern matching

**What Was Removed:**
- `llmService.js` (652 lines) - LLM text-to-SQL generation
- `intelligentQueryService.js` (548 lines) - Advanced NLP processing
- `queryExecutor.js` (417 lines) - Raw SQL execution
- **Total: ~1600 lines of dead code removed**

**Current Implementation:**
- Uses `SupabaseQueryService` with pattern matching
- Functional but limited to simple queries
- Fast response times, no LLM latency
- Will be re-implemented properly in future with proper architecture

### 2. Security Vulnerabilities (CRITICAL)
- **Exposed secrets:** `.env` and `.env.backup` contain Supabase keys in git
- **SQL injection:** String concatenation in query building (`intelligentQueryService.js:496-506`)
- **Insecure auth storage:** Admin credentials in localStorage instead of httpOnly cookies
- **No input validation:** Direct user input to database queries

### 3. Missing Production Essentials
- **No Error Boundaries:** App crashes completely on errors
- **No Tests:** 0% test coverage
- **Console.log everywhere:** 17+ files with debug logging
- **No PropTypes:** No runtime type checking
- **No monitoring:** No error tracking or analytics

---

## Architecture Overview

### Directory Structure
```
/src
├── components/           # 25+ React components (~4500 lines)
│   ├── AdminPanel/      # Admin interface (8 subcomponents)
│   ├── ClinicalChartMockup.js  # Main app container
│   ├── DatabaseChatbot.js      # LLM chatbot UI
│   └── DiagnosisWizard.js      # Guided workflow
├── contexts/            # React Context (Auth, Theme)
├── services/            # Business logic (~1800 lines)
│   ├── llmService.js              # LLM text-to-SQL
│   ├── queryExecutor.js           # Safe SQL execution
│   ├── intelligentQueryService.js # Advanced NLP
│   ├── supabaseQueryService.js    # Query builder
│   └── databaseContext.js         # Schema definitions
├── config/              # EmailJS feedback config
├── hooks/               # useResponsive custom hook
└── supabaseClient.js    # Supabase initialization
```

### Data Flow
```
User Input → ClinicalChartMockup (main state)
  ↓
FiltersSection (category, patient type, search)
  ↓
ConditionsList (filtered conditions)
  ↓
ConditionDetails (phase selection + products)
  ↓
Modals (research, competitive advantages)
```

### Database Schema (Supabase)
**Core Tables:**
- `procedures` - Clinical conditions
- `products` - Product catalog
- `categories` - Condition categories
- `patient_types` - Risk profiles (Type 1-4)
- `phases` - Treatment phases (Prep/Acute/Maintenance)

**Junction Tables:**
- `procedure_phase_products` - Links procedures → phases → products → patient types
- `procedure_patient_types` - Links procedures → patient types

**Intelligence Tables:**
- `competitive_advantage_competitors` - Competitive positioning
- `competitive_advantage_active_ingredients` - Formulation advantages
- `condition_product_research_articles` - Clinical evidence

**Admin Tables:**
- `admins` - Admin user access
- `feedback` - User feedback/support

---

## Common Development Tasks

### Working with the Chatbot
**Current File:** `src/components/DatabaseChatbot.js`

The chatbot currently uses `SupabaseQueryService` exclusively (line 80):
```javascript
const result = await queryServiceRef.current.processQuestion(currentMessage);
```

To integrate LLM properly, you would need to:
1. Call `llmService.generateSQL()` to get SQL from natural language
2. Pass SQL to `queryExecutor.executeQuery()` for safe execution
3. Format results for display

**Key Files:**
- `src/services/llmService.js` - Handles Ollama/OpenAI/Anthropic
- `src/services/queryExecutor.js` - Executes SQL safely
- `src/services/databaseContext.js` - Schema definitions for LLM context

### Admin Panel Operations
**Location:** `src/components/AdminPanel/`

The admin system is complex (1000+ lines across 8 files):
- `AdminPanelCore.js` - Main controller, state management
- `AdminPanelSupabase.js` - All Supabase CRUD operations
- `AdminPanelConditions.js` - Condition management UI
- `AdminPanelProducts.js` - Product management UI

**Important:** Admin operations use a diff-based save approach:
1. Load data from Supabase
2. Track changes in local state
3. Calculate diff on save
4. Update only changed records
5. Invalidate cache and reload

### Data Loading & Caching
**Location:** `src/components/ClinicalChartMockup.js:74-158`

Data loading uses localStorage caching:
```javascript
const cacheKey = 'conditions_cache_v1';
const cached = localStorage.getItem(cacheKey);
// Uses 1-hour cache validity
```

**To force refresh:** Pass `forceRefresh=true` to `loadChartData()`

### Authentication Flow
**Location:** `src/contexts/AuthContext.js`

- Uses Supabase Auth for email/password
- Checks `admins` table for authorization
- 10-minute inactivity auto-logout
- Stores session in localStorage (insecure - needs fix)

---

## Code Patterns & Conventions

### Component Patterns
- **Functional components only** - No class components
- **Hooks everywhere** - useState, useEffect, useCallback, useRef, useContext
- **Context for global state** - Auth and Theme use React Context
- **Prop drilling** - Props passed down component tree (no Redux/Zustand)

### Styling Patterns
- **Tailwind CSS utility classes** - All styling via Tailwind
- **Dark mode support** - Managed via ThemeContext
- **Responsive design** - useResponsive hook for device detection
- **Radix UI components** - Dialog, Tabs, Select for accessible UI

### Data Patterns
- **Supabase client** - Centralized in `supabaseClient.js`
- **localStorage caching** - Conditions cached for 1 hour
- **Async/await** - Consistent async handling
- **Try/catch blocks** - Error handling (but incomplete)

### Naming Conventions
- **camelCase for variables** - `loadChartData`, `currentMessage`
- **PascalCase for components** - `ClinicalChartMockup`, `AdminPanel`
- **snake_case in database** - `procedure_phase_products`, `patient_types`
- **Emoji logging** - `🗄️`, `🧠`, `❌` (should be removed for production)

---

## Development Workflow

### Starting Development
```bash
npm run dev          # Port 3000
```

### Building for Production
```bash
npm run build:prod   # Optimized build with 4GB memory allocation
npm start           # Serves on port 10000
```

### Database Changes
1. Update `supabase_schema.sql`
2. Run SQL in Supabase dashboard
3. Test in development
4. Update seed data if needed
5. Document changes

### Environment Variables
**Required:**
```env
REACT_APP_SUPABASE_URL=your_url
REACT_APP_SUPABASE_ANON_KEY=your_key
```

**Optional (LLM):**
```env
REACT_APP_OLLAMA_MODEL=llama3.2
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
REACT_APP_OPENAI_API_KEY=sk-...
REACT_APP_ANTHROPIC_API_KEY=...
```

---

## Testing Guidelines (Currently Missing)

**Needs Implementation:**
- Unit tests for services and utilities
- Component tests with React Testing Library
- Integration tests for API calls
- E2E tests for critical flows (auth, data loading, admin CRUD)

**Recommended Setup:**
- Jest + React Testing Library
- Target 70%+ code coverage
- Pre-commit hooks to run tests
- CI/CD integration

---

## Common Gotchas

### 1. Cache Invalidation
**Problem:** Data changes don't appear after admin edits

**Fix:** Call `invalidateConditionsCache()` after any admin operation

### 2. State Not Updating
**Problem:** UI doesn't reflect database changes

**Fix:** Use `forceRefresh=true` when calling `loadChartData()`

### 3. Build Failures
**Problem:** "JavaScript heap out of memory"

**Fix:** Already configured in package.json:
```json
"build:prod": "NODE_OPTIONS='--max_old_space_size=4096' ..."
```

### 4. Supabase RLS Policies
**Problem:** Admin can't access certain tables

**Fix:** Check Row Level Security policies in Supabase dashboard

### 5. LLM Service Not Working
**Problem:** Ollama queries fail

**Root Cause:** Ollama not installed/running, or code never calls LLM service

**Fix:** See LLM chatbot integration section above

---

## Production Deployment Considerations

### Security (Critical)
1. **Rotate all Supabase keys** - Current keys are exposed
2. **Remove .env from git history** - Use `git filter-branch` or BFG Repo-Cleaner
3. **Fix SQL injection** - Use parameterized queries only
4. **Secure auth storage** - Migrate to httpOnly cookies
5. **Add input validation** - Validate all user inputs

### Code Quality
1. **Remove console.log** - Use proper logging service
2. **Add PropTypes** - Or migrate to TypeScript
3. **Add Error Boundaries** - Catch and handle errors gracefully
4. **Refactor large functions** - Break into smaller units

### Monitoring & Observability
1. **Error tracking** - Add Sentry or similar
2. **Analytics** - Track user behavior
3. **Performance monitoring** - Core Web Vitals
4. **Logging** - Structured logging with levels

### Testing
1. **Unit tests** - Critical business logic
2. **Integration tests** - API interactions
3. **E2E tests** - User workflows
4. **Load testing** - Performance under scale

---

## Files NOT to Modify Without Review

### Critical Configuration Files
- `supabase_schema.sql` - Database schema (coordinate changes)
- `.env` - Contains secrets (should not be in git)
- `package.json` - Build scripts are carefully tuned
- `tailwind.config.js` - Brand colors and theme config

### Complex Business Logic Files
- `src/components/AdminPanel/AdminPanelCore.js` - 1168 lines, complex state
- `src/components/AdminPanel/AdminPanelSupabase.js` - All database operations
- `src/components/ClinicalChartMockup.js` - Main app controller

### Files to Refactor (Not Extend)
- `src/services/intelligentQueryService.js` - Dead code, remove or integrate
- `src/services/llmService.js` - Needs integration or removal
- `src/services/queryExecutor.js` - Unused, integrate or remove

---

## Documentation Files Reference

### Existing Documentation
- `readme.md` - Main project README (comprehensive)
- `PRODUCTION_SETUP.md` - Production deployment guide
- `FREE_PRODUCTION_GUIDE.md` - Free-tier deployment
- `LLM_INTEGRATION_README.md` - LLM setup instructions
- `SECURE_ADMIN_SETUP.md` - Admin security guidelines
- `AustinRec.md` - Developer notes/recommendations
- `supabase_schema.sql` - Database schema with comments

### New Documentation (This Directory)
- `CLAUDE.md` (this file) - AI assistant guidelines
- `architecture.md` - System architecture deep-dive
- `src/components/CONTEXT.md` - Component documentation
- `src/services/CONTEXT.md` - Services documentation
- `src/components/AdminPanel/CONTEXT.md` - Admin panel documentation

---

## When to Ask for Clarification

1. **LLM Integration Approach:** There are three competing implementations. Ask which to use.
2. **Data Model Changes:** Database changes affect multiple files. Confirm approach.
3. **Security Changes:** Auth and access control changes require careful review.
4. **Deployment Strategy:** Multiple deployment guides exist. Clarify target environment.
5. **Feature Priority:** Significant technical debt exists. Prioritize with the developer.

---

## Helpful Commands

### Database Operations
```bash
# Create admin user (requires service role key)
node create-any-admin.js

# Export data
# (Use admin panel UI: Admin → Import/Export tab)
```

### Development
```bash
npm run dev              # Start dev server
npm run build           # Production build
npm start               # Serve production build
npm test                # Run tests (none exist yet)
```

### Git Operations
```bash
git status              # Check working tree
git log --oneline -10   # Recent commits
git diff                # Uncommitted changes
```

### Debugging
```bash
# Check Supabase connection
node -e "require('dotenv').config(); console.log(process.env.REACT_APP_SUPABASE_URL)"

# Check Ollama status (for LLM)
curl http://localhost:11434/api/tags

# Check running Node processes
ps aux | grep node
```

---

## Project History Context

### Recent Work (from git commits)
- `ca053f14` - Configure for free production deployment
- `2042ac73` - Production-grade deployment config
- `73dcf31a` - Add open-source LLM support (Ollama)
- `0f52caf4` - Hide feedback button from non-users
- `2ab10407` - Final changes for client review

### Current Branch
`feature/llm-supabase-query-assistant` - Adding LLM chatbot functionality

### What Was Attempted
1. Started with simple Supabase query builder (works)
2. Added LLM text-to-SQL generation (partially implemented)
3. Added advanced NLP query service (never integrated)
4. Result: Three approaches exist but only one is active

---

## AI Assistant Best Practices for This Project

### DO
- Read context files before making changes
- Check if features already exist (lots of code)
- Consider security implications (many vulnerabilities exist)
- Test admin panel operations carefully (complex state management)
- Ask about architectural decisions (LLM integration approach unclear)
- Look for existing patterns before inventing new ones
- Consider mobile responsiveness (app is desktop-first but has mobile support)

### DON'T
- Add more console.log statements (cleaned up Jan 2025)
- Create new query services without removing old ones
- Modify database schema without checking dependencies
- Add features without tests (0% coverage needs to improve)
- Commit .env files (already a problem)
- Make security changes without thorough review
- Assume LLM features work (they don't)
- **NEVER git commit unless explicitly instructed by the user**

### WHEN REFACTORING
- Break large functions into smaller units
- Add tests as you go
- Remove dead code (lots exists)
- Add PropTypes or TypeScript
- Improve error handling (many gaps)
- Document complex logic
- Consider security implications

---

## Contact & Support

**Developer:** Austin Copps (coppsaustin@gmail.com)

**Project Started:** Early in developer's coding career (self-described "vibe coding")

**Current Goal:** Refactor for production readiness, fix LLM integration

---

*Last Updated: January 2025*
*Version: 1.0*
*Status: Active Development*
