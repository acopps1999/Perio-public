import React, { useState } from 'react';
import { BookOpen, Target, ArrowLeft, Microscope, FileText, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/featureVisibility';
import ProductDrawer from './ProductDrawer';

function ConditionDetails({
  selectedCondition,
  activeTab,
  handleTabChange,
  filteredProducts, // The already filtered product list for the current phase (ranked)
  // Phase 3: Removed patientTypes, activePatientType, handlePatientTypeSelect props
  handleProductSelect, // Handler when a product card is clicked
  handleShowAdditionalInfo, // Handler to show additional info
  // Note: Research is now handled via ProductDrawer, no separate modal needed
  hasProductsForPhase, // Function to check if a phase has any products
  showAdditionalInfo,
  onMobileBack, // Handler for mobile back navigation
  mobileView, // Current mobile view state
  getProductAvailability, // Function to check if a product is available
}) {

  const { isDarkMode } = useTheme();
  const { userRole } = useAuth();

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Product drawer state
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState('scientific');
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState(null);

  // Get the details for the selected product (define function first, use in useEffect)
  const getProductDetails = React.useCallback((productName) => {
    if (!productName || !selectedCondition) return null;
    const cleanName = productName.replace(' (Type 3/4 Only)', '');

    // Try exact match first
    let details = selectedCondition.productDetails?.[cleanName];

    // If not found, try case-insensitive match
    if (!details) {
      const detailsKeys = Object.keys(selectedCondition.productDetails || {});
      const matchingKey = detailsKeys.find(key =>
        key.toLowerCase() === cleanName.toLowerCase()
      );
      if (matchingKey) {
        details = selectedCondition.productDetails[matchingKey];
      }
    }

    // If still not found, try trimmed match (remove extra whitespace)
    if (!details) {
      const detailsKeys = Object.keys(selectedCondition.productDetails || {});
      const matchingKey = detailsKeys.find(key =>
        key.trim() === cleanName.trim()
      );
      if (matchingKey) {
        details = selectedCondition.productDetails[matchingKey];
      }
    }

    // If still not found, try partial match (in case of suffix differences)
    if (!details) {
      const detailsKeys = Object.keys(selectedCondition.productDetails || {});
      const matchingKey = detailsKeys.find(key =>
        key.toLowerCase().trim().includes(cleanName.toLowerCase().trim()) ||
        cleanName.toLowerCase().trim().includes(key.toLowerCase().trim())
      );
      if (matchingKey) {
        details = selectedCondition.productDetails[matchingKey];
      }
    }

    return details || null;
  }, [selectedCondition]);

  // Get the selected product details
  const selectedProductDetails = getProductDetails(selectedProduct);

  // DEBUG: Log what we're getting - MUST be before any early returns
  React.useEffect(() => {
    if (selectedProduct && selectedCondition) {
      console.log('=== PRODUCT DRAWER DEBUG ===');
      console.log('Selected product name:', selectedProduct);
      console.log('Available products in productDetails:', Object.keys(selectedCondition.productDetails || {}));
      console.log('Selected product details:', selectedProductDetails);
      if (selectedProductDetails) {
        console.log('Field Status:');
        console.log('- scientificRationale:', selectedProductDetails.scientificRationale ? `HAS DATA (${selectedProductDetails.scientificRationale.substring(0, 50)}...)` : 'EMPTY');
        console.log('- rationale:', selectedProductDetails.rationale ? `HAS DATA (${selectedProductDetails.rationale.substring(0, 50)}...)` : 'EMPTY');
        console.log('- clinicalEvidence:', selectedProductDetails.clinicalEvidence ? `HAS DATA (${selectedProductDetails.clinicalEvidence.substring(0, 50)}...)` : 'EMPTY');
        console.log('- handlingObjections:', selectedProductDetails.handlingObjections ? `HAS DATA` : 'EMPTY');
      } else {
        console.log('❌ selectedProductDetails is NULL - product name mismatch!');
      }
      console.log('Is fallback data?', selectedCondition._isFallbackData);
      console.log('=========================');
    }
  }, [selectedProduct, selectedCondition, selectedProductDetails]);

  // Phase 3: Removed safePatientTypes and getPatientTypeDescription - no longer using treatment modifiers

  if (!selectedCondition) {
    return (
      <div className={`lg:col-span-3 ${isDarkMode ? 'bg-prism-dark-bg-secondary text-prism-dark-text-secondary' : 'bg-prism-light-bg-primary text-prism-light-text-secondary'} shadow rounded-lg p-8 text-center`}>
        Select a condition or surgical procedure to view details
      </div>
    );
  }
  
  // Handle clicking on a product card
  const handleProductCardSelect = (product) => {
    // Set the selected product to display its details
    const cleanProductName = product.replace(' (Type 3/4 Only)', '');
    setSelectedProduct(cleanProductName);
    // Open the drawer with scientific tab by default
    setDrawerInitialTab('scientific');
    setProductDrawerOpen(true);
  };
  
  // Handle tab change and clear selected product
  const handleTabChangeWithClear = (tab) => {
    setSelectedProduct(null); // Clear selected product when changing phases
    handleTabChange(tab); // Call the original tab change handler
  };

  // Phase 3: Removed handlePatientTypeSelectWithClear - no longer using treatment modifiers

  const handleOpenCompetitiveAdvantage = async () => {
    if (!selectedProduct) return;

    // Load competitive advantage data from Supabase and WAIT for it
    await loadCompetitiveAdvantageData(selectedProduct);

    // Open drawer with competitive tab AFTER data is loaded
    handleOpenProductDrawer('competitive');
  };

  // Handle opening product drawer with specific tab
  const handleOpenProductDrawer = (initialTab = 'scientific') => {
    setDrawerInitialTab(initialTab);
    setProductDrawerOpen(true);
  };

  const loadCompetitiveAdvantageData = async (productName) => {
    try {
      // Try multiple product name variants to handle mismatches
      const variants = [
        productName, // Original
        productName.trim(), // Trimmed
        `${productName} (Type 3/4 Only)`, // With suffix
        productName.replace(' (Type 3/4 Only)', ''), // Without suffix (cleaned)
      ];

      // Remove duplicates from variants array
      const uniqueVariants = [...new Set(variants)];

      // Build OR query for all variants - Simple approach: just query the exact product name
      // The database should have exact matches, let's not overcomplicate
      const productNameParam = encodeURIComponent(productName);

      // Use raw fetch to bypass broken Supabase client
      const competitorsUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/competitive_advantage_competitors?select=competitor_name,advantages&product_name=eq.${productNameParam}`;
      const ingredientsUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/competitive_advantage_active_ingredients?select=ingredient_name,advantages&product_name=eq.${productNameParam}`;

      const [competitorsResponse, ingredientsResponse] = await Promise.all([
        fetch(competitorsUrl, {
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
          }
        }),
        fetch(ingredientsUrl, {
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
          }
        })
      ]);

      const competitorsData = await competitorsResponse.json();
      const ingredientsData = await ingredientsResponse.json();

      // DEBUG: Log competitive advantage query results
      console.log('=== COMPETITIVE ADVANTAGE DEBUG ===');
      console.log('Product name searched:', productName);
      console.log('Variants tried:', uniqueVariants);
      console.log('Competitors URL:', competitorsUrl);
      console.log('Ingredients URL:', ingredientsUrl);
      console.log('Competitors response status:', competitorsResponse.status);
      console.log('Ingredients response status:', ingredientsResponse.status);
      console.log('Competitors response:', competitorsData);
      console.log('Ingredients response:', ingredientsData);
      console.log('====================================');

      // Format data for the component
      const competitors = (competitorsData || []).map(item => ({
        name: item.competitor_name,
        advantages: item.advantages || ''
      }));

      const activeIngredients = (ingredientsData || []).map(item => ({
        name: item.ingredient_name,
        advantages: item.advantages || ''
      }));

      setCompetitiveAdvantageData({
        competitors,
        activeIngredients
      });

    } catch (error) {
      console.error('Error loading competitive advantage:', error);
      // Initialize with empty structure on error
      setCompetitiveAdvantageData({
        competitors: [],
        activeIngredients: []
      });
    }
  };

  return (
    <div className={`lg:col-span-3 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-primary'} shadow rounded-lg overflow-hidden`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-prism-dark-border-elevated' : 'border-prism-light-border-subtle'}`}>
        {/* Mobile back button */}
        <div className="flex items-center mb-2 lg:hidden">
          <button
            onClick={onMobileBack}
            className={`flex items-center transition-colors duration-250 ${isDarkMode ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary' : 'text-prism-primary-light hover:text-prism-primary'}`}
          >
            <ArrowLeft size={20} className="mr-2" />
            <span className="text-sm font-medium">Back to Conditions</span>
          </button>
        </div>

        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>{selectedCondition.name}</h2>
        <div className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
          <span className="mr-2">{selectedCondition.category}</span>
          <span className="mr-2 hidden">|</span>
          <span className="hidden">{selectedCondition.dds.join(', ')}</span>
          {/* Phase 3: Removed patientType display - no longer using treatment modifiers */}
        </div>

        {/* Recommended Products Section */}
        <div className="mt-6 mb-4">
          <div className="mb-3">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>Recommended Products</h3>
          </div>

          {/* Phase 3: Optional phase filter chips - only shown when multiple phases exist */}
          {selectedCondition.phases.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCondition.phases.map((phase) => (
                <button
                  key={phase}
                  onClick={() => handleTabChangeWithClear(phase)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                    activeTab === phase
                      ? isDarkMode
                        ? "bg-prism-primary text-white"
                        : "bg-prism-primary-light text-white"
                      : isDarkMode
                        ? "bg-prism-dark-bg-tertiary text-prism-dark-text-secondary hover:bg-prism-dark-bg-hover"
                        : "bg-prism-light-bg-secondary text-prism-light-text-secondary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  {phase}
                  {hasProductsForPhase(phase) && selectedCondition.products && Array.isArray(selectedCondition.products[phase]) && (
                    <span className={clsx(
                      "ml-1.5 px-1.5 py-0.5 text-xs rounded-full",
                      activeTab === phase
                        ? "bg-white/20"
                        : isDarkMode
                          ? "bg-prism-dark-bg-secondary"
                          : "bg-prism-light-bg-primary"
                    )}>
                      {selectedCondition.products[phase].length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product list - simplified without tab panels */}
          <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated' : 'bg-prism-light-bg-primary border-prism-light-border-subtle'}`}>
            {filteredProducts.length > 0 ? (
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const cleanProductName = product.replace(' (Type 3/4 Only)', '');
                  const isSelected = selectedProduct === cleanProductName;
                  const isAvailable = getProductAvailability ? getProductAvailability(product) : true;

                  return (
                    <div
                      key={product}
                      className={clsx(
                        "border rounded-lg p-5 shadow-sm cursor-pointer transition-all duration-250",
                        isSelected
                          ? "border-prism-primary bg-prism-primary text-white"
                          : isDarkMode
                            ? "bg-prism-dark-bg-tertiary border-prism-dark-border-subtle hover:bg-prism-dark-bg-hover hover:border-prism-dark-border-elevated"
                            : "bg-prism-light-bg-secondary border-prism-light-border-subtle hover:bg-prism-light-bg-tertiary hover:border-prism-light-border-elevated"
                      )}
                      onClick={() => handleProductCardSelect(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={clsx(
                              "text-lg font-semibold",
                              isSelected
                                ? "text-white"
                                : isDarkMode
                                  ? "text-prism-dark-text-primary"
                                  : "text-prism-light-text-primary"
                            )}>
                              {product}
                            </h4>
                            {!isAvailable && (
                              <span className={clsx(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-250",
                                isSelected
                                  ? "bg-white text-prism-primary"
                                  : isDarkMode
                                    ? "bg-prism-warning-bg-dark text-prism-warning"
                                    : "bg-prism-warning-bg-light text-prism-warning"
                              )}>
                                Not Available
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductDrawer('research');
                          }}
                          className={clsx(
                            "text-sm flex items-center transition-colors duration-250 ml-4",
                            isSelected
                              ? "text-white hover:text-gray-100"
                              : isDarkMode
                                ? "text-prism-primary hover:text-prism-primary-hover"
                                : "text-prism-primary-light hover:text-prism-primary"
                          )}
                        >
                          <BookOpen size={14} className="mr-1" />
                          <span>Research</span>
                        </button>
                      </div>
                      {product.includes('(Type 3/4 Only)') && (
                        <div className="mt-2">
                          <span className={clsx(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors duration-250",
                            isSelected
                              ? "bg-white text-prism-primary"
                              : isDarkMode
                                ? "bg-prism-warning-bg-dark text-prism-warning"
                                : "bg-prism-warning-bg-light text-prism-warning"
                          )}>
                            Recommended for Type 3/4 patients only
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-8 text-center ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                No products recommended{selectedCondition.phases.length > 1 ? ` for ${activeTab}` : ''}.
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Information Section */}
        {showAdditionalInfo && selectedProduct && selectedProductDetails && (
          <div className="mt-6 space-y-2">
            <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
              Additional Information: {selectedProduct}
            </h3>

            {/* Product-specific information */}

            {/* Scientific Rationale */}
            <div
              className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all duration-250 ${isDarkMode ? 'bg-prism-primary/15 border-prism-primary/30 hover:bg-prism-primary/25 hover:border-prism-primary/40' : 'bg-prism-primary-light/10 border-prism-primary-light/30 hover:bg-prism-primary-light/20 hover:border-prism-primary-light/40'}`}
              onClick={() => handleOpenProductDrawer('scientific')}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'}`}>
                  Scientific Rationale
                </div>
                <Microscope size={18} className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary-light/70'} />
              </div>
            </div>

            {/* Clinical Evidence */}
            <div
              className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all duration-250 ${isDarkMode ? 'bg-prism-primary/20 border-prism-primary/35 hover:bg-prism-primary/30 hover:border-prism-primary/45' : 'bg-prism-primary-light/15 border-prism-primary-light/35 hover:bg-prism-primary-light/25 hover:border-prism-primary-light/45'}`}
              onClick={() => handleOpenProductDrawer('clinical')}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'}`}>
                  Clinical Evidence
                </div>
                <FileText size={18} className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary-light/70'} />
              </div>
            </div>

            {/* Competitive Advantage - Sales/Admin only */}
            {hasFeatureAccess('competitive_advantage', userRole) && (
              <div
                className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all duration-250 ${isDarkMode ? 'bg-prism-primary/30 border-prism-primary/50 hover:bg-prism-primary/40 hover:border-prism-primary/60' : 'bg-prism-primary-light/20 border-prism-primary-light/40 hover:bg-prism-primary-light/30 hover:border-prism-primary-light/50'}`}
                onClick={handleOpenCompetitiveAdvantage}
              >
                <div className="flex justify-between items-center">
                  <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'}`}>
                    Competitive Advantage
                  </div>
                  <Target size={18} className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary-light/70'} />
                </div>
              </div>
            )}

            {/* Handling Objections - Sales/Admin only */}
            {hasFeatureAccess('objection_handling', userRole) && (
              <div
                className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all duration-250 ${isDarkMode ? 'bg-prism-primary/40 border-prism-primary/60 hover:bg-prism-primary/50 hover:border-prism-primary/70' : 'bg-prism-primary-light/25 border-prism-primary-light/45 hover:bg-prism-primary-light/35 hover:border-prism-primary-light/55'}`}
                onClick={() => handleOpenProductDrawer('objections')}
              >
                <div className="flex justify-between items-center">
                  <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'}`}>
                    Handling Objections
                  </div>
                  <MessageSquare size={18} className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary-light/70'} />
                </div>
              </div>
            )}

            {/* Key Pitch Points - Sales/Admin only */}
            {hasFeatureAccess('pitch_points', userRole) && selectedProductDetails.pitchPoints && (
              <div
                className={`p-3 rounded-lg mb-2 border cursor-pointer transition-all duration-250 ${isDarkMode ? 'bg-prism-primary/50 border-prism-primary/70 hover:bg-prism-primary/60 hover:border-prism-primary/80' : 'bg-prism-primary-light/30 border-prism-primary-light/50 hover:bg-prism-primary-light/40 hover:border-prism-primary-light/60'}`}
                onClick={() => handleOpenProductDrawer('pitch')}
              >
                <div className="flex justify-between items-center">
                  <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'}`}>
                    Key Pitch Points
                  </div>
                  <Target size={18} className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary-light/70'} />
                </div>
              </div>
            )}

            {/* Add button to clear selected product and show condition-level info */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setSelectedProduct(null)}
                className={`px-3 py-1 text-sm underline transition-colors duration-250 ${isDarkMode ? 'text-prism-primary hover:text-prism-primary-hover' : 'text-prism-primary-light hover:text-prism-primary'}`}
              >
                View overall condition information
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Drawer - rendered at root level to overlay entire page */}
      <ProductDrawer
        isOpen={productDrawerOpen}
        onClose={() => {
          setProductDrawerOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProductDetails ? {
          product_name: selectedProduct,
          scientificRationale: selectedProductDetails.scientificRationale,
          rationale: selectedProductDetails.rationale,
          clinicalEvidence: selectedProductDetails.clinicalEvidence,
          key_ingredients: selectedProductDetails.ingredients || [],
          pitchPoints: selectedProductDetails.pitchPoints,
          usage: selectedProductDetails.usage,
          handlingObjections: selectedProductDetails.handlingObjections,
          category: selectedCondition?.category
        } : null}
        research={selectedProductDetails?.researchArticles || []}
        competitiveData={competitiveAdvantageData}
        initialTab={drawerInitialTab}
        activePhase={activeTab}
        onLoadCompetitiveData={() => loadCompetitiveAdvantageData(selectedProduct)}
      />
    </div>
  );
}

export default ConditionDetails; 