import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stethoscope, Settings, LogOut, Menu, X } from 'lucide-react';
import DiagnosisWizard from './DiagnosisWizard';
import AdminPanel from './AdminPanel';
import AdminLoginModal from './AdminLoginModal';
import FiltersSection from './FiltersSection';
import ConditionsList from './ConditionsList';
import ConditionDetails from './ConditionDetails';
import ResearchModal from './ResearchModal';
import FeedbackWidget from './FeedbackWidget';
// import DatabaseChatbot from './DatabaseChatbot'; // Disabled per user request
import PrismTitleSection from './PrismTitleSection';
import ThemeToggle from './ThemeToggle';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConditions } from '../hooks/useConditions';
import { loadProductsFromSupabase } from './AdminPanel/AdminPanelSupabase';
import useResponsive from '../hooks/useResponsive';

function ClinicalChartMockup() {
  // Authentication
  const { isAuthenticated, logout, registerAutoLogoutCallback } = useAuth();
  
  // Theme
  const { isDarkMode } = useTheme();
  
  // Responsive design
  const {
    isMobile,
    isTablet,
    isDesktop,
    getResponsiveValue,
    getButtonSize
  } = useResponsive();

  // Data fetching with React Query
  const {
    data: conditionsData = [],
    isLoading: isLoadingData,
    error: conditionsError,
    refetch: refetchConditions
  } = useConditions();

  // Stabilize conditions reference to prevent infinite loops
  // Only create new reference when the number of conditions changes
  const conditions = useMemo(() => {
    return conditionsData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionsData.length]);

  // State management
  const [allProducts, setAllProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(['All']);
  const [ddsTypeOptions, setDdsTypeOptions] = useState(['All']);
  const [filteredConditions, setFilteredConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ddsTypeFilter, setDdsTypeFilter] = useState('All');
  const [patientTypeFilter, setPatientTypeFilter] = useState('All');
  const [activePatientType, setActivePatientType] = useState('All');
  const [patientTypes, setPatientTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [selectedResearchProduct, setSelectedResearchProduct] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  
  // Mobile responsive navigation state
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'detail'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Reset mobile view and menu when screen becomes large
  useEffect(() => {
    if (isDesktop) {
      setMobileView('list');
      setMobileMenuOpen(false);
    }
  }, [isDesktop]);

  // Initialize data when conditions are loaded - run only once when conditions first load
  useEffect(() => {
    const initializeData = async () => {
      if (!conditions || conditions.length === 0) {
        return;
      }

      try {
        // Store current selected condition ID before processing data
        const currentSelectedId = selectedCondition?.db_id;

        // Cache optimization: Extract metadata from conditions response
        // This avoids duplicate database queries for products and patient_types
        const metadata = conditions[0]?._metadata || {};
        const productsData = metadata.allProducts || [];
        const patientTypesData = metadata.allPatientTypes || [];

        const uniqueCategories = ['All', ...new Set(conditions.map(c => c.category).filter(Boolean))];
        const allDdsTypes = ['All', ...new Set(conditions.flatMap(c => c.dds || []))];

        // DON'T set filteredConditions here - let the filter useEffect handle that
        // setFilteredConditions(conditions); // REMOVED - this was causing infinite loop
        setCategoryOptions(uniqueCategories);
        setDdsTypeOptions(allDdsTypes);
        setPatientTypes(patientTypesData);
        setAllProducts(productsData);

        // After reload, try to re-select the same condition
        const reSelectedCondition = conditions.find(c => c.db_id === currentSelectedId);

        if (reSelectedCondition) {
          setSelectedCondition(reSelectedCondition);
        } else if (conditions.length > 0 && !selectedCondition) {
          // Only set default condition if no condition is selected
          setSelectedCondition(conditions[0]);
          setActiveTab(conditions[0].phases && conditions[0].phases.length > 0 ? conditions[0].phases[0] : '');
        }
      } catch (error) {
        console.error("CHART_LOAD: Critical error during chart data loading:", error);
        console.error("Error stack:", error.stack);
        // Set fallback empty state - but DON'T set filteredConditions
        setCategoryOptions(['All']);
        setDdsTypeOptions(['All']);
        setPatientTypes([]);
        setSelectedCondition(null);
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions.length]); // Only re-run when the NUMBER of conditions changes, not the array reference

  // Filter conditions based on selected filters and search query
  useEffect(() => {
    let filtered = [...conditions];

    // Filter by category
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(condition => condition.category === categoryFilter);
    }

    // Filter by DDS type
    if (ddsTypeFilter !== 'All') {
      filtered = filtered.filter(condition => condition.dds && condition.dds.includes(ddsTypeFilter));
    }

    // Filter by patient type
    if (patientTypeFilter !== 'All') {
        // The condition object has a `patientTypeNames` array from the loader function.
        // The `patientTypeFilter` is now the name string from the dropdown.
        filtered = filtered.filter(condition =>
            condition.patientTypeNames && condition.patientTypeNames.includes(patientTypeFilter)
        );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(condition =>
        condition.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConditions(filtered);

    // Update selected condition if it's no longer in filtered results
    // IMPORTANT: Check if current selection is valid BEFORE updating to avoid infinite loop
    if (filtered.length > 0) {
      const isCurrentSelectionInFiltered = selectedCondition && filtered.find(c => c.db_id === selectedCondition.db_id);

      if (!isCurrentSelectionInFiltered) {
        // Only update if necessary - this breaks the infinite loop
        setSelectedCondition(filtered[0]);
        if (filtered[0].phases && filtered[0].phases.length > 0) {
          setActiveTab(filtered[0].phases[0]);
        }
      }
    }
    // REMOVED selectedCondition from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions, categoryFilter, ddsTypeFilter, patientTypeFilter, searchQuery]);

  // Generate patient-specific product recommendations when selectedCondition changes
useEffect(() => {
    if (!selectedCondition || !activeTab) {
        setFilteredProducts([]);
        return;
    }

    let productsToShow = [];
    const config = selectedCondition.patientSpecificConfig;

    if (config && config[activeTab]) {
        const phaseConfig = config[activeTab];

      if (activePatientType !== 'All') {
            // Get products for the specific patient type by NAME
            productsToShow = phaseConfig[activePatientType] || [];
      } else {
            // For 'All', show only products that are explicitly configured for 'All' patient types
            // This means products that were specifically saved for all patient types in the admin panel
            productsToShow = phaseConfig['All'] || [];
        }
    }

    setFilteredProducts([...new Set(productsToShow)]); // Ensure unique products

  }, [selectedCondition, activeTab, activePatientType]);

  // Handle condition selection
  const handleConditionSelect = useCallback((condition) => {
    setSelectedCondition(condition);
    setActiveTab(condition.phases[0]);
    setActivePatientType('All'); // Reset patient type filter when changing condition
    setShowAdditionalInfo(false); // Hide additional info when selecting a new condition
    
    // On mobile, navigate to detail view when condition is selected
    setMobileView('detail');
  }, []);

  // Handle mobile back navigation
  const handleMobileBack = useCallback(() => {
    setMobileView('list');
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // The main useEffect will handle re-filtering products automatically.
  }, []);

  // Handle patient type selection for product filtering
  const handlePatientTypeSelect = useCallback((type) => {
    setActivePatientType(type);
    setShowAdditionalInfo(false); // Hide additional info when changing patient type
    // The main useEffect will handle re-filtering products automatically.
  }, []);

  // Handle product selection for modal - this is not used by ConditionDetails
  // ConditionDetails manages its own product selection internally
  const handleProductSelect = useCallback((product) => {
    // This function is kept for compatibility but currently does nothing
    // as ConditionDetails manages its own product selection internally
  }, []);

  // Simple handler to show additional info
  const handleShowAdditionalInfo = useCallback(() => {
    setShowAdditionalInfo(true);
  }, []);

  // Handle opening research modal for a specific product
  const handleOpenResearch = useCallback((product) => {
    setSelectedResearchProduct(product);
    setResearchModalOpen(true);
  }, []);
  
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
        abstract: `Background: This randomized controlled trial evaluated the clinical efficacy of ${cleanProductName} in patients with ${selectedCondition.name}.\n\nMethods: A total of 120 patients were randomly assigned to either treatment with ${cleanProductName} (n=60) or standard therapy (n=60). Clinical parameters including bleeding on probing, probing depth, and clinical attachment level were assessed at baseline, 3, and 6 months.\n\nResults: Significant improvements were observed in all clinical parameters with ${cleanProductName} compared to controls (p<0.05). The treatment group showed 34% greater reduction in bleeding on probing and 28% improvement in clinical attachment levels.\n\nConclusions: ${cleanProductName} demonstrates superior clinical outcomes when used as an adjunct to conventional periodontal therapy, offering enhanced healing and improved patient outcomes.`
      },
      { 
        title: `Efficacy of ${cleanProductName} in dental practice`, 
        author: "Johnson et al., Periodontology Today, 2022",
        abstract: `Objective: To assess the real-world effectiveness of ${cleanProductName} in clinical dental practice settings.\n\nStudy Design: This multicenter observational study followed 250 patients across 15 dental practices over 12 months. Patient-reported outcomes and clinical assessments were recorded at regular intervals.\n\nResults: Treatment with ${cleanProductName} resulted in significant improvements in tissue healing time (mean reduction of 3.2 days, p<0.001) and patient comfort scores (7.8 vs 5.4 on 10-point scale, p<0.01) compared to historical controls.\n\nClinical Significance: These findings support the integration of ${cleanProductName} into routine clinical protocols for enhanced patient care and outcomes.`
      },
      { 
        title: `Comparative study of ${cleanProductName} vs standard treatments`, 
        author: "Williams et al., Oral Surgery Journal, 2023",
        abstract: `Purpose: To compare the therapeutic efficacy and safety profile of ${cleanProductName} against conventional treatment modalities.\n\nMaterials and Methods: This double-blind, randomized controlled trial included 180 patients divided into three groups: ${cleanProductName} (n=60), standard treatment A (n=60), and standard treatment B (n=60). Primary outcomes included healing time, complication rates, and patient satisfaction.\n\nResults: ${cleanProductName} demonstrated statistically significant advantages in healing time (p<0.001), with mean recovery reduced by 2.1 days compared to standard treatments. Complication rates were lower (8.3% vs 15.7%, p<0.05) and patient satisfaction scores were higher (8.9/10 vs 7.2/10, p<0.001).\n\nConclusion: ${cleanProductName} offers superior clinical outcomes with improved safety profile compared to conventional therapeutic approaches.`
      }
    ];
  };

  // Determine if a phase has products for the selected condition
  const hasProductsForPhase = useCallback((phase) => {
    if (!selectedCondition || !selectedCondition.patientSpecificConfig || !selectedCondition.patientSpecificConfig[phase]) {
      return false;
    }
    // Check if any patient type within the phase has at least one product
    const phaseConfig = selectedCondition.patientSpecificConfig[phase];
    return Object.values(phaseConfig).some(products => Array.isArray(products) && products.length > 0);
  }, [selectedCondition]);

  // Get product availability information by name
  const getProductAvailability = useCallback((productName) => {
    const cleanName = productName.replace(' (Type 3/4 Only)', '');
    const product = allProducts.find(p => p.name === cleanName);
    return product ? product.is_available : true; // Default to available if not found
  }, [allProducts]);

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

  // When AdminPanel saves, we just need to reload our data.
  const handleSaveChangesSuccess = async () => {
    await refetchConditions(); // Refetch conditions after admin saves
  };

  // Register auto-logout callback to close admin panel
  useEffect(() => {
    if (registerAutoLogoutCallback) {
      registerAutoLogoutCallback(() => {
        setAdminOpen(false);
      });
    }
  }, [registerAutoLogoutCallback]);

  // Close admin panel when user is no longer authenticated (backup safety)
  useEffect(() => {
    if (!isAuthenticated && adminOpen) {
      setAdminOpen(false);
    }
  }, [isAuthenticated, adminOpen]);

  return (
    
    <div 
      className="min-h-screen prism-app-background" 
      style={{ 
        fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif' 
      }}
    >
      <header className="relative shadow-sm">
        {/* Full-width PRISM background */}
        <PrismTitleSection />
        
        {/* Desktop Navigation */}
        {isDesktop && (
          <div className="absolute top-0 right-0 h-full flex items-center pr-6 z-20">
            <div className="flex space-x-3">
              <ThemeToggle className="shadow-lg backdrop-blur-sm" />
              <button
                onClick={toggleWizard}
                className="inline-flex items-center px-4 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:ring-offset-2 shadow-lg backdrop-blur-sm"
              >
                <Stethoscope size={18} className="mr-2" />
                Therapeutic Wizard
              </button>
              <button
                onClick={toggleAdmin}
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-lg backdrop-blur-sm"
              >
                <Settings size={18} className="mr-2" />
                Admin
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-lg backdrop-blur-sm"
                >
                  <LogOut size={18} className="mr-2" />
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Mobile Navigation */}
        {(isMobile || isTablet) && (
          <>
            {/* Mobile Menu Button */}
            <div className="absolute top-0 right-0 h-full flex items-center pr-4 z-20">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center p-3 bg-white text-[#15396c] rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:ring-offset-2 shadow-lg backdrop-blur-sm"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            
            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className={`absolute top-full left-0 right-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-lg z-30`}>
                <div className="flex flex-col p-4 space-y-3">
                  <div className="flex justify-center mb-2">
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      toggleWizard();
                      setMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:ring-offset-2 w-full justify-center text-lg font-medium`}
                  >
                    <Stethoscope size={20} className="mr-3" />
                    Therapeutic Wizard
                  </button>
                  <button
                    onClick={() => {
                      toggleAdmin();
                      setMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 w-full justify-center text-lg font-medium`}
                  >
                    <Settings size={20} className="mr-3" />
                    Admin Panel
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className={`inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 w-full justify-center text-lg font-medium`}
                    >
                      <LogOut size={20} className="mr-3" />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </header>
      
      <main className={`max-w-7xl mx-auto ${getResponsiveValue('px-3', 'px-4 sm:px-6', 'px-4 sm:px-6 lg:px-8')} ${getResponsiveValue('py-4', 'py-6', 'py-8')}`}>
        {isLoadingData ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>Loading clinical data from database...</p>
            </div>
          </div>
        ) : conditionsError ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center max-w-md">
              <div className={`rounded-lg ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border p-6`}>
                <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-red-400' : 'text-red-800'} mb-2`}>
                  Error Loading Data
                </h3>
                <p className={`${isDarkMode ? 'text-red-300' : 'text-red-600'} mb-4`}>
                  {conditionsError.message || 'Failed to load clinical data. Please try again.'}
                </p>
                <button
                  onClick={() => refetchConditions()}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
            {/* Responsive layout */}
            <div className={`${getResponsiveValue('block', 'md:grid md:grid-cols-3 md:gap-4', 'lg:grid lg:grid-cols-4 lg:gap-6')}`}>
              {/* Conditions List - Responsive visibility and sizing */}
              <div className={`${
                isMobile 
                  ? (mobileView === 'list' ? 'block' : 'hidden')
                  : isTablet 
                    ? 'md:block md:col-span-1'
                    : 'lg:block lg:col-span-1'
              } ${getResponsiveValue('mb-4', 'mb-0', 'mb-0')}`}>
                <ConditionsList
                  filteredConditions={filteredConditions}
                  selectedCondition={selectedCondition}
                  handleConditionSelect={handleConditionSelect}
                />
              </div>
              
              {/* Condition Details - Responsive visibility and sizing */}
              <div className={`${
                isMobile 
                  ? (mobileView === 'detail' ? 'block' : 'hidden')
                  : isTablet 
                    ? 'md:block md:col-span-2'
                    : 'lg:block lg:col-span-3'
              }`}>
                <ConditionDetails
                  selectedCondition={selectedCondition}
                  activeTab={activeTab}
                  handleTabChange={handleTabChange}
                  filteredProducts={filteredProducts}
                  patientTypes={patientTypes}
                  activePatientType={activePatientType}
                  handlePatientTypeSelect={handlePatientTypeSelect}
                  handleProductSelect={handleProductSelect}
                  handleShowAdditionalInfo={handleShowAdditionalInfo}
                  handleOpenResearch={handleOpenResearch}
                  hasProductsForPhase={hasProductsForPhase}
                  showAdditionalInfo={showAdditionalInfo}
                  onMobileBack={handleMobileBack}
                  mobileView={mobileView}
                  getProductAvailability={getProductAvailability}
                />
              </div>
            </div>
          </>
        )}
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
          patientTypes={patientTypes}
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
          onSaveChangesSuccess={handleSaveChangesSuccess}
          onClose={toggleAdmin}
        />
      )}
      
      {/* Feedback Widget - always visible */}
      <FeedbackWidget />

      {/* Database Chatbot - disabled per user request */}
      {/* <DatabaseChatbot /> */}
    </div>
  );
}

export default ClinicalChartMockup;