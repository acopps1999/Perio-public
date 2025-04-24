import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronRight, Info, Filter, BookOpen } from 'lucide-react';
import clsx from 'clsx';

// PatientTypes definition (consider moving to a shared constants file later)
const PATIENT_TYPES = {
  'Type 1': 'Healthy',
  'Type 2': 'Mild inflammation, moderate risk',
  'Type 3': 'Smoker, diabetic, immunocompromised',
  'Type 4': 'Periodontal disease, chronic illness, poor healing'
};

function ConditionDetails({
  selectedCondition,
  activeTab,
  handleTabChange,
  filteredProducts, // The already filtered product list for the current phase/patient type
  patientTypes, // Array like ['All', '1', '2', '3', '4']
  activePatientType,
  handlePatientTypeSelect,
  handleProductSelect, // Handler when a product card is clicked
  handleOpenResearch, // Handler to open research modal (general or for a specific product)
  hasProductsForPhase, // Function to check if a phase has any products
  showAdditionalInfo,
}) {

  const [expandedSections, setExpandedSections] = useState({
    pitchPoints: false,
    competitiveAdvantage: false,
    handlingObjections: false,
    scientificRationale: false,
    clinicalEvidence: false,
    productUsage: false
  });
  
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (!selectedCondition) {
    return (
      <div className="lg:col-span-3 bg-white shadow rounded-lg p-8 text-center text-gray-500">
        Select a condition to view details
      </div>
    );
  }
  
  // Handle clicking on a product card
  const handleProductCardSelect = (product) => {
    // Set the selected product to display its details
    setSelectedProduct(product.replace(' (Type 3/4 Only)', ''));
    // Also call the original handler passed as prop
    handleProductSelect(product);
  };
  
  // Get the details for the selected product
  const getProductDetails = (productName) => {
    if (!productName) return null;
    const cleanName = productName.replace(' (Type 3/4 Only)', '');
    return selectedCondition.productDetails?.[cleanName] || null;
  };
  
  // Get the selected product details
  const selectedProductDetails = getProductDetails(selectedProduct);

  return (
    <div className="lg:col-span-3 bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{selectedCondition.name}</h2>
        <div className="text-sm text-gray-500 mt-1">
          <span className="mr-2">{selectedCondition.category}</span>
          <span className="mr-2">|</span>
          <span>{selectedCondition.dds.join(', ')}</span>
          <span className="mr-2">|</span>
          <span>{selectedCondition.patientType}</span>
        </div>
        
        {/* Recommended Products Section */}
        <div className="mt-6 mb-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Recommended Products</h3>
          </div>
          
          {/* Patient Type Filter for Products */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-shrink-0">
                <span className="text-sm font-medium text-blue-700">Show Recommendations For:</span>
              </div>
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
          <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
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
                        className={`bg-white border border-blue-200 rounded-lg p-5 hover:bg-blue-50 shadow-sm cursor-pointer ${
                          selectedProduct === product.replace(' (Type 3/4 Only)', '') ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleProductCardSelect(product)}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-semibold text-blue-800">{product}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the parent onClick
                              handleOpenResearch(product);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                          >
                            <BookOpen size={14} className="mr-1" />
                            <span>Research</span>
                          </button>
                        </div>
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
        
        {/* Additional Information Section */}
        {showAdditionalInfo && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              {selectedProduct ? `Additional Information: ${selectedProduct}` : 'Additional Information'}
            </h3>
            
            {selectedProduct && selectedProductDetails ? (
              <>
                {/* Product-specific information */}
                
                {/* Usage */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.productUsage ? 'bg-teal-100' : 'bg-teal-50 hover:bg-teal-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, productUsage: !prev.productUsage }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-teal-800">Usage Instructions</div>
                    <div className="text-teal-600">
                      {expandedSections.productUsage ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.productUsage && (
                    <div className="text-teal-700 mt-2 whitespace-pre-line">
                      {typeof selectedProductDetails.usage === 'object'
                        ? (selectedProductDetails.usage[activeTab] 
                            ? <span><strong>{activeTab} phase:</strong> <span className="whitespace-pre-line">{selectedProductDetails.usage[activeTab]}</span></span>
                            : (Object.keys(selectedProductDetails.usage).length > 0 
                                ? <div className="space-y-2">
                                    {Object.entries(selectedProductDetails.usage).map(([phase, instruction]) => (
                                      <div key={phase}><strong>{phase} phase:</strong> <span className="whitespace-pre-line">{instruction}</span></div>
                                    ))}
                                  </div>
                                : 'Usage instructions not available.'))
                        : <span className="whitespace-pre-line">{selectedProductDetails.usage || 'Usage instructions not available.'}</span>}
                    </div>
                  )}
                </div>
                
                {/* Rationale */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.scientificRationale ? 'bg-green-100' : 'bg-green-50 hover:bg-green-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, scientificRationale: !prev.scientificRationale }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-green-800">Scientific Rationale</div>
                    <div className="text-green-600">
                      {expandedSections.scientificRationale ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.scientificRationale && (
                    <div className="text-green-700 mt-2 whitespace-pre-line">
                      {selectedProductDetails.rationale || 'Scientific rationale not available.'}
                    </div>
                  )}
                </div>
                
                {/* Clinical Evidence */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.clinicalEvidence ? 'bg-indigo-100' : 'bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, clinicalEvidence: !prev.clinicalEvidence }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-indigo-800">Clinical Evidence</div>
                    <div className="text-indigo-600">
                      {expandedSections.clinicalEvidence ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.clinicalEvidence && (
                    <div className="text-indigo-700 mt-2 whitespace-pre-line">
                      {selectedProductDetails.clinicalEvidence || 'Clinical evidence not available.'}
                    </div>
                  )}
                </div>
                
                {/* Competitive Advantage */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.competitiveAdvantage ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, competitiveAdvantage: !prev.competitiveAdvantage }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-purple-800">Competitive Advantage</div>
                    <div className="text-purple-600">
                      {expandedSections.competitiveAdvantage ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.competitiveAdvantage && (
                    <div className="text-purple-700 mt-2 whitespace-pre-line">
                      {selectedProductDetails.competitive || 'Competitive advantage information not available.'}
                    </div>
                  )}
                </div>
                
                {/* Handling Objections */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.handlingObjections ? 'bg-amber-100' : 'bg-amber-50 hover:bg-amber-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, handlingObjections: !prev.handlingObjections }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-amber-800">Handling Objections</div>
                    <div className="text-amber-600">
                      {expandedSections.handlingObjections ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.handlingObjections && (
                    <div className="text-amber-700 mt-2 whitespace-pre-line">
                      {selectedProductDetails.objection || 'Objection handling information not available.'}
                    </div>
                  )}
                </div>
                
                {/* Research Articles */}
                {selectedProductDetails.researchArticles && selectedProductDetails.researchArticles.length > 0 && (
                  <div 
                    className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                      expandedSections.pitchPoints ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => setExpandedSections(prev => ({ ...prev, pitchPoints: !prev.pitchPoints }))}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-blue-800">Research Articles</div>
                      <div className="text-blue-600">
                        {expandedSections.pitchPoints ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                    {expandedSections.pitchPoints && (
                      <div className="text-blue-700 mt-2 whitespace-pre-line">
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedProductDetails.researchArticles.map((article, index) => (
                            <li key={index}>{article.title || 'Untitled research article'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Condition-level information (shown when no product is selected) */}
                
                {/* Key Pitch Points */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.pitchPoints ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, pitchPoints: !prev.pitchPoints }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-blue-800">Key Pitch Points</div>
                    <div className="text-blue-600">
                      {expandedSections.pitchPoints ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.pitchPoints && (
                    <div className="text-blue-700 mt-2 whitespace-pre-line">{selectedCondition.pitchPoints || 'No pitch points available.'}</div>
                  )}
                </div>

                {/* Scientific Rationale */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.scientificRationale ? 'bg-green-100' : 'bg-green-50 hover:bg-green-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, scientificRationale: !prev.scientificRationale }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-green-800">Scientific Rationale</div>
                    <div className="text-green-600">
                      {expandedSections.scientificRationale ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.scientificRationale && (
                    <div className="text-green-700 mt-2 whitespace-pre-line">
                      {selectedCondition.scientificRationale || 'Scientific foundation for the recommended treatment approach.'}
                    </div>
                  )}
                </div>
                
                {/* Clinical Evidence */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.clinicalEvidence ? 'bg-indigo-100' : 'bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, clinicalEvidence: !prev.clinicalEvidence }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-indigo-800">Clinical Evidence</div>
                    <div className="text-indigo-600">
                      {expandedSections.clinicalEvidence ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.clinicalEvidence && (
                    <div className="text-indigo-700 mt-2 whitespace-pre-line">
                      {selectedCondition.clinicalEvidence || 'Clinical evidence supporting the treatment recommendations for this condition.'}
                    </div>
                  )}
                </div>
                
                {/* Competitive Advantage */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.competitiveAdvantage ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, competitiveAdvantage: !prev.competitiveAdvantage }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-purple-800">Competitive Advantage</div>
                    <div className="text-purple-600">
                      {expandedSections.competitiveAdvantage ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.competitiveAdvantage && (
                    <div className="text-purple-700 mt-2 whitespace-pre-line">
                      {selectedCondition.competitiveAdvantage || 'No competitive advantage information available.'}
                    </div>
                  )}
                </div>
                
                {/* Handling Objections */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.handlingObjections ? 'bg-amber-100' : 'bg-amber-50 hover:bg-amber-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, handlingObjections: !prev.handlingObjections }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-amber-800">Handling Objections</div>
                    <div className="text-amber-600">
                      {expandedSections.handlingObjections ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.handlingObjections && (
                    <div className="text-amber-700 mt-2 whitespace-pre-line">
                      {selectedCondition.handlingObjections || 'No objection handling information available.'}
                    </div>
                  )}
                </div>

                {/* Product Usage Instructions */}
                <div 
                  className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                    expandedSections.productUsage ? 'bg-teal-100' : 'bg-teal-50 hover:bg-teal-100'
                  }`}
                  onClick={() => setExpandedSections(prev => ({ ...prev, productUsage: !prev.productUsage }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-teal-800">Product Usage Instructions</div>
                    <div className="text-teal-600">
                      {expandedSections.productUsage ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                  {expandedSections.productUsage && (
                    <div className="mt-2 space-y-3">
                      {selectedCondition.productDetails && Object.keys(selectedCondition.productDetails).length > 0 ? (
                        (() => {
                          // Get only products that are configured for the current phase/patient type
                          const configuredProducts = filteredProducts.map(p => p.replace(' (Type 3/4 Only)', ''));
                          
                          // Filter product details to only show configured products
                          const filteredProductDetails = Object.entries(selectedCondition.productDetails)
                            .filter(([productName, _]) => configuredProducts.includes(productName));
                            
                          if (filteredProductDetails.length === 0) {
                            return (
                              <div className="text-teal-700">
                                No product usage information available for the selected phase and patient type.
                              </div>
                            );
                          }
                          
                          return filteredProductDetails.map(([productName, details]) => (
                            <div key={productName} className="bg-white border rounded-md p-3">
                              <h4 className="font-medium text-teal-800">{productName}</h4>
                              <p className="text-teal-700 mt-1">
                                <span className="font-medium">Usage: </span>
                                {typeof details.usage === 'object'
                                  ? (Object.keys(details.usage).length > 0 
                                      ? <div className="space-y-2">
                                          {/* Show only the current phase if available */}
                                          {details.usage[activeTab] ? (
                                            <div><strong>{activeTab} phase:</strong> <span className="whitespace-pre-line">{details.usage[activeTab]}</span></div>
                                          ) : (
                                            // Otherwise show all phases
                                            Object.entries(details.usage).map(([phase, instruction]) => (
                                              <div key={phase}><strong>{phase} phase:</strong> <span className="whitespace-pre-line">{instruction}</span></div>
                                            ))
                                          )}
                                        </div>
                                      : 'Usage instructions not available.')
                                  : <span className="whitespace-pre-line">{details.usage || 'Usage instructions not available.'}</span>}
                              </p>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="text-teal-700">No product usage information available.</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Add button to clear selected product and show condition-level info */}
            {selectedProduct && (
              <div className="mt-3 text-center">
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View overall condition information
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConditionDetails; 