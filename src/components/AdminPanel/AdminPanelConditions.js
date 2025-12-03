import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Plus, Trash2, X, ChevronRight, ArrowLeft, Edit3, FileText, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import DraggableProductList from './DraggableProductList';
import ProductEditDrawer from './ProductEditDrawer';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { useTheme } from '../../contexts/ThemeContext';
import {
  updateConditionFieldRealtime,
  updateProductDetailRealtime,
  addPhaseToConditionRealtime,
  removePhaseFromConditionRealtime,
  addProductToPhaseRealtime,
  removeProductFromPhaseRealtime,
  reorderProductsRealtime
} from './AdminPanelSupabase';

/**
 * AdminPanelConditions Component
 *
 * Streamlined layout with:
 * - Basic info always visible
 * - Modifiers (formerly phases) section
 * - Products by Modifier with drag-and-drop ranking
 * - Product cards that open full editing drawer
 */
function AdminPanelConditions({
  conditions,
  setConditions,
  selectedCondition,
  setSelectedCondition,
  categories,
  ddsTypes,
  allProducts,
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
  getAllProductsForCondition,
  saveStatus,
  executeUpdate,
  ToastContainer,
  parentDrawerWidth
}) {
  const { isDarkMode } = useTheme();

  // State for view mode: 'list' or 'detail'
  const [viewMode, setViewMode] = useState('list');
  // State for new modifier input
  const [newModifier, setNewModifier] = useState('');
  // State for product edit drawer
  const [editingProduct, setEditingProduct] = useState(null);

  // Debounced callback for condition field updates
  const debouncedUpdateConditionField = useDebouncedCallback(async (conditionId, field, value) => {
    if (!conditionId) return;

    const operationId = `condition-${conditionId}-${field}`;

    await executeUpdate(
      operationId,
      () => {
        const oldConditions = [...conditions];
        const oldSelected = {...selectedCondition};
        return () => {
          setConditions(oldConditions);
          setSelectedCondition(oldSelected);
        };
      },
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
      () => {
        const oldConditions = [...conditions];
        const oldSelected = {...selectedCondition};
        return () => {
          setConditions(oldConditions);
          setSelectedCondition(oldSelected);
        };
      },
      async () => {
        return await updateProductDetailRealtime(conditionId, productName, field, value);
      },
      null,
      `Failed to save ${field}`
    );
  }, 500);

  // Handler for adding a modifier
  const handleAddModifier = async () => {
    if (!newModifier.trim() || !selectedCondition?.db_id) return;

    const modifierName = newModifier.trim();
    const operationId = `phase-add-${selectedCondition.db_id}-${modifierName}`;

    await executeUpdate(
      operationId,
      () => {
        const oldConditions = [...conditions];
        const oldSelected = {...selectedCondition};
        const oldNewModifier = newModifier;

        const updatedPhases = [...(selectedCondition.phases || []), modifierName];
        setConditions(prev => prev.map(c =>
          c.db_id === selectedCondition.db_id
            ? { ...c, phases: updatedPhases }
            : c
        ));
        setSelectedCondition(prev => ({ ...prev, phases: updatedPhases }));
        setNewModifier('');

        return () => {
          setConditions(oldConditions);
          setSelectedCondition(oldSelected);
          setNewModifier(oldNewModifier);
        };
      },
      async () => {
        return await addPhaseToConditionRealtime(selectedCondition.db_id, modifierName);
      },
      `Added modifier "${modifierName}"`,
      `Failed to add modifier "${modifierName}"`
    );
  };

  // Handler for removing a modifier
  const handleRemoveModifier = async (modifierToRemove) => {
    if (!selectedCondition?.db_id) return;

    const operationId = `phase-remove-${selectedCondition.db_id}-${modifierToRemove}`;

    await executeUpdate(
      operationId,
      () => {
        const oldConditions = [...conditions];
        const oldSelected = {...selectedCondition};

        const updatedPhases = selectedCondition.phases.filter(p => p !== modifierToRemove);
        setConditions(prev => prev.map(c =>
          c.db_id === selectedCondition.db_id
            ? { ...c, phases: updatedPhases }
            : c
        ));
        setSelectedCondition(prev => ({ ...prev, phases: updatedPhases }));

        return () => {
          setConditions(oldConditions);
          setSelectedCondition(oldSelected);
        };
      },
      async () => {
        return await removePhaseFromConditionRealtime(selectedCondition.db_id, modifierToRemove);
      },
      `Removed modifier "${modifierToRemove}"`,
      `Failed to remove modifier "${modifierToRemove}"`
    );
  };

  // Get unique products that are configured as recommendations
  const getRecommendedProductsForCondition = (condition) => {
    if (!condition || !condition.products) return [];

    const recommendedProducts = new Set();
    Object.keys(condition.products).forEach(phase => {
      const products = condition.products[phase] || [];
      products.forEach(product => {
        if (product && product.trim()) {
          recommendedProducts.add(product);
        }
      });
    });

    return Array.from(recommendedProducts).sort();
  };

  // Get modifiers where a specific product is recommended
  const getPhasesForProduct = (condition, productName) => {
    if (!condition || !condition.products) return [];

    const productPhases = [];
    Object.keys(condition.products).forEach(phase => {
      const products = condition.products[phase] || [];
      if (products.includes(productName)) {
        productPhases.push(phase);
      }
    });

    return productPhases;
  };

  // Render draggable product list for a modifier
  const renderModifierProducts = (modifier) => {
    const modifierProducts = selectedCondition?.products?.[modifier] || [];

    const handleAddProduct = async (productName) => {
      if (!selectedCondition?.db_id) return;

      const operationId = `product-add-${selectedCondition.db_id}-${modifier}-${productName}`;

      await executeUpdate(
        operationId,
        () => {
          const oldConditions = [...conditions];
          const oldSelected = { ...selectedCondition };

          const newProducts = [...modifierProducts, productName];
          const updatedProductsMap = {
            ...(selectedCondition.products || {}),
            [modifier]: newProducts
          };

          setConditions(prev => prev.map(c =>
            c.db_id === selectedCondition.db_id
              ? { ...c, products: updatedProductsMap }
              : c
          ));
          setSelectedCondition(prev => ({ ...prev, products: updatedProductsMap }));

          return () => {
            setConditions(oldConditions);
            setSelectedCondition(oldSelected);
          };
        },
        async () => {
          return await addProductToPhaseRealtime(selectedCondition.db_id, modifier, productName);
        },
        `Added "${productName}" to ${modifier}`,
        `Failed to add "${productName}"`
      );
    };

    const handleRemoveProduct = async (productName) => {
      if (!selectedCondition?.db_id) return;

      const operationId = `product-remove-${selectedCondition.db_id}-${modifier}-${productName}`;

      await executeUpdate(
        operationId,
        () => {
          const oldConditions = [...conditions];
          const oldSelected = { ...selectedCondition };

          const newProducts = modifierProducts.filter(p => p !== productName);
          const updatedProductsMap = {
            ...(selectedCondition.products || {}),
            [modifier]: newProducts
          };

          setConditions(prev => prev.map(c =>
            c.db_id === selectedCondition.db_id
              ? { ...c, products: updatedProductsMap }
              : c
          ));
          setSelectedCondition(prev => ({ ...prev, products: updatedProductsMap }));

          return () => {
            setConditions(oldConditions);
            setSelectedCondition(oldSelected);
          };
        },
        async () => {
          return await removeProductFromPhaseRealtime(selectedCondition.db_id, modifier, productName);
        },
        `Removed "${productName}" from ${modifier}`,
        `Failed to remove "${productName}"`
      );
    };

    const handleReorderProducts = async (newProductOrder) => {
      if (!selectedCondition?.db_id) return;

      const operationId = `product-reorder-${selectedCondition.db_id}-${modifier}`;

      const productRankings = newProductOrder.map((name, index) => ({
        productName: name,
        rank: index + 1
      }));

      await executeUpdate(
        operationId,
        () => {
          const oldConditions = [...conditions];
          const oldSelected = { ...selectedCondition };

          const updatedProductsMap = {
            ...(selectedCondition.products || {}),
            [modifier]: newProductOrder
          };

          setConditions(prev => prev.map(c =>
            c.db_id === selectedCondition.db_id
              ? { ...c, products: updatedProductsMap }
              : c
          ));
          setSelectedCondition(prev => ({ ...prev, products: updatedProductsMap }));

          return () => {
            setConditions(oldConditions);
            setSelectedCondition(oldSelected);
          };
        },
        async () => {
          return await reorderProductsRealtime(selectedCondition.db_id, modifier, productRankings);
        },
        `Reordered products in ${modifier}`,
        `Failed to reorder products`
      );
    };

    return (
      <DraggableProductList
        products={modifierProducts}
        onReorder={handleReorderProducts}
        onRemove={handleRemoveProduct}
        onAdd={handleAddProduct}
        availableProducts={allProducts}
        phaseName={modifier}
      />
    );
  };

  // Handler for selecting a condition and switching to detail view
  const handleConditionClick = (condition) => {
    handleConditionSelect(condition);
    setViewMode('detail');
  };

  // Handler for going back to list view
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCondition(null);
  };

  // Return early if no data
  if (conditions.length === 0) {
    return (
      <div className={`text-center py-10 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
        Loading conditions...
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-hidden flex flex-col h-full">
      {viewMode === 'list' ? (
        // LIST VIEW
        <div className="p-8 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              All Conditions & Surgical Procedures
            </h3>
            <button
              onClick={handleAddCondition}
              className="px-6 py-3 bg-[#9b9cfa] text-white rounded-lg hover:bg-[#b4b5ff] inline-flex items-center text-sm font-semibold transition-colors shadow-md"
            >
              <Plus size={18} className="mr-2" />
              Add New Condition
            </button>
          </div>

          <ul className="space-y-3">
            {conditions.map((condition) => (
              <li
                key={condition.name}
                className={`px-6 py-4 rounded-xl cursor-pointer flex justify-between items-center group transition-all ${
                  isDarkMode
                    ? 'border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#9b9cfa] hover:bg-[#2a2a2a]'
                    : 'border border-gray-200 bg-white hover:border-[#9b9cfa] hover:bg-gray-50'
                }`}
                onClick={() => handleConditionClick(condition)}
              >
                <div className="flex-1">
                  <div className={`font-semibold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {condition.name}
                  </div>
                  <div className={`flex items-center gap-4 text-sm ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                      isDarkMode ? 'bg-[#2a2a2a] text-[#e5e7eb]' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {condition.category}
                    </span>
                    {condition.phases && condition.phases.length > 0 && (
                      <span className={`text-xs ${isDarkMode ? 'text-[#6b7280]' : 'text-gray-500'}`}>
                        {condition.phases.length} {condition.phases.length === 1 ? 'modifier' : 'modifiers'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete('condition', condition);
                    }}
                    className={`opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-2 rounded-lg transition-all ${
                      isDarkMode ? 'hover:bg-[#78350f]' : 'hover:bg-red-50'
                    }`}
                    title="Delete condition"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={20} className={`${isDarkMode ? 'text-[#6b7280]' : 'text-gray-400'} group-hover:text-[#9b9cfa]`} />
                </div>
              </li>
            ))}
          </ul>

          {conditions.length === 0 && (
            <div className={`text-center py-12 ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
              <p className="text-lg mb-2">No conditions yet</p>
              <p className={`text-sm ${isDarkMode ? 'text-[#6b7280]' : 'text-gray-500'}`}>
                Click "Add New Condition" to get started
              </p>
            </div>
          )}
        </div>
      ) : (
        // DETAIL VIEW - Streamlined single-page layout
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex-shrink-0 px-8 py-4 ${
            isDarkMode ? 'bg-[#1a1a1a] border-b border-[#2a2a2a]' : 'bg-white border-b border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToList}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'}`}
                title="Back to list"
              >
                <ArrowLeft size={20} className={isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'} />
              </button>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedCondition?.name || 'Edit Condition'}
                </h3>
              </div>
              <button
                onClick={() => confirmDelete('condition', selectedCondition)}
                className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className={`flex-1 overflow-y-auto p-6 min-h-0 ${isDarkMode ? 'bg-[#000000]' : 'bg-gray-50'}`}>
            {selectedCondition ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Basic Info - Always visible */}
                <div className={`rounded-xl p-6 ${
                  isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-gray-200'
                }`}>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Condition Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
                        Condition Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={selectedCondition.name}
                          onChange={(e) => {
                            updateConditionField(selectedCondition.db_id, 'name', e.target.value);
                            debouncedUpdateConditionField(selectedCondition.db_id, 'name', e.target.value);
                          }}
                          className={`w-full px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                            isDarkMode
                              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                              : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                        <SaveStatusIndicator
                          status={saveStatus[`condition-${selectedCondition.db_id}-name`]}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
                        Category
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCondition.category}
                          onChange={(e) => {
                            updateConditionField(selectedCondition.db_id, 'category_id', e.target.value);
                          }}
                          className={`w-full px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                            isDarkMode
                              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white'
                              : 'bg-gray-50 border border-gray-300 text-gray-900'
                          }`}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <SaveStatusIndicator
                          status={saveStatus[`condition-${selectedCondition.db_id}-category_id`]}
                          className="absolute right-8 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modifiers Section */}
                <div className={`rounded-xl p-6 ${
                  isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Modifiers
                    </h4>
                    <span className={`text-sm ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                      {selectedCondition.phases?.length || 0} configured
                    </span>
                  </div>

                  {/* Modifier tags */}
                  <div className={`flex flex-wrap gap-2 p-3 rounded-lg mb-4 min-h-[48px] ${
                    isDarkMode ? 'bg-[#2a2a2a] border border-[#3f3f46]' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    {selectedCondition.phases?.map((modifier) => (
                      <span
                        key={modifier}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center font-medium ${
                          isDarkMode ? 'bg-[#065f46] text-[#10b981]' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {modifier}
                        <button
                          onClick={() => handleRemoveModifier(modifier)}
                          className={`ml-2 transition-colors ${
                            isDarkMode ? 'text-[#10b981] hover:text-white' : 'text-green-700 hover:text-green-900'
                          }`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {(!selectedCondition.phases || selectedCondition.phases.length === 0) && (
                      <span className={`text-sm italic ${isDarkMode ? 'text-[#6b7280]' : 'text-gray-500'}`}>
                        No modifiers added yet
                      </span>
                    )}
                  </div>

                  {/* Add modifier input */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newModifier}
                      onChange={(e) => setNewModifier(e.target.value)}
                      placeholder="New modifier name..."
                      className={`flex-1 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                        isDarkMode
                          ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newModifier.trim()) {
                          handleAddModifier();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddModifier}
                      className="px-5 py-2.5 bg-[#9b9cfa] text-white rounded-lg hover:bg-[#b4b5ff] font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Products by Modifier - Always visible with tabs */}
                <div className={`rounded-xl overflow-hidden ${
                  isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-gray-200'
                }`}>
                  <div className={`px-6 py-4 border-b ${
                    isDarkMode ? 'border-[#2a2a2a]' : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Products by Modifier
                      </h4>
                      <span className={`text-sm ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                        Drag to reorder priority
                      </span>
                    </div>
                  </div>

                  {selectedCondition.phases && selectedCondition.phases.length > 0 ? (
                    <Tabs.Root defaultValue={selectedCondition.phases[0]}>
                      <Tabs.List className={`flex overflow-x-auto ${isDarkMode ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`}>
                        {selectedCondition.phases.map((modifier, index) => {
                          const getModifierColor = (idx) => {
                            const colors = ['bg-[#8b5cf6]', 'bg-[#9b9cfa]', 'bg-[#c4b5fd]', 'bg-[#6366f1]'];
                            return colors[idx % colors.length];
                          };

                          return (
                            <Tabs.Trigger
                              key={modifier}
                              value={modifier}
                              className={clsx(
                                "flex-1 min-w-[120px] px-6 py-3 text-sm text-center focus:outline-none transition-all duration-300 text-white relative",
                                getModifierColor(index),
                                "data-[state=active]:scale-105 data-[state=active]:font-bold data-[state=active]:brightness-110 data-[state=active]:border-b-4 data-[state=active]:border-white data-[state=active]:z-10",
                                "data-[state=inactive]:opacity-70 data-[state=inactive]:font-semibold data-[state=inactive]:hover:opacity-90"
                              )}
                            >
                              {modifier}
                            </Tabs.Trigger>
                          );
                        })}
                      </Tabs.List>

                      {selectedCondition.phases.map((modifier) => (
                        <Tabs.Content key={modifier} value={modifier} className="p-6">
                          {renderModifierProducts(modifier)}
                        </Tabs.Content>
                      ))}
                    </Tabs.Root>
                  ) : (
                    <div className={`p-8 text-center ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                      <p className="mb-2">No modifiers configured</p>
                      <p className="text-sm">Add modifiers above to configure products</p>
                    </div>
                  )}
                </div>

                {/* Product Cards - Quick access to edit details */}
                {getRecommendedProductsForCondition(selectedCondition).length > 0 && (
                  <div className={`rounded-xl p-6 ${
                    isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Product Details & Research
                      </h4>
                      <span className={`text-sm ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                        Click to edit
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {getRecommendedProductsForCondition(selectedCondition).map((productName) => {
                        const research = selectedCondition.conditionSpecificResearch?.[productName] || [];
                        const modifiers = getPhasesForProduct(selectedCondition, productName);

                        return (
                          <button
                            key={productName}
                            onClick={() => setEditingProduct(productName)}
                            className={`p-4 rounded-lg text-left transition-all hover:scale-[1.02] ${
                              isDarkMode
                                ? 'bg-[#2a2a2a] border border-[#3f3f46] hover:border-[#9b9cfa]'
                                : 'bg-gray-50 border border-gray-200 hover:border-[#9b9cfa]'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {productName}
                              </span>
                              <Edit3 size={14} className="text-[#9b9cfa]" />
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`flex items-center gap-1 ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                                <FileText size={12} />
                                {modifiers.length} {modifiers.length === 1 ? 'modifier' : 'modifiers'}
                              </span>
                              <span className={`flex items-center gap-1 ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                                <BookOpen size={12} />
                                {research.length} {research.length === 1 ? 'article' : 'articles'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hidden DDS Types (kept for data integrity) */}
                <div className="hidden">
                  {/* DDS Types selector - hidden but functional */}
                </div>
              </div>
            ) : (
              <div className={`text-center py-10 ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                Select a condition to edit
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Edit Drawer */}
      <ProductEditDrawer
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        productName={editingProduct}
        productDetails={selectedCondition?.productDetails?.[editingProduct] || {}}
        condition={selectedCondition}
        saveStatus={saveStatus}
        updateProductDetail={updateProductDetail}
        debouncedUpdateProductDetail={debouncedUpdateProductDetail}
        updateConditionField={updateConditionField}
        getPhasesForProduct={getPhasesForProduct}
        parentDrawerWidth={parentDrawerWidth}
      />

      <ToastContainer />
    </div>
  );
}

export default AdminPanelConditions;
