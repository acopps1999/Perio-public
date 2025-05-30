import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Search, X, ChevronDown, ChevronRight, Info, Stethoscope, Settings, Filter, BookOpen, ExternalLink, FileText, LogOut } from 'lucide-react';
import clsx from 'clsx';
import DiagnosisWizard from './DiagnosisWizard';
import AdminPanel from './AdminPanel';
import AdminLoginModal from './AdminLoginModal';
import FiltersSection from './FiltersSection';
import ConditionsList from './ConditionsList';
import ConditionDetails from './ConditionDetails';
import ResearchModal from './ResearchModal';
import { useAuth } from '../contexts/AuthContext';
import conditionsDataImport from '../conditions_complete.json';

// PatientTypes definition based on project documentation
const PATIENT_TYPES = {
  'Type 1': 'Healthy',
  'Type 2': 'Mild inflammation, moderate risk',
  'Type 3': 'Smoker, diabetic, immunocompromised',
  'Type 4': 'Periodontal disease, chronic illness, poor healing'
};

function ClinicalChartMockup() {
  // Authentication
  const { isAuthenticated, logout } = useAuth();
  
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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
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
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  
  //useEffect(() => {
    // Clear localStorage on first load in production
    // (This is a one-time reset that can help if there's corrupted data)
    //if (process.env.NODE_ENV === 'production' && !localStorage.getItem('render_initialized')) {
      //localStorage.removeItem('conditions_data');
      //localStorage.setItem('render_initialized', 'true');
      //window.location.reload();
    //}
  //}, []);

  // Load conditions on component mount
  useEffect(() => {
    // Clear localStorage on first load in production
    // (This is a one-time reset that can help if there's corrupted data)
    if (process.env.NODE_ENV === 'production' && !localStorage.getItem('render_initialized')) {
      localStorage.removeItem('conditions_data');
      localStorage.setItem('render_initialized', 'true');
      window.location.reload();
    }

    // Always use imported data instead of checking localStorage
    setConditions(conditionsDataImport);
    setFilteredConditions(conditionsDataImport);
    
    // Set default selected condition
    if (conditionsDataImport.length > 0) {
      setSelectedCondition(conditionsDataImport[0]);
      setActiveTab(conditionsDataImport[0].phases[0]);
    }
    
    // Load categories if available from the imported data
    const uniqueCategories = [...new Set(conditionsDataImport.map(c => c.category))];
    if (!uniqueCategories.includes('All')) {
      uniqueCategories.unshift('All');
    }
    setCategoryOptions(uniqueCategories);
    
    // Load DDS types from the imported data
    const allDdsTypes = ['All'];
    conditionsDataImport.forEach(condition => {
      condition.dds.forEach(dds => {
        if (!allDdsTypes.includes(dds)) {
          allDdsTypes.push(dds);
        }
      });
    });
    setDdsTypeOptions(allDdsTypes);
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
  
  console.log("Setting up patient-specific products for:", selectedCondition.name);
  
  // Create a map of phase -> patientType -> products
  let patientProducts = {};
  
  // Check if condition has patientSpecificConfig from admin panel
  if (selectedCondition.patientSpecificConfig) {
    console.log("Using admin-configured products");
    // Use the configuration directly
    patientProducts = JSON.parse(JSON.stringify(selectedCondition.patientSpecificConfig));
  } else {
    console.log("Inferring patient-specific products");
    // Process each phase
    selectedCondition.phases.forEach(phase => {
      patientProducts[phase] = {
        'All': [],
        '1': [],
        '2': [],
        '3': [],
        '4': []
      };
      
      // First pass: add all products to 'All' category
      const phaseProducts = selectedCondition.products[phase] || [];
      patientProducts[phase]['All'] = [...phaseProducts];
      
      // Second pass: distribute products to specific patient types
      phaseProducts.forEach(product => {
        if (product.includes('(Type 3/4 Only)')) {
          const baseProduct = product.replace(' (Type 3/4 Only)', '');
          patientProducts[phase]['3'].push(baseProduct);
          patientProducts[phase]['4'].push(baseProduct);
        } else {
          // Regular products apply to all patient types
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
  if (activeTab) {
    const phaseProducts = patientProducts[activeTab] || { 'All': [] };
    if (activePatientType !== 'All') {
      setFilteredProducts(phaseProducts[activePatientType] || []);
    } else {
      setFilteredProducts(phaseProducts['All'] || []);
    }
  }
}, [selectedCondition]);

  // Filter products for display based on selected phase and patient type
  useEffect(() => {
    console.log("[FilterEffect] Running - Deps:", { 
      condition: selectedCondition?.name, 
      tab: activeTab, 
      patientType: activePatientType, 
      hasStructure: !!patientSpecificProducts 
    });

    if (!selectedCondition || !activeTab) {
        console.log("[FilterEffect] No condition or active tab, clearing products.");
        setFilteredProducts([]);
        return;
    }

    // Ensure the structure for the current condition/phase exists
    if (!patientSpecificProducts || !patientSpecificProducts[activeTab]) {
      console.log(`[FilterEffect] Product structure not ready for phase: ${activeTab}. Waiting...`);
      // Avoid setting empty products if the structure just isn't ready yet
      // setFilteredProducts([]); 
      return;
    }

    const phaseProductsStructure = patientSpecificProducts[activeTab];
    console.log(`[FilterEffect] Structure for phase ${activeTab}:`, JSON.stringify(phaseProductsStructure));
    let productsToShow = [];

      if (activePatientType !== 'All') {
        productsToShow = phaseProductsStructure[activePatientType] || [];
        console.log(`[FilterEffect] Using products for specific type ${activePatientType}:`, productsToShow);
      } else {
        // 'All' patient type should show products from the original 'All' list in the structure
        productsToShow = phaseProductsStructure['All'] || [];
        console.log(`[FilterEffect] Using products for 'All' type:`, productsToShow);
    }

    // Check if the products actually changed before setting state
    // Note: React's state setter already optimizes this, so explicit check might be redundant
    // if (JSON.stringify(filteredProducts) !== JSON.stringify(productsToShow)) { 
      console.log(`[FilterEffect] Updating filteredProducts state for Phase: ${activeTab}, Patient Type: ${activePatientType}`, productsToShow);
      setFilteredProducts([...productsToShow]); // Ensure a new array is set
    // } else {
      // console.log(`[FilterEffect] No change detected in products for Phase: ${activeTab}, Patient Type: ${activePatientType}. Skipping update.`);
    // }

}, [selectedCondition, activeTab, activePatientType, patientSpecificProducts]); // Removed filteredProducts from deps

  // Get patient types from PATIENT_TYPES constant
  const patientTypes = ['All', '1', '2', '3', '4'];

  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setActiveTab(condition.phases[0]);
    setActivePatientType('All'); // Reset patient type filter when changing condition
    setShowAdditionalInfo(false); // Hide additional info when selecting a new condition
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Re-apply the product filtering when tab changes
    if (selectedCondition && patientSpecificProducts[tab]) {
      if (activePatientType !== 'All') {
        setFilteredProducts([...(patientSpecificProducts[tab][activePatientType] || [])]);
      } else {
        setFilteredProducts([...(patientSpecificProducts[tab]['All'] || [])]);
      }
    }
  };

  // Handle patient type selection for product filtering
  const handlePatientTypeSelect = (type) => {
    console.log("Patient type selected:", type);
    setActivePatientType(type);
    
    // Force immediate update of filtered products
    if (selectedCondition && activeTab) {
      const phaseProducts = patientSpecificProducts[activeTab] || {
        'All': [],
        '1': [],
        '2': [],
        '3': [],
        '4': []
      };
      
      if (type !== 'All') {
        console.log("Immediately updating products for type:", type, phaseProducts[type]);
        setFilteredProducts([...(phaseProducts[type] || [])]);
      } else {
        console.log("Immediately updating products for all types:", phaseProducts['All']);
        setFilteredProducts([...(phaseProducts['All'] || [])]);
      }
    }
  };

  // Handle product selection for modal
  const handleProductSelect = (product) => {
    // Don't open the modal, just show additional info
    setShowAdditionalInfo(true);
    
    // Optional: store the selected product for highlighting or scrolling
    setSelectedProduct({
      name: product,
      details: selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')]
    });
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
    if (isAuthenticated) {
      setAdminOpen(!adminOpen);
    } else {
      setLoginModalOpen(true);
    }
  };

  // Handle admin logout
  const handleLogout = () => {
    logout();
    setAdminOpen(false);
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
    setAdminOpen(true);
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
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FiltersSection
          categoryOptions={categoryOptions}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          ddsTypeOptions={ddsTypeOptions}
          ddsTypeFilter={ddsTypeFilter}
          setDdsTypeFilter={setDdsTypeFilter}
          patientTypes={patientTypes}
          patientTypeFilter={patientTypeFilter}
          setPatientTypeFilter={setPatientTypeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <ConditionsList
            filteredConditions={filteredConditions}
            selectedCondition={selectedCondition}
            handleConditionSelect={handleConditionSelect}
          />
          <ConditionDetails
            selectedCondition={selectedCondition}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            filteredProducts={filteredProducts}
            patientTypes={patientTypes}
            activePatientType={activePatientType}
            handlePatientTypeSelect={handlePatientTypeSelect}
            handleProductSelect={handleProductSelect}
            handleOpenResearch={handleOpenResearch}
            hasProductsForPhase={hasProductsForPhase}
            showAdditionalInfo={showAdditionalInfo}
          />
        </div>
      </main>
      <ResearchModal 
        isOpen={researchModalOpen}
        setIsOpen={setResearchModalOpen}
        selectedCondition={selectedCondition}
        selectedResearchProduct={selectedResearchProduct}
        filteredProducts={filteredProducts}
        getProductResearch={getProductResearch}
      />
      {wizardOpen && (
        <DiagnosisWizard 
          conditions={conditions} 
          onClose={toggleWizard} 
        />
      )}
      
      <AdminLoginModal 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
      
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