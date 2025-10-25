# Admin Panel - Context Documentation

## Overview

The Admin Panel is a comprehensive management interface for the PRISM Clinical Chart application. It provides full CRUD operations for conditions, products, categories, competitive advantages, and research articles.

**Total Code:** ~3000+ lines across 8 files

**Access:** Admin authentication required

**Location:** `src/components/AdminPanel/`

---

## Architecture

### Component Structure
```
AdminPanel.js (Container)
  │
  └─> AdminPanelCore.js (State Manager - 1168 lines)
       │
       ├─> AdminPanelConditions.js (Condition Management UI)
       ├─> AdminPanelProducts.js (Product Management UI)
       ├─> AdminPanelCategories.js (Category Management UI)
       ├─> AdminPanelImportExport.js (Data Backup/Restore)
       ├─> AdminPanelModals.js (Reusable Modals)
       └─> AdminPanelSupabase.js (Database Operations - 1000+ lines)
```

---

## Core Components

### 1. AdminPanel.js (~200 lines)
**Role:** Main container with tab navigation

**Features:**
- Radix UI Tabs for navigation
- Full-screen modal on mobile
- 5 tabs: Conditions, Products, Categories, Import/Export, Modals
- Reset/Save buttons
- Close button

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: Function
}
```

**Tab Structure:**
```javascript
<Tabs.Root defaultValue="conditions">
  <Tabs.List>
    <Tabs.Trigger value="conditions">Conditions</Tabs.Trigger>
    <Tabs.Trigger value="products">Products</Tabs.Trigger>
    <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
    <Tabs.Trigger value="import-export">Import/Export</Tabs.Trigger>
    <Tabs.Trigger value="modals">Modals</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="conditions">
    <AdminPanelConditions />
  </Tabs.Content>
  {/* ... more tabs */}
</Tabs.Root>
```

**Location:** `src/components/AdminPanel/AdminPanel.js`

---

### 2. AdminPanelCore.js (1168 lines) ⚠️ COMPLEX
**Role:** Central state manager and controller for all admin operations

**Responsibilities:**
- Load all admin data (conditions, products, categories, patient types, phases)
- Track changes for diff-based saving
- Coordinate CRUD operations
- Handle cache invalidation
- Manage loading and error states

**Key State:**
```javascript
const [conditions, setConditions] = useState([]);
const [originalConditions, setOriginalConditions] = useState([]); // For diffing
const [products, setProducts] = useState([]);
const [categories, setCategories] = useState([]);
const [patientTypes, setPatientTypes] = useState([]);
const [phases, setPhases] = useState([]);
const [competitiveData, setCompetitiveData] = useState({ competitors: [], activeIngredients: [] });
const [editedConditions, setEditedConditions] = useState({});
const [showSuccess, setShowSuccess] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

**Main Methods:**

#### loadInitialData() (Lines 62-116)
```javascript
const loadInitialData = async () => {
  setIsLoading(true);

  // Load in parallel
  const [
    loadedConditions,
    loadedProducts,
    loadedCategories,
    loadedPatientTypes,
    loadedPhases,
    competitiveAdvantages
  ] = await Promise.all([
    loadConditionsFromSupabase(true), // Force refresh
    loadProductsFromSupabase(),
    loadCategoriesFromSupabase(),
    loadPatientTypesFromSupabase(),
    loadPhasesFromSupabase(),
    loadCompetitiveAdvantages()
  ]);

  // Set state
  setConditions(loadedConditions);
  setOriginalConditions(JSON.parse(JSON.stringify(loadedConditions))); // Deep copy
  // ... more state updates

  setIsLoading(false);
};
```

#### handleSaveChanges() (Lines 228-411) ⚠️ 183 LINES - NEEDS REFACTORING
```javascript
const handleSaveChanges = async () => {
  const saveStartTime = performance.now();

  // 1. Calculate diff between edited and original
  const changedConditions = Object.keys(editedConditions)
    .filter(id => {
      const edited = editedConditions[id];
      const original = originalConditions.find(c => c.id === parseInt(id));
      return JSON.stringify(edited) !== JSON.stringify(original);
    });

  // 2. Update each changed condition
  for (const conditionId of changedConditions) {
    const condition = editedConditions[conditionId];
    await updateConditionInSupabase(condition);
  }

  // 3. Invalidate cache
  invalidateConditionsCache();

  // 4. Reload data
  await loadInitialData();

  // 5. Show success message
  setShowSuccess(true);
  setTimeout(() => setShowSuccess(false), 3000);

  const totalTime = performance.now() - saveStartTime;
  console.log(`✅ Total save process completed in ${Math.round(totalTime)}ms`);
};
```

**Issues:**
- 1168 lines in single file (too large)
- handleSaveChanges is 183 lines (should be broken up)
- Complex diff logic
- Limited error handling
- Performance logging with console.log

**Refactoring Needed:**
- Extract save logic into separate functions
- Move diff calculation to utility
- Add comprehensive error handling
- Remove console.log statements
- Add unit tests

**Location:** `src/components/AdminPanel/AdminPanelCore.js`

---

### 3. AdminPanelSupabase.js (1000+ lines) ⚠️ COMPLEX
**Role:** All database operations for admin panel

**Exported Functions:**

#### Data Loading Functions
```javascript
export const loadConditionsFromSupabase = async (forceRefresh = false)
// - Checks cache first (unless forceRefresh)
// - Fetches procedures with all relationships
// - Transforms to application format
// - Caches result
// Returns: Array of conditions

export const loadProductsFromSupabase = async ()
// - Fetches all products
// Returns: Array of products

export const loadCategoriesFromSupabase = async ()
// - Fetches categories
// Returns: Array of categories

export const loadPatientTypesFromSupabase = async ()
// - Fetches patient type definitions
// Returns: Array with Type 1-4

export const loadPhasesFromSupabase = async ()
// - Fetches treatment phases
// Returns: Array with Prep, Acute, Maintenance

export const loadCompetitiveAdvantages = async ()
// - Fetches competitor and ingredient data
// Returns: { competitors: [], activeIngredients: [] }
```

#### CRUD Operations
```javascript
export const addConditionToSupabase = async (condition)
// 1. Insert into procedures table
// 2. Insert into procedure_patient_types junction table
// 3. Insert into procedure_phase_products junction table
// Returns: { success: boolean, error?: string }

export const updateConditionInSupabase = async (condition)
// 1. Update procedures table
// 2. Delete old junction table entries
// 3. Insert new junction table entries
// 4. Handle patient-specific configurations
// Returns: { success: boolean, error?: string }

export const deleteConditionFromSupabase = async (conditionId)
// 1. Delete from junction tables (cascade)
// 2. Delete from procedures table
// Returns: { success: boolean, error?: string }
```

#### Cache Management
```javascript
export const invalidateConditionsCache = () => {
  localStorage.removeItem('conditions_cache_v1');
  console.log('🗑️ Conditions cache invalidated');
}
```

**Data Transformation:**
```javascript
// Supabase format → Application format
{
  id: 1,
  name: "Gingivitis",
  category: "Intra-Oral",
  pitch_points: "Key benefits...",

  // Transformed from junction tables
  patient_types: [1, 2, 3, 4],

  // Transformed from procedure_phase_products
  patientSpecificConfig: [
    {
      phase_id: 1,
      patient_type_id: 1,
      product_id: 5
    },
    // ... more configs
  ]
}
```

**Issues:**
- 1000+ lines in single file
- Complex transformations
- Limited error handling
- Console.log statements everywhere
- No retry logic for failures

**Location:** `src/components/AdminPanel/AdminPanelSupabase.js`

---

### 4. AdminPanelConditions.js (~400 lines)
**Role:** UI for condition management

**Features:**
- Condition list with edit/delete buttons
- Add new condition form
- Edit existing condition
- Field editors:
  - Name (text input)
  - Category (dropdown)
  - Pitch points (textarea with auto-resize)
  - Patient types (multi-select checkboxes)
  - Products per phase/patient type (drag-and-drop or manual)

**Edit Workflow:**
```javascript
1. User clicks "Edit" on condition
   ↓
2. setEditingCondition(condition)
   ↓
3. Form pre-populated with condition data
   ↓
4. User makes changes
   ↓
5. handleFieldChange(field, value)
   ↓
6. Updates editedConditions state
   ↓
7. User clicks "Save" (in AdminPanelCore)
   ↓
8. handleSaveChanges() calculates diff and saves
```

**Patient-Specific Configuration:**
```javascript
// For each phase (Prep, Acute, Maintenance)
// For each patient type (Type 1-4)
// User can assign products

<PhaseTab phase="Acute">
  <PatientTypeSelector type="Type 3">
    <ProductSelector products={availableProducts} />
  </PatientTypeSelector>
</PhaseTab>
```

**Location:** `src/components/AdminPanel/AdminPanelConditions.js`

---

### 5. AdminPanelProducts.js (~300 lines)
**Role:** Product catalog management

**Features:**
- Product list with availability status
- Add new product
- Edit product details
- Delete products
- Bulk operations
- Search/filter products

**Product Fields:**
- Name
- Description
- Availability status (Available, Discontinued, Coming Soon)
- Category assignments

**Location:** `src/components/AdminPanel/AdminPanelProducts.js`

---

### 6. AdminPanelCategories.js (~200 lines)
**Role:** Category management

**Features:**
- Category list
- Add new category
- Rename category
- Delete category (with warning if in use)

**Validation:**
- Check if category is used by conditions before delete
- Prevent duplicate category names

**Location:** `src/components/AdminPanel/AdminPanelCategories.js`

---

### 7. AdminPanelImportExport.js (~350 lines)
**Role:** Data backup and migration

**Features:**

#### Export
```javascript
const exportData = () => {
  const exportObject = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      conditions,
      products,
      categories,
      patientTypes,
      phases,
      competitiveData
    }
  };

  const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
    type: 'application/json'
  });

  downloadFile(blob, `prism-export-${Date.now()}.json`);
};
```

#### Import
```javascript
const importData = async (file) => {
  const text = await file.text();
  const importObject = JSON.parse(text);

  // Validate format
  if (importObject.version !== '1.0') {
    throw new Error('Unsupported version');
  }

  // Confirm with user
  if (confirm('This will overwrite existing data. Continue?')) {
    // Import each entity type
    await bulkImportConditions(importObject.data.conditions);
    await bulkImportProducts(importObject.data.products);
    // ... more imports
  }
};
```

**Safety Features:**
- Version checking
- Confirmation dialogs
- Rollback on error (partial - needs improvement)
- Export before import recommended

**Issues:**
- No atomic transactions (partial imports possible)
- No data validation before import
- Error handling incomplete

**Location:** `src/components/AdminPanel/AdminPanelImportExport.js`

---

### 8. AdminPanelModals.js (~250 lines)
**Role:** Reusable modal components for competitive advantage and research management

**Modals:**
- CompetitiveAdvantageEditor
- ActiveIngredientEditor
- ResearchArticleEditor

**Features:**
- Add/Edit/Delete competitive advantages
- Add/Edit/Delete research articles
- Form validation
- Radix UI Dialog components

**Location:** `src/components/AdminPanel/AdminPanelModals.js`

---

## State Management

### Change Tracking Strategy

**Problem:** Need to detect what changed before saving

**Solution:** Diff-based approach

```javascript
// 1. Load original data
const [originalConditions, setOriginalConditions] = useState([]);

// 2. Track edits separately
const [editedConditions, setEditedConditions] = useState({});
// Format: { [conditionId]: editedCondition }

// 3. On save, calculate diff
const changedConditions = Object.keys(editedConditions)
  .filter(id => {
    const edited = editedConditions[id];
    const original = originalConditions.find(c => c.id === parseInt(id));
    return JSON.stringify(edited) !== JSON.stringify(original);
  });

// 4. Update only changed records
for (const id of changedConditions) {
  await updateConditionInSupabase(editedConditions[id]);
}
```

**Advantages:**
- Only saves what changed (efficient)
- Can implement "Reset" easily (discard editedConditions)
- User can make multiple edits before saving

**Disadvantages:**
- Complex state management
- JSON comparison can be slow for large objects
- Needs deep cloning to avoid reference issues

---

## Data Flow

### Loading Data
```
AdminPanel opens
  ↓
AdminPanelCore.loadInitialData()
  ↓
Promise.all([
  loadConditionsFromSupabase(),
  loadProductsFromSupabase(),
  loadCategoriesFromSupabase(),
  loadPatientTypesFromSupabase(),
  loadPhasesFromSupabase(),
  loadCompetitiveAdvantages()
])
  ↓
Set state in AdminPanelCore
  ↓
Pass to child components via props
  ↓
Render UI
```

### Editing Condition
```
User clicks "Edit" in AdminPanelConditions
  ↓
setEditingCondition(condition)
  ↓
User changes field (e.g., name)
  ↓
handleFieldChange('name', newValue)
  ↓
Update editedConditions state:
editedConditions[condition.id] = { ...condition, name: newValue }
  ↓
UI updates to show changes
  ↓
User clicks "Save" (not immediate - batched)
```

### Saving Changes
```
User clicks "Save Changes" button
  ↓
AdminPanelCore.handleSaveChanges()
  ↓
Calculate diff (edited vs original)
  ↓
For each changed condition:
  updateConditionInSupabase(condition)
    ↓
    1. Update procedures table
    2. Delete old junction table entries
    3. Insert new junction table entries
  ↓
invalidateConditionsCache()
  ↓
loadInitialData(forceRefresh=true)
  ↓
Show success message
  ↓
ClinicalChartMockup.loadChartData(forceRefresh=true)
  ↓
Main app updates with new data
```

---

## Complex Operations

### Adding a New Condition

**Steps:**
1. User fills out form in AdminPanelConditions
2. User selects patient types (checkboxes)
3. User assigns products for each phase/patient type combination
4. User clicks "Save"
5. AdminPanelCore.handleAddCondition() called
6. addConditionToSupabase() inserts:
   - New row in `procedures` table
   - Rows in `procedure_patient_types` junction table
   - Rows in `procedure_phase_products` junction table
7. Cache invalidated
8. Data reloaded

**Database Operations:**
```sql
-- 1. Insert condition
INSERT INTO procedures (name, category, pitch_points, category_id)
VALUES ('New Condition', 'Surgical', 'Key points...', 1)
RETURNING id;

-- 2. Insert patient types
INSERT INTO procedure_patient_types (procedure_id, patient_type_id)
VALUES
  (new_id, 1),
  (new_id, 2),
  (new_id, 3);

-- 3. Insert products for each phase/patient combination
INSERT INTO procedure_phase_products
  (procedure_id, phase_id, patient_type_id, product_id)
VALUES
  (new_id, 1, 1, 5),  -- Prep, Type 1, Product 5
  (new_id, 1, 2, 6),  -- Prep, Type 2, Product 6
  (new_id, 2, 1, 7),  -- Acute, Type 1, Product 7
  -- ... more combinations
```

---

### Updating an Existing Condition

**Steps:**
1. User edits condition in AdminPanelConditions
2. Changes tracked in editedConditions state
3. User clicks "Save Changes"
4. AdminPanelCore calculates diff
5. updateConditionInSupabase() called:
   - Update procedures table
   - **Delete all junction table entries** (simplest approach)
   - **Re-insert junction table entries** from editedConditions
6. Cache invalidated
7. Data reloaded

**Database Operations:**
```sql
-- 1. Update main record
UPDATE procedures
SET name = 'Updated Name',
    pitch_points = 'New points...',
    updated_at = NOW()
WHERE id = 123;

-- 2. Delete old relationships
DELETE FROM procedure_patient_types WHERE procedure_id = 123;
DELETE FROM procedure_phase_products WHERE procedure_id = 123;

-- 3. Re-insert relationships
INSERT INTO procedure_patient_types (procedure_id, patient_type_id)
VALUES (123, 1), (123, 2), (123, 3);

INSERT INTO procedure_phase_products
  (procedure_id, phase_id, patient_type_id, product_id)
VALUES
  (123, 1, 1, 5),
  -- ... more
```

**Optimization Opportunity:** Instead of delete-all + re-insert, could calculate diff for junction tables too. Current approach is simpler but less efficient.

---

### Deleting a Condition

**Steps:**
1. User clicks "Delete" in AdminPanelConditions
2. Confirmation dialog shown
3. User confirms
4. deleteConditionFromSupabase() called
5. Database cascades delete to junction tables (if configured)
6. Cache invalidated
7. Data reloaded

**Database Operations:**
```sql
-- Junction tables deleted first (or CASCADE)
DELETE FROM procedure_phase_products WHERE procedure_id = 123;
DELETE FROM procedure_patient_types WHERE procedure_id = 123;

-- Then main record
DELETE FROM procedures WHERE id = 123;
```

---

## Cache Management

### Cache Invalidation Strategy

**When to Invalidate:**
- After any admin save operation
- After import operation
- When user clicks "Refresh"

**How:**
```javascript
export const invalidateConditionsCache = () => {
  localStorage.removeItem('conditions_cache_v1');
};

// Called after every save
await updateConditionInSupabase(condition);
invalidateConditionsCache();
await loadInitialData(forceRefresh=true);
```

**Force Refresh:**
```javascript
const loadConditionsFromSupabase = async (forceRefresh = false) => {
  if (!forceRefresh) {
    // Check cache
    const cached = localStorage.getItem('conditions_cache_v1');
    if (cached && isCacheValid(cached)) {
      return JSON.parse(cached).data;
    }
  }

  // Fetch from Supabase
  const { data } = await supabase.from('procedures').select('*');

  // Update cache
  localStorage.setItem('conditions_cache_v1', JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
};
```

---

## Security Considerations

### Authentication Required
```javascript
// AdminPanel only renders if authenticated
const { isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <AdminLoginModal />;
}
```

### Authorization (Client-Side Only - ISSUE)
```javascript
// Currently only checked in frontend
{isAuthenticated && (
  <button onClick={openAdminPanel}>Admin</button>
)}
```

**Problem:** Client-side authorization can be bypassed

**Solution Needed:** Server-side authorization via Supabase RLS policies

### Row Level Security (RLS) in Supabase

**Current Policies:**
- Public read access to conditions, products, etc.
- Admin write access (checked via `admins` table)

**Example RLS Policy:**
```sql
-- Allow authenticated admins to update procedures
CREATE POLICY admin_update_procedures ON procedures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );
```

---

## Performance Considerations

### Current Bottlenecks

1. **Large Save Operations**
   - Deleting and re-inserting all junction table entries
   - Could optimize with diff-based updates

2. **Full Data Reload After Save**
   - Invalidates cache and reloads everything
   - Could update state incrementally instead

3. **No Pagination**
   - Loads all conditions/products at once
   - Fine for current data size but won't scale

4. **No Optimistic Updates**
   - UI waits for database confirmation
   - Could show changes immediately with rollback on error

### Optimization Opportunities

1. **Incremental State Updates**
   ```javascript
   // Instead of
   await saveChanges();
   await loadInitialData();

   // Do
   await saveChanges();
   setConditions(updatedConditions); // Update state directly
   ```

2. **Batch Operations**
   ```javascript
   // Instead of
   for (const condition of changed) {
     await updateCondition(condition);
   }

   // Do
   await Promise.all(
     changed.map(c => updateCondition(c))
   );
   ```

3. **Debounced Auto-Save**
   ```javascript
   useEffect(() => {
     const timer = setTimeout(() => {
       autoSave();
     }, 2000);
     return () => clearTimeout(timer);
   }, [editedConditions]);
   ```

---

## Error Handling

### Current Approach
```javascript
try {
  await updateConditionInSupabase(condition);
} catch (error) {
  console.error('Error updating condition:', error);
  // No user feedback
}
```

### Issues
- Errors logged to console only
- No user notification
- No rollback on failure
- Partial saves possible

### Improved Approach Needed
```javascript
try {
  setIsSaving(true);
  await updateConditionInSupabase(condition);
  showSuccessToast('Condition updated successfully');
} catch (error) {
  console.error('Error updating condition:', error);
  showErrorToast(`Failed to update condition: ${error.message}`);
  // Rollback changes
  setEditedConditions(originalConditions);
} finally {
  setIsSaving(false);
}
```

---

## Testing Recommendations

### Unit Tests
```javascript
describe('AdminPanelCore', () => {
  it('calculates diff correctly', () => {
    const original = [{ id: 1, name: 'Original' }];
    const edited = { 1: { id: 1, name: 'Edited' } };
    const changed = calculateChangedConditions(original, edited);
    expect(changed).toHaveLength(1);
  });

  it('handles save errors gracefully', async () => {
    // Mock failed save
    jest.spyOn(supabase, 'from').mockRejectedValue(new Error('DB error'));
    await handleSaveChanges();
    expect(errorState).toBeDefined();
  });
});
```

### Integration Tests
```javascript
describe('Condition CRUD Operations', () => {
  it('creates a new condition', async () => {
    const newCondition = {
      name: 'Test Condition',
      category: 'Surgical',
      pitch_points: 'Test points'
    };

    await addConditionToSupabase(newCondition);

    const conditions = await loadConditionsFromSupabase(true);
    expect(conditions).toContainEqual(
      expect.objectContaining({ name: 'Test Condition' })
    );
  });

  it('updates an existing condition', async () => {
    const updated = { ...condition, name: 'Updated Name' };
    await updateConditionInSupabase(updated);

    const conditions = await loadConditionsFromSupabase(true);
    const found = conditions.find(c => c.id === condition.id);
    expect(found.name).toBe('Updated Name');
  });
});
```

---

## Common Issues & Solutions

### Issue: Changes Not Appearing
**Cause:** Cache not invalidated

**Solution:**
```javascript
invalidateConditionsCache();
await loadInitialData(forceRefresh=true);
```

### Issue: Partial Save
**Cause:** Error during multi-step save operation

**Solution:** Implement transactions or rollback logic

### Issue: Slow Save Operations
**Cause:** Deleting and re-inserting all junction table entries

**Solution:** Calculate diff for junction tables too

### Issue: State Desync
**Cause:** editedConditions not properly updated

**Solution:** Ensure deep cloning and immutable updates
```javascript
setEditedConditions(prev => ({
  ...prev,
  [id]: { ...prev[id], [field]: value }
}));
```

---

## Future Enhancements

### 1. Undo/Redo
- Track change history
- Allow reverting to previous states
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

### 2. Bulk Operations
- Select multiple conditions
- Bulk edit (change category, add products)
- Bulk delete with confirmation

### 3. Audit Log
- Track who changed what and when
- Store in database
- Display in admin panel

### 4. Advanced Validation
- Check for duplicate names
- Validate relationships (products exist, etc.)
- Warn about unused products/categories

### 5. Import/Export Improvements
- CSV support
- Partial imports (specific tables only)
- Dry-run mode (preview before import)
- Rollback mechanism

---

*Last Updated: January 2025*
*Document Status: Complete*
*Refactoring Priority: High (large files, complex logic)*
