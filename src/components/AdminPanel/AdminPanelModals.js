import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Edit, Trash2, X, Target, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// AdminPanelModals Component
function AdminPanelModals({
  // Modal state props
  showAddModal,
  setShowAddModal,
  showDeleteModal,
  setShowDeleteModal,
  competitiveAdvantageModalOpen,
  setCompetitiveAdvantageModalOpen,
  
  // Modal data props
  modalType,
  newItemData,
  setNewItemData,
  editingProductId,
  setEditingProductId,
  itemToDelete,
  setItemToDelete,
  selectedProductForAdvantage,
  setSelectedProductForAdvantage,
  competitiveAdvantageData,
  setCompetitiveAdvantageData,
  
  // Handler props
  handleSubmitNewItem,
  handleDelete,
  isDeleting,
  setIsEditing,
  setShowSuccess,
  
  // Data props
  categories,
  allProducts
}) {

  // Competitive advantage functions
  const handleOpenCompetitiveAdvantage = (productName) => {
    setSelectedProductForAdvantage(productName);
    
    // Load existing competitive advantage data from Supabase
    loadCompetitiveAdvantageFromSupabase(productName);
    
    setCompetitiveAdvantageModalOpen(true);
  };

  const loadCompetitiveAdvantageFromSupabase = async (productName) => {
    try {
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
      
    } catch (error) {
      console.error('Error loading competitive advantage:', error);
      // Initialize with empty structure on error
      setCompetitiveAdvantageData({
        competitors: [],
        activeIngredients: []
      });
    }
  };

  const saveCompetitiveAdvantage = async () => {
    if (!selectedProductForAdvantage) return;
    
    try {
      setIsEditing(true);
      
      // Delete existing competitors for this product
      await supabase
        .from('competitive_advantage_competitors')
        .delete()
        .eq('product_name', selectedProductForAdvantage);
      
      // Delete existing active ingredients for this product
      await supabase
        .from('competitive_advantage_active_ingredients')
        .delete()
        .eq('product_name', selectedProductForAdvantage);
      
      // Insert new competitors
      if (competitiveAdvantageData.competitors && competitiveAdvantageData.competitors.length > 0) {
        const competitorsToInsert = competitiveAdvantageData.competitors
          .filter(comp => comp.name.trim()) // Only insert competitors with names
          .map(comp => ({
            product_name: selectedProductForAdvantage,
            competitor_name: comp.name,
            advantages: comp.advantages || ''
          }));
        
        if (competitorsToInsert.length > 0) {
          const { error: competitorsError } = await supabase
            .from('competitive_advantage_competitors')
            .insert(competitorsToInsert);
          
          if (competitorsError) {
            console.error('Error saving competitors:', competitorsError);
            return;
          }
        }
      }
      
      // Insert new active ingredients
      if (competitiveAdvantageData.activeIngredients && competitiveAdvantageData.activeIngredients.length > 0) {
        const ingredientsToInsert = competitiveAdvantageData.activeIngredients
          .filter(ing => ing.name.trim()) // Only insert ingredients with names
          .map(ing => ({
            product_name: selectedProductForAdvantage,
            ingredient_name: ing.name,
            advantages: ing.advantages || ''
          }));
        
        if (ingredientsToInsert.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('competitive_advantage_active_ingredients')
            .insert(ingredientsToInsert);
          
          if (ingredientsError) {
            console.error('Error saving active ingredients:', ingredientsError);
            return;
          }
        }
      }
      
      console.log('Competitive advantage saved successfully for', selectedProductForAdvantage);
      
      // Close modal
      setCompetitiveAdvantageModalOpen(false);
      setSelectedProductForAdvantage(null);
      
      // Show success notification
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving competitive advantage:', error);
    }
  };

  const addCompetitor = () => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: [...prev.competitors, {
        name: '',
        advantages: ''
      }]
    }));
  };

  const addActiveIngredient = () => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: [...prev.activeIngredients, {
        name: '',
        advantages: ''
      }]
    }));
  };

  const updateCompetitor = (index, field, value) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const updateActiveIngredient = (index, field, value) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: prev.activeIngredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeCompetitor = (index) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const removeActiveIngredient = (index) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: prev.activeIngredients.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      {/* Add New Item Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {modalType === 'condition' && 'Add New Condition'}
              {modalType === 'category' && 'Add New Category'}
              {modalType === 'ddsType' && 'Add New DDS Type'}
              {modalType === 'product' && (editingProductId ? `Edit Product: ${editingProductId}` : 'Add New Product')}
            </Dialog.Title>

            <div className="space-y-4">
              {modalType === 'condition' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition Name
                    </label>
                    <input
                      type="text"
                      value={newItemData.name || ''}
                      onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                      placeholder="Enter condition name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newItemData.category || ''}
                      onChange={(e) => setNewItemData({...newItemData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                    >
                      <option value="">Select a category</option>
                      {categories.filter(cat => cat !== 'All').map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-gray-500">
                    All detailed configuration (phases, products, scientific rationale, etc.) can be configured after creating the condition in the Conditions tab.
                  </p>
                </>
              )}
              
              {modalType === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newItemData.name || ''}
                    onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              
              {modalType === 'ddsType' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DDS Type Name
                  </label>
                  <input
                    type="text"
                    value={newItemData.name || ''}
                    onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              
              {modalType === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newItemData.name || ''}
                    onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                    placeholder="Enter product name"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Product details (usage, rationale, etc.) are configured per condition in the Conditions tab.
                  </p>
                  
                  {/* Competitive Advantage Button - only show when editing existing product */}
                  {editingProductId && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // Use the current product name (either original or edited)
                          const productName = newItemData.name || editingProductId;
                          handleOpenCompetitiveAdvantage(productName);
                        }}
                        className="w-full px-3 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center justify-center"
                      >
                        <Target size={16} className="mr-2" />
                        Manage Competitive Advantage
                      </button>
                      <p className="mt-1 text-xs text-gray-500">
                        Configure competitive advantages against competitors and active ingredients.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Dialog.Close asChild>
                <button className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              
              <button
                onClick={handleSubmitNewItem}
                disabled={!newItemData.name}
                className={`px-3 py-1.5 rounded-md text-white text-sm ${
                  newItemData.name ? 'bg-[#15396c] hover:bg-[#15396c]/90' : 'bg-[#15396c]/40 cursor-not-allowed'
                }`}
              >
                {editingProductId ? 'Save Changes' : 'Add'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      {/* Delete Confirmation Modal */}
      <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-2 flex items-center text-red-600">
              <AlertTriangle size={20} className="mr-2" />
              Confirm Deletion
            </Dialog.Title>
            
            <Dialog.Description className="text-gray-600 mb-4">
              {itemToDelete?.type === 'condition' && 
                `Are you sure you want to delete the condition "${itemToDelete.item.name}"? This action cannot be undone.`}
              
              {itemToDelete?.type === 'product' && 
                `Are you sure you want to delete the product "${itemToDelete.item}"? This will remove it from all conditions where it's used. This action cannot be undone.`}
            </Dialog.Description>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Dialog.Close asChild>
                <button className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-3 py-1.5 rounded-md text-white text-sm ${
                  isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Competitive Advantage Modal */}
      <Dialog.Root open={competitiveAdvantageModalOpen} onOpenChange={setCompetitiveAdvantageModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Competitive Advantage - {selectedProductForAdvantage}
                </Dialog.Title>
                <Dialog.Close className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </Dialog.Close>
              </div>

              <div className="space-y-8">
                {/* Competitors Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Competitors</h3>
                    <button
                      onClick={addCompetitor}
                      className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Competitor
                    </button>
                  </div>

                  {competitiveAdvantageData.competitors.map((competitor, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <input
                          type="text"
                          placeholder="Competitor name"
                          value={competitor.name}
                          onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-3 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                        />
                        <button
                          onClick={() => removeCompetitor(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {competitor.name || 'Competitor Information'}:
                        </label>
                        <textarea
                          placeholder="Enter competitive advantage information..."
                          value={competitor.advantages}
                          onChange={(e) => updateCompetitor(index, 'advantages', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                          rows={4}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Ingredients Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Active Ingredients</h3>
                    <button
                      onClick={addActiveIngredient}
                      className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Active Ingredient
                    </button>
                  </div>

                  {competitiveAdvantageData.activeIngredients.map((ingredient, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <input
                          type="text"
                          placeholder="Active ingredient name"
                          value={ingredient.name}
                          onChange={(e) => updateActiveIngredient(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-3 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                        />
                        <button
                          onClick={() => removeActiveIngredient(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {ingredient.name || 'Active Ingredient Information'}:
                        </label>
                        <textarea
                          placeholder="Enter competitive advantage information..."
                          value={ingredient.advantages}
                          onChange={(e) => updateActiveIngredient(index, 'advantages', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                          rows={4}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setCompetitiveAdvantageModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCompetitiveAdvantage}
                  className="px-4 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default AdminPanelModals; 