import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useTheme } from '../../contexts/ThemeContext';
import DynamicTextarea from './DynamicTextarea';

/**
 * AdminPanelCompetitiveAdvantage
 * 
 * Manages competitive advantage data for products:
 * - Competitor comparisons
 * - Active ingredient comparisons
 */
const AdminPanelCompetitiveAdvantage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Competitors data
  const [competitors, setCompetitors] = useState([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', advantages: '' });
  
  // Active ingredients data
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', advantages: '' });
  
  const [activeTab, setActiveTab] = useState('competitors');
  const [successMessage, setSuccessMessage] = useState('');

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Load competitive data when product is selected
  useEffect(() => {
    if (selectedProduct) {
      loadCompetitiveData(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitiveData = async (productName) => {
    try {
      setLoading(true);
      
      // Load competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitive_advantage_competitors')
        .select('*')
        .eq('product_name', productName)
        .order('competitor_name');
      
      if (competitorsError) throw competitorsError;
      setCompetitors(competitorsData || []);
      
      // Load ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('competitive_advantage_active_ingredients')
        .select('*')
        .eq('product_name', productName)
        .order('ingredient_name');
      
      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);
    } catch (error) {
      console.error('Error loading competitive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim() || !selectedProduct) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('competitive_advantage_competitors')
        .insert({
          product_name: selectedProduct,
          competitor_name: newCompetitor.name.trim(),
          advantages: newCompetitor.advantages.trim()
        });
      
      if (error) throw error;
      
      // Reload data
      await loadCompetitiveData(selectedProduct);
      setNewCompetitor({ name: '', advantages: '' });
      showSuccess('Competitor added successfully');
    } catch (error) {
      console.error('Error adding competitor:', error);
      alert('Failed to add competitor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompetitor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('competitive_advantage_competitors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadCompetitiveData(selectedProduct);
      showSuccess('Competitor deleted successfully');
    } catch (error) {
      console.error('Error deleting competitor:', error);
      alert('Failed to delete competitor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompetitor = async (id, field, value) => {
    try {
      const { error } = await supabase
        .from('competitive_advantage_competitors')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setCompetitors(prev => prev.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      ));
    } catch (error) {
      console.error('Error updating competitor:', error);
      alert('Failed to update competitor: ' + error.message);
    }
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim() || !selectedProduct) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('competitive_advantage_active_ingredients')
        .insert({
          product_name: selectedProduct,
          ingredient_name: newIngredient.name.trim(),
          advantages: newIngredient.advantages.trim()
        });
      
      if (error) throw error;
      
      await loadCompetitiveData(selectedProduct);
      setNewIngredient({ name: '', advantages: '' });
      showSuccess('Ingredient added successfully');
    } catch (error) {
      console.error('Error adding ingredient:', error);
      alert('Failed to add ingredient: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('competitive_advantage_active_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadCompetitiveData(selectedProduct);
      showSuccess('Ingredient deleted successfully');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Failed to delete ingredient: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateIngredient = async (id, field, value) => {
    try {
      const { error } = await supabase
        .from('competitive_advantage_active_ingredients')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setIngredients(prev => prev.map(i => 
        i.id === id ? { ...i, [field]: value } : i
      ));
    } catch (error) {
      console.error('Error updating ingredient:', error);
      alert('Failed to update ingredient: ' + error.message);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !selectedProduct) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prism-primary mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}>
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Success Message */}
      {successMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${
          isDarkMode
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <span className="text-xl">✓</span>
          {successMessage}
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex-1 flex gap-4 overflow-hidden p-4">
        {/* Left: Product Selection */}
        <div className={`w-80 flex-shrink-0 rounded-lg border overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated' : 'bg-prism-light-bg-secondary border-prism-light-border-elevated'
        }`}>
          <div className="p-4 border-b border-inherit">
            <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
              Select Product
            </h3>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} size={16} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle text-prism-dark-text-primary placeholder-prism-dark-text-tertiary focus:border-prism-primary' 
                    : 'bg-prism-light-bg-primary border-prism-light-border-subtle text-prism-light-text-primary placeholder-prism-light-text-tertiary focus:border-prism-primary-light'
                }`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product.name)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-all ${
                  selectedProduct === product.name
                    ? isDarkMode
                      ? 'bg-prism-primary text-white'
                      : 'bg-prism-primary-light text-white'
                    : isDarkMode
                      ? 'text-prism-dark-text-primary hover:bg-prism-dark-bg-hover'
                      : 'text-prism-light-text-primary hover:bg-prism-light-bg-hover'
                }`}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Competitive Data */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedProduct ? (
            <div className={`flex-1 flex items-center justify-center rounded-lg border ${
              isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated' : 'bg-prism-light-bg-secondary border-prism-light-border-elevated'
            }`}>
              <p className={isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}>
                Select a product to manage competitive advantage data
              </p>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col rounded-lg border overflow-hidden ${
              isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated' : 'bg-prism-light-bg-secondary border-prism-light-border-elevated'
            }`}>
              {/* Header */}
              <div className="p-4 border-b border-inherit">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                  {selectedProduct}
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                  Manage competitive advantage information
                </p>
              </div>

              {/* Tab Switcher */}
              <div className={`flex gap-2 p-4 border-b border-inherit ${isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-prism-light-bg-tertiary'}`}>
                <button
                  onClick={() => setActiveTab('competitors')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'competitors'
                      ? isDarkMode
                        ? 'bg-prism-primary text-white'
                        : 'bg-prism-primary-light text-white'
                      : isDarkMode
                        ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-hover'
                        : 'text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-hover'
                  }`}
                >
                  Competitors ({competitors.length})
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'ingredients'
                      ? isDarkMode
                        ? 'bg-prism-primary text-white'
                        : 'bg-prism-primary-light text-white'
                      : isDarkMode
                        ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-hover'
                        : 'text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-hover'
                  }`}
                >
                  Active Ingredients ({ingredients.length})
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'competitors' ? (
                  <>
                    {/* Add New Competitor */}
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle' : 'bg-prism-light-bg-tertiary border-prism-light-border-subtle'}`}>
                      <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        Add Competitor
                      </h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Competitor name (e.g., Colgate Total)"
                          value={newCompetitor.name}
                          onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary' 
                              : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                          }`}
                        />
                        <DynamicTextarea
                          placeholder="Competitive advantages (what makes your product better)"
                          value={newCompetitor.advantages}
                          onChange={(e) => setNewCompetitor({ ...newCompetitor, advantages: e.target.value })}
                          initialRows={2}
                          maxRows={8}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode
                              ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                              : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                          }`}
                        />
                        <button
                          onClick={handleAddCompetitor}
                          disabled={saving || !newCompetitor.name.trim()}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${
                            saving || !newCompetitor.name.trim()
                              ? 'bg-gray-400 cursor-not-allowed'
                              : isDarkMode
                                ? 'bg-prism-primary hover:bg-prism-primary-hover'
                                : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'
                          }`}
                        >
                          <Plus size={16} />
                          Add Competitor
                        </button>
                      </div>
                    </div>

                    {/* Existing Competitors */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        Existing Competitors
                      </h4>
                      {competitors.length === 0 ? (
                        <p className={`text-center py-8 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                          No competitors added yet
                        </p>
                      ) : (
                        competitors.map(competitor => (
                          <div key={competitor.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle' : 'bg-prism-light-bg-tertiary border-prism-light-border-subtle'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <input
                                type="text"
                                value={competitor.competitor_name}
                                onChange={(e) => handleUpdateCompetitor(competitor.id, 'competitor_name', e.target.value)}
                                className={`flex-1 px-3 py-2 rounded-lg border font-medium ${
                                  isDarkMode 
                                    ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary' 
                                    : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                                }`}
                              />
                              <button
                                onClick={() => handleDeleteCompetitor(competitor.id)}
                                className={`ml-2 p-2 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'text-red-400 hover:bg-red-500/20' 
                                    : 'text-red-600 hover:bg-red-100'
                                }`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <DynamicTextarea
                              value={competitor.advantages || ''}
                              onChange={(e) => handleUpdateCompetitor(competitor.id, 'advantages', e.target.value)}
                              initialRows={2}
                              maxRows={8}
                              placeholder="Competitive advantages..."
                              className={`w-full px-3 py-2 rounded-lg border ${
                                isDarkMode
                                  ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                                  : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                              }`}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Add New Ingredient */}
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle' : 'bg-prism-light-bg-tertiary border-prism-light-border-subtle'}`}>
                      <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        Add Active Ingredient
                      </h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Ingredient name (e.g., Fluoride, Xylitol)"
                          value={newIngredient.name}
                          onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary' 
                              : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                          }`}
                        />
                        <DynamicTextarea
                          placeholder="Competitive advantages (what makes this ingredient better)"
                          value={newIngredient.advantages}
                          onChange={(e) => setNewIngredient({ ...newIngredient, advantages: e.target.value })}
                          initialRows={2}
                          maxRows={8}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode
                              ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                              : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                          }`}
                        />
                        <button
                          onClick={handleAddIngredient}
                          disabled={saving || !newIngredient.name.trim()}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${
                            saving || !newIngredient.name.trim()
                              ? 'bg-gray-400 cursor-not-allowed'
                              : isDarkMode
                                ? 'bg-prism-primary hover:bg-prism-primary-hover'
                                : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'
                          }`}
                        >
                          <Plus size={16} />
                          Add Ingredient
                        </button>
                      </div>
                    </div>

                    {/* Existing Ingredients */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        Existing Active Ingredients
                      </h4>
                      {ingredients.length === 0 ? (
                        <p className={`text-center py-8 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                          No active ingredients added yet
                        </p>
                      ) : (
                        ingredients.map(ingredient => (
                          <div key={ingredient.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle' : 'bg-prism-light-bg-tertiary border-prism-light-border-subtle'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <input
                                type="text"
                                value={ingredient.ingredient_name}
                                onChange={(e) => handleUpdateIngredient(ingredient.id, 'ingredient_name', e.target.value)}
                                className={`flex-1 px-3 py-2 rounded-lg border font-medium ${
                                  isDarkMode 
                                    ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary' 
                                    : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                                }`}
                              />
                              <button
                                onClick={() => handleDeleteIngredient(ingredient.id)}
                                className={`ml-2 p-2 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'text-red-400 hover:bg-red-500/20' 
                                    : 'text-red-600 hover:bg-red-100'
                                }`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <DynamicTextarea
                              value={ingredient.advantages || ''}
                              onChange={(e) => handleUpdateIngredient(ingredient.id, 'advantages', e.target.value)}
                              initialRows={2}
                              maxRows={8}
                              placeholder="Competitive advantages..."
                              className={`w-full px-3 py-2 rounded-lg border ${
                                isDarkMode
                                  ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                                  : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
                              }`}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanelCompetitiveAdvantage;


