import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getCategoryDescription } from '../../utils/categoryDescriptions';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useTheme } from '../../contexts/ThemeContext';

// AdminPanelCategories Component
function AdminPanelCategories({
  // Props from AdminPanelCore
  categories,
  setCategories,
  conditions,
  setConditions,
  saveStatus,
  executeUpdate,
  ToastContainer,
  confirmDelete,
  showToast
}) {
  const { isDarkMode } = useTheme();
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Add new category with real-time update
  const handleAddCategory = async () => {
    const categoryName = newCategoryInput.trim();
    if (!categoryName) return;

    if (categories.includes(categoryName)) {
      showToast('Category already exists', 'error');
      return;
    }

    const operationId = `category-add-${categoryName}`;

    await executeUpdate(
      operationId,
      // Optimistic update
      () => {
        const oldCategories = [...categories];
        setCategories(prev => [...prev, categoryName].sort());
        setNewCategoryInput('');

        // Rollback
        return () => {
          setCategories(oldCategories);
          setNewCategoryInput(categoryName);
        };
      },
      // Database update
      async () => {
        const { addCategoryRealtime } = await import('./AdminPanelSupabase');
        return await addCategoryRealtime(categoryName);
      },
      `Added category "${categoryName}"`,
      `Failed to add category "${categoryName}"`
    );
  };

  // Delete category - trigger confirmation modal
  const handleDeleteCategory = (categoryName) => {
    if (categoryName === 'All') {
      showToast('Cannot delete "All" category', 'error');
      return;
    }

    // Trigger the modal confirmation (handled by AdminPanelCore)
    confirmDelete('category', categoryName);
  };

  return (
    <div className="p-8" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
      {/* Centered Categories Section */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Categories</h3>

          {/* Add Category Input */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="Enter new category name..."
              className={`flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] focus:border-transparent ${isDarkMode ? 'bg-[#1a1a1a] border border-[#3f3f46] text-white placeholder-[#6b7280]' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryInput.trim()}
              className={`px-6 py-3 rounded-lg text-white text-sm font-semibold flex items-center transition-colors shadow-md ${!newCategoryInput.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#9b9cfa] hover:bg-[#b4b5ff]'}`}
            >
              <Plus size={18} className="mr-2" />
              Add Category
            </button>
            <SaveStatusIndicator status={saveStatus[`category-add-${newCategoryInput.trim()}`]} />
          </div>
        </div>

        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-[#065f46] border border-[#10b981]' : 'bg-green-50 border border-green-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-[#10b981]' : 'text-green-700'}`}>
            <strong className="font-semibold">Note:</strong> Category descriptions shown below will appear in the Therapeutic Wizard when users select condition categories.
          </p>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categories.map((category) => (
              <div
                key={category}
                className={`rounded-xl p-6 shadow-md hover:shadow-lg transition-all group ${isDarkMode ? 'border border-[#3f3f46] bg-[#1a1a1a] hover:bg-[#2a2a2a]' : 'border border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`font-bold text-xl mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{category}</div>
                      <SaveStatusIndicator status={saveStatus[`category-delete-${category}`]} />
                    </div>
                    <div className={`text-sm mb-4 italic leading-relaxed ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                      "{getCategoryDescription(category)}"
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg ${isDarkMode ? 'bg-[#065f46] text-[#10b981]' : 'bg-green-100 text-green-700'}`}>
                      {conditions.filter(c => c.category === category).length} conditions
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    {category !== 'All' && (
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className={`opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-[#78350f]' : 'hover:bg-red-50'}`}
                        title="Delete category"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {ToastContainer && <ToastContainer />}
    </div>
  );
}

export default AdminPanelCategories;