import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Info, User } from 'lucide-react';
import clsx from 'clsx';
import DynamicTextarea from './DynamicTextarea';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import {
  updateConditionFieldRealtime,
  addPhaseToConditionRealtime,
  removePhaseFromConditionRealtime,
  updateProductDetailRealtime,
  addProductToPatientTypeRealtime,
  removeProductFromPatientTypeRealtime
} from './AdminPanelSupabase';

// AdminPanelConditions Component
function AdminPanelConditions({
  // Props from AdminPanelCore
  conditions,
  setConditions,
  selectedCondition,
  setSelectedCondition,
  categories,
  ddsTypes,
  allProducts,
  patientTypes,
  activePatientType,
  setActivePatientType,
  patientSpecificProducts,
  setPatientSpecificProducts,
  selectedResearchProduct,
  setSelectedResearchProduct,
  showSuccess,
  setShowSuccess,
  onClose,
  handleConditionSelect,
  handleAddCondition,
  confirmDelete,
  updateConditionField,
  updateProductDetail,
  handlePatientTypeSelect,
  addProductToPatientType,
  removeProductFromPatientType,
  getAllProductsForCondition,
  saveStatus,
  executeUpdate,
  ToastContainer
}) {

// State for tracking expanded product sections
const [expandedProducts, setExpandedProducts] = useState({});
// State for new phase input
const [newPhase, setNewPhase] = useState('');

// Debounced callback for condition field updates
const debouncedUpdateConditionField = useDebouncedCallback(async (conditionId, field, value) => {
  if (!conditionId) return;

  const operationId = `condition-${conditionId}-${field}`;

  await executeUpdate(
    operationId,
    // Optimistic update (already done via updateConditionField)
    () => {
      const oldConditions = [...conditions];
      const oldSelected = {...selectedCondition};

      // The UI is already updated via updateConditionField
      // Rollback
      return () => {
        setConditions(oldConditions);
        setSelectedCondition(oldSelected);
      };
    },
    // Database update
    async () => {
      return await updateConditionFieldRealtime(conditionId, field, value);
    },
    null,
    `Failed to save ${field}`
  );
}, 500);

// Debounced callback for product detail updates
const debouncedUpdateProductDetail = useDebouncedCallback(async (conditionId, productName, field, value) => {
  if (!conditionId) return;

  const operationId = `product-detail-${conditionId}-${productName}-${field}`;

  await executeUpdate(
    operationId,
    // Optimistic update (already done via updateProductDetail)
    () => {
      const oldConditions = [...conditions];
      const oldSelected = {...selectedCondition};

      // The UI is already updated via updateProductDetail
      // Rollback
      return () => {
        setConditions(oldConditions);
        setSelectedCondition(oldSelected);
      };
    },
    // Database update
    async () => {
      return await updateProductDetailRealtime(conditionId, productName, field, value);
    },
    null,
    `Failed to save ${field}`
  );
}, 500);

// Handler for adding a phase
const handleAddPhase = async () => {
  if (!newPhase.trim() || !selectedCondition?.db_id) return;

  const phaseName = newPhase.trim();
  const operationId = `phase-add-${selectedCondition.db_id}-${phaseName}`;

  await executeUpdate(
    operationId,
    // Optimistic update
    () => {
      const oldConditions = [...conditions];
      const oldSelected = {...selectedCondition};
      const oldNewPhase = newPhase;

      const updatedPhases = [...(selectedCondition.phases || []), phaseName];
      setConditions(prev => prev.map(c =>
        c.db_id === selectedCondition.db_id
          ? { ...c, phases: updatedPhases }
          : c
      ));
      setSelectedCondition(prev => ({ ...prev, phases: updatedPhases }));
      setNewPhase('');

      // Rollback
      return () => {
        setConditions(oldConditions);
        setSelectedCondition(oldSelected);
        setNewPhase(oldNewPhase);
      };
    },
    // Database update
    async () => {
      return await addPhaseToConditionRealtime(selectedCondition.db_id, phaseName);
    },
    `Added phase "${phaseName}"`,
    `Failed to add phase "${phaseName}"`
  );
};

// Handler for removing a phase
const handleRemovePhase = async (phaseToRemove) => {
  if (!selectedCondition?.db_id) return;

  const operationId = `phase-remove-${selectedCondition.db_id}-${phaseToRemove}`;

  await executeUpdate(
    operationId,
    // Optimistic update
    () => {
      const oldConditions = [...conditions];
      const oldSelected = {...selectedCondition};

      const updatedPhases = selectedCondition.phases.filter(p => p !== phaseToRemove);
      setConditions(prev => prev.map(c =>
        c.db_id === selectedCondition.db_id
          ? { ...c, phases: updatedPhases }
          : c
      ));
      setSelectedCondition(prev => ({ ...prev, phases: updatedPhases }));

      // Rollback
      return () => {
        setConditions(oldConditions);
        setSelectedCondition(oldSelected);
      };
    },
    // Database update
    async () => {
      return await removePhaseFromConditionRealtime(selectedCondition.db_id, phaseToRemove);
    },
    `Removed phase "${phaseToRemove}"`,
    `Failed to remove phase "${phaseToRemove}"`
  );
};

// Return early if no data
if (conditions.length === 0) {
  return (
    <div className="text-center py-10 text-gray-500">
      Loading conditions...
    </div>
  );
}

// Function to get unique products that are actually configured as recommendations
const getRecommendedProductsForCondition = (condition) => {
  if (!condition || !condition.patientSpecificConfig) return [];

  const recommendedProducts = new Set();

  // Iterate through all phases
  Object.keys(condition.patientSpecificConfig).forEach(phase => {
    const phaseConfig = condition.patientSpecificConfig[phase];

    // Iterate through all patient types in this phase
    Object.keys(phaseConfig).forEach(patientType => {
      const products = phaseConfig[patientType] || [];

      // Add each product to the set
      products.forEach(product => {
        if (product && product.trim()) {
          recommendedProducts.add(product);
        }
      });
    });
  });

  return Array.from(recommendedProducts).sort();
};

// Function to get phases where a specific product is recommended
const getPhasesForProduct = (condition, productName) => {
  if (!condition || !condition.patientSpecificConfig) return [];

  const productPhases = [];

  // Iterate through all phases
  Object.keys(condition.patientSpecificConfig).forEach(phase => {
    const phaseConfig = condition.patientSpecificConfig[phase];

    // Check if the product is recommended for any patient type in this phase
    const isProductInPhase = Object.keys(phaseConfig).some(patientType => {
      const products = phaseConfig[patientType] || [];
      return products.includes(productName);
    });

    if (isProductInPhase) {
      productPhases.push(phase);
    }
  });

  return productPhases;
};

// Render treatment modifier filter and product configuration UI
const renderPatientTypeProductConfig = (phase) => {
  return (
    <div className="mt-4 border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">Treatment Modifier Product Recommendation</h4>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Filter by:</span>
          <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelect}>
            <Select.Trigger className="px-3 py-1 text-sm border border-gray-300 rounded-md flex items-center focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c]">
              <User size={15} className="mr-1 text-[#15396c]" />
              <Select.Value />
              <Select.Icon><ChevronDown size={15} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white rounded-md shadow-lg border min-w-[220px] z-[9999]">
                <Select.Viewport className="p-1">
                    <Select.Item
                      key="all"
                      value="All"
                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                    >
                    <Select.ItemText>All Treatment Modifiers</Select.ItemText>
                  </Select.Item>
                  {patientTypes.map((type) => (
                    <Select.Item
                      key={type.id}
                      value={type.name}
                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                    >
                      <Select.ItemText>{type.name}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
      
      {activePatientType !== 'all' && (
        <div className="mb-4 p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-700 flex items-center">
          <Info size={15} className="mr-1 flex-shrink-0 text-[#15396c]" />
          <span>
            Configuring products specifically for <strong>{activePatientType}</strong>.
            Products added here will only be recommended for this treatment modifier.
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Products for {activePatientType === 'all' ? 'All Treatment Modifiers' : `${activePatientType}`}</span>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addProductToPatientType(phase, activePatientType, e.target.value);
              e.target.value = ''; // Reset select
            }
          }}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Add product...</option>
          {allProducts
            .filter(product => {
              // Only show products that aren't already added for this patient type
              if (!patientSpecificProducts[phase]) return true;
              return !patientSpecificProducts[phase][activePatientType]?.includes(product.name);
            })
            .map((product) => (
              <option key={product.name} value={product.name}>
                {product.name}{!product.is_available ? ' (Not Available)' : ''}
              </option>
            ))}
        </select>
      </div>
      
      {patientSpecificProducts[phase] && patientSpecificProducts[phase][activePatientType]?.length > 0 ? (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {patientSpecificProducts[phase][activePatientType].map((product) => (
            <li 
              key={product}
              className="bg-white border rounded-md p-2 flex justify-between items-center"
            >
              <span>{product}</span>
              <button
                onClick={() => removeProductFromPatientType(phase, activePatientType, product)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md">
          No products configured for {activePatientType === 'all' ? 'All Treatment Modifiers' : `Treatment Modifier ${activePatientType}`}.
        </div>
      )}
    </div>
  );
};

return (
  <div className="flex-grow overflow-auto">
    <div className="flex h-full">
      {/* Conditions List */}
      <div className="w-1/3 border-r p-4" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">All Conditions & Surgical Procedures</h3>
          <button
            onClick={handleAddCondition}
            className="p-1 text-[#15396c] hover:text-[#15396c]/80 inline-flex items-center text-sm"
          >
            <Plus size={16} className="mr-1" />
            Add New
          </button>
        </div>
        
        <ul className="space-y-1">
          {conditions.map((condition) => (
            <li 
              key={condition.name}
              className={clsx(
                "px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group transition-colors border-l-4",
                selectedCondition && selectedCondition.name === condition.name
                  ? "bg-[#15396c] border-[#15396c]"
                  : "hover:bg-gray-50 border-transparent"
              )}
              onClick={() => handleConditionSelect(condition)}
            >
              <div>
                <div className={clsx(
                  "font-medium text-sm",
                  selectedCondition && selectedCondition.name === condition.name ? "text-white" : "text-black"
                )}>
                  {condition.name}
                </div>
                <div className={clsx(
                  "text-xs",
                  selectedCondition && selectedCondition.name === condition.name ? "text-gray-200" : "text-gray-500"
                )}>
                  {condition.category}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete('condition', condition);
                }}
                className={clsx(
                  "opacity-0 group-hover:opacity-100 hover:text-red-700 p-1",
                  selectedCondition && selectedCondition.name === condition.name ? "text-red-300" : "text-red-500"
                )}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Condition Editor */}
      <div className="w-2/3 p-4" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
        {selectedCondition ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Condition Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition & Surgical Procedure Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedCondition.name}
                    onChange={(e) => {
                      updateConditionField(selectedCondition.db_id, 'name', e.target.value);
                      debouncedUpdateConditionField(selectedCondition.db_id, 'name', e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                  />
                  <SaveStatusIndicator
                    status={saveStatus[`condition-${selectedCondition.db_id}-name`]}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={selectedCondition.category}
                    onChange={(e) => {
                      // Update database with category_id (will convert name to ID and update local state)
                      updateConditionField(selectedCondition.db_id, 'category_id', e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <SaveStatusIndicator
                    status={saveStatus[`condition-${selectedCondition.db_id}-category_id`]}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Treatment Modifier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatment Modifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedCondition.patientType}
                  onChange={(e) => {
                    // Only update the input value for immediate UI feedback
                    // The debounced function will handle state and database updates
                    const newValue = e.target.value;
                    // Immediate local UI update only
                    setSelectedCondition(prev => ({ ...prev, patientType: newValue }));
                    // Debounced database save (will also update conditions array)
                    debouncedUpdateConditionField(selectedCondition.db_id, 'patient_type', newValue);
                  }}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                />
                <SaveStatusIndicator
                  status={saveStatus[`condition-${selectedCondition.db_id}-patient_type`]}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Format: "Types 1 to 4" or "Types 3 to 4"</p>
            </div>
            
            {/* DDS Types - Hidden */}
            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DDS Types
              </label>
              <div className="border border-gray-300 rounded-md p-2 mb-2">
                <div className="flex flex-wrap gap-2">
                  {selectedCondition.dds.map((dds) => (
                    <span 
                      key={dds} 
                      className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {dds}
                      <button
                        onClick={() => {
                          const updatedDds = selectedCondition.dds.filter(d => d !== dds);
                          updateConditionField(selectedCondition.db_id, 'dds', updatedDds);
                        }}
                        className="ml-1 text-slate-700 hover:text-slate-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value && !selectedCondition.dds.includes(e.target.value)) {
                    const updatedDds = [...selectedCondition.dds, e.target.value];
                    updateConditionField(selectedCondition.db_id, 'dds', updatedDds);
                  }
                  e.target.value = ''; // Reset select
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
              >
                <option value="">Add DDS Type...</option>
                {ddsTypes.filter(dds => !selectedCondition.dds.includes(dds)).map((dds) => (
                  <option key={dds} value={dds}>
                    {dds}
                  </option>
                ))}
              </select>
            </div>

            {/* Phases */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatment Phases
              </label>
              <div className="border border-gray-300 rounded-md p-2 mb-2">
                <div className="flex flex-wrap gap-2">
                  {selectedCondition.phases.map((phase) => (
                    <span
                      key={phase}
                      className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {phase}
                      <button
                        onClick={() => handleRemovePhase(phase)}
                        className="ml-1 text-purple-700 hover:text-purple-900"
                      >
                        <X size={14} />
                      </button>
                      <SaveStatusIndicator
                        status={saveStatus[`phase-remove-${selectedCondition.db_id}-${phase}`]}
                      />
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value)}
                  placeholder="New phase name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPhase.trim() && !selectedCondition.phases.includes(newPhase.trim())) {
                      handleAddPhase();
                    }
                  }}
                />
                <button
                  onClick={handleAddPhase}
                  className="px-3 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 flex items-center gap-1"
                >
                  Add
                  <SaveStatusIndicator
                    status={saveStatus[`phase-add-${selectedCondition.db_id}-${newPhase.trim()}`]}
                  />
                </button>
              </div>
            </div>
            
            {/* Products by Phase with Treatment Modifier Filtering */}
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3">Products by Phase</h3>
              
              <Tabs.Root defaultValue={selectedCondition.phases[0]} className="border rounded-md">
                <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
                  {selectedCondition.phases.map((phase, index) => {
                    // Different opacity levels of the selected condition color for each phase
                    const getPhaseColor = (phaseIndex) => {
                      const colors = [
                        'bg-[#15396c]/40', // First phase - 40% opacity
                        'bg-[#15396c]/60', // Second phase - 60% opacity  
                        'bg-[#15396c]/80'  // Third phase - 80% opacity
                      ];
                      return colors[phaseIndex] || 'bg-[#15396c]/40';
                    };
                    
                    return (
                    <Tabs.Trigger
                      key={phase}
                      value={phase}
                      className={clsx(
                          "flex-1 px-4 py-2 text-sm font-medium text-center focus:outline-none transition-all duration-200 text-white",
                          getPhaseColor(index),
                          "data-[state=active]:shadow-[inset_0_0_0_4px_#15396c]",
                          "data-[state=inactive]:hover:shadow-[inset_0_0_0_2px_rgba(156,163,175,0.5)]"
                      )}
                    >
                      {phase} Phase
                    </Tabs.Trigger>
                    );
                  })}
                </Tabs.List>
                
                {selectedCondition.phases.map((phase) => (
                  <Tabs.Content key={phase} value={phase} className="p-4">
                    {/* Patient-specific product configuration */}
                    {renderPatientTypeProductConfig(phase)}
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            </div>
            
            {/* Condition-Specific Research */}
            <div>
              <h3 className="font-medium text-lg mb-3">Condition-Specific Research</h3>
              
              {selectedCondition && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product to Manage Research:
                  </label>
                  {(() => {
                    const recommendedProducts = getRecommendedProductsForCondition(selectedCondition);
                    
                    if (recommendedProducts.length === 0) {
                      return (
                        <div className="p-3 text-gray-500 bg-gray-50 border border-gray-200 rounded-md text-sm">
                          No products are currently configured as recommendations for this condition. 
                          Add products in the "Products by Phase" section above to manage their research.
                        </div>
                      );
                    }
                    
                    return (
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        onChange={(e) => {
                          if (e.target.value) {
                            // Store the selected product name in state
                            setSelectedResearchProduct(e.target.value);
                          }
                        }}
                        value={selectedResearchProduct || ''}
                      >
                        <option value="">Select a product...</option>
                        {recommendedProducts.map(prod => (
                          <option key={prod} value={prod}>{prod}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}
              
              {selectedResearchProduct && (
                <div>
                  <h4 className="font-medium text-md mb-2">
                    Research Articles for {selectedResearchProduct}
                  </h4>
                  
                  {/* Initialize condition-specific research if it doesn't exist */}
                  {!selectedCondition.conditionSpecificResearch && updateConditionField(
                    selectedCondition.name, 
                    'conditionSpecificResearch', 
                    {}
                  )}
                  
                  {/* Check if we have condition-specific research for this product */}
                  {selectedCondition.conditionSpecificResearch && 
                  selectedCondition.conditionSpecificResearch[selectedResearchProduct] && 
                  selectedCondition.conditionSpecificResearch[selectedResearchProduct].map((article, index) => (
                    <div key={index} className="flex space-x-2 mb-4 border-b pb-4">
                      <div className="flex-grow space-y-2">
                        <input
                          type="text"
                          placeholder="Article title"
                          value={article.title || ''}
                          onChange={(e) => {
                            const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                            const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                            updatedArticles[index].title = e.target.value;
                            
                            updatedResearch[selectedResearchProduct] = updatedArticles;
                            
                            updateConditionField(
                              selectedCondition.name, 
                              'conditionSpecificResearch', 
                              updatedResearch
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        
                        <input
                          type="text"
                          placeholder="Author/Source"
                          value={article.author || ''}
                          onChange={(e) => {
                            const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                            const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                            updatedArticles[index].author = e.target.value;
                            
                            updatedResearch[selectedResearchProduct] = updatedArticles;
                            
                            updateConditionField(
                              selectedCondition.name, 
                              'conditionSpecificResearch', 
                              updatedResearch
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        
                        <DynamicTextarea
                          initialRows={3}
                          maxRows={8}
                          placeholder="Abstract (optional)"
                          value={article.abstract || ''}
                          onChange={(e) => {
                            const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                            const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                            updatedArticles[index].abstract = e.target.value;
                            
                            updatedResearch[selectedResearchProduct] = updatedArticles;
                            
                            updateConditionField(
                              selectedCondition.name, 
                              'conditionSpecificResearch', 
                              updatedResearch
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        
                        <input
                          type="text"
                          placeholder="URL (optional)"
                          value={article.url || ''}
                          onChange={(e) => {
                            const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                            const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                            updatedArticles[index].url = e.target.value;
                            
                            updatedResearch[selectedResearchProduct] = updatedArticles;
                            
                            updateConditionField(
                              selectedCondition.name, 
                              'conditionSpecificResearch', 
                              updatedResearch
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      
                      <button
                        onClick={() => {
                          const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                          const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                          updatedArticles.splice(index, 1);
                          
                          updatedResearch[selectedResearchProduct] = updatedArticles;
                          
                          updateConditionField(
                            selectedCondition.name, 
                            'conditionSpecificResearch', 
                            updatedResearch
                          );
                        }}
                        className="p-2 border border-red-300 rounded-md text-red-500 hover:bg-red-50 self-start"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                      const updatedArticles = [...(updatedResearch[selectedResearchProduct] || []), { title: '', author: '', abstract: '', url: '' }];
                      
                      updatedResearch[selectedResearchProduct] = updatedArticles;
                      
                      updateConditionField(
                        selectedCondition.name, 
                        'conditionSpecificResearch', 
                        updatedResearch
                      );
                    }}
                    className="mt-2 px-3 py-2 border border-indigo-300 rounded-md text-indigo-600 hover:bg-indigo-50 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Research Article
                  </button>
                </div>
              )}
              
              {!selectedResearchProduct && selectedCondition && (
                <div className="text-gray-500 italic">
                  {getRecommendedProductsForCondition(selectedCondition).length > 0 
                    ? "Select a product from the dropdown above to manage its research articles."
                    : "Add product recommendations in the 'Products by Phase' section above to manage research articles."
                  }
                </div>
              )}
            </div>
            
            {/* Product Details */}
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-3">Product Details</h3>
              
              {(() => {
                const recommendedProducts = getRecommendedProductsForCondition(selectedCondition);
                
                if (recommendedProducts.length === 0) {
                  return (
                    <p className="text-gray-500 text-sm italic">
                      No product details available. Add products to phases first.
                    </p>
                  );
                }
                
                return (
                  <div className="space-y-6">
                    {recommendedProducts.map((productName) => {
                      // Get product details from the condition's productDetails object
                      const productDetails = selectedCondition.productDetails?.[productName] || {};
                      const isExpanded = expandedProducts[productName] || false;
                      
                    return (
                    <div key={productName} className="border rounded-md bg-gray-50">
                      {/* Collapsible Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center"
                        onClick={() => setExpandedProducts(prev => ({
                          ...prev,
                          [productName]: !prev[productName]
                        }))}
                      >
                        <h4 className="font-medium text-md">{productName}</h4>
                        <div className="text-gray-600">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                      
                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t bg-white">
                          {/* Usage Instructions with Phase Tabs */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Usage Instructions
                            </label>
                            
                            {(() => {
                              // Get only the phases where this product is recommended
                              const recommendedPhases = getPhasesForProduct(selectedCondition, productName);
                              
                              if (recommendedPhases.length > 0) {
                                return (
                                  <div className="border rounded-md">
                                    <Tabs.Root defaultValue={recommendedPhases[0]} className="w-full">
                                      <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
                                        {recommendedPhases.map((phase, index) => {
                                          // Different opacity levels of the selected condition color for each phase
                                          const getPhaseColor = (phaseIndex) => {
                                            const colors = [
                                              'bg-[#15396c]/40', // First phase - 40% opacity
                                              'bg-[#15396c]/60', // Second phase - 60% opacity  
                                              'bg-[#15396c]/80'  // Third phase - 80% opacity
                                            ];
                                            return colors[phaseIndex] || 'bg-[#15396c]/40';
                                          };
                                          
                                          return (
                                            <Tabs.Trigger
                                              key={phase}
                                              value={phase}
                                              className={clsx(
                                                "flex-1 px-4 py-2 text-sm font-medium text-center focus:outline-none transition-all duration-200 text-white",
                                                getPhaseColor(index),
                                                "data-[state=active]:shadow-[inset_0_0_0_4px_#15396c]",
                                                "data-[state=inactive]:hover:shadow-[inset_0_0_0_2px_rgba(156,163,175,0.5)]"
                                              )}
                                            >
                                              {phase}
                                            </Tabs.Trigger>
                                          );
                                        })}
                                      </Tabs.List>
                                      
                                      {recommendedPhases.map((phase) => (
                                        <Tabs.Content key={phase} value={phase} className="p-4">
                                          <div className="relative">
                                            <DynamicTextarea
                                              initialRows={3}
                                              maxRows={12}
                                              value={
                                                productDetails.usage &&
                                                typeof productDetails.usage === 'object' ?
                                                productDetails.usage[phase] || '' :
                                                productDetails.usage || ''
                                              }
                                              onChange={(e) => {
                                                updateProductDetail(
                                                  selectedCondition.name,
                                                  productName,
                                                  'usage',
                                                  e.target.value,
                                                  phase
                                                );
                                                debouncedUpdateProductDetail(
                                                  selectedCondition.db_id,
                                                  productName,
                                                  `usage_${phase}`,
                                                  e.target.value
                                                );
                                              }}
                                              placeholder={`Enter usage instructions for ${phase} phase. Line breaks will be preserved in the display.`}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                                            />
                                            <SaveStatusIndicator
                                              status={saveStatus[`product-detail-${selectedCondition.db_id}-${productName}-usage_${phase}`]}
                                              className="absolute right-2 top-2"
                                            />
                                          </div>
                                        </Tabs.Content>
                                      ))}
                                    </Tabs.Root>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="border rounded-md p-4 bg-gray-50 text-gray-500 italic">
                                    This product is not recommended for any phases. Add it to a phase in the "Products by Phase" section above to add usage instructions.
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          
                          {/* Scientific Rationale */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Scientific Rationale
                            </label>
                            <div className="relative">
                              <DynamicTextarea
                                initialRows={2}
                                maxRows={8}
                                value={productDetails.rationale || ''}
                                onChange={(e) => {
                                  updateProductDetail(
                                    selectedCondition.name,
                                    productName,
                                    'rationale',
                                    e.target.value
                                  );
                                  debouncedUpdateProductDetail(
                                    selectedCondition.db_id,
                                    productName,
                                    'rationale',
                                    e.target.value
                                  );
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter scientific rationale. Line breaks will be preserved in the display."
                              />
                              <SaveStatusIndicator
                                status={saveStatus[`product-detail-${selectedCondition.db_id}-${productName}-rationale`]}
                                className="absolute right-2 top-2"
                              />
                            </div>
                          </div>

                          {/* Clinical Evidence */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Clinical Evidence
                            </label>
                            <div className="relative">
                              <DynamicTextarea
                                initialRows={2}
                                maxRows={8}
                                value={productDetails.clinicalEvidence || ''}
                                onChange={(e) => {
                                  updateProductDetail(
                                    selectedCondition.name,
                                    productName,
                                    'clinicalEvidence',
                                    e.target.value
                                  );
                                  debouncedUpdateProductDetail(
                                    selectedCondition.db_id,
                                    productName,
                                    'clinical_evidence',
                                    e.target.value
                                  );
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter clinical evidence. Line breaks will be preserved in the display."
                              />
                              <SaveStatusIndicator
                                status={saveStatus[`product-detail-${selectedCondition.db_id}-${productName}-clinical_evidence`]}
                                className="absolute right-2 top-2"
                              />
                            </div>
                          </div>

                          {/* Handling Objections */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Handling Objections
                            </label>
                            <div className="relative">
                              <DynamicTextarea
                                initialRows={2}
                                maxRows={8}
                                value={productDetails.handlingObjections || ''}
                                onChange={(e) => {
                                  updateProductDetail(
                                    selectedCondition.name,
                                    productName,
                                    'handlingObjections',
                                    e.target.value
                                  );
                                  debouncedUpdateProductDetail(
                                    selectedCondition.db_id,
                                    productName,
                                    'handling_objections',
                                    e.target.value
                                  );
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter objection handling information. Line breaks will be preserved in the display."
                              />
                              <SaveStatusIndicator
                                status={saveStatus[`product-detail-${selectedCondition.db_id}-${productName}-handling_objections`]}
                                className="absolute right-2 top-2"
                              />
                            </div>
                          </div>

                          {/* Key Pitch Points */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Key Pitch Points
                            </label>
                            <div className="relative">
                              <DynamicTextarea
                                initialRows={2}
                                maxRows={8}
                                value={productDetails.pitchPoints || ''}
                                onChange={(e) => {
                                  updateProductDetail(
                                    selectedCondition.name,
                                    productName,
                                    'pitchPoints',
                                    e.target.value
                                  );
                                  debouncedUpdateProductDetail(
                                    selectedCondition.db_id,
                                    productName,
                                    'pitch_points',
                                    e.target.value
                                  );
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter key pitch points. Line breaks will be preserved in the display."
                              />
                              <SaveStatusIndicator
                                status={saveStatus[`product-detail-${selectedCondition.db_id}-${productName}-pitch_points`]}
                                className="absolute right-2 top-2"
                              />
                            </div>
                          </div>
                          

                        </div>
                      )}
                    </div>
                    );
                  })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Select a condition to edit or create a new one
          </div>
        )}
      </div>
    </div>
    {ToastContainer && <ToastContainer />}
  </div>
);
}

export default AdminPanelConditions;