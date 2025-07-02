import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronRight, Info, Filter, BookOpen, Target, ArrowLeft, Microscope, FileText, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
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

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [competitiveAdvantageModalOpen, setCompetitiveAdvantageModalOpen] = useState(false);
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState(null);
  
  // Product details modal state
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [currentModalSection, setCurrentModalSection] = useState(null);

  const getPatientTypeDescription = (name) => {
    if (name === 'All') return 'All Treatment Modifiers';
    const pt = patientTypes.find(p => p.name === name);
    return pt ? `${pt.name}: ${pt.description}` : name;
  };

  if (!selectedCondition) {
    return (
      <div className="lg:col-span-3 bg-white shadow rounded-lg p-8 text-center text-gray-500">
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
      const { supabase } = await import('../supabaseClient');
      
      // Load competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitive_advantage_competitors')
        .select('competitor_name, advantages')
        .eq('product_name', productName);
      
      if (competitorsError) {
        console.error('Error loading competitors:', competitorsError);
      }
      
      // Load active ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('competitive_advantage_active_ingredients')
        .select('ingredient_name, advantages')
        .eq('product_name', productName);
      
      if (ingredientsError) {
        console.error('Error loading active ingredients:', ingredientsError);
      }
      
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
    <div className="lg:col-span-3 bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        {/* Mobile back button */}
        <div className="flex items-center mb-2 lg:hidden">
          <button
            onClick={onMobileBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            <span className="text-sm font-medium">Back to Conditions</span>
          </button>
        </div>
        
        <h2 className="text-xl font-semibold">{selectedCondition.name}</h2>
        <div className="text-sm text-gray-500 mt-1">
          <span className="mr-2">{selectedCondition.category}</span>
          <span className="mr-2 hidden">|</span>
          <span className="hidden">{selectedCondition.dds.join(', ')}</span>
          <span className="mr-2 hidden">|</span>
          <span>{selectedCondition.patientType}</span>
        </div>
        
        {/* Recommended Products Section */}
        <div className="mt-6 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Recommended Products</h3>
            <button
              onClick={() => handleOpenResearch()} // Pass no product to open general research
              className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center text-sm hidden"
            >
              <BookOpen size={16} className="mr-2" />
              View Published Research
            </button>
          </div>
          
          {/* Treatment Modifier Filter for Products */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-shrink-0">
                <span className="text-sm font-medium text-gray-700">Show Recommendations For:</span>
              </div>
              <div className="flex-grow">
                <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelectWithClear}>
                  <Select.Trigger className="flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c]">
                    <div className="flex items-center">
                      <Filter size={16} className="mr-2 text-[#15396c]" />
                      <Select.Value placeholder="Select Treatment Modifier" />
                    </div>
                    <Select.Icon><ChevronDown size={18} /></Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                      <Select.Viewport className="p-1">
                        {[{ name: 'All' }, ...patientTypes].map((pt) => (
                          <Select.Item
                            key={pt.name}
                            value={pt.name}
                            className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
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
              <div className="mt-2 text-sm text-gray-600 flex items-center">
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
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-6 border-[#15396c] p-4 mb-4 shadow-md rounded-r-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-[#15396c]" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-base font-semibold text-[#15396c] mb-2">
                      Usage Instructions for {selectedProduct} - {activeTab} Phase
                    </h4>
                    <div className="bg-white p-3 rounded-md border border-[#15396c]/20 shadow-sm">
                      <div className="text-sm text-gray-800 leading-relaxed">
                        {typeof selectedProductDetails.usage === 'object'
                          ? (selectedProductDetails.usage[activeTab] 
                              ? <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage[activeTab]}</div>
                              : <div className="text-gray-600 italic">No specific instructions for {activeTab} phase. See general usage below.</div>)
                          : <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedCondition.phases.map((phase) => (
              <Tabs.Content key={phase} value={phase} className="p-4 bg-white border border-t-0 rounded-b-lg">
                {filteredProducts.length > 0 ? (
                  <div className="space-y-4">
                    {filteredProducts.map((product) => {
                      const cleanProductName = product.replace(' (Type 3/4 Only)', '');
                      const isSelected = selectedProduct === cleanProductName;
                      const isAvailable = getProductAvailability ? getProductAvailability(product) : true;
                      
                      // Debug logging
                      console.log('DEBUG ConditionDetails product card:', {
                        product,
                        cleanProductName,
                        isAvailable,
                        hasGetProductAvailability: !!getProductAvailability
                      });
                      
                      return (
                      <div 
                        key={product}
                        className={clsx(
                          "border-2 rounded-lg p-5 shadow-sm cursor-pointer transition-all duration-200",
                          isSelected
                            ? "border-[#15396c] !bg-[#15396c]" // Force background with !important
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
                  <div className="p-8 text-center text-gray-500">
                    <strong>No products recommended</strong> for {phase} phase with Treatment Modifier {activePatientType}.
                  </div>
                ) : (
                  <div className="text-gray-500">No products recommended for this phase.</div>
                )}
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
        
        {/* Additional Information Section */}
        {showAdditionalInfo && selectedProduct && selectedProductDetails && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Additional Information: {selectedProduct}
            </h3>
            
            {/* Product-specific information */}
            
            {/* Scientific Rationale */}
            <div 
              className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/10 border-[#15396c]/20 cursor-pointer hover:bg-[#15396c]/15 transition-colors"
              onClick={() => handleOpenProductDetailsModal('scientificRationale')}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-[#15396c]">
                  Scientific Rationale
                </div>
                <Microscope size={18} className="text-[#15396c]/70" />
              </div>
            </div>
            
            {/* Clinical Evidence */}
            <div 
              className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/25 border-[#15396c]/35 cursor-pointer hover:bg-[#15396c]/30 transition-colors"
              onClick={() => handleOpenProductDetailsModal('clinicalEvidence')}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-[#15396c]">
                  Clinical Evidence
                </div>
                <FileText size={18} className="text-[#15396c]/70" />
              </div>
            </div>
            
            {/* Competitive Advantage */}
            <div 
              className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/40 border-[#15396c]/50 cursor-pointer hover:bg-[#15396c]/45 transition-colors"
              onClick={handleOpenCompetitiveAdvantage}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-[#15396c]">
                  Competitive Advantage
                </div>
                <Target size={18} className="text-[#15396c]/70" />
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
              className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/55 border-[#15396c]/65 cursor-pointer hover:bg-[#15396c]/60 transition-colors"
              onClick={() => handleOpenProductDetailsModal('handlingObjections')}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-[#15396c]">
                  Handling Objections
                </div>
                <MessageSquare size={18} className="text-[#15396c]/70" />
              </div>
            </div>
            
            {/* Key Pitch Points */}
            {selectedProductDetails.pitchPoints && (
              <div 
                className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/70 border-[#15396c]/80 cursor-pointer hover:bg-[#15396c]/75 transition-colors"
                onClick={() => handleOpenProductDetailsModal('pitchPoints')}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-[#15396c]">
                    Key Pitch Points
                  </div>
                  <Target size={18} className="text-[#15396c]/70" />
                </div>
              </div>
            )}
            
            {/* Add button to clear selected product and show condition-level info */}
            <div className="mt-3 text-center">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1 text-sm text-[#15396c] hover:text-[#15396c]/80 underline"
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