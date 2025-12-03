# PHASE 3 IMPLEMENTATION PLAN
## PRISM Clinical Chart - Complete Refactor

**Project:** PRISM Phase 3 Enhancements
**Timeline:** 4 Weeks
**Total Investment:** $16,800
**Developer:** Austin Copps

---

## EXECUTIVE OVERVIEW

This implementation plan provides a detailed roadmap for completing all 7 Phase 3 deliverables. The plan is structured around a 4-week sprint cycle with daily checkpoints and clear dependencies mapped between features.

### Success Criteria
- All 7 features implemented and functional
- Zero critical bugs
- Production deployment completed
- Client acceptance obtained
- 30-day support period initiated

---

## WEEK 1: DATABASE REFACTORING & FOUNDATION

**Objectives:**
- Remove treatment modifier complexity
- Implement product ranking system
- Set up migration infrastructure
- Establish new data structures

### Day 1-2: Database Analysis & Migration Prep

**Task 1.1: Analyze Current Schema**
- [ ] Review `staging-schema.sql` for all patient_type dependencies
- [ ] Map all tables using `patient_type_id`:
  - `procedure_phase_products` (primary concern)
  - Any views or functions referencing patient types
- [ ] Document current data volumes per table
- [ ] Identify all foreign key constraints to modify

**Task 1.2: Create Backup Strategy**
- [ ] Document full database backup procedure
- [ ] Create rollback SQL scripts
- [ ] Test restore process in staging environment
- [ ] Set up point-in-time recovery checkpoints

**Task 1.3: Design New Schema**
- [ ] Design simplified `procedure_phase_products` structure:
  - Remove: `patient_type_id`
  - Add: `rank` (integer, NOT NULL)
  - Add: `display_order` (integer, for manual sorting)
- [ ] Design `custom_phase_labels` JSONB column for procedures table
- [ ] Update materialized view `procedures_complete` definition
- [ ] Document all schema changes

**Deliverable:** Database migration plan document with rollback procedures

---

### Day 3-4: Data Migration Scripts

**Task 1.4: Write Migration SQL** DONE

**File: `database/migrations/phase3_schema_migration.sql`**

```sql
-- PHASE 3 MIGRATION SCRIPT 
-- STEP 1: Add new columns (non-breaking)
ALTER TABLE procedure_phase_products
ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS custom_phase_labels JSONB DEFAULT '{}'::jsonb;

-- STEP 2: Consolidate patient type data
-- Create temporary table to identify duplicates
CREATE TEMP TABLE ppp_consolidated AS
SELECT
  procedure_id,
  phase_id,
  product_id,
  MIN(id) as keep_id,
  COUNT(*) as duplicate_count
FROM procedure_phase_products
GROUP BY procedure_id, phase_id, product_id
HAVING COUNT(*) > 1;

-- STEP 3: Assign ranks to consolidated products
WITH ranked_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY procedure_id, phase_id
      ORDER BY id
    ) as new_rank
  FROM procedure_phase_products
)
UPDATE procedure_phase_products ppp
SET rank = rp.new_rank
FROM ranked_products rp
WHERE ppp.id = rp.id;

-- STEP 4: Remove patient_type_id (breaking change)
ALTER TABLE procedure_phase_products
DROP COLUMN IF EXISTS patient_type_id CASCADE;

-- STEP 5: Add constraints
ALTER TABLE procedure_phase_products
ALTER COLUMN rank SET NOT NULL;

-- STEP 6: Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppp_unique_rank
ON procedure_phase_products(procedure_id, phase_id, rank);

-- STEP 7: Rebuild materialized view
DROP MATERIALIZED VIEW IF EXISTS procedures_complete CASCADE;
-- (New view definition goes here)

-- STEP 8: Mark patient_types as deprecated
COMMENT ON TABLE patient_types IS 'DEPRECATED: No longer used in Phase 3+. Retained for historical data only.';
```

**Task 1.5: Write Data Validation Scripts**
- [ ] Create pre-migration validation queries
- [ ] Create post-migration validation queries
- [ ] Write data integrity check scripts
- [ ] Test migration on staging database copy

**Deliverable:** Tested migration scripts with validation

---

### Day 5: Execute Migration & Verify

**Task 1.6: Database Migration Execution**
- [ ] Create final database backup
- [ ] Run migration in staging environment
- [ ] Execute validation queries
- [ ] Verify no data loss
- [ ] Test application with new schema
- [ ] Document any issues encountered

**Task 1.7: Update Data Layer**

**Files to Update:**
- `src/services/database/queries/procedures.js`
  - Remove patient type filtering from queries
  - Add ORDER BY rank ASC to all product queries
- `src/services/database/transformers/procedureTransformer.js`
  - Remove `buildPatientSpecificConfig()` patient type logic
  - Simplify to: `{ phase: [products] }` structure
  - Add rank sorting to product arrays

**Deliverable:** Migrated database with verified data integrity

---

## WEEK 2: UI SIMPLIFICATION & PRODUCT RANKING

**Objectives:**
- Remove phase tabs, implement single product view
- Add drag-and-drop product ranking in admin
- Remove all treatment modifier UI elements
- Implement customizable phase naming

### Day 6-7: Remove Treatment Modifiers (Frontend)

**Task 2.1: Clean Up Main Application**

**File: `src/components/ClinicalChartMockup.js`**
- [ ] Remove `activePatientType` state
- [ ] Remove `patientTypes` state
- [ ] Remove patient type fetching from useEffect
- [ ] Simplify product filtering logic (remove patient type filter)
- [ ] Remove `handlePatientTypeSelect` function
- [ ] Update `filteredProducts` useEffect to not use patient types

**File: `src/components/ConditionDetails.js`**
- [ ] Remove patient type filter dropdown (lines 266-310)
- [ ] Remove "Show Recommendations For" UI section
- [ ] Remove `activePatientType` prop
- [ ] Remove `handlePatientTypeSelect` prop
- [ ] Simplify product display logic

**Task 2.2: Update Data Structures**
- [ ] Update all components expecting `patientSpecificConfig` format
- [ ] Change from: `{ phase: { patientType: [products] } }`
- [ ] Change to: `{ phase: [products] }` or flat array
- [ ] Remove "(Type 3/4 Only)" badges from product displays

**Deliverable:** Treatment modifier UI completely removed

---

### Day 8-9: Consolidate Phase Tabs to Single View

**Task 2.3: Redesign ConditionDetails Component**

**File: `src/components/ConditionDetails.js`**

**Current Structure (Lines 312-353):**
```javascript
<Tabs.Root value={activeTab} onValueChange={handleTabChange}>
  <Tabs.List>
    {phases.map(phase => <Tabs.Trigger>)}
  </Tabs.List>
  <Tabs.Content>{products}</Tabs.Content>
</Tabs.Root>
```

**New Structure:**
```javascript
<div className="single-product-view">
  {/* Phase selector as compact dropdown or pills */}
  <div className="phase-filter">
    <button onClick={() => setPhaseFilter('All')}>All Phases</button>
    {phases.map(phase => (
      <button onClick={() => setPhaseFilter(phase)}>{phase}</button>
    ))}
  </div>

  {/* Ranked product list */}
  <div className="products-list">
    {rankedProducts.map((product, index) => (
      <ProductCard
        product={product}
        rank={index + 1}
        phases={product.phases} // Array of phase names
        showTopPickBadge={index === 0}
      />
    ))}
  </div>
</div>
```

**Task 2.4: Create New Product Card Component**

**File: `src/components/ProductCard.js` (new)**
- [ ] Display product name
- [ ] Show rank indicator (#1, #2, etc.)
- [ ] Display phase badges (multiple if product spans multiple phases)
- [ ] Color-coded phase badges (purple gradient system)
- [ ] "Top Pick" badge for #1 ranked products
- [ ] Research button
- [ ] Availability status
- [ ] Click to open ProductDrawer

**Task 2.5: Implement Phase Filtering**
- [ ] Add phase filter state (All, Prep, Acute, Maintenance, custom)
- [ ] Filter products by phase when filter is active
- [ ] Show all products when "All Phases" selected
- [ ] Maintain rank order within filtered results

**Deliverable:** Single-page ranked product view replacing tabs

---

### Day 10: Product Ranking in Admin Panel

**Task 2.6: Add Drag-and-Drop Ranking**

**File: `src/components/AdminPanel/AdminPanelConditions.js`**

**Option A: React Beautiful DnD**
```bash
npm install react-beautiful-dnd
```

**Option B: dnd-kit (modern alternative)**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Implementation:**
- [ ] Install drag-and-drop library
- [ ] Create draggable product list component
- [ ] Add drag handles to each product item
- [ ] Implement onDragEnd handler to reorder products
- [ ] Update rank values in database on reorder
- [ ] Add visual rank indicators (#1, #2, #3...)
- [ ] Add up/down arrow buttons as alternative to drag

**Task 2.7: Update Admin Supabase Operations**

**File: `src/components/AdminPanel/AdminPanelSupabase.js`**

**New Functions:**
```javascript
// Replace: addProductToPatientTypeRealtime
export async function addProductToPhase(procedureId, phaseId, productId) {
  // Get max rank for this procedure/phase
  const { data: maxRank } = await supabase
    .from('procedure_phase_products')
    .select('rank')
    .eq('procedure_id', procedureId)
    .eq('phase_id', phaseId)
    .order('rank', { ascending: false })
    .limit(1)
    .single();

  const newRank = (maxRank?.rank || 0) + 1;

  // Insert with new rank
  const { error } = await supabase
    .from('procedure_phase_products')
    .insert({
      procedure_id: procedureId,
      phase_id: phaseId,
      product_id: productId,
      rank: newRank
    });

  return { success: !error, error };
}

// New function for reranking
export async function updateProductRank(pppId, newRank) {
  const { error } = await supabase
    .from('procedure_phase_products')
    .update({ rank: newRank })
    .eq('id', pppId);

  return { success: !error, error };
}

// New function for bulk reranking after drag
export async function reorderProducts(procedureId, phaseId, productRankings) {
  // productRankings: [{ id, rank }, { id, rank }, ...]
  const updates = productRankings.map(({ id, rank }) =>
    supabase
      .from('procedure_phase_products')
      .update({ rank })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  return { success: results.every(r => !r.error) };
}
```

**Deliverable:** Functional drag-and-drop product ranking in admin panel

---

### Day 11: Customizable Phase Naming

**Task 2.8: Add Phase Name Customization UI**

**File: `src/components/AdminPanel/AdminPanelConditions.js`**

**New Section in Condition Editor:**
```javascript
<div className="phase-naming-config">
  <h3>Customize Phase Names</h3>
  <p>Override default phase names for this procedure</p>

  {procedure.phases.map(phase => (
    <div key={phase.id} className="phase-name-editor">
      <label>
        {phase.name} (default)
        <input
          type="text"
          placeholder={phase.name}
          value={customPhaseLabels[phase.id] || ''}
          onChange={(e) => updateCustomPhaseLabel(phase.id, e.target.value)}
        />
      </label>
      <button onClick={() => resetPhaseLabel(phase.id)}>Reset to Default</button>
    </div>
  ))}
</div>
```

**Task 2.9: Update Database Operations**
- [ ] Add function to save custom phase labels (JSONB column)
- [ ] Add function to retrieve custom labels
- [ ] Update procedureTransformer to include custom labels

**Task 2.10: Update Frontend Display**

**File: `src/components/ConditionDetails.js` & ProductCard.js**
- [ ] Check for custom phase labels: `customPhaseLabels[phaseId] || defaultPhaseName`
- [ ] Display custom labels in phase badges
- [ ] Tooltip showing original phase name for context

**Deliverable:** Working customizable phase naming system

---

## WEEK 3: ROLE-BASED ACCESS CONTROL

**Objectives:**
- Implement multi-role system (Admin, Sales, Clinician)
- Add role-based content visibility
- Create admin role assignment interface
- Create feature visibility configuration

### Day 12-13: Role System Backend

**Task 3.1: Update Database Schema**

**File: `database/migrations/phase3_roles_migration.sql`**
```sql
-- Update role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinician';

-- Update existing 'user' roles to 'sales'
UPDATE user_profiles
SET role = 'sales'
WHERE role = 'user';

-- Add role assignment audit
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;
```

**Task 3.2: Update AuthContext**

**File: `src/contexts/AuthContext.js`**
- [ ] Extend role state to support: 'admin' | 'sales' | 'clinician'
- [ ] Add helper functions:
  ```javascript
  const isAdmin = () => userRole === 'admin';
  const isSales = () => userRole === 'sales';
  const isClinician = () => userRole === 'clinician';
  const hasRole = (roles) => roles.includes(userRole);
  ```
- [ ] Update role fetching logic to handle new roles

**Deliverable:** Extended role system in database and auth context

---

### Day 14: Feature Visibility Configuration

**Task 3.3: Create Feature Visibility Config**

**File: `src/config/featureVisibility.js` (new)**
```javascript
/**
 * Feature Visibility Configuration
 * Defines which user roles can access specific features
 */

export const FEATURE_VISIBILITY = {
  // Universal features (all roles)
  product_recommendations: ['admin', 'sales', 'clinician'],
  clinical_evidence: ['admin', 'sales', 'clinician'],
  research_articles: ['admin', 'sales', 'clinician'],
  therapeutic_wizard: ['admin', 'sales', 'clinician'],

  // Sales-only features
  competitive_advantage: ['admin', 'sales'],
  objection_handling: ['admin', 'sales'],
  pitch_points: ['admin', 'sales'],

  // Admin-only features
  admin_panel: ['admin'],
  user_management: ['admin'],
  product_management: ['admin'],

  // Feature tabs in ProductDrawer
  drawer_competitive_tab: ['admin', 'sales'],
  drawer_objection_tab: ['admin', 'sales'],
  drawer_pitch_tab: ['admin', 'sales'],
};

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(feature, userRole) {
  if (!FEATURE_VISIBILITY[feature]) {
    console.warn(`Feature "${feature}" not found in visibility config`);
    return false;
  }
  return FEATURE_VISIBILITY[feature].includes(userRole);
}

/**
 * Filter array of features by role
 */
export function getAccessibleFeatures(userRole) {
  return Object.keys(FEATURE_VISIBILITY).filter(feature =>
    FEATURE_VISIBILITY[feature].includes(userRole)
  );
}
```

**Deliverable:** Centralized feature visibility configuration

---

### Day 15-16: Implement Role-Based UI

**Task 3.4: Update ProductDrawer**

**File: `src/components/ProductDrawer.js`**
```javascript
import { hasFeatureAccess } from '../config/featureVisibility';
import { useAuth } from '../contexts/AuthContext';

function ProductDrawer({ product, procedure }) {
  const { userRole } = useAuth();

  // Define tabs with visibility rules
  const tabs = [
    { id: 'overview', label: 'Overview', visible: true },
    { id: 'clinical', label: 'Clinical Evidence', visible: true },
    { id: 'research', label: 'Research', visible: true },
    {
      id: 'competitive',
      label: 'Competitive Advantage',
      visible: hasFeatureAccess('drawer_competitive_tab', userRole)
    },
    {
      id: 'objections',
      label: 'Handling Objections',
      visible: hasFeatureAccess('drawer_objection_tab', userRole)
    },
    {
      id: 'pitch',
      label: 'Pitch Points',
      visible: hasFeatureAccess('drawer_pitch_tab', userRole)
    },
  ].filter(tab => tab.visible);

  return (
    <Drawer>
      <Tabs>
        {tabs.map(tab => (
          <Tab key={tab.id} label={tab.label}>
            {/* Tab content */}
          </Tab>
        ))}
      </Tabs>
    </Drawer>
  );
}
```

**Task 3.5: Update CompetitiveAdvantageModal**

**File: `src/components/CompetitiveAdvantageModal.js`**
```javascript
// Hide entire modal for clinicians
if (!hasFeatureAccess('competitive_advantage', userRole)) {
  return null;
}
```

**Task 3.6: Update Admin Panel Access**

**File: `src/components/ClinicalChartMockup.js`**
- Already has role check for admin button visibility
- Verify admin panel only accessible to admins
- Add role checks to all admin drawer components

**Deliverable:** Role-based content visibility throughout app

---

### Day 17: Role Assignment Interface

**Task 3.7: Update User Approvals Tab**

**File: `src/components/AdminPanel/AdminPanelUserApprovals.js`**

**Add Role Selection:**
```javascript
<div className="user-approval-row">
  <div className="user-info">
    <span>{user.email}</span>
    <span>{user.full_name}</span>
  </div>

  <div className="role-assignment">
    <label>Assign Role:</label>
    <select
      value={selectedRoles[user.id] || 'sales'}
      onChange={(e) => handleRoleChange(user.id, e.target.value)}
    >
      <option value="sales">Sales Representative</option>
      <option value="clinician">Clinician</option>
      <option value="admin">Administrator</option>
    </select>
  </div>

  <div className="approval-actions">
    <button onClick={() => approveUser(user.id, selectedRoles[user.id])}>
      Approve
    </button>
    <button onClick={() => rejectUser(user.id)}>
      Reject
    </button>
  </div>
</div>
```

**Task 3.8: Add Role Change for Existing Users**
- [ ] Add "Change Role" button to approved users list
- [ ] Add modal for role reassignment
- [ ] Update database with new role
- [ ] Force user re-login to update role context

**Task 3.9: Add Role Badges**
```javascript
function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-purple-100 text-purple-800',
    sales: 'bg-blue-100 text-blue-800',
    clinician: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[role]}`}>
      {role.toUpperCase()}
    </span>
  );
}
```

**Deliverable:** Complete role assignment and management interface

---

## WEEK 4: TESTING, DOCUMENTATION & DEPLOYMENT

**Objectives:**
- Comprehensive testing of all features
- Bug fixes and polish
- Documentation updates
- Production deployment

### Day 18-19: Testing & QA

**Task 4.1: Unit Testing**

**Create test files:**
- [ ] `tests/featureVisibility.test.js` - Test role-based access
- [ ] `tests/productRanking.test.js` - Test ranking logic
- [ ] `tests/phaseConsolidation.test.js` - Test single view logic
- [ ] `tests/customPhaseNaming.test.js` - Test custom labels

**Task 4.2: Integration Testing**
- [ ] Test patient type removal end-to-end
- [ ] Test product ranking drag-and-drop
- [ ] Test role assignment workflow
- [ ] Test phase name customization workflow
- [ ] Test all database operations

**Task 4.3: User Flow Testing**

**Sales Representative Flow:**
- [ ] Login as sales user
- [ ] Browse procedures
- [ ] View ranked products
- [ ] Access competitive advantage
- [ ] Access objection handling
- [ ] Access pitch points

**Clinician Flow:**
- [ ] Login as clinician
- [ ] Browse procedures
- [ ] View ranked products
- [ ] Access clinical evidence
- [ ] Verify NO access to sales features
- [ ] Verify competitive advantage hidden

**Admin Flow:**
- [ ] Login as admin
- [ ] Assign user roles
- [ ] Rank products via drag-and-drop
- [ ] Customize phase names
- [ ] Manage all content
- [ ] Access all features

**Task 4.4: Browser Compatibility Testing**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Task 4.5: Mobile Responsiveness Testing**
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet views

**Deliverable:** Comprehensive test results with all issues documented

---

### Day 20: Bug Fixes & Polish

**Task 4.6: Bug Triage**
- [ ] Categorize all bugs (critical, high, medium, low)
- [ ] Fix all critical bugs
- [ ] Fix all high-priority bugs
- [ ] Address medium bugs time permitting
- [ ] Document any known low-priority issues

**Task 4.7: UI Polish**
- [ ] Verify consistent styling across all new components
- [ ] Ensure dark mode compatibility
- [ ] Check all responsive breakpoints
- [ ] Verify loading states
- [ ] Check error states
- [ ] Smooth animations and transitions

**Task 4.8: Performance Optimization**
- [ ] Profile page load times
- [ ] Optimize database queries
- [ ] Check materialized view refresh performance
- [ ] Minimize re-renders
- [ ] Lazy load components where appropriate

**Deliverable:** Polished, bug-free application

---

### Day 21: Documentation

**Task 4.9: Update ARCHITECTURE.md**
- [ ] Document new database schema
- [ ] Document role system architecture
- [ ] Update data flow diagrams
- [ ] Document feature visibility system

**Task 4.10: Update CLAUDE.md**
- [ ] Add Phase 3 features section
- [ ] Update known issues list
- [ ] Update file structure documentation
- [ ] Add troubleshooting for new features

**Task 4.11: Create Migration Guide**

**File: `database/PHASE3_MIGRATION_GUIDE.md`**
- [ ] Step-by-step migration instructions
- [ ] Rollback procedures
- [ ] Data validation steps
- [ ] Common issues and solutions

**Task 4.12: Create Admin User Guide**

**File: `docs/ADMIN_GUIDE_PHASE3.md`**
- [ ] How to rank products
- [ ] How to customize phase names
- [ ] How to assign user roles
- [ ] How to manage users
- [ ] Best practices

**Task 4.13: Create Role Management Docs**

**File: `docs/ROLE_MANAGEMENT.md`**
- [ ] Role descriptions
- [ ] Feature access matrix
- [ ] How to assign roles
- [ ] How to change roles
- [ ] Security considerations

**Deliverable:** Complete documentation package

---

### Day 22: Production Deployment

**Task 4.14: Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Database migration tested in staging
- [ ] Rollback plan documented
- [ ] Client acceptance obtained
- [ ] Backup created

**Task 4.15: Database Migration (Production)**
- [ ] Create final production backup
- [ ] Run migration scripts
- [ ] Validate data integrity
- [ ] Verify materialized view performance
- [ ] Test application against production database

**Task 4.16: Application Deployment**
- [ ] Build production bundle: `npm run build:prod`
- [ ] Deploy to hosting platform
- [ ] Verify environment variables
- [ ] Run smoke tests
- [ ] Monitor error logs

**Task 4.17: Post-Deployment Verification**
- [ ] Test all 7 features in production
- [ ] Verify admin panel functionality
- [ ] Test role-based access
- [ ] Check performance metrics
- [ ] Verify database queries performing well

**Task 4.18: Client Handoff**
- [ ] Demonstrate all new features
- [ ] Walk through admin panel changes
- [ ] Review documentation
- [ ] Provide training on role assignment
- [ ] Answer questions
- [ ] Obtain formal acceptance

**Deliverable:** Successful production deployment with client acceptance

---

## DEPENDENCIES & CRITICAL PATH

### Feature Dependencies

```
Week 1: Database Foundation
├─ Treatment Modifier Removal (DB)
│  └─ Required for: All UI changes
├─ Product Ranking Schema
│  └─ Required for: Admin ranking UI
└─ Migration Infrastructure
   └─ Required for: All schema changes

Week 2: UI Refactoring
├─ Treatment Modifier Removal (UI)
│  ├─ Depends on: Week 1 DB changes
│  └─ Required for: Consolidated product view
├─ Consolidated Product View
│  ├─ Depends on: Treatment modifier removal
│  └─ Required for: Product ranking display
├─ Product Ranking UI
│  ├─ Depends on: Week 1 ranking schema
│  └─ Enables: Admin product management
└─ Custom Phase Naming
   └─ Independent (can be done in parallel)

Week 3: Role System
├─ Role Database Schema
│  └─ Required for: All role-based features
├─ Feature Visibility Config
│  └─ Required for: UI role checks
├─ Role-Based UI
│  ├─ Depends on: Feature visibility config
│  └─ Required for: Production readiness
└─ Role Assignment Interface
   ├─ Depends on: Role schema
   └─ Required for: User management

Week 4: Testing & Deployment
├─ Testing
│  └─ Depends on: All features complete
├─ Documentation
│  └─ Can be done in parallel with testing
└─ Deployment
   └─ Depends on: Testing complete, client approval
```

### Critical Path Items
1. **Week 1, Day 5:** Database migration MUST be successful before Week 2 starts
2. **Week 2, Day 7:** Treatment modifier removal MUST be complete before consolidated view
3. **Week 3, Day 13:** Role system MUST be functional before UI updates
4. **Week 4, Day 19:** All testing MUST be complete before deployment

---

## RISK MITIGATION

### Risk 1: Database Migration Failure
**Probability:** Medium | **Impact:** Critical

**Mitigation:**
- Comprehensive testing in staging environment
- Multiple backup points
- Documented rollback procedures
- Dry run migration 24 hours before production

**Contingency:**
- Rollback to pre-migration state
- Investigate issues in staging
- Reschedule migration

---

### Risk 2: Role System Security Issues
**Probability:** Low | **Impact:** High

**Mitigation:**
- Thorough security testing
- Penetration testing of role boundaries
- Code review of all access control logic
- Test role escalation scenarios

**Contingency:**
- Disable affected features
- Patch and redeploy
- Audit all access logs

---

### Risk 3: Performance Degradation
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Benchmark queries before and after
- Monitor materialized view refresh times
- Profile application performance
- Optimize indexes for new schema

**Contingency:**
- Add database indexes
- Optimize queries
- Increase caching
- Consider query batching

---

### Risk 4: Data Loss During Migration
**Probability:** Low | **Impact:** Critical

**Mitigation:**
- Multiple backup layers
- Validation queries at each step
- Test migration on copy of production data
- Point-in-time recovery enabled

**Contingency:**
- Restore from backup
- Replay transactions if needed
- Manual data recovery if necessary

---

## DAILY STANDUPS

### Daily Checklist Template

**What I completed yesterday:**
- [ ] Task 1
- [ ] Task 2

**What I'm working on today:**
- [ ] Task 3
- [ ] Task 4

**Blockers:**
- None / List any issues

**Questions for client:**
- None / List any questions

---

## SUCCESS METRICS

### Week 1 Success Criteria
- [ ] Database migration complete
- [ ] Zero data loss
- [ ] New schema validated
- [ ] Application functional with new schema

### Week 2 Success Criteria
- [ ] Treatment modifiers removed from UI
- [ ] Single product view functional
- [ ] Product ranking working in admin
- [ ] Custom phase naming operational

### Week 3 Success Criteria
- [ ] Three roles fully implemented
- [ ] Role assignment working
- [ ] Content visibility correct per role
- [ ] All security tests passing

### Week 4 Success Criteria
- [ ] All features tested and working
- [ ] Zero critical bugs
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Client acceptance obtained

---

## DELIVERABLES CHECKLIST

### Code Deliverables
- [ ] Updated database schema
- [ ] Migration scripts with rollback procedures
- [ ] Updated React components (20+ files)
- [ ] New admin UI components
- [ ] Role-based access control system
- [ ] Feature visibility configuration
- [ ] Production build optimized

### Documentation Deliverables
- [ ] Updated ARCHITECTURE.md
- [ ] Updated CLAUDE.md
- [ ] Phase 3 migration guide
- [ ] Admin user guide
- [ ] Role management documentation
- [ ] API documentation (if applicable)

### Testing Deliverables
- [ ] Unit test suite
- [ ] Integration test suite
- [ ] End-to-end test scenarios
- [ ] Security test results
- [ ] Performance test results
- [ ] Browser compatibility matrix

---

## CLIENT COMMUNICATION SCHEDULE

### Week 1
**Friday:** Database migration status update
- Migration plan reviewed
- Staging test results
- Production timeline confirmed

### Week 2
**Friday:** UI changes demo
- Show consolidated product view
- Demonstrate product ranking
- Review custom phase naming

### Week 3
**Friday:** Role system walkthrough
- Explain role types
- Demonstrate role assignment
- Show feature visibility differences

### Week 4
**Monday:** Pre-deployment review
**Wednesday:** Production deployment
**Friday:** Final acceptance and handoff

---

## POST-DEPLOYMENT CHECKLIST

### Immediate (Day 1)
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Test critical user flows
- [ ] Be available for emergency fixes

### First Week
- [ ] Daily check-ins with client
- [ ] Monitor user feedback
- [ ] Address any minor bugs
- [ ] Optimize as needed

### 30-Day Support Period
- [ ] Weekly check-ins
- [ ] Monitor performance trends
- [ ] Address any issues
- [ ] Provide usage guidance
- [ ] Document lessons learned

---

**End of Implementation Plan**

*This plan is a living document and may be adjusted as needed during development.*
