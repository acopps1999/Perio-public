# PRISM Clinical Chart - System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Data Architecture](#data-architecture)
6. [Component Architecture](#component-architecture)
7. [Service Layer Architecture](#service-layer-architecture)
8. [Authentication & Authorization](#authentication--authorization)
9. [LLM Integration Architecture](#llm-integration-architecture)
10. [State Management](#state-management)
11. [Caching Strategy](#caching-strategy)
12. [Design Patterns](#design-patterns)
13. [Technical Decisions](#technical-decisions)
14. [Known Issues & Technical Debt](#known-issues--technical-debt)

---

## System Overview

### High-Level Description
PRISM Clinical Chart is a **single-page application (SPA)** built with React 18 that provides clinical decision support for dental sales representatives. The application enables users to browse dental conditions, get phase-based product recommendations tailored to patient risk profiles, access competitive intelligence, and manage clinical data through an admin interface.

### Core Capabilities
1. **Clinical Decision Support** - Condition browsing, filtering, and product recommendations
2. **Phase-Based Treatment Planning** - Prep, Acute, Maintenance phase recommendations
3. **Patient Risk Profiling** - Type 1-4 risk categorization with tailored guidance
4. **Competitive Intelligence** - Competitor and active ingredient analysis
5. **Research Integration** - Clinical evidence and peer-reviewed studies
6. **Admin Management** - Full CRUD operations on conditions, products, and categories
7. **Feedback System** - User feedback collection and management
8. **Database Chatbot** (Partial) - Natural language database queries via LLM

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │              React Application (SPA)                   │      │
│  │                                                         │      │
│  │  ┌─────────────────────────────────────────────┐      │      │
│  │  │   Components Layer                           │      │      │
│  │  │   - ClinicalChartMockup (Main Container)    │      │      │
│  │  │   - AdminPanel (Management Interface)        │      │      │
│  │  │   - DatabaseChatbot (LLM Interface)          │      │      │
│  │  │   - DiagnosisWizard (Guided Workflow)        │      │      │
│  │  └─────────────────────────────────────────────┘      │      │
│  │                         │                               │      │
│  │  ┌─────────────────────────────────────────────┐      │      │
│  │  │   Context Layer (Global State)              │      │      │
│  │  │   - AuthContext (Authentication)            │      │      │
│  │  │   - ThemeContext (Dark/Light Mode)          │      │      │
│  │  └─────────────────────────────────────────────┘      │      │
│  │                         │                               │      │
│  │  ┌─────────────────────────────────────────────┐      │      │
│  │  │   Services Layer (Business Logic)          │      │      │
│  │  │   - Supabase Query Service (Active)         │      │      │
│  │  │   - LLM Service (Partial)                   │      │      │
│  │  │   - Query Executor (Inactive)               │      │      │
│  │  │   - Intelligent Query Service (Inactive)    │      │      │
│  │  └─────────────────────────────────────────────┘      │      │
│  │                         │                               │      │
│  │  ┌─────────────────────────────────────────────┐      │      │
│  │  │   Supabase Client (Data Access)             │      │      │
│  │  └─────────────────────────────────────────────┘      │      │
│  └───────────────────────────────────────────────────────┘      │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                    HTTPS / WebSocket
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                     Supabase (Backend)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────┐    ┌────────────────────┐               │
│  │   PostgreSQL DB    │    │   Supabase Auth    │               │
│  │   - procedures     │    │   - JWT tokens     │               │
│  │   - products       │    │   - Session mgmt   │               │
│  │   - categories     │    └────────────────────┘               │
│  │   - patient_types  │                                          │
│  │   - phases         │    ┌────────────────────┐               │
│  │   - research       │    │   Row Level         │               │
│  │   - competitive    │    │   Security (RLS)    │               │
│  │   - admins         │    │   - Access control  │               │
│  │   - feedback       │    └────────────────────┘               │
│  └────────────────────┘                                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  External Services (Optional)                      │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Ollama     │  │   OpenAI     │  │   EmailJS            │   │
│  │   (Local LLM)│  │   (Cloud LLM)│  │   (Feedback Alerts)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **React 18.2.0** - Core UI library with Hooks API
- **Tailwind CSS 3.3.2** - Utility-first CSS framework
- **Radix UI** - Headless accessible component primitives
  - Dialog, Tabs, Select components
- **Lucide React 0.257.0** - Icon library
- **React Router DOM 7.6.2** - Client-side routing (minimal usage)

### Application Structure
The frontend follows a **component-based architecture** with functional components and React Hooks.

```
/src
├── index.js                     # Entry point, renders root
├── index.css                    # Global styles, Tailwind imports
├── supabaseClient.js           # Supabase initialization
│
├── components/                  # UI Components (~4500 lines)
│   ├── ClinicalChartMockup.js         # Main app container
│   ├── DiagnosisWizard.js             # Guided workflow
│   ├── ConditionDetails.js            # Detail view
│   ├── ConditionsList.js              # List view
│   ├── FiltersSection.js              # Filtering UI
│   ├── DatabaseChatbot.js             # LLM chatbot
│   ├── FeedbackWidget.js              # Feedback system
│   ├── AdminPanel.js                  # Admin container
│   └── AdminPanel/                    # Admin subcomponents
│       ├── AdminPanelCore.js          # State controller
│       ├── AdminPanelSupabase.js      # DB operations
│       ├── AdminPanelConditions.js    # Condition management
│       ├── AdminPanelProducts.js      # Product management
│       ├── AdminPanelCategories.js    # Category management
│       ├── AdminPanelImportExport.js  # Data management
│       └── AdminPanelModals.js        # Modal components
│
├── contexts/                    # React Context API
│   ├── AuthContext.js                 # Authentication state
│   └── ThemeContext.js                # Theme (dark/light)
│
├── services/                    # Business Logic (~1800 lines)
│   ├── llmService.js                  # LLM text-to-SQL
│   ├── queryExecutor.js               # SQL execution
│   ├── intelligentQueryService.js     # NLP processing
│   ├── supabaseQueryService.js        # Query builder
│   └── databaseContext.js             # Schema definitions
│
├── hooks/                       # Custom Hooks
│   └── useResponsive.js              # Responsive design utilities
│
├── config/                      # Configuration
│   └── feedbackConfig.js            # EmailJS setup
│
└── utils/                       # Utilities
    └── categoryDescriptions.js      # Static content
```

### Component Hierarchy
```
<ThemeProvider>
  <AuthProvider>
    <ClinicalChartMockup>
      {/* Main Application */}
      <PrismTitleSection />
      <ThemeToggle />
      <FiltersSection />
      <ConditionsList />
      <ConditionDetails />

      {/* Modals & Overlays */}
      <DiagnosisWizard />
      <AdminPanel>
        <AdminPanelCore>
          <AdminPanelConditions />
          <AdminPanelProducts />
          <AdminPanelCategories />
          <AdminPanelImportExport />
        </AdminPanelCore>
      </AdminPanel>
      <DatabaseChatbot />
      <FeedbackWidget />

      {/* Data Modals */}
      <CompetitiveAdvantageModal />
      <ResearchModal />
      <ProductDetailsModal />
    </ClinicalChartMockup>
  </AuthProvider>
</ThemeProvider>
```

---

## Backend Architecture

### Supabase (Backend-as-a-Service)
Supabase provides the entire backend infrastructure:

1. **PostgreSQL Database** - Relational data storage
2. **Authentication** - JWT-based auth with email/password
3. **REST API** - Auto-generated from database schema
4. **Row Level Security (RLS)** - Database-level access control
5. **Real-time** - WebSocket subscriptions (not currently used)

### API Layer
All database operations go through the Supabase JavaScript client:

```javascript
// Example query pattern
const { data, error } = await supabase
  .from('procedures')
  .select(`
    *,
    category:categories(name),
    patient_types(id, name, description)
  `)
  .eq('category', 'Surgical');
```

### Service Role vs Anon Key
- **Anon Key** - Frontend access, limited by RLS policies
- **Service Role Key** - Admin scripts only (e.g., `create-any-admin.js`)

---

## Data Architecture

### Database Schema Overview

#### Core Entity Model
```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  categories  │       │  procedures  │       │    phases    │
│              │◄──────┤              │       │              │
│  - id        │       │  - id        │       │  - id        │
│  - name      │       │  - name      │       │  - name      │
└──────────────┘       │  - category  │       │  (3 phases)  │
                       │  - pitch_pts │       └──────────────┘
                       └──────────────┘
                              │
                              │ Many-to-Many
                              ▼
                    ┌────────────────────────┐
                    │ procedure_phase_       │
                    │ products               │
                    │  - procedure_id        │
                    │  - phase_id            │◄───────┐
                    │  - product_id          │        │
                    │  - patient_type_id     │        │
                    └────────────────────────┘        │
                              │                       │
              ┌───────────────┴───────────────┐       │
              ▼                               ▼       │
       ┌──────────────┐               ┌──────────────┐
       │   products   │               │patient_types │
       │              │               │              │
       │  - id        │               │  - id        │
       │  - name      │               │  - name      │
       └──────────────┘               │  - desc      │
                                      │  (4 types)   │
                                      └──────────────┘
```

#### Intelligence & Research Model
```
┌──────────────────────────────────┐
│ competitive_advantage_competitors│
│  - id                            │
│  - product_name                  │
│  - competitor_name               │
│  - advantages (text)             │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│competitive_advantage_active_     │
│ingredients                       │
│  - id                            │
│  - product_name                  │
│  - ingredient_name               │
│  - advantages (text)             │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│condition_product_research_       │
│articles                          │
│  - id                            │
│  - procedure_id (FK)             │
│  - product_id (FK)               │
│  - title, author, abstract, url  │
└──────────────────────────────────┘
```

#### Admin & Feedback Model
```
┌──────────────┐                ┌──────────────┐
│    admins    │                │   feedback   │
│              │                │              │
│  - id        │                │  - id (uuid) │
│  - user_id   │◄────Auth       │  - type      │
│  - email     │                │  - location  │
└──────────────┘                │  - description│
                                │  - context   │
                                │  - status    │
                                └──────────────┘
```

### Key Database Concepts

#### Patient-Specific Configuration
Products are recommended based on **three dimensions**:
1. **Procedure** (e.g., Implant Placement)
2. **Phase** (Prep, Acute, Maintenance)
3. **Patient Type** (Type 1-4 risk profiles)

This is stored in the `procedure_phase_products` junction table:
```sql
CREATE TABLE procedure_phase_products (
  id BIGSERIAL PRIMARY KEY,
  procedure_id BIGINT REFERENCES procedures(id),
  phase_id BIGINT REFERENCES phases(id),
  product_id BIGINT REFERENCES products(id),
  patient_type_id BIGINT REFERENCES patient_types(id)
);
```

Example: "For **Implant Placement** in the **Acute Phase** for **Type 3** (high-risk) patients, recommend **Chlorhexidine Rinse**."

#### Pitch Points
Each condition has `pitch_points` (text field) containing sales talking points:
```
"Key benefits: Reduces inflammation, speeds healing, prevents infection"
```

---

## Component Architecture

### Component Categories

#### 1. Container Components
**ClinicalChartMockup.js** - Main application controller
- Manages global application state (conditions, products, filters)
- Loads data from Supabase on mount
- Handles responsive layout switching
- Routes between main views and modals

**AdminPanel.js** + **AdminPanelCore.js** - Admin system controller
- Loads all admin data (conditions, products, categories)
- Manages edit/save/delete workflows
- Tracks changes for diff-based updates
- Handles cache invalidation

#### 2. Presentation Components
- **ConditionsList** - Grid display of conditions
- **ConditionDetails** - Detail view with phase tabs
- **FiltersSection** - Filter controls
- **ResearchModal** - Research articles
- **CompetitiveAdvantageModal** - Competitive data

#### 3. Form Components
- **AdminPanelConditions** - Condition CRUD forms
- **AdminPanelProducts** - Product management
- **AdminPanelCategories** - Category management
- **AdminLoginModal** - Authentication form
- **FeedbackWidget** - Feedback submission form

#### 4. Smart Components (With Business Logic)
- **DiagnosisWizard** - Multi-step guided workflow
- **DatabaseChatbot** - LLM query interface
- **AdminPanelImportExport** - Data import/export logic

### Component Communication Patterns

#### Props Down, Events Up
```javascript
// Parent passes data and callbacks
<ConditionsList
  conditions={filteredConditions}
  selectedCondition={selectedCondition}
  onSelectCondition={handleSelectCondition}
/>

// Child calls callback on interaction
const handleClick = (condition) => {
  onSelectCondition(condition);
};
```

#### Context for Global State
```javascript
// AuthContext usage
const { isAuthenticated, adminUser, login, logout } = useAuth();

// ThemeContext usage
const { isDarkMode, toggleTheme } = useTheme();
```

#### Ref Forwarding for Service Access
```javascript
// DatabaseChatbot stores service instance in ref
const queryServiceRef = useRef(new SupabaseQueryService(supabase));

// Avoids recreating service on every render
```

---

## Service Layer Architecture

### Service Responsibilities

#### 1. Data Access Services
**Location:** `src/components/AdminPanel/AdminPanelSupabase.js`

Functions:
- `loadConditionsFromSupabase()` - Fetch conditions with caching
- `loadProductsFromSupabase()` - Fetch product catalog
- `addConditionToSupabase()` - Create new condition
- `updateConditionInSupabase()` - Update existing condition
- `deleteConditionFromSupabase()` - Remove condition
- `loadCompetitiveAdvantages()` - Fetch competitive data

#### 2. Query Processing Services (Partially Implemented)

**SupabaseQueryService** (ACTIVE)
- Location: `src/services/supabaseQueryService.js`
- Purpose: Convert natural language to Supabase queries
- Uses: Intent detection, entity extraction, query builder
- Status: Functional, currently used by DatabaseChatbot

**LLMService** (PARTIAL)
- Location: `src/services/llmService.js`
- Purpose: Generate SQL from natural language using LLM
- Supports: Ollama (local), OpenAI, Anthropic, HuggingFace
- Status: Code exists but never called

**IntelligentQueryService** (INACTIVE)
- Location: `src/services/intelligentQueryService.js`
- Purpose: Advanced multi-step NLP query processing
- Features: Intent classification, context retrieval, query planning
- Status: Complete implementation but unused (dead code)

**QueryExecutor** (INACTIVE)
- Location: `src/services/queryExecutor.js`
- Purpose: Safe execution of raw SQL queries
- Features: Validation, timeout protection, result limiting
- Status: Only used by IntelligentQueryService (also inactive)

#### 3. Configuration Services
**DatabaseContext** (`src/services/databaseContext.js`)
- Compressed schema for LLM prompts
- Query templates
- Condition name mappings
- Entity extraction helpers

### Service Architecture Issues

**Problem:** Three competing query approaches exist:
1. Supabase Query Builder (simple, works)
2. LLM Text-to-SQL (complex, not integrated)
3. Intelligent Query Service (very complex, dead code)

**Decision Needed:** Choose one approach and remove others, or create proper fallback chain.

---

## Authentication & Authorization

### Authentication Flow

```
1. User clicks "Admin" → Opens AdminLoginModal
2. User enters email/password
3. AuthContext.login() called
   │
   ├──> supabase.auth.signInWithPassword()
   │    └──> Returns JWT token + user object
   │
   ├──> Check 'admins' table for user_id
   │    └──> SELECT * FROM admins WHERE user_id = ?
   │
   ├──> Store in localStorage (INSECURE)
   │    - 'admin_authenticated': 'true'
   │    - 'admin_user': JSON.stringify(user)
   │
   └──> Set AuthContext state
        - isAuthenticated: true
        - adminUser: { ...userData }
```

### Session Management

**Inactivity Timeout:** 10 minutes
```javascript
// AuthContext.js monitors user activity
const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

activityEvents.forEach(event => {
  window.addEventListener(event, resetInactivityTimer);
});

const resetInactivityTimer = () => {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(performLogout, 600000); // 10 min
};
```

### Authorization Model

**Row Level Security (RLS) Policies** in Supabase:
- Public read access to procedures, products, categories, research
- Admin-only write access (checked via `admins` table)
- Feedback table: Users can insert, admins can read/update

**Frontend Authorization Checks:**
```javascript
// Only show admin features if authenticated
{isAuthenticated && (
  <button onClick={openAdminPanel}>Admin Panel</button>
)}
```

### Security Issues (CRITICAL)

1. **localStorage Storage** - Should use httpOnly cookies
2. **Client-Side Checks** - Authorization should be server-enforced
3. **Exposed Keys** - Anon key visible in browser (expected) but service key in git (bad)
4. **No CSRF Protection** - No token validation

---

## LLM Integration Architecture

### Intended Architecture (Not Fully Implemented)

```
User Question
    │
    ▼
┌─────────────────────────────────┐
│  DatabaseChatbot Component      │
│  - UI for chat interface        │
│  - Message history management   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  LLMService                     │
│  - Provider selection (Ollama/  │
│    OpenAI/Anthropic)            │
│  - Prompt engineering           │
│  - SQL generation               │
└─────────────────────────────────┘
    │
    ├─────> Option A: IntelligentQueryService
    │       - Intent classification
    │       - Context retrieval
    │       - Multi-step query planning
    │       - Confidence scoring
    │
    └─────> Option B: Direct SQL generation
            - Simple LLM prompt
            - SQL query output
    │
    ▼
┌─────────────────────────────────┐
│  QueryExecutor                  │
│  - SQL validation               │
│  - Safe execution               │
│  - Timeout protection           │
│  - Result formatting            │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Supabase Database              │
│  - Execute query                │
│  - Return results               │
└─────────────────────────────────┘
    │
    ▼
Display formatted results to user
```

### Current Implementation (Simplified)

```
User Question
    │
    ▼
DatabaseChatbot
    │
    ▼
SupabaseQueryService
    │
    ├─> analyzeIntent() - Pattern matching
    ├─> executeQueries() - Query builder API
    └─> formatResponse() - Natural language output
    │
    ▼
Supabase (via query builder, not raw SQL)
```

### LLM Provider Support

**Ollama (Local)**
- Base URL: `http://localhost:11434`
- Default model: `llama3.2:1b`
- Pros: Free, private, no rate limits
- Cons: Requires installation, limited by hardware

**OpenAI**
- Models: `gpt-4`, `gpt-3.5-turbo`
- Pros: High quality, reliable
- Cons: Paid, rate limits

**Anthropic**
- Model: `claude-3-sonnet`
- Pros: Excellent reasoning
- Cons: Paid, rate limits

**HuggingFace**
- Free hosted inference
- Various open-source models
- Pros: Free
- Cons: Lower quality, slower

### Configuration
```javascript
// llmService.js default config
const DEFAULT_CONFIG = {
  provider: LLM_PROVIDERS.OLLAMA,
  useIntelligentService: true,
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:1b',
    timeout: 45000
  }
};
```

### Issues
1. LLM code exists but is never called
2. Invalid model names in .env (`sqlcoder:7b`, `codellama:7b`)
3. No connection testing or error handling
4. Ollama not installed/running

---

## State Management

### State Architecture

#### Component-Level State (useState)
Used for UI state within components:
```javascript
// ClinicalChartMockup.js
const [conditions, setConditions] = useState([]);
const [selectedCondition, setSelectedCondition] = useState(null);
const [filters, setFilters] = useState({ category: '', patientType: '' });
```

#### Global State (React Context)
Used for app-wide state:

**AuthContext:**
- `isAuthenticated` - Boolean auth status
- `adminUser` - Current user object
- `login()` - Authentication function
- `logout()` - Logout function

**ThemeContext:**
- `isDarkMode` - Boolean theme state
- `toggleTheme()` - Theme switcher

#### Persistent State (localStorage)
Used for caching and session persistence:

**Conditions Cache:**
```javascript
const cacheKey = 'conditions_cache_v1';
localStorage.setItem(cacheKey, JSON.stringify({
  data: conditions,
  timestamp: Date.now(),
  version: 'v1'
}));
```

**Auth Session:**
```javascript
localStorage.setItem('admin_authenticated', 'true');
localStorage.setItem('admin_user', JSON.stringify(userData));
```

**Theme Preference:**
```javascript
localStorage.setItem('prism-theme', isDarkMode ? 'dark' : 'light');
```

#### Server State (Supabase)
Source of truth for all data:
- Conditions, products, categories
- Patient types, phases
- Research, competitive advantages
- Feedback, admin users

### State Flow Pattern
```
Supabase (Server State)
    │
    ▼
loadChartData() → localStorage (Cache)
    │
    ▼
Component State (useState)
    │
    ▼
Derived State (filters applied)
    │
    ▼
UI Render
```

---

## Caching Strategy

### Conditions Cache
**Location:** ClinicalChartMockup.js

**Strategy:** Time-based cache with manual invalidation

```javascript
const CACHE_VALIDITY_MINUTES = 60;

const loadConditionsFromSupabase = async () => {
  // 1. Check cache
  const cached = localStorage.getItem('conditions_cache_v1');
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age < CACHE_VALIDITY_MINUTES * 60 * 1000) {
      return data; // Use cache
    }
  }

  // 2. Fetch from Supabase
  const { data } = await supabase.from('procedures').select('*');

  // 3. Update cache
  localStorage.setItem('conditions_cache_v1', JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
};
```

**Cache Invalidation:**
- Manual: `invalidateConditionsCache()` after admin edits
- Automatic: After 60 minutes
- Force refresh: `loadChartData(forceRefresh=true)`

### Products/Categories - No Cache
Products and categories are fetched fresh on each load:
- Smaller dataset
- Less frequently accessed
- More likely to change

### Theme/Auth - Permanent Cache
Persisted indefinitely until manually cleared:
- Theme preference survives page reload
- Auth session persists until logout

---

## Design Patterns

### 1. Container/Presentation Pattern
**Container:** ClinicalChartMockup (manages state)
**Presentation:** ConditionsList, FiltersSection (display data)

### 2. Provider Pattern
React Context used for global state:
```jsx
<ThemeProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</ThemeProvider>
```

### 3. Custom Hooks Pattern
**useResponsive** - Encapsulates responsive logic:
```javascript
const { isMobile, isTablet, isDesktop } = useResponsive();
```

### 4. Render Props Pattern
Used in admin modals for dynamic rendering:
```jsx
<Modal renderContent={(data) => <EditForm data={data} />} />
```

### 5. Compound Components Pattern
AdminPanel uses tab-based composition:
```jsx
<Tabs.Root>
  <Tabs.List>
    <Tabs.Trigger value="conditions">Conditions</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="conditions">
    <AdminPanelConditions />
  </Tabs.Content>
</Tabs.Root>
```

### 6. Service Layer Pattern
Business logic separated from UI:
- llmService.js - LLM operations
- queryExecutor.js - Query execution
- supabaseQueryService.js - Query building

### 7. Repository Pattern
AdminPanelSupabase.js acts as data access layer:
- Centralized database operations
- Abstraction over Supabase client
- Consistent error handling

---

## Technical Decisions

### Why React?
- **Component reusability** - Modular UI design
- **Large ecosystem** - Many libraries available
- **Hooks API** - Simpler than class components
- **Developer familiarity** - Popular framework

### Why Supabase?
- **BaaS simplicity** - No backend code needed
- **PostgreSQL** - Powerful relational database
- **Built-in auth** - JWT authentication out of the box
- **RLS** - Database-level security
- **Real-time** - WebSocket support (future feature)

### Why Tailwind CSS?
- **Utility-first** - Rapid UI development
- **Customizable** - Theme configuration
- **Responsive** - Mobile-first design
- **No CSS files** - Styles co-located with components

### Why Radix UI?
- **Accessibility** - ARIA attributes built-in
- **Headless** - Style with Tailwind
- **Keyboard navigation** - Built-in
- **Focus management** - Modal trapping

### Why Functional Components?
- **Simpler** - Less boilerplate than classes
- **Hooks** - useState, useEffect more intuitive
- **Modern React** - Recommended approach
- **Performance** - Easier optimization

### Why localStorage for Cache?
- **Simple** - No server required
- **Fast** - Instant retrieval
- **Persistent** - Survives refresh
- **Sufficient** - 1-hour TTL acceptable for conditions

### Why localStorage for Auth? (BAD DECISION)
- **SECURITY ISSUE** - Should use httpOnly cookies
- **XSS vulnerability** - JavaScript can access tokens
- **Needs refactoring** - Move to secure cookies

---

## Known Issues & Technical Debt

### Critical Issues
1. **Exposed Secrets** - .env files in git with Supabase keys
2. **SQL Injection** - String concatenation in queries
3. **Insecure Auth Storage** - localStorage instead of httpOnly cookies
4. **LLM Integration Broken** - Three approaches, none fully working

### High Priority
1. **No Tests** - 0% coverage
2. **No Error Boundaries** - App crashes on errors
3. **Missing Input Validation** - Direct user input to database
4. **No PropTypes** - Runtime type checking missing

### Medium Priority
1. **Large Functions** - AdminPanelCore.js has 183-line functions
2. **Console.log Everywhere** - 17+ files with debug logging
3. **Dead Code** - IntelligentQueryService, QueryExecutor unused
4. **Inconsistent Code Style** - Mixed patterns

### Low Priority
1. **Mobile Responsiveness** - Desktop-first, some mobile issues
2. **Accessibility** - Limited ARIA labels
3. **Performance** - No lazy loading or code splitting
4. **Bundle Size** - No optimization

### Architectural Debt
1. **Service Layer Confusion** - Three query services, unclear which to use
2. **State Management** - Prop drilling vs Context not consistently applied
3. **Caching Strategy** - Inconsistent (some cached, some not)
4. **Error Handling** - Inconsistent patterns across components

---

## Phase 3 Changes (December 2024)

### Overview
Phase 3 simplified the product recommendation system and added role-based access control.

### Database Schema Changes

#### Removed: Patient Type Grouping
Products are no longer grouped by patient type (Type 1-4). Instead, products are **ranked per phase** using a simple ordering system.

**Before (Phase 2):**
```
procedure_phase_products: procedure_id + phase_id + patient_type_id + product_id
```

**After (Phase 3):**
```
procedure_phase_products: procedure_id + phase_id + product_id + rank
```

#### New: Product Ranking
Products within each phase are now ordered by a `rank` column (1 = highest priority):
```sql
ALTER TABLE procedure_phase_products ADD COLUMN rank INTEGER DEFAULT 999;
```

#### New: Custom Phase Labels
Procedures can have custom phase names instead of standard "Prep/Acute/Maintenance":
```sql
ALTER TABLE procedures ADD COLUMN custom_phase_labels JSONB DEFAULT '{}';
-- Example: {"1": "Initial Assessment", "2": "Active Treatment", "3": "Follow-up"}
```

#### New: Role System
Three user roles with distinct feature access:
- **Admin** - Full access to all features
- **Sales** - Sales features + clinical evidence
- **Clinician** - Clinical evidence only (no sales features)

```sql
-- Updated user_role enum
ALTER TYPE user_role ADD VALUE 'sales';
ALTER TYPE user_role ADD VALUE 'clinician';

-- Role tracking columns
ALTER TABLE user_profiles ADD COLUMN role_assigned_by UUID;
ALTER TABLE user_profiles ADD COLUMN role_assigned_at TIMESTAMPTZ;
```

### New Components

#### Feature Visibility System
Central configuration for role-based feature access:

**File:** `src/config/featureVisibility.js`
```javascript
export const FEATURE_VISIBILITY = {
  // Universal features
  product_recommendations: ['admin', 'sales', 'clinician'],
  clinical_evidence: ['admin', 'sales', 'clinician'],

  // Sales-only features
  competitive_advantage: ['admin', 'sales'],
  objection_handling: ['admin', 'sales'],
  pitch_points: ['admin', 'sales'],

  // Admin-only features
  admin_panel: ['admin'],
};

export function hasFeatureAccess(feature, userRole) { ... }
```

#### RoleBadge Component
Color-coded badges for user roles:
- Purple: Admin
- Blue: Sales
- Green: Clinician

**File:** `src/components/AdminPanel/RoleBadge.js`

#### ProductDrawer Role Filtering
The ProductDrawer filters tabs based on user role:
- Clinicians see: Usage, Scientific, Clinical, Research
- Sales sees all tabs including: Competitive, Objections, Pitch Points
- Admins see all tabs

### Updated Components

#### AuthContext Enhancements
New role helper functions:
- `isAdmin()` - Check if user is admin
- `isSales()` - Check if user is sales rep
- `isClinician()` - Check if user is clinician
- `hasRole(roles)` - Check if user has any of specified roles

#### Admin User Approvals
Role selection dropdown during user approval process:
- Default role: Sales
- Admin can assign any role during approval

### Materialized View Updates
The `procedures_complete` view now includes:
- Product ranking by phase
- All product_details fields (clinical_evidence, pitch_points, objection_handling)
- Custom phase labels

---

## Future Architectural Considerations

### Scalability
- **Code Splitting** - Lazy load admin panel and wizard
- **Pagination** - For large condition lists
- **Virtual Scrolling** - For very long lists
- **CDN** - Serve static assets from CDN

### Testing
- **Unit Tests** - Services and utilities
- **Integration Tests** - API interactions
- **Component Tests** - UI rendering and interactions
- **E2E Tests** - Critical user flows

### Monitoring
- **Error Tracking** - Sentry or similar
- **Analytics** - User behavior tracking
- **Performance Monitoring** - Core Web Vitals
- **Logging** - Structured logging service

### Security Hardening
- **Rotate Keys** - Supabase credentials
- **httpOnly Cookies** - Secure session storage
- **CSRF Protection** - Token validation
- **Input Validation** - Comprehensive sanitization
- **Rate Limiting** - Prevent abuse

### Developer Experience
- **TypeScript Migration** - Type safety
- **ESLint/Prettier** - Code style consistency
- **Pre-commit Hooks** - Run tests and linting
- **CI/CD** - Automated testing and deployment

---

*Last Updated: December 2024*
*Document Version: 2.0 (Phase 3 Updates)*
*Architecture Status: Documented, Phase 3 Complete*
