import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Search, X, ChevronDown, ChevronRight, Info, Stethoscope, Settings, Filter, BookOpen, ExternalLink, FileText } from 'lucide-react';
import clsx from 'clsx';
import DiagnosisWizard from './DiagnosisWizard';
import AdminPanel from './AdminPanel';
import conditionsDataImport from '../conditions_complete.json';

// PatientTypes definition based on project documentation
const PATIENT_TYPES = {
  'Type 1': 'Healthy',
  'Type 2': 'Mild inflammation, moderate risk',
  'Type 3': 'Smoker, diabetic, immunocompromised',
  'Type 4': 'Periodontal disease, chronic illness, poor healing'
};

function ClinicalChartMockup() {
  // State management
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
  
  useEffect(() => {
    // Clear localStorage on first load in production
    // (This is a one-time reset that can help if there's corrupted data)
    if (process.env.NODE_ENV === 'production' && !localStorage.getItem('render_initialized')) {
      localStorage.removeItem('conditions_data');
      localStorage.setItem('render_initialized', 'true');
      window.location.reload();
    }
  }, []);

  // Load conditions on component mount
  useEffect(() => {
    // Check if saved data exists in localStorage
    const savedData = localStorage.getItem('conditions_data');
    const savedCategories = localStorage.getItem('categories_data');
    const savedDdsTypes = localStorage.getItem('dds_types_data');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setConditions(parsedData);
      setFilteredConditions(parsedData);
      
      // Set default selected condition if data exists
      if (parsedData.length > 0) {
        setSelectedCondition(parsedData[0]);
        setActiveTab(parsedData[0].phases[0]);
      }
    } else {
      // Use imported data if no saved data exists
      setConditions(conditionsDataImport);
      setFilteredConditions(conditionsDataImport);
      
      // Set default selected condition if data exists
      if (conditionsDataImport.length > 0) {
        setSelectedCondition(conditionsDataImport[0]);
        setActiveTab(conditionsDataImport[0].phases[0]);
      }
    }
    
    // Load categories if available
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
          // Ensure 'All' is the first option
          if (!parsedCategories.includes('All')) {
            parsedCategories.unshift('All');
          } else {
            // If 'All' exists but is not the first element, remove it and add it to the beginning
            const filteredCategories = parsedCategories.filter(c => c !== 'All');
            setCategoryOptions(['All', ...filteredCategories]);
          }
        }
      } catch (error) {
        console.error('Error parsing saved categories:', error);
      }
    }
    
    // Load DDS types if available
    if (savedDdsTypes) {
      try {
        const parsedDdsTypes = JSON.parse(savedDdsTypes);
        if (Array.isArray(parsedDdsTypes) && parsedDdsTypes.length > 0) {
          // Ensure 'All' is the first option
          if (!parsedDdsTypes.includes('All')) {
            parsedDdsTypes.unshift('All');
          } else {
            // If 'All' exists but is not the first element, remove it and add it to the beginning
            const filteredDdsTypes = parsedDdsTypes.filter(d => d !== 'All');
            setDdsTypeOptions(['All', ...filteredDdsTypes]);
          }
        }
      } catch (error) {
        console.error('Error parsing saved DDS types:', error);
      }
    }
  }, []);

  // Filter conditions based on selected filters and search query
  useEffect(() => {
    let filtered = [...conditions];
    
    // Filter by category
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(condition => condition.category === categoryFilter);
    }
    
    // Filter by DDS type
    if (ddsTypeFilter !== 'All') {
      filtered = filtered.filter(condition => condition.dds.includes(ddsTypeFilter));
    }
    
    // Filter by patient type
    if (patientTypeFilter !== 'All') {
      filtered = filtered.filter(condition => {
        // Check if condition's patientType includes the selected patient type
        // This assumes patientType can be a string like "Types 1 to 4" or an array
        if (Array.isArray(condition.patientType)) {
          return condition.patientType.includes(`Type ${patientTypeFilter}`);
        } else {
          return condition.patientType.includes(patientTypeFilter);
        }
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
    if (filtered.length > 0 && (!selectedCondition || 
        !filtered.find(c => c.name === selectedCondition.name))) {
      setSelectedCondition(filtered[0]);
      setActiveTab(filtered[0].phases[0]);
    }
  }, [conditions, categoryFilter, ddsTypeFilter, patientTypeFilter, searchQuery, selectedCondition]);

  // Generate patient-specific product recommendations when selectedCondition changes
  useEffect(() => {
    if (!selectedCondition) return;
    
    // Create a map of phase -> patientType -> products
    let patientProducts = {};
    
    // Check if condition has patientSpecificConfig from admin panel
    if (selectedCondition.patientSpecificConfig) {
      // Use the configuration directly
      patientProducts = JSON.parse(JSON.stringify(selectedCondition.patientSpecificConfig));
    } else {
      // Fall back to the old method of inferring patient-specific products
      // Process each phase
      selectedCondition.phases.forEach(phase => {
        patientProducts[phase] = {
          'All': [...(selectedCondition.products[phase] || [])], // Default 'All' includes all products
          '1': [],
          '2': [],
          '3': [],
          '4': []
        };
        
        // Extract patient-specific products from the condition's products
        const phaseProducts = selectedCondition.products[phase] || [];
        
        // Process each product in this phase
        phaseProducts.forEach(product => {
          // Handle Type 3/4 Only products
          if (product.includes('(Type 3/4 Only)')) {
            const baseProduct = product.replace(' (Type 3/4 Only)', '');
            patientProducts[phase]['3'].push(baseProduct);
            patientProducts[phase]['4'].push(baseProduct);
          } 
          // Regular products apply to all patient types
          else {
            patientProducts[phase]['1'].push(product);
            patientProducts[phase]['2'].push(product);
            patientProducts[phase]['3'].push(product);
            patientProducts[phase]['4'].push(product);
          }
        });
      });
    }
    
    setPatientSpecificProducts(patientProducts);
  }, [selectedCondition]);

  // Filter products based on selected phase and patient type
  useEffect(() => {
    if (selectedCondition && activeTab) {
      // Ensure patientSpecificProducts[activeTab] exists
      const phaseProducts = patientSpecificProducts[activeTab] || {
        'All': [],
        '1': [],
        '2': [],
        '3': [],
        '4': []
      };
      
      if (activePatientType !== 'All') {
        setFilteredProducts(phaseProducts[activePatientType] || []);
      } else {
        setFilteredProducts(phaseProducts['All'] || []);
      }
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCondition, activeTab, activePatientType, patientSpecificProducts]);


  // Get patient types from PATIENT_TYPES constant
  const patientTypes = ['All', '1', '2', '3', '4'];

  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setActiveTab(condition.phases[0]);
    setActivePatientType('All'); // Reset patient type filter when changing condition
  };

  // Handle patient type selection for product filtering
  const handlePatientTypeSelect = (type) => {
    setActivePatientType(type);
  };

  // Handle product selection for modal
  const handleProductSelect = (product) => {
    setSelectedProduct({
      name: product,
      details: selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')]
    });
    setModalOpen(true);
  };

  // Handle opening research modal for a specific product
  const handleOpenResearch = (product) => {
    setSelectedResearchProduct(product);
    setResearchModalOpen(true);
  };
  
  // Get research articles for a specific product in the current condition
  const getProductResearch = (productName) => {
    if (!selectedCondition || !productName) return [];
    
    const cleanProductName = productName.replace(' (Type 3/4 Only)', '');
    
    // Check if condition has condition-specific research for this product
    if (
      selectedCondition.conditionSpecificResearch && 
      selectedCondition.conditionSpecificResearch[cleanProductName]
    ) {
      return selectedCondition.conditionSpecificResearch[cleanProductName];
    }
    
    // If not, check if product has general research
    if (
      selectedCondition.productDetails && 
      selectedCondition.productDetails[cleanProductName] && 
      selectedCondition.productDetails[cleanProductName].researchArticles
    ) {
      return selectedCondition.productDetails[cleanProductName].researchArticles;
    }
    
    // As a fallback, generate mock research data
    return [
      { 
        title: `Clinical application of ${cleanProductName} in ${selectedCondition.name}`, 
        author: "Smith et al., Journal of Dental Research, 2023",
        abstract: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in odio ac nunc efficitur vestibulum."
      },
      { 
        title: `Efficacy of ${cleanProductName} in dental practice`, 
        author: "Johnson et al., Periodontology Today, 2022",
        abstract: "Maecenas vel ante vel leo dictum eleifend. Suspendisse potenti."
      },
      { 
        title: `Comparative study of ${cleanProductName} vs standard treatments`, 
        author: "Williams et al., Oral Surgery Journal, 2023",
        abstract: "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae."
      }
    ];
  };

  // Determine if a phase has products for the selected condition
  const hasProductsForPhase = (phase) => {
    return selectedCondition && 
           selectedCondition.products && 
           selectedCondition.products[phase] && 
           selectedCondition.products[phase].length > 0;
  };

  // Toggle diagnosis wizard
  const toggleWizard = () => {
    setWizardOpen(!wizardOpen);
  };
  
  // Toggle admin panel
  const toggleAdmin = () => {
    setAdminOpen(!adminOpen);
  };
  // Handle conditions update from admin panel
  const handleConditionsUpdate = (updatedConditions, updatedCategories, updatedDdsTypes) => {
    // Update conditions
    setConditions(updatedConditions);
    
    // Update categories if provided
    if (updatedCategories && Array.isArray(updatedCategories)) {
      // Make sure 'All' is always the first option
      let sortedCategories;
      if (updatedCategories.includes('All')) {
        const filteredCategories = updatedCategories.filter(c => c !== 'All');
        sortedCategories = ['All', ...filteredCategories];
      } else {
        sortedCategories = ['All', ...updatedCategories];
      }
      
      // Update the categories
      setCategoryOptions(sortedCategories);
      
      // Keep current filter if valid, otherwise reset to 'All'
      if (categoryFilter !== 'All' && !sortedCategories.includes(categoryFilter)) {
        setCategoryFilter('All');
      }
    }
    
    // Update DDS types if provided
    if (updatedDdsTypes && Array.isArray(updatedDdsTypes)) {
      // Make sure 'All' is always the first option
      let sortedDdsTypes;
      if (updatedDdsTypes.includes('All')) {
        const filteredDdsTypes = updatedDdsTypes.filter(d => d !== 'All');
        sortedDdsTypes = ['All', ...filteredDdsTypes];
      } else {
        sortedDdsTypes = ['All', ...updatedDdsTypes];
      }
      
      // Update the DDS types
      setDdsTypeOptions(sortedDdsTypes);
      
      // Keep current filter if valid, otherwise reset to 'All'
      if (ddsTypeFilter !== 'All' && !sortedDdsTypes.includes(ddsTypeFilter)) {
        setDdsTypeFilter('All');
      }
    }
    
    // Update filtered conditions based on current filters
    let filtered = [...updatedConditions];
    
    // Apply existing filters
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(condition => condition.category === categoryFilter);
    }
    
    if (ddsTypeFilter !== 'All') {
      filtered = filtered.filter(condition => condition.dds.includes(ddsTypeFilter));
    }
    
    if (patientTypeFilter !== 'All') {
      filtered = filtered.filter(condition => {
        if (Array.isArray(condition.patientType)) {
          return condition.patientType.includes(`Type ${patientTypeFilter}`);
        } else {
          return condition.patientType.includes(patientTypeFilter);
        }
      });
    }
    
    if (searchQuery) {
      filtered = filtered.filter(condition => 
        condition.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredConditions(filtered);
    
    // If previously selected condition exists in updated data, keep it selected
    if (selectedCondition) {
      const updatedSelectedCondition = updatedConditions.find(c => c.name === selectedCondition.name);
      if (updatedSelectedCondition) {
        setSelectedCondition(updatedSelectedCondition);
        
        // Ensure active tab is valid for updated condition
        if (updatedSelectedCondition.phases && !updatedSelectedCondition.phases.includes(activeTab)) {
          setActiveTab(updatedSelectedCondition.phases[0]);
        }
      } else {
        // If selected condition no longer exists, select the first condition
        if (updatedConditions.length > 0) {
          setSelectedCondition(updatedConditions[0]);
          setActiveTab(updatedConditions[0].phases[0]);
        } else {
          setSelectedCondition(null);
          setActiveTab('');
        }
      }
    }
  };
  return (
    
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Clinical Chart Tool for Dental Sales Reps</h1>
          <div className="flex space-x-3">
            <button
              onClick={toggleWizard}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Stethoscope size={18} className="mr-2" />
              Diagnosis Wizard
            </button>
            <button
              onClick={toggleAdmin}
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <Settings size={18} className="mr-2" />
              Admin
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium mb-4">Filters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Category Filter */}
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
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                    <Select.Viewport className="p-1">
                      {categoryOptions.map((category) => (
                        <Select.Item
                          key={category}
                          value={category}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                        >
                          <Select.ItemText>{category}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            {/* DDS Type Filter */}
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
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                    <Select.Viewport className="p-1">
                      {ddsTypeOptions.map((dds) => (
                        <Select.Item
                          key={dds}
                          value={dds}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                        >
                          <Select.ItemText>{dds}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Patient Type Filter */}
            <div>
              <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Patient Type
              </label>
              <Select.Root value={patientTypeFilter} onValueChange={setPatientTypeFilter}>
                <Select.Trigger id="patient-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <Select.Value />
                  <Select.Icon><ChevronDown size={18} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                    <Select.Viewport className="p-1">
                      {patientTypes.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                        >
                          <Select.ItemText>
                            {type === 'All' ? 'All' : `Type ${type}: ${PATIENT_TYPES[`Type ${type}`]}`}
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
                Search Condition
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
                  placeholder="Search conditions..."
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
          {/* Conditions List */}
          <div className="lg:col-span-1 bg-white shadow rounded-lg overflow-hidden">
            <h2 className="text-lg font-medium p-4 border-b">Conditions</h2>
            {filteredConditions.length === 0 ? (
              <div className="p-4 text-gray-500">No conditions match the selected filters.</div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                {filteredConditions.map((condition) => (
                  <li 
                    key={condition.name}
                    className={clsx(
                      "px-4 py-3 hover:bg-gray-50 cursor-pointer",
                      selectedCondition && selectedCondition.name === condition.name ? "bg-blue-50" : ""
                    )}
                    onClick={() => handleConditionSelect(condition)}
                  >
                    <div className="font-medium">{condition.name}</div>
                    <div className="text-sm text-gray-500">{condition.category}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {condition.dds.join(', ')} | {condition.patientType}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Selected Condition Details */}
          <div className="lg:col-span-3">
            {selectedCondition ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">{selectedCondition.name}</h2>
                  <div className="text-sm text-gray-500 mt-1">
                    <span className="mr-2">{selectedCondition.category}</span>
                    <span className="mr-2">|</span>
                    <span>{selectedCondition.dds.join(', ')}</span>
                    <span className="mr-2">|</span>
                    <span>{selectedCondition.patientType}</span>
                  </div>
                  
                  {/* Recommended Products Section - Moved to top */}
                  <div className="mt-6 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Recommended Products</h3>
                      
                      {/* Published Research Button */}
                      <button
                        onClick={() => setResearchModalOpen(true)}
                        className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center text-sm"
                      >
                        <BookOpen size={16} className="mr-2" />
                        View Published Research
                      </button>
                    </div>
                    
                    {/* Patient Type Filter for Products */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-shrink-0">
                          <span className="text-sm font-medium text-blue-700">Show Recommendations For:</span>
                        </div>
                        
                        {/* Patient Type Selection */}
                        <div className="flex-grow">
                          <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelect}>
                            <Select.Trigger className="flex justify-between items-center px-3 py-2 text-sm bg-white border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <div className="flex items-center">
                                <Filter size={16} className="mr-2 text-blue-500" />
                                <Select.Value placeholder="Select Patient Type" />
                              </div>
                              <Select.Icon><ChevronDown size={18} /></Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                                <Select.Viewport className="p-1">
                                  {patientTypes.map((type) => (
                                    <Select.Item
                                      key={type}
                                      value={type}
                                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
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
                        <div className="mt-2 text-sm text-blue-700 flex items-center">
                          <Info size={14} className="mr-1" />
                          Showing specific recommendations for: 
                          <span className="font-medium ml-1">
                            {`Type ${activePatientType}: ${PATIENT_TYPES[`Type ${activePatientType}`]}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Treatment Phases Tabs */}
                    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                      <Tabs.List className="flex border-b divide-x divide-gray-200 bg-gray-50 rounded-t-lg">
                        {selectedCondition.phases.map((phase) => (
                          <Tabs.Trigger
                            key={phase}
                            value={phase}
                            className={clsx(
                              "flex-1 px-4 py-3 text-sm font-medium text-center focus:outline-none",
                              activeTab === phase 
                                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                                : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                          >
                            {phase} Phase
                            {hasProductsForPhase(phase) && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                {selectedCondition.products[phase].length}
                              </span>
                            )}
                          </Tabs.Trigger>
                        ))}
                      </Tabs.List>
                      {selectedCondition.phases.map((phase) => (
                        <Tabs.Content key={phase} value={phase} className="p-4 bg-white border border-t-0 rounded-b-lg">
                          {filteredProducts.length > 0 ? (
                            <div className="space-y-4">
                              {filteredProducts.map((product) => (
                                <div 
                                  key={product}
                                  className="bg-white border border-blue-200 rounded-lg p-5 hover:bg-blue-50 shadow-sm"
                                >
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-lg font-semibold text-blue-800">{product}</h4>
                                  </div>
                                  {selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')] && (
                                    <div className="mt-2 space-y-2 text-gray-700">
                                      <div>
                                        <span className="font-medium">Usage: </span>
                                        {selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')].usage}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Tag to show this is specific for Type 3/4 patients */}
                                  {product.includes('(Type 3/4 Only)') && (
                                    <div className="mt-2">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                        Recommended for Type 3/4 patients only
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : activePatientType !== 'All' ? (
                            <div className="text-gray-500 bg-gray-50 p-4 rounded-md border">
                              <div>
                                <strong>No products recommended</strong> for {phase} phase with patient Type {activePatientType}.
                                <p className="mt-2">Based on clinical guidelines, no product is necessary for this specific case.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500">No products recommended for this phase.</div>
                          )}
                        </Tabs.Content>
                      ))}
                    </Tabs.Root>
                  </div>
                  
                  {/* Additional Information Section - AFTER products */}
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Additional Information</h3>
                    
                    {/* Key Pitch Points */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.pitchPoints ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        pitchPoints: !prev.pitchPoints 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-blue-800">Key Pitch Points</div>
                        <div className="text-blue-600">
                          {expandedSections.pitchPoints ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.pitchPoints && (
                        <div className="text-blue-700 mt-2">{selectedCondition.pitchPoints || 'No pitch points available.'}</div>
                      )}
                    </div>
                    {/* Scientific Rationale - New Section */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.scientificRationale ? 'bg-green-100' : 'bg-green-50 hover:bg-green-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        scientificRationale: !prev.scientificRationale 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-green-800">Scientific Rationale</div>
                        <div className="text-green-600">
                          {expandedSections.scientificRationale ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.scientificRationale && (
                        <div className="text-green-700 mt-2">
                          {selectedCondition.scientificRationale || 
                            'Scientific foundation for the recommended treatment approach.'}
                        </div>
                      )}
                    </div>
                    
                    {/* Clinical Evidence - Renamed from Clinical Rationale */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.clinicalEvidence ? 'bg-indigo-100' : 'bg-indigo-50 hover:bg-indigo-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        clinicalEvidence: !prev.clinicalEvidence 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-indigo-800">Clinical Evidence</div>
                        <div className="text-indigo-600">
                          {expandedSections.clinicalEvidence ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.clinicalEvidence && (
                        <div className="text-indigo-700 mt-2">
                          {selectedCondition.clinicalEvidence || 
                            'Clinical evidence supporting the treatment recommendations for this condition.'}
                        </div>
                      )}
                    </div>
                    
                    {/* Competitive Advantage */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.competitiveAdvantage ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        competitiveAdvantage: !prev.competitiveAdvantage 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-purple-800">Competitive Advantage</div>
                        <div className="text-purple-600">
                          {expandedSections.competitiveAdvantage ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.competitiveAdvantage && (
                        <div className="text-purple-700 mt-2">
                          {selectedCondition.competitiveAdvantage || 'No competitive advantage information available.'}
                        </div>
                      )}
                    </div>
                    
                    {/* Handling Objections */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.handlingObjections ? 'bg-amber-100' : 'bg-amber-50 hover:bg-amber-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        handlingObjections: !prev.handlingObjections 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-amber-800">Handling Objections</div>
                        <div className="text-amber-600">
                          {expandedSections.handlingObjections ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.handlingObjections && (
                        <div className="text-amber-700 mt-2">
                          {selectedCondition.handlingObjections || 'No objection handling information available.'}
                        </div>
                      )}
                    </div>
                    {/* Product Usage Instructions */}
                    <div 
                      className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                        expandedSections.productUsage ? 'bg-teal-100' : 'bg-teal-50 hover:bg-teal-100'
                      }`}
                      onClick={() => setExpandedSections(prev => ({ 
                        ...prev, 
                        productUsage: !prev.productUsage 
                      }))}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-teal-800">Product Usage Instructions</div>
                        <div className="text-teal-600">
                          {expandedSections.productUsage ? 
                            <ChevronDown size={18} /> : 
                            <ChevronRight size={18} />
                          }
                        </div>
                      </div>
                      {expandedSections.productUsage && (
                        <div className="mt-2 space-y-3">
                          {selectedCondition.productDetails && Object.keys(selectedCondition.productDetails).length > 0 ? (
                            Object.entries(selectedCondition.productDetails).map(([productName, details]) => (
                              <div key={productName} className="bg-white border rounded-md p-3">
                                <h4 className="font-medium text-teal-800">{productName}</h4>
                                <p className="text-teal-700 mt-1">
                                  <span className="font-medium">Usage: </span>
                                  {details.usage || 'Usage instructions not available.'}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-teal-700">No product usage information available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                Select a condition to view details
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Product Details Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-lg w-[90vw] bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
              {selectedProduct?.name}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              Product information and recommendation details
            </Dialog.Description>
            
            {selectedProduct && selectedProduct.details && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">Usage Instructions</h4>
                  <p className="text-blue-700">{selectedProduct.details.usage}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">Scientific Rationale</h4>
                  <p className="text-green-700">{selectedProduct.details.rationale || 'No scientific rationale provided.'}</p>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-medium text-indigo-800 mb-1">Clinical Evidence</h4>
                  <p className="text-indigo-700">{selectedProduct.details.clinicalEvidence || selectedProduct.details.rationale || 'No clinical evidence provided.'}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-1">Competitive Advantage</h4>
                  <p className="text-purple-700">{selectedProduct.details.competitive}</p>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-1">Handling Objections</h4>
                  <p className="text-amber-700">{selectedProduct.details.objection}</p>
                </div>
                
                <div className="flex gap-4">
                  {/* Research Articles Button */}
                  <button
                    onClick={() => {
                      setSelectedResearchProduct(selectedProduct.name);
                      setResearchModalOpen(true);
                      setModalOpen(false);
                    }}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
                  >
                    <BookOpen size={20} className="mr-2" />
                    View Published Research
                  </button>
                  
                  {selectedProduct.details.factSheet && selectedProduct.details.factSheet !== '#' && (
                    <a 
                      href={selectedProduct.details.factSheet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                      <FileText size={20} className="mr-2" />
                      View Fact Sheet
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Published Research Modal */}
      <Dialog.Root open={researchModalOpen} onOpenChange={setResearchModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-3xl w-[90vw] bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold text-gray-900 flex items-center">
              <BookOpen size={24} className="mr-2 text-indigo-600" />
              {selectedResearchProduct ? 
                `Published Research for ${selectedResearchProduct}` : 
                `Published Research for ${selectedCondition?.name}`}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mt-1 mb-4">
              Scientific articles and studies supporting clinical recommendations
            </Dialog.Description>
            
            {selectedCondition && (
              <div className="space-y-6">
                {selectedResearchProduct ? (
                  // Show research for a specific product
                  <>
                    <h3 className="text-lg font-medium text-indigo-800 border-b pb-2">
                      {selectedResearchProduct.replace(' (Type 3/4 Only)', '')}
                    </h3>
                    
                    {getProductResearch(selectedResearchProduct).length > 0 ? (
                      getProductResearch(selectedResearchProduct).map((article, index) => (
                        <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <h3 className="font-medium text-lg text-indigo-600">
                            {article.url ? (
                              <a 
                                href={article.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline flex items-start"
                              >
                                <span className="mr-2">{index + 1}.</span>
                                <span>{article.title}</span>
                              </a>
                            ) : (
                              <div className="flex items-start">
                                <span className="mr-2">{index + 1}.</span>
                                <span>{article.title}</span>
                              </div>
                            )}
                          </h3>
                          
                          {article.author && (
                            <p className="text-gray-600 mt-1 pl-6">{article.author}</p>
                          )}
                          
                          {article.abstract && (
                            <div className="mt-3 pl-6">
                              <p className="text-gray-700">{article.abstract}</p>
                            </div>
                          )}
                          
                          {article.url && (
                            <div className="mt-3 pl-6">
                              <a 
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 text-sm inline-flex items-center"
                              >
                                <ExternalLink size={14} className="mr-1" />
                                <span>View Article</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-gray-500">
                        <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No research articles available for this product.</p>
                      </div>
                    )}
                  </>
                ) : (
                  // Show research for all products in the condition
                  <>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => {
                        const productResearch = getProductResearch(product);
                        if (!productResearch || productResearch.length === 0) return null;
                        
                        return (
                          <div key={product} className="mb-8">
                            <h3 className="text-lg font-medium text-indigo-800 border-b pb-2">
                              {product.replace(' (Type 3/4 Only)', '')}
                            </h3>
                            
                            {productResearch.map((article, index) => (
                              <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0 mt-4">
                                <h4 className="font-medium text-lg text-indigo-600">
                                  {article.url ? (
                                    <a 
                                      href={article.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:underline flex items-start"
                                    >
                                      <span className="mr-2">{index + 1}.</span>
                                      <span>{article.title}</span>
                                    </a>
                                  ) : (
                                    <div className="flex items-start">
                                      <span className="mr-2">{index + 1}.</span>
                                      <span>{article.title}</span>
                                    </div>
                                  )}
                                </h4>
                                
                                {article.author && (
                                  <p className="text-gray-600 mt-1 pl-6">{article.author}</p>
                                )}
                                
                                {article.abstract && (
                                  <div className="mt-3 pl-6">
                                    <p className="text-gray-700">{article.abstract}</p>
                                  </div>
                                )}
                                
                                {article.url && (
                                  <div className="mt-3 pl-6">
                                    <a 
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 text-sm inline-flex items-center"
                                    >
                                      <ExternalLink size={14} className="mr-1" />
                                      <span>View Article</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-10 text-center text-gray-500">
                        <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No research articles available for the current selection.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Diagnosis Wizard */}
      {wizardOpen && (
        <DiagnosisWizard 
          conditions={conditions} 
          onClose={toggleWizard} 
        />
      )}
      
      {/* Admin Panel */}
      {adminOpen && (
        <AdminPanel 
          conditions={conditions}
          onConditionsUpdate={handleConditionsUpdate}
          onClose={toggleAdmin}
        />
      )}
    </div>
  );
}

export default ClinicalChartMockup;