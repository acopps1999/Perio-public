# Components Layer - Context Documentation

## Overview

The components directory contains all React UI components for the PRISM Clinical Chart application. This includes the main application container, clinical decision support features, admin management interface, and various modals and widgets.

**Total:** 25+ components across ~4500 lines of code

**Architecture:** Functional components using React Hooks exclusively

---

## Component Categories

### 1. Main Application Components

#### ClinicalChartMockup.js (~613 lines)
**Role:** Main application container and state manager

**Responsibilities:**
- Loads conditions, products, and patient types from Supabase
- Manages global application state
- Handles responsive layout switching (mobile/tablet/desktop)
- Coordinates between different views (main, wizard, admin, chatbot)
- Implements caching strategy for conditions

**Key State:**
```javascript
const [conditions, setConditions] = useState([]);
const [products, setProducts] = useState([]);
const [patientTypes, setPatientTypes] = useState([]);
const [selectedCondition, setSelectedCondition] = useState(null);
const [filters, setFilters] = useState({ category: '', patientType: '', search: '' });
```

**Data Loading:**
```javascript
const loadChartData = async (forceRefresh = false) => {
  // 1. Load conditions (with caching)
  const conditions = await loadConditionsFromSupabase(forceRefresh);

  // 2. Load products
  const { data: products } = await supabase.from('products').select('*');

  // 3. Load patient types
  const { data: patientTypes } = await supabase.from('patient_types').select('*');

  // 4. Set state
  setConditions(conditions);
  setProducts(products);
  setPatientTypes(patientTypes);
};
```

**Views Managed:**
- Main application view (conditions list + details)
- Admin panel modal
- Diagnosis wizard modal
- Database chatbot panel
- Feedback widget

**Location:** `src/components/ClinicalChartMockup.js`

---

#### DiagnosisWizard.js (~350+ lines)
**Role:** Guided 5-step workflow for product recommendations

**Steps:**
1. **Select Category** - Surgical or Intra-Oral
2. **Select Condition** - Filtered by category
3. **Select Patient Type** - Type 1-4 risk profiles
4. **Select Phase** - Prep, Acute, or Maintenance
5. **View Products** - Recommended products with research and competitive advantages

**Key Features:**
- Progressive disclosure (steps unlock sequentially)
- Automatic reset when going back
- Integration with research and competitive advantage modals
- Responsive design (full-screen on mobile)

**Product Recommendation Logic:**
```javascript
// From condition.patientSpecificConfig
const recommendedProducts = condition.patientSpecificConfig
  .filter(config =>
    config.phase_id === selectedPhase &&
    config.patient_type_id === selectedPatientType
  )
  .map(config => config.product_id);
```

**Location:** `src/components/DiagnosisWizard.js`

---

#### ConditionDetails.js (~300+ lines)
**Role:** Detailed view of selected condition with phase-based recommendations

**Features:**
- Phase tabs (Prep, Acute, Maintenance)
- Patient type selector
- Product recommendations filtered by phase and patient type
- Pitch points display
- Links to research articles
- Links to competitive advantages

**Data Structure:**
```javascript
{
  condition: {
    id, name, category, pitch_points,
    patientSpecificConfig: [
      { phase_id, patient_type_id, product_id },
      ...
    ]
  }
}
```

**Filtering Logic:**
```javascript
const getProductsForPhaseAndPatient = (phaseId, patientTypeId) => {
  return condition.patientSpecificConfig
    .filter(config =>
      config.phase_id === phaseId &&
      config.patient_type_id === patientTypeId
    )
    .map(config => products.find(p => p.id === config.product_id));
};
```

**Location:** `src/components/ConditionDetails.js`

---

### 2. List and Filter Components

#### ConditionsList.js (~150 lines)
**Role:** Scrollable grid of conditions

**Features:**
- Grid layout (responsive columns)
- Selection highlighting
- Category and patient type badges
- Click to select condition
- Keyboard navigation support

**Props:**
```javascript
{
  conditions: Array,          // Filtered conditions
  selectedCondition: Object,  // Currently selected
  onSelectCondition: Function // Selection handler
}
```

**Location:** `src/components/ConditionsList.js`

---

#### FiltersSection.js (~200 lines)
**Role:** Filter controls for category, patient type, and search

**Features:**
- Category dropdown (Surgical, Intra-Oral, All)
- Patient type dropdown (Type 1-4, All)
- Search input with debouncing
- Clear all filters button
- Radix UI Select components

**State Lifting:**
```javascript
// Managed by parent (ClinicalChartMockup)
const [filters, setFilters] = useState({
  category: '',
  patientType: '',
  search: ''
});

// Passed down to FiltersSection
<FiltersSection filters={filters} onFiltersChange={setFilters} />
```

**Location:** `src/components/FiltersSection.js`

---

### 3. Database Chatbot Components

#### DatabaseChatbot.js (~200 lines)
**Role:** Natural language database query interface

**Current Implementation:**
- Uses SupabaseQueryService only
- Pattern matching for intent detection
- Authenticated users only
- Conversation history
- Sample questions for guidance
- SQL query visibility (toggle)

**Message Flow:**
```javascript
User types question
  ↓
handleSendMessage()
  ↓
queryServiceRef.current.processQuestion(message)
  ↓
Display formatted answer
```

**Known Issues:**
- LLM integration not working (see Services CONTEXT.md)
- Limited to simple pattern matching
- Can't handle complex queries

**UI Components:**
- Message history (scrollable)
- Input field with send button
- Loading indicator
- Sample questions
- SQL toggle button
- Error messages

**Location:** `src/components/DatabaseChatbot.js`

---

### 4. Modal Components

#### CompetitiveAdvantageModal.js (~250 lines)
**Role:** Display competitive positioning data

**Features:**
- Two-tab interface: Competitors vs Active Ingredients
- Product selection
- Advantage details view
- Copy to clipboard
- Radix UI Dialog

**Data Structure:**
```javascript
{
  competitors: [
    { product_name, competitor_name, advantages }
  ],
  activeIngredients: [
    { product_name, ingredient_name, advantages }
  ]
}
```

**Location:** `src/components/CompetitiveAdvantageModal.js`

---

#### ResearchModal.js (~200 lines)
**Role:** Display clinical research articles

**Features:**
- Filterable by product or procedure
- Shows title, author, abstract
- External links to full articles
- Radix UI Dialog

**Location:** `src/components/ResearchModal.js`

---

#### ProductDetailsModal.js (~150 lines)
**Role:** Detailed product information

**Features:**
- Product name and description
- Availability status
- Phase information
- Related research
- Competitive advantages

**Location:** `src/components/ProductDetailsModal.js`

---

### 5. Feedback System Components

#### FeedbackWidget.js (~300 lines)
**Role:** User feedback collection

**Features:**
- Floating button (bottom-right)
- Three feedback types: Bug, Feature, Question
- Auto-capture context (URL, screen size, location)
- Supabase storage
- Optional EmailJS notifications
- Admin-only visibility

**Data Captured:**
```javascript
{
  type: 'bug' | 'feature' | 'question',
  description: string,
  location: string,  // Page/component name
  context: {
    url: window.location.href,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent
  },
  status: 'new'
}
```

**Location:** `src/components/FeedbackWidget.js`

---

### 6. UI Components

#### PrismTitleSection.js (~100 lines)
**Role:** Application header with logo and navigation

**Features:**
- PRISM logo
- Title text
- Navigation buttons (Admin, Wizard, Chatbot)
- Mobile hamburger menu
- Responsive layout

**Location:** `src/components/PrismTitleSection.js`

---

#### ThemeToggle.js (~50 lines)
**Role:** Dark/Light mode toggle

**Features:**
- Sun/Moon icon
- Smooth transitions
- Persists to localStorage
- Uses ThemeContext

**Location:** `src/components/ThemeToggle.js`

---

### 7. Authentication Components

#### AdminLoginModal.js (~150 lines)
**Role:** Admin authentication form

**Features:**
- Email/password inputs
- Submit button with loading state
- Error message display
- Radix UI Dialog
- Integration with AuthContext

**Login Flow:**
```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  const { success, error } = await login(email, password);
  if (success) {
    onLoginSuccess();
  } else {
    setError(error);
  }
};
```

**Location:** `src/components/AdminLoginModal.js`

---

## Admin Panel Components

See separate `src/components/AdminPanel/CONTEXT.md` for detailed admin panel documentation.

**Summary:**
- AdminPanel.js - Main container with tabs
- AdminPanelCore.js - State manager (1168 lines)
- AdminPanelSupabase.js - Database operations (1000+ lines)
- AdminPanelConditions.js - Condition CRUD UI
- AdminPanelProducts.js - Product management UI
- AdminPanelCategories.js - Category management UI
- AdminPanelImportExport.js - Data backup/restore
- AdminPanelModals.js - Reusable modal components

---

## Component Communication Patterns

### 1. Props Down, Events Up
```javascript
// Parent
<ConditionsList
  conditions={filteredConditions}
  onSelectCondition={handleSelectCondition}
/>

// Child
const ConditionsList = ({ conditions, onSelectCondition }) => {
  return conditions.map(c => (
    <button onClick={() => onSelectCondition(c)}>
      {c.name}
    </button>
  ));
};
```

### 2. Context for Global State
```javascript
// AuthContext
const { isAuthenticated, adminUser, login, logout } = useAuth();

// ThemeContext
const { isDarkMode, toggleTheme } = useTheme();
```

### 3. Ref for Service Instances
```javascript
// DatabaseChatbot
const queryServiceRef = useRef(new SupabaseQueryService(supabase));

// Avoids recreating service on every render
```

### 4. State Lifting
```javascript
// Filters managed in parent
const [filters, setFilters] = useState({});

// Passed to child
<FiltersSection filters={filters} onFiltersChange={setFilters} />

// Multiple children use same state
<ConditionsList conditions={applyFilters(conditions, filters)} />
```

---

## Styling Patterns

### Tailwind CSS Classes
```javascript
<div className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    Title
  </h2>
</div>
```

### Responsive Design
```javascript
// Mobile-first approach
className="
  grid grid-cols-1      /* Mobile: 1 column */
  md:grid-cols-2        /* Tablet: 2 columns */
  lg:grid-cols-3        /* Desktop: 3 columns */
  gap-4
"
```

### Dark Mode
```javascript
// Automatic via ThemeContext
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Text</p>
</div>
```

### Conditional Classes
```javascript
import clsx from 'clsx';

<button className={clsx(
  'px-4 py-2 rounded',
  isSelected && 'bg-blue-600 text-white',
  !isSelected && 'bg-gray-200 text-gray-800'
)}>
  Button
</button>
```

---

## Common Hooks Used

### useState - Component State
```javascript
const [isOpen, setIsOpen] = useState(false);
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
```

### useEffect - Side Effects
```javascript
useEffect(() => {
  loadData();
}, []); // Run on mount

useEffect(() => {
  filterData();
}, [filters]); // Run when filters change
```

### useCallback - Memoized Callbacks
```javascript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### useRef - Persistent Values
```javascript
const serviceRef = useRef(new Service());
const inputRef = useRef(null);
```

### useContext - Global State
```javascript
const { isAuthenticated } = useAuth();
const { isDarkMode } = useTheme();
```

### Custom Hooks
```javascript
const { isMobile, isTablet, isDesktop } = useResponsive();
```

---

## Data Flow Examples

### Loading Conditions
```
ClinicalChartMockup.loadChartData()
  ↓
AdminPanelSupabase.loadConditionsFromSupabase()
  ↓
Check localStorage cache
  ↓
If cached and valid: return cached data
If not: fetch from Supabase
  ↓
Cache in localStorage
  ↓
Return to ClinicalChartMockup
  ↓
setConditions(data)
  ↓
Pass to child components via props
```

### Selecting a Condition
```
User clicks condition in ConditionsList
  ↓
ConditionsList calls onSelectCondition(condition)
  ↓
ClinicalChartMockup.handleSelectCondition(condition)
  ↓
setSelectedCondition(condition)
  ↓
ConditionDetails receives selectedCondition prop
  ↓
Renders condition details
```

### Filtering Conditions
```
User changes filter in FiltersSection
  ↓
FiltersSection calls onFiltersChange(newFilters)
  ↓
ClinicalChartMockup.setFilters(newFilters)
  ↓
useMemo recalculates filteredConditions
  ↓
Pass to ConditionsList
  ↓
List updates with filtered results
```

---

## Error Handling Patterns

### Try-Catch Blocks
```javascript
const loadData = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    setData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Error State Display
```javascript
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    {error}
  </div>
)}
```

### Loading States
```javascript
{loading ? (
  <div className="flex justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
  </div>
) : (
  <DataDisplay data={data} />
)}
```

---

## Accessibility Considerations

### Current State
- Limited aria-labels (only 4 instances found)
- Some keyboard navigation support
- Focus management in modals (Radix UI)
- Color contrast generally good

### Improvements Needed
1. **Add aria-labels to all buttons**
   ```javascript
   <button aria-label="Close modal">X</button>
   ```

2. **Add role attributes**
   ```javascript
   <div role="tabpanel" aria-labelledby="tab-1">
   ```

3. **Keyboard navigation**
   ```javascript
   onKeyDown={(e) => {
     if (e.key === 'Enter') handleSelect();
     if (e.key === 'Escape') handleClose();
   }}
   ```

4. **Focus management**
   ```javascript
   useEffect(() => {
     if (isOpen) {
       inputRef.current?.focus();
     }
   }, [isOpen]);
   ```

---

## Performance Considerations

### Current Optimizations
- useCallback for event handlers
- useMemo for filtered data
- Condition caching (localStorage)
- Radix UI lazy loading

### Improvements Needed
1. **Virtualization for long lists**
   ```javascript
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

2. **Code splitting**
   ```javascript
   const AdminPanel = lazy(() => import('./AdminPanel'));
   ```

3. **Image optimization**
   - Use WebP format
   - Lazy load images
   - Responsive images

4. **Bundle size reduction**
   - Tree shaking
   - Remove unused dependencies
   - Analyze bundle

---

## Testing Recommendations

### Component Tests
```javascript
import { render, screen, fireEvent } from '@testing-library/react';

describe('ConditionsList', () => {
  it('renders conditions', () => {
    render(<ConditionsList conditions={mockConditions} />);
    expect(screen.getByText('Gingivitis')).toBeInTheDocument();
  });

  it('handles selection', () => {
    const onSelect = jest.fn();
    render(<ConditionsList conditions={mockConditions} onSelectCondition={onSelect} />);
    fireEvent.click(screen.getByText('Gingivitis'));
    expect(onSelect).toHaveBeenCalledWith(mockConditions[0]);
  });
});
```

### Integration Tests
```javascript
describe('Condition Selection Flow', () => {
  it('selects condition and displays details', () => {
    render(<ClinicalChartMockup />);
    fireEvent.click(screen.getByText('Gingivitis'));
    expect(screen.getByRole('heading', { name: 'Gingivitis' })).toBeInTheDocument();
  });
});
```

---

## Common Gotchas

### 1. State Not Updating
**Problem:** Component doesn't re-render after state change

**Solution:** Ensure you're using setState function, not mutating state directly
```javascript
// Wrong
conditions.push(newCondition);

// Right
setConditions([...conditions, newCondition]);
```

### 2. Infinite Re-render Loop
**Problem:** useEffect causes infinite loop

**Solution:** Check dependencies array
```javascript
// Wrong - causes infinite loop
useEffect(() => {
  setData(processData(data));
}, [data]);

// Right
useEffect(() => {
  setData(processData(initialData));
}, [initialData]);
```

### 3. Stale Closures
**Problem:** Event handler uses old state value

**Solution:** Use functional state updates
```javascript
// Wrong
const increment = () => setCount(count + 1);

// Right
const increment = () => setCount(c => c + 1);
```

### 4. Memory Leaks
**Problem:** Event listeners or timers not cleaned up

**Solution:** Return cleanup function from useEffect
```javascript
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer);
}, []);
```

---

*Last Updated: January 2025*
*Document Status: Complete*
*Next Steps: Add comprehensive test coverage, improve accessibility*
