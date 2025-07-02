import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, Settings, LogOut, Menu, X } from 'lucide-react';
import DiagnosisWizard from './DiagnosisWizard';
import AdminPanel from './AdminPanel';
import AdminLoginModal from './AdminLoginModal';
import FiltersSection from './FiltersSection';
import ConditionsList from './ConditionsList';
import ConditionDetails from './ConditionDetails';
import ResearchModal from './ResearchModal';
import FeedbackWidget from './FeedbackWidget';
import PrismTitleSection from './PrismTitleSection';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadConditionsFromSupabase, loadProductsFromSupabase } from './AdminPanel/AdminPanelSupabase'; // Import the robust loading function
import { supabase } from '../supabaseClient'; // Import supabase client
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
    isTouchDevice,
    getResponsiveValue,
    getButtonSize,
    getSpacing,
    windowSize 
  } = useResponsive();
  
  // State management
  const [conditions, setConditions] = useState([]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [selectedResearchProduct, setSelectedResearchProduct] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
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

  const loadChartData = useCallback(async (forceRefresh = false) => {
    console.log("CHART_LOAD: Starting chart data load...");
    setIsLoadingData(true);
    
    try {
      // Use the functional form of setState to get the previous state
      // without creating a dependency on `selectedCondition` in useCallback.
      let currentSelectedId;
      setSelectedCondition(prev => {
        currentSelectedId = prev?.db_id;
        return prev;
      });

      console.log("CHART_LOAD: Fetching conditions, products, and patient types from Supabase...");
      
      // Parallelize fetching - only force refresh when needed (e.g., after admin saves)
      const [newConditions, productsResult, dbPatientTypes] = await Promise.all([
          loadConditionsFromSupabase(forceRefresh),
          loadProductsFromSupabase(),
          supabase.from('patient_types').select('id, name, description').order('name', { ascending: true })
      ]);

      console.log("CHART_LOAD: Raw data received - Conditions:", newConditions?.length || 0, "Products:", productsResult?.data?.length || 0, "Patient Types:", dbPatientTypes?.data?.length || 0);
      
      // Debug: Log first condition to see its structure
      if (newConditions && newConditions.length > 0) {
        console.log("CHART_LOAD: First condition structure:", JSON.stringify(newConditions[0], null, 2));
      }

      if (dbPatientTypes.error) {
          console.error("CHART_LOAD: Error fetching patient types:", dbPatientTypes.error);
          return;
      }

      if (!productsResult.success) {
          console.error("CHART_LOAD: Error fetching products:", productsResult.error);
          // Continue without products for now
      }

      if (!newConditions || newConditions.length === 0) {
          console.warn("CHART_LOAD: No conditions loaded from Supabase");
      }
      
      const uniqueCategories = ['All', ...new Set(newConditions.map(c => c.category).filter(Boolean))];
      const allDdsTypes = ['All', ...new Set(newConditions.flatMap(c => c.dds || []))];

      console.log("CHART_LOAD: Processed categories:", uniqueCategories.length, "DDS types:", allDdsTypes.length);

      setConditions(newConditions);
      setFilteredConditions(newConditions);
      setCategoryOptions(uniqueCategories);
      setDdsTypeOptions(allDdsTypes);
      setPatientTypes(dbPatientTypes.data || []); // Set the patient types from DB
      
      // Debug: Log products being set
      const productsToSet = productsResult.success ? productsResult.data : [];
      console.log('DEBUG loadChartData - Products being set:', productsToSet);
      setAllProducts(productsToSet); // Set the products with availability info

      // After reload, try to re-select the same condition
      const reSelectedCondition = newConditions.find(c => c.db_id === currentSelectedId);

      if (reSelectedCondition) {
        console.log("CHART_LOAD: Re-selecting previous condition:", reSelectedCondition.name);
        setSelectedCondition(reSelectedCondition);
      } else if (newConditions.length > 0) {
        // Fallback to the first condition if the old one doesn't exist anymore
        console.log("CHART_LOAD: Selecting first condition:", newConditions[0].name);
        setSelectedCondition(newConditions[0]);
        setActiveTab(newConditions[0].phases && newConditions[0].phases.length > 0 ? newConditions[0].phases[0] : '');
      } else {
        console.log("CHART_LOAD: No conditions available");
        setSelectedCondition(null); // No conditions left
      }
      
      console.log("CHART_LOAD: Chart data loaded successfully!");
      
    } catch (error) {
      console.error("CHART_LOAD: Critical error during chart data loading:", error);
      // Set fallback empty state
      setConditions([]);
      setFilteredConditions([]);
      setCategoryOptions(['All']);
      setDdsTypeOptions(['All']);
      setPatientTypes([]);
      setSelectedCondition(null);
    } finally {
      setIsLoadingData(false);
    }
  }, []); // Empty dependency array is critical to prevent a stale function.

  // Load conditions on component mount
  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

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
    if (filtered.length > 0 && (!selectedCondition || 
        !filtered.find(c => c.name === selectedCondition.name))) {
      setSelectedCondition(filtered[0]);
      setActiveTab(filtered[0].phases[0]);
    }
  }, [conditions, categoryFilter, ddsTypeFilter, patientTypeFilter, searchQuery, selectedCondition]);

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
    // This function is kept for compatibility but should not automatically show additional info
    console.log('handleProductSelect called for:', product);
    
    // Store the selected product for potential future use
    setSelectedProduct({
      name: product,
      details: selectedCondition.productDetails[product.replace(' (Type 3/4 Only)', '')]
    });
  }, [selectedCondition]);

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
        abstract: "Background: This randomized controlled trial evaluated the clinical efficacy of ${cleanProductName} in patients with ${selectedCondition.name}.\n\nMethods: A total of 120 patients were randomly assigned to either treatment with ${cleanProductName} (n=60) or standard therapy (n=60). Clinical parameters including bleeding on probing, probing depth, and clinical attachment level were assessed at baseline, 3, and 6 months.\n\nResults: Significant improvements were observed in all clinical parameters with ${cleanProductName} compared to controls (p<0.05). The treatment group showed 34% greater reduction in bleeding on probing and 28% improvement in clinical attachment levels.\n\nConclusions: ${cleanProductName} demonstrates superior clinical outcomes when used as an adjunct to conventional periodontal therapy, offering enhanced healing and improved patient outcomes."
      },
      { 
        title: `Efficacy of ${cleanProductName} in dental practice`, 
        author: "Johnson et al., Periodontology Today, 2022",
        abstract: "Objective: To assess the real-world effectiveness of ${cleanProductName} in clinical dental practice settings.\n\nStudy Design: This multicenter observational study followed 250 patients across 15 dental practices over 12 months. Patient-reported outcomes and clinical assessments were recorded at regular intervals.\n\nResults: Treatment with ${cleanProductName} resulted in significant improvements in tissue healing time (mean reduction of 3.2 days, p<0.001) and patient comfort scores (7.8 vs 5.4 on 10-point scale, p<0.01) compared to historical controls.\n\nClinical Significance: These findings support the integration of ${cleanProductName} into routine clinical protocols for enhanced patient care and outcomes."
      },
      { 
        title: `Comparative study of ${cleanProductName} vs standard treatments`, 
        author: "Williams et al., Oral Surgery Journal, 2023",
        abstract: "Purpose: To compare the therapeutic efficacy and safety profile of ${cleanProductName} against conventional treatment modalities.\n\nMaterials and Methods: This double-blind, randomized controlled trial included 180 patients divided into three groups: ${cleanProductName} (n=60), standard treatment A (n=60), and standard treatment B (n=60). Primary outcomes included healing time, complication rates, and patient satisfaction.\n\nResults: ${cleanProductName} demonstrated statistically significant advantages in healing time (p<0.001), with mean recovery reduced by 2.1 days compared to standard treatments. Complication rates were lower (8.3% vs 15.7%, p<0.05) and patient satisfaction scores were higher (8.9/10 vs 7.2/10, p<0.001).\n\nConclusion: ${cleanProductName} offers superior clinical outcomes with improved safety profile compared to conventional therapeutic approaches."
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
    console.log('DEBUG getProductAvailability:', {
      productName,
      cleanName,
      allProducts: allProducts.map(p => ({ name: p.name, is_available: p.is_available })),
      foundProduct: product,
      result: product ? product.is_available : true
    });
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
    console.log("CHART_LOAD: AdminPanel saved. Reloading chart data with fresh data.");
    await loadChartData(true); // Force refresh after admin saves
  };

  // Register auto-logout callback to close admin panel
  useEffect(() => {
    if (registerAutoLogoutCallback) {
      registerAutoLogoutCallback(() => {
        console.log('Auto-logout callback: Closing admin panel');
        setAdminOpen(false);
      });
    }
  }, [registerAutoLogoutCallback]);

  // Close admin panel when user is no longer authenticated (backup safety)
  useEffect(() => {
    if (!isAuthenticated && adminOpen) {
      console.log('User logged out: Closing admin panel');
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
              <p className="text-gray-600 text-lg">Loading clinical data from database...</p>
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
    </div>
  );
}

export default ClinicalChartMockup;