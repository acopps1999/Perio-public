import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stethoscope, Settings, LogOut, Menu, X } from 'lucide-react';
import DiagnosisWizard from './DiagnosisWizard';
import AdminDrawer from './AdminDrawer';
import AdminLoginModal from './AdminLoginModal';
import SocialLoginModal from './SocialLoginModal';
import FiltersSection from './FiltersSection';
import ConditionsList from './ConditionsList';
import ConditionDetails from './ConditionDetails';
import ResearchModal from './ResearchModal';
import FeedbackWidget from './FeedbackWidget';
import DatabaseChatbot from './AgenticSearchWidget';
import PrismTitleSection from './PrismTitleSection';
import ThemeToggle from './ThemeToggle';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConditions } from '../hooks/useConditions';
import { loadProductsFromSupabase } from './AdminPanel/AdminPanelSupabase';
import useResponsive from '../hooks/useResponsive';
import { useAdminNotifications } from '../hooks/useAdminNotifications';

function ClinicalChartMockup() {
  // Authentication
  const { isAuthenticated, loading: authLoading, logout, registerAutoLogoutCallback, userRole } = useAuth();

  // Admin notifications
  const { unreadCount } = useAdminNotifications();

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
  // Phase 3: Removed activePatientType and patientTypes - no longer using treatment modifiers
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

        // Fetch additional data
        const productsResult = await loadProductsFromSupabase();

        // Phase 3: Removed patient types fetch - no longer using treatment modifiers

        if (!productsResult.success) {
          // Continue without products if load fails
        }

        const uniqueCategories = ['All', ...new Set(conditions.map(c => c.category).filter(Boolean))];
        const allDdsTypes = ['All', ...new Set(conditions.flatMap(c => c.dds || []))];

        // DON'T set filteredConditions here - let the filter useEffect handle that
        // setFilteredConditions(conditions); // REMOVED - this was causing infinite loop
        setCategoryOptions(uniqueCategories);
        setDdsTypeOptions(allDdsTypes);

        const productsToSet = productsResult.success ? productsResult.data : [];
        setAllProducts(productsToSet);

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
        console.error('Critical error during chart data loading:', error);
        // Set fallback empty state - but DON'T set filteredConditions
        setCategoryOptions(['All']);
        setDdsTypeOptions(['All']);
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
  }, [conditions, categoryFilter, ddsTypeFilter, searchQuery]);

  // Phase 3: Generate ranked product recommendations for selected phase
  // Uses new `products` structure instead of patientSpecificConfig
  useEffect(() => {
    if (!selectedCondition || !activeTab) {
      setFilteredProducts([]);
      return;
    }

    // Phase 3: Use the new products structure { phaseName: [productNames] }
    // Products are already ranked in order
    const products = selectedCondition.products;

    if (products && products[activeTab]) {
      // Products are already sorted by rank in the transformer
      setFilteredProducts(products[activeTab] || []);
    } else {
      // Fallback: try legacy patientSpecificConfig for backward compatibility
      const config = selectedCondition.patientSpecificConfig;
      if (config && config[activeTab]) {
        const phaseConfig = config[activeTab];
        // For 'All' key or any key, flatten all products
        const allProducts = [];
        Object.keys(phaseConfig).forEach(key => {
          if (phaseConfig[key] && Array.isArray(phaseConfig[key])) {
            allProducts.push(...phaseConfig[key]);
          }
        });
        setFilteredProducts([...new Set(allProducts)]);
      } else {
        setFilteredProducts([]);
      }
    }
  }, [selectedCondition, activeTab]);

  // Handle condition selection
  const handleConditionSelect = useCallback((condition) => {
    setSelectedCondition(condition);
    setActiveTab(condition.phases && condition.phases.length > 0 ? condition.phases[0] : '');
    // Phase 3: Removed activePatientType reset - no longer using treatment modifiers
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

  // Phase 3: Removed handlePatientTypeSelect - no longer using treatment modifiers

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
  // Phase 3: Updated to use new products structure
  const hasProductsForPhase = useCallback((phase) => {
    if (!selectedCondition) return false;

    // Phase 3: Check new products structure first
    if (selectedCondition.products && selectedCondition.products[phase]) {
      return selectedCondition.products[phase].length > 0;
    }

    // Fallback: check legacy patientSpecificConfig
    if (selectedCondition.patientSpecificConfig && selectedCondition.patientSpecificConfig[phase]) {
      const phaseConfig = selectedCondition.patientSpecificConfig[phase];
      return Object.values(phaseConfig).some(products => Array.isArray(products) && products.length > 0);
    }

    return false;
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
  
  // Toggle admin panel - only allow admin users
  const toggleAdmin = () => {
    if (isAuthenticated && userRole === 'admin') {
      setAdminOpen(!adminOpen);
    } else if (isAuthenticated && userRole !== 'admin') {
      // User is authenticated but not an admin
      alert('Access denied. Admin privileges required.');
    } else {
      // User is not authenticated - show admin login modal
      setLoginModalOpen(true);
    }
  };

  // Handle admin logout
  const handleLogout = async () => {
    await logout();
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
  // Only close if auth is NOT currently loading (to avoid closing during auth refresh)
  useEffect(() => {
    if (!isAuthenticated && adminOpen && !authLoading) {
      setAdminOpen(false);
    }
  }, [isAuthenticated, adminOpen, authLoading]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-prism-dark-bg-primary' : 'bg-prism-light-bg-primary'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-prism-primary mx-auto mb-4"></div>
          <p className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} text-lg`}>
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {/* Add the PRISM background styles */}
        <style>
          {`
            @keyframes prismaticRotation1 {
              0% { transform: rotate(0deg) scale(1); filter: hue-rotate(0deg) brightness(1); }
              25% { transform: rotate(90deg) scale(1.1); filter: hue-rotate(90deg) brightness(1.3); }
              50% { transform: rotate(180deg) scale(1.05); filter: hue-rotate(180deg) brightness(1.1); }
              75% { transform: rotate(270deg) scale(1.15); filter: hue-rotate(270deg) brightness(1.4); }
              100% { transform: rotate(360deg) scale(1); filter: hue-rotate(360deg) brightness(1); }
            }

            @keyframes prismaticRotation2 {
              0% { transform: rotate(0deg) scale(1.1) skew(5deg); filter: hue-rotate(180deg) brightness(0.8); }
              20% { transform: rotate(72deg) scale(0.9) skew(-2deg); filter: hue-rotate(144deg) brightness(1.2); }
              40% { transform: rotate(144deg) scale(1.2) skew(3deg); filter: hue-rotate(108deg) brightness(0.9); }
              60% { transform: rotate(216deg) scale(0.95) skew(-4deg); filter: hue-rotate(72deg) brightness(1.5); }
              80% { transform: rotate(288deg) scale(1.1) skew(1deg); filter: hue-rotate(36deg) brightness(1.1); }
              100% { transform: rotate(360deg) scale(1.1) skew(5deg); filter: hue-rotate(0deg) brightness(0.8); }
            }

            .prism-login-bg {
              position: relative;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: ${isDarkMode ? '#18181b' : '#ffffff'};
              overflow: hidden;
            }

            .prism-login-bg::before {
              content: '';
              position: fixed;
              top: -100%;
              left: -100%;
              width: 300%;
              height: 300%;
              background:
                conic-gradient(from 0deg at 30% 40%,
                  transparent 0deg,
                  rgba(99, 102, 241, 0.4) 15deg,
                  transparent 30deg,
                  rgba(129, 140, 248, 0.3) 45deg,
                  transparent 60deg,
                  rgba(99, 102, 241, 0.6) 75deg,
                  transparent 90deg
                ),
                conic-gradient(from 120deg at 70% 60%,
                  transparent 0deg,
                  rgba(99, 102, 241, 0.5) 20deg,
                  transparent 40deg,
                  rgba(165, 180, 252, 0.3) 60deg,
                  transparent 80deg,
                  rgba(129, 140, 248, 0.4) 100deg,
                  transparent 120deg
                ),
                conic-gradient(from 240deg at 20% 80%,
                  transparent 0deg,
                  rgba(99, 102, 241, 0.7) 25deg,
                  transparent 50deg,
                  rgba(79, 70, 229, 0.4) 75deg,
                  transparent 100deg
                ),
                radial-gradient(ellipse at 60% 20%,
                  rgba(129, 140, 248, 0.8) 0%,
                  rgba(99, 102, 241, 0.3) 20%,
                  transparent 40%
                ),
                radial-gradient(ellipse at 15% 70%,
                  rgba(165, 180, 252, 0.6) 0%,
                  rgba(99, 102, 241, 0.2) 25%,
                  transparent 50%
                );
              animation: prismaticRotation1 12s linear infinite;
              z-index: 0;
              pointer-events: none;
            }

            .prism-login-bg::after {
              content: '';
              position: fixed;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background:
                conic-gradient(from 60deg at 80% 30%,
                  transparent 0deg,
                  rgba(129, 140, 248, 0.5) 10deg,
                  transparent 20deg,
                  rgba(99, 102, 241, 0.4) 30deg,
                  transparent 40deg,
                  rgba(165, 180, 252, 0.3) 50deg,
                  transparent 60deg
                ),
                conic-gradient(from 180deg at 25% 50%,
                  transparent 0deg,
                  rgba(129, 140, 248, 0.6) 30deg,
                  transparent 60deg,
                  rgba(99, 102, 241, 0.4) 90deg,
                  transparent 120deg
                ),
                linear-gradient(45deg,
                  transparent 0%,
                  rgba(99, 102, 241, 0.2) 25%,
                  transparent 50%,
                  rgba(165, 180, 252, 0.3) 75%,
                  transparent 100%
                ),
                linear-gradient(-30deg,
                  transparent 0%,
                  rgba(129, 140, 248, 0.4) 20%,
                  transparent 40%,
                  rgba(99, 102, 241, 0.2) 60%,
                  transparent 80%
                ),
                radial-gradient(ellipse at 45% 85%,
                  rgba(165, 180, 252, 0.5) 0%,
                  rgba(99, 102, 241, 0.1) 30%,
                  transparent 60%
                );
              animation: prismaticRotation2 16s linear infinite reverse;
              z-index: 1;
              pointer-events: none;
            }
          `}
        </style>
        <div className="prism-login-bg">
          <div style={{ position: 'relative', zIndex: 10 }}>
            <SocialLoginModal
              isOpen={true}
              onClose={() => {}} // Prevent closing - user must login
              onSuccess={() => {}} // Auth state will update automatically
            />
          </div>
        </div>
      </>
    );
  }

  return (

    <div
      className={`min-h-screen ${isDarkMode ? 'bg-prism-dark-bg-primary' : 'bg-prism-light-bg-primary'}`}
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
                className={`inline-flex items-center px-4 py-2 ${isDarkMode ? 'bg-prism-primary hover:bg-prism-primary-hover' : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 shadow-lg backdrop-blur-sm transition-all duration-250`}
              >
                <Stethoscope size={18} className="mr-2" />
                Therapeutic Wizard
              </button>
              {/* Only show Admin button if user is an admin */}
              {userRole === 'admin' && (
                <button
                  onClick={toggleAdmin}
                  className={`relative inline-flex items-center px-4 py-2 ${isDarkMode ? 'bg-prism-dark-bg-tertiary hover:bg-prism-dark-bg-hover border border-prism-dark-border-elevated' : 'bg-prism-light-bg-secondary hover:bg-prism-light-bg-hover border border-prism-light-border-elevated'} ${isDarkMode ? 'text-white' : 'text-prism-light-text-primary'} rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 shadow-lg backdrop-blur-sm transition-all duration-250`}
                >
                  <Settings size={18} className="mr-2" />
                  Admin
                  {/* Notification Badge */}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-prism-error rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 bg-prism-error hover:bg-prism-error/90 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-prism-error focus:ring-offset-2 shadow-lg backdrop-blur-sm transition-all duration-250"
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
                className={`inline-flex items-center p-3 ${isDarkMode ? 'bg-prism-dark-bg-secondary text-prism-primary' : 'bg-prism-light-bg-primary text-prism-primary-light'} rounded-lg hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 shadow-lg backdrop-blur-sm transition-all duration-250`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            
            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className={`absolute top-full left-0 right-0 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-primary'} border-t ${isDarkMode ? 'border-prism-dark-border-subtle' : 'border-prism-light-border-subtle'} shadow-lg z-30`}>
                <div className="flex flex-col p-4 space-y-3">
                  <div className="flex justify-center items-center mb-2">
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      toggleWizard();
                      setMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} ${isDarkMode ? 'bg-prism-primary hover:bg-prism-primary-hover' : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 w-full justify-center text-lg font-medium transition-all duration-250`}
                  >
                    <Stethoscope size={20} className="mr-3" />
                    Therapeutic Wizard
                  </button>
                  {/* Only show Admin button in mobile menu if user is an admin */}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        toggleAdmin();
                        setMobileMenuOpen(false);
                      }}
                      className={`relative inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} ${isDarkMode ? 'bg-prism-dark-bg-tertiary hover:bg-prism-dark-bg-hover border border-prism-dark-border-elevated text-white' : 'bg-prism-light-bg-secondary hover:bg-prism-light-bg-hover border border-prism-light-border-elevated text-prism-light-text-primary'} rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 w-full justify-center text-lg font-medium transition-all duration-250`}
                    >
                      <Settings size={20} className="mr-3" />
                      Admin Panel
                      {/* Notification Badge */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-prism-error rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className={`inline-flex items-center ${getButtonSize() === 'lg' ? 'px-6 py-4' : 'px-4 py-3'} bg-prism-error hover:bg-prism-error/90 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-prism-error focus:ring-offset-2 w-full justify-center text-lg font-medium transition-all duration-250`}
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prism-primary mx-auto mb-4"></div>
              <p className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} text-lg`}>Loading clinical data from database...</p>
            </div>
          </div>
        ) : conditionsError ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center max-w-md">
              <div className={`rounded-lg ${isDarkMode ? 'bg-prism-error-bg-dark border-prism-error' : 'bg-prism-error-bg-light border-prism-error'} border p-6 ${isDarkMode ? 'shadow-md' : 'shadow-light-md'}`}>
                <svg className="mx-auto h-12 w-12 text-prism-error mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'} mb-2`}>
                  Error Loading Data
                </h3>
                <p className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} mb-4`}>
                  {conditionsError.message || 'Failed to load clinical data. Please try again.'}
                </p>
                <button
                  onClick={() => refetchConditions()}
                  className="inline-flex items-center px-4 py-2 bg-prism-error text-white rounded-lg hover:bg-prism-error/90 focus:outline-none focus:ring-2 focus:ring-prism-error focus:ring-offset-2 transition-all duration-250"
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
                  // Phase 3: Removed patientTypes, activePatientType, handlePatientTypeSelect props
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
          // Phase 3: Removed patientTypes prop - no longer using treatment modifiers
          onClose={toggleWizard}
        />
      )}
      
      <AdminLoginModal 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
      
      <AdminDrawer
        isOpen={adminOpen}
        onClose={toggleAdmin}
        onSaveChangesSuccess={handleSaveChangesSuccess}
      />
      
      {/* Feedback Widget - always visible */}
      <FeedbackWidget />
      
      {/* Database Chatbot - always visible for authenticated users */}
      <DatabaseChatbot />
    </div>
  );
}

export default ClinicalChartMockup;