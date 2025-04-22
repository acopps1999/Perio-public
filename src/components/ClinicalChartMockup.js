import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Search, X, ChevronDown, ChevronRight, Info, Stethoscope, Settings, Filter, BookOpen, ExternalLink, FileText, Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import DiagnosisWizard from './DiagnosisWizard';
import AdminPanel from './AdminPanel';
import { useConditionsData } from '../hooks/useConditionsData';

// PatientTypes definition based on project documentation
const PATIENT_TYPES = {
  'Type 1': 'Healthy',
  'Type 2': 'Mild inflammation, moderate risk',
  'Type 3': 'Smoker, diabetic, immunocompromised',
  'Type 4': 'Periodontal disease, chronic illness, poor healing'
};

function ClinicalChartMockup() {
  // State management using the hook
  const { conditions: conditionsData, loading, error, refetch } = useConditionsData();

  // Local state remains for filtering, UI, etc.
  const [conditions, setConditions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(['All']);
  const [ddsTypeOptions, setDdsTypeOptions] = useState(['All']);
  const [filteredConditions, setFilteredConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ddsTypeFilter, setDdsTypeFilter] = useState('All');
  const [patientTypeFilter, setPatientTypeFilter] = useState('All');
  const [activePatientType, setActivePatientType] = useState('All'); // Active patient type for product filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [selectedResearchProduct, setSelectedResearchProduct] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [patientSpecificProducts, setPatientSpecificProducts] = useState({}); // Store patient-specific product recommendations
  const [expandedSections, setExpandedSections] = useState({
    pitchPoints: false,
    competitiveAdvantage: false,
    handlingObjections: false,
    scientificRationale: false,
    clinicalEvidence: false,
    productUsage: false
  });

  // Load initial data from the hook
  useEffect(() => {
    if (!loading && conditionsData) {
      console.log("Data received from hook:", conditionsData);
      setConditions(conditionsData); // Set the base data
      // Filtered conditions will be updated by the filtering useEffect below

      // Dynamically populate category and DDS options from fetched data
      // Ensure unique values and include 'All'
      const categories = ['All', ...new Set(conditionsData.map(c => c.category).filter(Boolean))];
      const ddsTypes = ['All', ...new Set(conditionsData.flatMap(c => Array.isArray(c.dds) ? c.dds : []).filter(Boolean))];

      setCategoryOptions(categories.sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
      setDdsTypeOptions(ddsTypes.sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));

      // Set default selected condition if data exists and none is selected or the selected one is gone
      if (conditionsData.length > 0) {
        const currentSelectedExists = selectedCondition && conditionsData.some(c => c.id === selectedCondition.id);
        if (!currentSelectedExists) {
          const firstCondition = conditionsData[0];
          setSelectedCondition(firstCondition);
          // Ensure firstCondition.phases is an array and has elements
          if (Array.isArray(firstCondition.phases) && firstCondition.phases.length > 0) {
              setActiveTab(firstCondition.phases[0]);
          } else {
              console.warn('First condition has no phases:', firstCondition);
              setActiveTab(''); // Or handle appropriately
          }
        }
      } else {
        // No data, reset selection
        setSelectedCondition(null);
        setActiveTab('');
      }
    }
  // Only run when hook data changes or loading state finishes
  }, [conditionsData, loading]); 

  // Filter conditions based on selected filters and search query
  useEffect(() => {
    // Start with the full dataset from the hook
    let filtered = [...conditionsData]; 

    // Filter by category
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(condition => condition.category === categoryFilter);
    }

    // Filter by DDS type
    if (ddsTypeFilter !== 'All') {
      // Make sure condition.dds is an array before calling includes
      filtered = filtered.filter(condition => Array.isArray(condition.dds) && condition.dds.includes(ddsTypeFilter));
    }

    // Filter by patient type
    if (patientTypeFilter !== 'All') {
      filtered = filtered.filter(condition => {
        // Use the formatted string from the hook
        return condition.patientType && condition.patientType.includes(`Type ${patientTypeFilter}`);
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(condition =>
        condition.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConditions(filtered);

    // Update selected condition if it's no longer in filtered results
    if (filtered.length > 0) {
        const selectedStillInFiltered = selectedCondition && filtered.some(c => c.id === selectedCondition.id);
        if (!selectedStillInFiltered) {
            // If current selection is gone or no selection, pick the first filtered item
            const firstFilteredCondition = filtered[0];
            setSelectedCondition(firstFilteredCondition);
            if (Array.isArray(firstFilteredCondition.phases) && firstFilteredCondition.phases.length > 0) {
                setActiveTab(firstFilteredCondition.phases[0]);
            } else {
                setActiveTab(''); 
            }
        }
        // If selected is still valid, keep it
    } else if (filtered.length === 0 && selectedCondition) {
      // No conditions match, clear selection
      setSelectedCondition(null);
      setActiveTab('');
    }
  // Depend on the raw data and filters
  }, [conditionsData, categoryFilter, ddsTypeFilter, patientTypeFilter, searchQuery, selectedCondition]);

  // Generate patient-specific product recommendations when selectedCondition changes
  // Modify the useEffect that sets up patientSpecificProducts
  useEffect(() => {
    if (!selectedCondition || !Array.isArray(selectedCondition.phases)) {
        setPatientSpecificProducts({}); // Reset if no condition or phases
        return;
    }

    console.log("Setting up patient-specific products for:", selectedCondition.name);

    // Create a map of phase -> patientType -> products
    let patientProducts = {};

    // Check if condition has patientSpecificConfig from admin panel (needs DB integration later)
    if (selectedCondition.patientSpecificConfig) {
      console.log("Using admin-configured products");
      // Use the configuration directly
      patientProducts = JSON.parse(JSON.stringify(selectedCondition.patientSpecificConfig));
    } else {
      console.log("Inferring patient-specific products from fetched data");
      // Process each phase
      selectedCondition.phases.forEach(phase => {
        patientProducts[phase] = {
          'All': [],
          '1': [],
          '2': [],
          '3': [],
          '4': []
        };

        // Use the products structure coming from the hook
        const phaseProducts = selectedCondition.products?.[phase] || [];
        patientProducts[phase]['All'] = [...phaseProducts];

        // Distribute products (assuming no specific patient type logic in base products for now)
        // This part might need adjustment based on how you store/fetch patient-specific product rules
        phaseProducts.forEach(product => {
          // Example: If product name implies specificity (e.g., '(Type 3/4 Only)'), handle it
          // This logic needs refinement based on actual DB data/rules
          if (product.includes('(Type 3/4 Only)')) { 
            const baseProduct = product.replace(' (Type 3/4 Only)', '');
            patientProducts[phase]['3'].push(baseProduct);
            patientProducts[phase]['4'].push(baseProduct);
          } else {
            // Assume applies to all types if not marked otherwise
            patientProducts[phase]['1'].push(product);
            patientProducts[phase]['2'].push(product);
            patientProducts[phase]['3'].push(product);
            patientProducts[phase]['4'].push(product);
          }
        });
      });
    }

    console.log("Final patient-specific products:", patientProducts);
    setPatientSpecificProducts(patientProducts);

    // Set initial filtered products based on current activeTab and activePatientType
    // Moved this logic to the next useEffect that depends on patientSpecificProducts

  }, [selectedCondition]); // Re-run only when selected condition changes


  // Filter products based on selected phase, patient type, AND when patientSpecificProducts updates
  useEffect(() => {
    if (selectedCondition && activeTab && patientSpecificProducts[activeTab]) { // Check phase exists
      console.log("Filtering products based on patient type:", activePatientType);
      console.log("Available products for phase:", patientSpecificProducts[activeTab]);

      const phaseProducts = patientSpecificProducts[activeTab];

      // Force a re-render by creating a new array
      if (activePatientType !== 'All') {
        const productsForType = [...(phaseProducts[activePatientType] || [])];
        console.log("Setting filtered products for type:", activePatientType, productsForType);
        setFilteredProducts(productsForType);
      } else {
        const allProducts = [...(phaseProducts['All'] || [])];
        console.log("Setting filtered products for all:", allProducts);
        setFilteredProducts(allProducts);
      }
    } else {
      // Reset if no condition, tab, or products for the tab
      setFilteredProducts([]);
    }
  // Depend on selection AND the generated product map
  }, [selectedCondition, activeTab, activePatientType, patientSpecificProducts]);

  // Get patient types from PATIENT_TYPES constant
  const patientTypes = ['All', '1', '2', '3', '4'];

  // Handle condition selection - ensure phases exist
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    if (Array.isArray(condition.phases) && condition.phases.length > 0) {
      setActiveTab(condition.phases[0]);
    } else {
      setActiveTab(''); // Handle condition with no phases
    }
    setActivePatientType('All'); // Reset patient type filter when changing condition
  };

  // Handle patient type selection - triggers the product filtering useEffect
  const handlePatientTypeSelect = (type) => {
    console.log("Patient type selected:", type);
    setActivePatientType(type);
    // No need to manually setFilteredProducts here, the useEffect handles it
  };

  // Handle product selection for modal - adjust product name cleaning if needed
  const handleProductSelect = (product) => {
    // Adjust cleaning logic if product names from DB differ from JSON structure
    const cleanProductName = product.replace(' (Type 3/4 Only)', '');
    setSelectedProduct({
      name: product,
      details: selectedCondition?.productDetails?.[cleanProductName] // Use optional chaining
    });
    setModalOpen(true);
  };

  // Handle opening research modal for a specific product
  const handleOpenResearch = (product) => {
    setSelectedResearchProduct(product); // Pass the full product name initially
    setResearchModalOpen(true);
  };

  // Get research articles for a specific product in the current condition
  const getProductResearch = (productName) => {
    if (!selectedCondition || !productName) return [];

    // Clean product name for lookup in details
    const cleanProductName = productName.replace(' (Type 3/4 Only)', '');

    // --- Placeholder for fetching/accessing research data --- 
    // This needs implementation based on how research is stored (e.g., in productDetails or a separate table)
    // Example: Check if details exist and have a researchArticles property
    const details = selectedCondition.productDetails?.[cleanProductName];
    if (details?.researchArticles && Array.isArray(details.researchArticles)) {
        return details.researchArticles;
    }
    // --- End Placeholder --- 

    // Fallback mock data (REMOVE OR REPLACE with actual data fetching/access)
    console.warn(`Using mock research data for ${cleanProductName} in ${selectedCondition.name}`);
    return [
      {
        title: `Clinical application of ${cleanProductName} in ${selectedCondition.name}`,
        author: "Smith et al., Journal of Dental Research, 2023",
        abstract: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in odio ac nunc efficitur vestibulum.",
        url: "#" // Add dummy URL
      },
      {
        title: `Efficacy of ${cleanProductName} in dental practice`,
        author: "Johnson et al., Periodontology Today, 2022",
        abstract: "Maecenas vel ante vel leo dictum eleifend. Suspendisse potenti.",
        url: "#"
      }
    ];
    // return []; // Return empty array if no real or mock data
  };

  // Determine if a phase has products for the selected condition - check products object structure
  const hasProductsForPhase = (phase) => {
    // Check the structure returned by the hook
    return selectedCondition?.products?.[phase]?.length > 0;
  };

  // Toggle diagnosis wizard
  const toggleWizard = () => {
    setWizardOpen(!wizardOpen);
  };
  
  // Toggle admin panel
  const toggleAdmin = () => {
    setAdminOpen(!adminOpen);
  };

  // Handle conditions update from admin panel (triggers refetch)
  const handleConditionsUpdate = () => {
    // The AdminPanel should perform the DB write.
    // This function is now primarily called when the Admin Panel closes to refresh data.
    console.log("Admin panel action finished, triggering data refetch...");
    refetch();
    // Optional: Close admin panel if not handled internally
    // setAdminOpen(false);
  };

  // Add Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-lg text-gray-600">Loading Clinical Data...</p>
        </div>
      </div>
    );
  }

  // Add Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg text-center shadow-md" role="alert">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <strong className="font-bold">Error Fetching Data!</strong>
          <span className="block sm:inline mt-1"> Failed to load conditions from the database.</span>
          <button
             onClick={refetch}
             className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
             Retry Fetch
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Clinical Chart Tool</h1>
          <div className="flex space-x-3">
            <button
              onClick={toggleWizard}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
            >
              <Stethoscope size={18} className="mr-2" />
              Diagnosis Wizard
            </button>
            <button
              onClick={toggleAdmin}
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
            >
              <Settings size={18} className="mr-2" />
              Admin Panel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section - Use dynamic options */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium mb-4 flex items-center">
             <Filter size={20} className="mr-2 text-gray-500"/> Filters
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Category Filter - Uses categoryOptions state */}
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Condition Category
              </label>
              <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
                <Select.Trigger id="category-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <Select.Value />
                  <Select.Icon><ChevronDown size={18} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border z-50">
                    <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
                      {categoryOptions.map((category) => (
                        <Select.Item
                          key={category}
                          value={category}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:font-semibold"
                        >
                          <Select.ItemText>{category}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            {/* DDS Type Filter - Uses ddsTypeOptions state */}
             <div>
              <label htmlFor="dds-filter" className="block text-sm font-medium text-gray-700 mb-1">
                DDS Type
              </label>
              <Select.Root value={ddsTypeFilter} onValueChange={setDdsTypeFilter}>
                 <Select.Trigger id="dds-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <Select.Value />
                  <Select.Icon><ChevronDown size={18} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border z-50">
                    <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
                      {ddsTypeOptions.map((dds) => (
                        <Select.Item
                          key={dds}
                          value={dds}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:font-semibold"
                        >
                          <Select.ItemText>{dds}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            {/* Patient Type Filter - Uses static patientTypes array */}
            <div>
              <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Patient Type (Condition Filter)
              </label>
              <Select.Root value={patientTypeFilter} onValueChange={setPatientTypeFilter}>
                <Select.Trigger id="patient-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <Select.Value />
                  <Select.Icon><ChevronDown size={18} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border z-50">
                    <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
                      {patientTypes.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:font-semibold"
                        >
                          <Select.ItemText>
                            {type === 'All' ? 'All Condition Types' : `Type ${type}: ${PATIENT_TYPES[`Type ${type}`]}`}
                          </Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Condition Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="E.g., Gingivitis..."
                />
                {searchQuery && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={18} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Conditions List - Use filteredConditions state */}
          <div className="lg:col-span-1 bg-white shadow rounded-lg overflow-hidden">
            <h2 className="text-lg font-medium p-4 border-b">Conditions ({filteredConditions.length})</h2>
            {filteredConditions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                 <Info size={24} className="mx-auto mb-2 text-gray-400"/>
                 No conditions match the selected filters.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[calc(100vh-250px)] overflow-y-auto">
                {filteredConditions.map((condition) => (
                  <li
                    key={condition.id}
                    className={clsx(
                      "px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150",
                      selectedCondition?.id === condition.id ? "bg-blue-50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                    )}
                    onClick={() => handleConditionSelect(condition)}
                  >
                    <div className="font-medium text-gray-800">{condition.name}</div>
                    <div className="text-sm text-gray-500">{condition.category}</div>
                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2">
                      <span>{Array.isArray(condition.dds) ? condition.dds.join(', ') : 'N/A'}</span>
                      <span>|</span>
                      <span title={condition.patientType || 'N/A'}>{condition.patientType ? `Fits: ${condition.patientType}` : 'Fits: N/A'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Selected Condition Details - Use selectedCondition state */}
          <div className="lg:col-span-3">
            {selectedCondition ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-800">{selectedCondition.name}</h2>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-2 items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{selectedCondition.category}</span>
                    <span className="text-gray-300">|</span>
                    <span title={Array.isArray(selectedCondition.dds) ? selectedCondition.dds.join(', ') : 'N/A'}>
                       <Stethoscope size={14} className="inline mr-1"/> 
                       {Array.isArray(selectedCondition.dds) ? selectedCondition.dds.slice(0, 2).join(', ') + (selectedCondition.dds.length > 2 ? '...' : '') : 'N/A'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span title={selectedCondition.patientType || 'N/A'}>Patient Types: {selectedCondition.patientType || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Recommended Products</h3>
                      <button
                        onClick={() => handleOpenResearch(null)}
                        className="py-1 px-3 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center text-sm transition-colors"
                      >
                        <BookOpen size={16} className="mr-1" />
                        View All Research
                      </button>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex-shrink-0">
                          <span className="text-sm font-medium text-blue-700">Show Recommendations For:</span>
                        </div>
                        <div className="flex-grow min-w-[200px]">
                          <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelect}>
                            <Select.Trigger className="w-full flex justify-between items-center px-3 py-1.5 text-sm bg-white border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <div className="flex items-center">
                                <Filter size={16} className="mr-2 text-blue-500" />
                                <Select.Value placeholder="Select Patient Type" />
                              </div>
                              <Select.Icon><ChevronDown size={18} /></Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border z-50">
                                <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
                                  {patientTypes.map((type) => (
                                    <Select.Item
                                      key={type}
                                      value={type}
                                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:font-semibold"
                                    >
                                      <Select.ItemText>
                                        {type === 'All' ? 'All Patient Types' : `Type ${type}: ${PATIENT_TYPES[`Type ${type}`]}`}
                                      </Select.ItemText>
                                    </Select.Item>
                                  ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </div>
                      </div>

                      {activePatientType !== 'All' && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center">
                          <Info size={14} className="mr-1 flex-shrink-0" />
                          Showing specific recommendations for: 
                          <span className="font-medium ml-1">
                            {`Type ${activePatientType}: ${PATIENT_TYPES[`Type ${activePatientType}`]}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <Tabs.List className="flex border-b divide-x divide-gray-200 bg-gray-50 rounded-t-lg overflow-x-auto">
                         {Array.isArray(selectedCondition.phases) && selectedCondition.phases.length > 0 ? (
                            selectedCondition.phases.map((phase) => (
                            <Tabs.Trigger
                                key={phase}
                                value={phase}
                                className={clsx(
                                "flex-1 px-4 py-2.5 text-sm font-medium text-center focus:outline-none whitespace-nowrap",
                                activeTab === phase
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                {phase} Phase
                                {hasProductsForPhase(phase) && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                                    {selectedCondition.products?.[phase]?.length || 0}
                                </span>
                                )}
                            </Tabs.Trigger>
                            ))
                        ) : (
                            <div className="p-4 text-sm text-gray-500">No treatment phases defined for this condition.</div>
                        )}
                      </Tabs.List>
                      {Array.isArray(selectedCondition.phases) && selectedCondition.phases.map((phase) => (
                        <Tabs.Content key={phase} value={phase} className="p-4 bg-white border border-gray-200 border-t-0 rounded-b-lg min-h-[150px]">
                           {filteredProducts.length > 0 ? (
                            <div className="space-y-3">
                              {filteredProducts.map((product) => (
                                <div
                                  key={product}
                                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                                  onClick={() => handleProductSelect(product)}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-md font-semibold text-blue-800">{product.replace(' (Type 3/4 Only)', '')}</h4>
                                    <Info size={16} className="text-gray-400 hover:text-blue-600"/>
                                  </div>
                                  {selectedCondition.productDetails?.[product.replace(' (Type 3/4 Only)', '')] && (
                                    <div className="text-sm text-gray-600">
                                      <p className="line-clamp-2">
                                        <span className="font-medium">Usage: </span>
                                        {selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')].usage}
                                      </p>
                                    </div>
                                  )}

                                  {product.includes('(Type 3/4 Only)') && (
                                    <div className="mt-2">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                        Recommended for Type 3/4
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-6">
                              <Info size={24} className="mx-auto mb-2 text-gray-400"/>
                              {activePatientType !== 'All' ? (
                                <div>
                                  No specific products recommended for <span className="font-medium">{phase}</span> phase
                                  for patient <span className="font-medium">Type {activePatientType}</span>.
                                  <p className="text-xs mt-1">Standard care may be sufficient, or check 'All Patient Types'.</p>
                                </div>
                              ) : (
                                `No products recommended for the ${phase} phase.`
                              )}
                            </div>
                          )}
                        </Tabs.Content>
                      ))}
                    </Tabs.Root>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                     <h3 className="text-lg font-medium text-gray-700 mb-3">Condition Details & Talking Points</h3>
                     <div className="space-y-2">
                        <DisclosureItem title="Key Pitch Points" content={selectedCondition.pitchPoints} defaultOpen={true} color="blue" />
                        <DisclosureItem title="Scientific Rationale" content={selectedCondition.scientificRationale || 'Rationale details not yet available.'} color="green" />
                        <DisclosureItem title="Clinical Evidence" content={selectedCondition.clinicalEvidence || 'Clinical evidence details not yet available.'} color="indigo" />
                        <DisclosureItem title="Competitive Advantage" content={selectedCondition.competitiveAdvantage || 'Competitive advantage details not yet available.'} color="purple" />
                        <DisclosureItem title="Handling Objections" content={selectedCondition.handlingObjections || 'Objection handling details not yet available.'} color="amber" />
                        <DisclosureItem title="Product Usage Summary" color="teal">
                            {selectedCondition.productDetails && Object.keys(selectedCondition.productDetails).length > 0 ? (
                                <ul className="list-disc space-y-2 pl-5 mt-2">
                                {Object.entries(selectedCondition.productDetails)
                                    .filter(([_, details]) => details.usage)
                                    .map(([productName, details]) => (
                                    <li key={productName} className="text-sm text-teal-800">
                                        <span className="font-semibold">{productName}:</span> {details.usage}
                                    </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-teal-700 mt-2 text-sm">No product usage information available for this condition.</div>
                            )}
                        </DisclosureItem>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500 h-full flex flex-col justify-center items-center">
                <Info size={32} className="text-gray-400 mb-4"/>
                {conditionsData.length > 0 ? 'Select a condition from the list to view details.' : 'No conditions loaded.'}
              </div>
            )}
          </div>
        </div>
      </main>
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-xl w-[90vw] bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto z-50">
            <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
              {selectedProduct?.name?.replace(' (Type 3/4 Only)', '')}
              {selectedProduct?.name?.includes('(Type 3/4 Only)') && 
                 <span className="ml-2 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Type 3/4 Only</span>
              }
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              Detailed product information for {selectedCondition?.name}
            </Dialog.Description>

            {selectedProduct?.details ? (
              <div className="space-y-4">
                <ModalSection title="Usage Instructions" content={selectedProduct.details.usage} color="blue" />
                <ModalSection title="Scientific Rationale" content={selectedProduct.details.rationale} color="green" />
                <ModalSection title="Clinical Evidence" content={selectedProduct.details.clinicalEvidence || selectedProduct.details.rationale || 'Not available.'} color="indigo" />
                <ModalSection title="Competitive Advantage" content={selectedProduct.details.competitive} color="purple" />
                <ModalSection title="Handling Objections" content={selectedProduct.details.objection} color="amber" />

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t mt-5">
                  <button
                    onClick={() => {
                      handleOpenResearch(selectedProduct.name);
                    }}
                    className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center text-sm transition-colors"
                  >
                    <BookOpen size={18} className="mr-2" />
                    View Specific Research
                  </button>

                  {selectedProduct.details.factSheet && selectedProduct.details.factSheet !== '#' ? (
                    <a
                      href={selectedProduct.details.factSheet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center text-sm transition-colors"
                    >
                      <FileText size={18} className="mr-2" />
                      View Fact Sheet
                    </a>
                  ) : (
                     <button
                       disabled
                       className="flex-1 py-2 px-4 bg-gray-300 text-gray-500 rounded-md flex items-center justify-center text-sm cursor-not-allowed"
                    >
                      <FileText size={18} className="mr-2" />
                      Fact Sheet Unavailable
                    </button>
                  )}
                </div>
              </div>
            ) : (
                 <p className="text-gray-600">Details not available for this product in the context of {selectedCondition?.name}.</p>
            )}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                 <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      <Dialog.Root open={researchModalOpen} onOpenChange={setResearchModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-3xl w-[90vw] bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col z-50">
            <div className="p-5 border-b sticky top-0 bg-white">
                <Dialog.Title className="text-xl font-semibold text-gray-900 flex items-center">
                    <BookOpen size={24} className="mr-3 text-indigo-600 flex-shrink-0" />
                    {selectedResearchProduct ? 
                        <span>Published Research: <span className="text-indigo-700">{selectedResearchProduct.replace(' (Type 3/4 Only)', '')}</span></span> : 
                        <span>Published Research for <span className="text-indigo-700">{selectedCondition?.name}</span></span>}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 mt-1">
                    Relevant scientific articles and studies.
                </Dialog.Description>
                <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </Dialog.Close>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {selectedCondition ? (
                <div className="space-y-6">
                  {selectedResearchProduct ? (
                    (() => {
                      const research = getProductResearch(selectedResearchProduct);
                      return research.length > 0 ? (
                        research.map((article, index) => (
                          <ResearchArticle key={index} article={article} index={index} />
                        ))
                      ) : (
                        <EmptyState icon={BookOpen} message={`No specific research articles found for ${selectedResearchProduct.replace(' (Type 3/4 Only)', '')}.`} />
                      );
                    })()
                  ) : (
                    (() => {
                      const allResearch = (filteredProducts || [])
                        .map(product => ({ product, research: getProductResearch(product) }))
                        .filter(item => item.research.length > 0);

                      return allResearch.length > 0 ? (
                        allResearch.map(({ product, research }, prodIndex) => (
                          <div key={product} className={prodIndex > 0 ? "pt-6 border-t" : ""}>
                            <h3 className="text-lg font-medium text-indigo-800 mb-3">
                              {product.replace(' (Type 3/4 Only)', '')}
                            </h3>
                            <div className="space-y-4">
                              {research.map((article, index) => (
                                <ResearchArticle key={index} article={article} index={index} smallHeaders={true}/>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                         <EmptyState icon={BookOpen} message={`No research articles found for the products currently recommended for ${selectedCondition.name}.`} />
                      );
                    })()
                  )}
                </div>
              ) : (
                 <EmptyState icon={AlertTriangle} message="No condition selected to display research."/>
              )}
            </div>
            <div className="p-4 border-t flex justify-end sticky bottom-0 bg-gray-50">
              <Dialog.Close asChild>
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Close Research
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      {wizardOpen && (
        <DiagnosisWizard
          conditions={conditionsData}
          onClose={toggleWizard}
        />
      )}

      {adminOpen && (
        <AdminPanel
          initialConditions={conditionsData}
          onClose={() => {
              toggleAdmin();
              handleConditionsUpdate();
          }}
        />
      )}
    </div>
  );
}

const DisclosureItem = ({ title, content, defaultOpen = false, color = 'gray', children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colors = {
    gray: { bg: 'bg-gray-50', hover: 'hover:bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: 'text-gray-600' },
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
    indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', icon: 'text-indigo-600' },
    purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: 'text-amber-600' },
    teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', icon: 'text-teal-600' },
  };
  const theme = colors[color] || colors.gray;

  return (
    <div className={`border ${theme.border} rounded-md overflow-hidden`}>
      <button
        className={`w-full flex justify-between items-center p-3 text-left ${theme.bg} ${theme.hover} transition-colors`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`font-medium ${theme.text}`}>{title}</span>
        <span className={theme.icon}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>
      {isOpen && (
        <div className={`p-4 border-t ${theme.border} ${theme.text.replace('800', '700')} text-sm`}>
          {children || content || 'No information available.'}
        </div>
      )}
    </div>
  );
};

const ModalSection = ({ title, content, color = 'gray' }) => {
   const colors = {
    gray: { bg: 'bg-gray-50', text: 'text-gray-800', contentText: 'text-gray-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', contentText: 'text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-800', contentText: 'text-green-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-800', contentText: 'text-indigo-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-800', contentText: 'text-purple-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-800', contentText: 'text-amber-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-800', contentText: 'text-teal-700' },
  };
  const theme = colors[color] || colors.gray;
  return (
    <div className={`${theme.bg} p-4 rounded-lg`}>
      <h4 className={`font-medium ${theme.text} mb-1 text-md`}>{title}</h4>
      <p className={`${theme.contentText} text-sm`}>{content || 'Not available.'}</p>
    </div>
  );
};

const ResearchArticle = ({ article, index, smallHeaders = false }) => (
  <div className="pb-4 border-b last:border-b-0">
    <h3 className={`font-medium ${smallHeaders ? 'text-md' : 'text-lg'} text-indigo-700`}>
      {article.url ? (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline group inline-flex items-start"
        >
          {!smallHeaders && <span className="mr-2 text-indigo-400">{index + 1}.</span>}
          <span>{article.title}</span>
          <ExternalLink size={14} className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
        </a>
      ) : (
        <div className="flex items-start">
          {!smallHeaders && <span className="mr-2 text-indigo-400">{index + 1}.</span>}
          <span>{article.title}</span>
        </div>
      )}
    </h3>

    {article.author && (
      <p className={`text-gray-600 text-sm mt-1 ${!smallHeaders ? 'pl-6' : ''}`}>{article.author}</p>
    )}

    {article.abstract && (
      <div className={`mt-2 ${!smallHeaders ? 'pl-6' : ''}`}>
        <p className="text-gray-700 text-sm leading-relaxed">{article.abstract}</p>
      </div>
    )}

    {article.url && (
        <div className={`mt-2 ${!smallHeaders ? 'pl-6' : ''}`}>
            <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 text-xs inline-flex items-center font-medium"
            >
                <ExternalLink size={12} className="mr-1" />
                <span>View Full Article</span>
            </a>
        </div>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
   <div className="py-10 text-center text-gray-500">
      <Icon size={48} className="mx-auto mb-4 text-gray-300" />
      <p>{message}</p>
    </div>
);

export default ClinicalChartMockup;