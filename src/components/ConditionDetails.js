import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Info, Filter, BookOpen, Target, ArrowLeft, Microscope, FileText, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';
import CompetitiveAdvantageModal from './CompetitiveAdvantageModal';
import ProductDetailsModal from './ProductDetailsModal';

function ConditionDetails({
  selectedCondition,
  activeTab,
  handleTabChange,
  filteredProducts, // The already filtered product list for the current phase/patient type
  patientTypes, // Now an array of {id, name, description}
  activePatientType,
  handlePatientTypeSelect,
  handleProductSelect, // Handler when a product card is clicked
  handleShowAdditionalInfo, // Handler to show additional info
  handleOpenResearch, // Handler to open research modal (general or for a specific product)
  hasProductsForPhase, // Function to check if a phase has any products
  showAdditionalInfo,
  onMobileBack, // Handler for mobile back navigation
  mobileView, // Current mobile view state
  getProductAvailability, // Function to check if a product is available
}) {

  const { isDarkMode } = useTheme();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [competitiveAdvantageModalOpen, setCompetitiveAdvantageModalOpen] = useState(false);
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState(null);

  // Product details modal state
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [currentModalSection, setCurrentModalSection] = useState(null);

  // Ensure patientTypes is always an array
  const safePatientTypes = Array.isArray(patientTypes) ? patientTypes : [];

  const getPatientTypeDescription = (name) => {
    if (name === 'All') return 'All Treatment Modifiers';
    const pt = safePatientTypes.find(p => p.name === name);
    return pt ? `${pt.name}: ${pt.description}` : name;
  };

  if (!selectedCondition) {
    return (
      <div className={`lg:col-span-3 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'} shadow rounded-lg p-8 text-center`}>
        Select a condition or surgical procedure to view details
      </div>
    );
  }
  
  // Handle clicking on a product card
  const handleProductCardSelect = (product) => {
    // Set the selected product to display its details
    const cleanProductName = product.replace(' (Type 3/4 Only)', '');
    setSelectedProduct(cleanProductName);
    // Show the additional information section
    handleShowAdditionalInfo();
  };
  
  // Handle tab change and clear selected product
  const handleTabChangeWithClear = (tab) => {
    setSelectedProduct(null); // Clear selected product when changing phases
    handleTabChange(tab); // Call the original tab change handler
  };
  
  // Handle patient type change and clear selected product
  const handlePatientTypeSelectWithClear = (type) => {
    setSelectedProduct(null); // Clear selected product when changing patient type
    handlePatientTypeSelect(type); // Call the original patient type select handler
  };
  
  // Get the details for the selected product
  const getProductDetails = (productName) => {
    if (!productName) return null;
    const cleanName = productName.replace(' (Type 3/4 Only)', '');
    return selectedCondition.productDetails?.[cleanName] || null;
  };
  
  // Get the selected product details
  const selectedProductDetails = getProductDetails(selectedProduct);

  const handleOpenCompetitiveAdvantage = () => {
    if (!selectedProduct) return;
    
    // Load competitive advantage data from Supabase
    loadCompetitiveAdvantageData(selectedProduct);
  };

  // Handle opening product details modal
  const handleOpenProductDetailsModal = (sectionType) => {
    setCurrentModalSection(sectionType);
    setProductDetailsModalOpen(true);
  };

  const loadCompetitiveAdvantageData = async (productName) => {
    try {
      // Use raw fetch to bypass broken Supabase client
      const competitorsUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/competitive_advantage_competitors?select=competitor_name,advantages&product_name=eq.${encodeURIComponent(productName)}`;
      const ingredientsUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/competitive_advantage_active_ingredients?select=ingredient_name,advantages&product_name=eq.${encodeURIComponent(productName)}`;

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

      setCompetitiveAdvantageModalOpen(true);

    } catch (error) {
      console.error('Error loading competitive advantage:', error);
      // Initialize with empty structure on error and open modal
      setCompetitiveAdvantageData({
        competitors: [],
        activeIngredients: []
      });
      setCompetitiveAdvantageModalOpen(true);
    }
  };

  return (
    <div className={`lg:col-span-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg overflow-hidden`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Mobile back button */}
        <div className="flex items-center mb-2 lg:hidden">
          <button
            onClick={onMobileBack}
            className={`flex items-center transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft size={20} className="mr-2" />
            <span className="text-sm font-medium">Back to Conditions</span>
          </button>
        </div>

        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedCondition.name}</h2>
        <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="mr-2">{selectedCondition.category}</span>
          <span className="mr-2 hidden">|</span>
          <span className="hidden">{selectedCondition.dds.join(', ')}</span>
          <span className="mr-2 hidden">|</span>
          <span>{selectedCondition.patientType}</span>
        </div>

        {/* Recommended Products Section */}
        <div className="mt-6 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Recommended Products</h3>
            <button
              onClick={() => handleOpenResearch()} // Pass no product to open general research
              className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center text-sm hidden"
            >
              <BookOpen size={16} className="mr-2" />
              View Published Research
            </button>
          </div>
          
          {/* Treatment Modifier Filter for Products */}
          <div className={`p-4 rounded-lg border mb-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-shrink-0">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Show Recommendations For:</span>
              </div>
              <div className="flex-grow">
                <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelectWithClear}>
                  <Select.Trigger className={`flex justify-between items-center px-3 py-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                    <div className="flex items-center">
                      <Filter size={16} className="mr-2 text-[#15396c]" />
                      <Select.Value placeholder="Select Treatment Modifier" />
                    </div>
                    <Select.Icon><ChevronDown size={18} /></Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className={`overflow-hidden rounded-md shadow-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <Select.Viewport className="p-1">
                        {[{ name: 'All' }, ...safePatientTypes].map((pt) => (
                          <Select.Item
                            key={pt.name}
                            value={pt.name}
                            className={`flex items-center h-8 px-3 py-2 text-sm cursor-pointer focus:outline-none ${isDarkMode ? 'text-gray-200 hover:bg-gray-600 focus:bg-gray-600' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'}`}
                          >
                            <Select.ItemText>
                              {getPatientTypeDescription(pt.name)}
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
              <div className={`mt-2 text-sm flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Info size={14} className="mr-1" />
                Showing specific recommendations for:
                <span className="font-medium ml-1">
                  {getPatientTypeDescription(activePatientType)}
                </span>
              </div>
            )}
          </div>
          
          {/* Treatment Phases Tabs */}
          <Tabs.Root value={activeTab} onValueChange={handleTabChangeWithClear}>
            <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
              {selectedCondition.phases.map((phase, index) => {
                // Different opacity levels of the selected condition color for each phase
                const getPhaseColor = (phaseName, phaseIndex) => {
                  const colors = [
                    'bg-[#15396c]/40', // Prep - 40% opacity
                    'bg-[#15396c]/60', // Acute - 60% opacity  
                    'bg-[#15396c]/80'  // Maintenance - 80% opacity
                  ];
                  return colors[phaseIndex] || 'bg-[#15396c]/40';
                };
                
                return (
                  <Tabs.Trigger
                    key={phase}
                    value={phase}
                    className={clsx(
                      "flex-1 px-4 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200 text-white",
                      getPhaseColor(phase, index),
                      activeTab === phase 
                        ? "shadow-[inset_0_0_0_4px_#15396c] animate-pulse-border"
                        : "hover:shadow-[inset_0_0_0_2px_rgba(156,163,175,0.5)]"
                    )}
                    style={activeTab === phase ? {
                      animation: 'pulse-border 2s infinite'
                    } : {}}
                  >
                    {phase} Phase
                    {hasProductsForPhase(phase) && selectedCondition.products && Array.isArray(selectedCondition.products[phase]) && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white text-[#15396c]">
                        {selectedCondition.products[phase].length}
                      </span>
                    )}
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
            
            {/* Phase-specific Usage Instructions - More prominently displayed */}
            {selectedProduct && selectedProductDetails && selectedProductDetails.usage && filteredProducts.length > 0 && (
              <div className={`bg-gradient-to-r border-l-6 border-[#15396c] p-4 mb-4 shadow-md rounded-r-md ${isDarkMode ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-50 to-blue-100'}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-[#15396c]" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-[#15396c]'}`}>
                      Usage Instructions for {selectedProduct} - {activeTab} Phase
                    </h4>
                    <div className={`p-3 rounded-md border shadow-sm ${isDarkMode ? 'bg-gray-700 border-blue-700/40 text-gray-200' : 'bg-white border-[#15396c]/20 text-gray-800'}`}>
                      <div className="text-sm leading-relaxed">
                        {typeof selectedProductDetails.usage === 'object'
                          ? (selectedProductDetails.usage[activeTab]
                              ? <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage[activeTab]}</div>
                              : <div className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No specific instructions for {activeTab} phase. See general usage below.</div>)
                          : <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedCondition.phases.map((phase) => (
              <Tabs.Content key={phase} value={phase} className={`p-4 border border-t-0 rounded-b-lg ${isDarkMode ? 'bg-gray-750' : 'bg-white'}`}>
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
                          "border-2 rounded-lg p-5 shadow-sm cursor-pointer transition-all duration-200",
                          isSelected
                            ? "border-[#15396c] !bg-[#15396c]" // Force background with !important
                            : isDarkMode
                              ? "bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500"
                              : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        )}
                        onClick={() => handleProductCardSelect(product)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={clsx(
                                "text-lg font-semibold",
                                isSelected
                                  ? "!text-white" // Force white text with !important
                                  : isDarkMode
                                    ? "text-white"
                                    : "text-black"
                              )}>
                                {product}
                              </h4>
                              {!isAvailable && (
                                <span className={clsx(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                  isSelected
                                    ? "bg-white text-amber-600"
                                    : "bg-amber-100 text-amber-800"
                                )}>
                                  Not Available
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the parent onClick
                              handleOpenResearch(product);
                            }}
                            className={clsx(
                              "text-sm flex items-center transition-colors ml-4",
                              isSelected
                                ? "!text-white hover:!text-gray-200" // Force white text with !important
                                : "text-[#15396c] hover:text-[#15396c]/80"
                            )}
                          >
                            <BookOpen size={14} className="mr-1" />
                            <span>Research</span>
                          </button>
                        </div>
                        {product.includes('(Type 3/4 Only)') && (
                          <div className="mt-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                              isSelected
                                ? "bg-white text-[#15396c]"
                                : "bg-amber-100 text-amber-800"
                            )}>
                              Recommended for Type 3/4 patients only
                            </span>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                ) : activePatientType !== 'All' ? (
                  <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <strong>No products recommended</strong> for {phase} phase with Treatment Modifier {activePatientType}.
                  </div>
                ) : (
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No products recommended for this phase.</div>
                )}
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
        
        {/* Additional Information Section */}
        {showAdditionalInfo && selectedProduct && selectedProductDetails && (
          <div className="mt-6 space-y-2">
            <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Additional Information: {selectedProduct}
            </h3>

            {/* Product-specific information */}

            {/* Scientific Rationale */}
            <div
              className={`p-3 rounded-md mb-2 border-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-blue-900/30 border-blue-700/40 hover:bg-blue-900/40' : 'bg-[#15396c]/10 border-[#15396c]/20 hover:bg-[#15396c]/15'}`}
              onClick={() => handleOpenProductDetailsModal('scientificRationale')}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-[#15396c]'}`}>
                  Scientific Rationale
                </div>
                <Microscope size={18} className={isDarkMode ? 'text-blue-400/70' : 'text-[#15396c]/70'} />
              </div>
            </div>

            {/* Clinical Evidence */}
            <div
              className={`p-3 rounded-md mb-2 border-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-blue-800/40 border-blue-600/50 hover:bg-blue-800/50' : 'bg-[#15396c]/25 border-[#15396c]/35 hover:bg-[#15396c]/30'}`}
              onClick={() => handleOpenProductDetailsModal('clinicalEvidence')}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-blue-200' : 'text-[#15396c]'}`}>
                  Clinical Evidence
                </div>
                <FileText size={18} className={isDarkMode ? 'text-blue-300/70' : 'text-[#15396c]/70'} />
              </div>
            </div>

            {/* Competitive Advantage */}
            <div
              className={`p-3 rounded-md mb-2 border-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-blue-700/50 border-blue-500/60 hover:bg-blue-700/60' : 'bg-[#15396c]/40 border-[#15396c]/50 hover:bg-[#15396c]/45'}`}
              onClick={handleOpenCompetitiveAdvantage}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-blue-100' : 'text-[#15396c]'}`}>
                  Competitive Advantage
                </div>
                <Target size={18} className={isDarkMode ? 'text-blue-200/70' : 'text-[#15396c]/70'} />
              </div>
            </div>
            
            {/* Competitive Advantage Modal */}
            <CompetitiveAdvantageModal
              isOpen={competitiveAdvantageModalOpen}
              onClose={() => setCompetitiveAdvantageModalOpen(false)}
              selectedProduct={selectedProduct}
              competitiveAdvantageData={competitiveAdvantageData}
            />

            {/* Product Details Modal */}
            <ProductDetailsModal
              isOpen={productDetailsModalOpen}
              onClose={() => setProductDetailsModalOpen(false)}
              selectedProduct={selectedProduct}
              sectionType={currentModalSection}
              content={currentModalSection && selectedProductDetails ? 
                (() => {
                  switch (currentModalSection) {
                    case 'scientificRationale':
                      return selectedProductDetails.rationale;
                    case 'clinicalEvidence':
                      return selectedProductDetails.clinicalEvidence;
                    case 'handlingObjections':
                      return selectedProductDetails.handlingObjections;
                    case 'pitchPoints':
                      return selectedProductDetails.pitchPoints;
                    default:
                      return null;
                  }
                })() : null
              }
              title={currentModalSection ? 
                (() => {
                  switch (currentModalSection) {
                    case 'scientificRationale':
                      return 'Scientific Rationale';
                    case 'clinicalEvidence':
                      return 'Clinical Evidence';
                    case 'handlingObjections':
                      return 'Handling Objections';
                    case 'pitchPoints':
                      return 'Key Pitch Points';
                    default:
                      return '';
                  }
                })() : ''
              }
            />
            
            {/* Handling Objections */}
            <div
              className={`p-3 rounded-md mb-2 border-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-blue-600/60 border-blue-400/70 hover:bg-blue-600/70' : 'bg-[#15396c]/55 border-[#15396c]/65 hover:bg-[#15396c]/60'}`}
              onClick={() => handleOpenProductDetailsModal('handlingObjections')}
            >
              <div className="flex justify-between items-center">
                <div className={`font-medium ${isDarkMode ? 'text-blue-50' : 'text-[#15396c]'}`}>
                  Handling Objections
                </div>
                <MessageSquare size={18} className={isDarkMode ? 'text-blue-100/70' : 'text-[#15396c]/70'} />
              </div>
            </div>

            {/* Key Pitch Points */}
            {selectedProductDetails.pitchPoints && (
              <div
                className={`p-3 rounded-md mb-2 border-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-blue-500/70 border-blue-300/80 hover:bg-blue-500/80' : 'bg-[#15396c]/70 border-[#15396c]/80 hover:bg-[#15396c]/75'}`}
                onClick={() => handleOpenProductDetailsModal('pitchPoints')}
              >
                <div className="flex justify-between items-center">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-[#15396c]'}`}>
                    Key Pitch Points
                  </div>
                  <Target size={18} className={isDarkMode ? 'text-white/70' : 'text-[#15396c]/70'} />
                </div>
              </div>
            )}

            {/* Add button to clear selected product and show condition-level info */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setSelectedProduct(null)}
                className={`px-3 py-1 text-sm underline ${isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-[#15396c] hover:text-[#15396c]/80'}`}
              >
                View overall condition information
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConditionDetails; 