import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getCategoryDescription } from '../../utils/categoryDescriptions';
import { SaveStatusIndicator } from './SaveStatusIndicator';

// AdminPanelCategories Component
function AdminPanelCategories({
  // Props from AdminPanelCore
  categories,
  setCategories,
  conditions,
  setConditions,
  saveStatus,
  executeUpdate,
  ToastContainer
}) {
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Toast helper
  const showToast = (message, type) => {
    // If ToastContainer is available, use it (implementation may vary)
  };

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

  // Delete category with real-time update
  const handleDeleteCategory = async (categoryName) => {
    if (categoryName === 'All') {
      showToast('Cannot delete "All" category', 'error');
      return;
    }

    if (!window.confirm(`Delete category "${categoryName}"? This will remove the category from all conditions using it.`)) {
      return;
    }

    const operationId = `category-delete-${categoryName}`;

    await executeUpdate(
      operationId,
      // Optimistic update
      () => {
        const oldCategories = [...categories];
        const oldConditions = [...conditions];

        setCategories(prev => prev.filter(c => c !== categoryName));
        // Update conditions that use this category
        setConditions(prev => prev.map(c =>
          c.category === categoryName ? { ...c, category: null } : c
        ));

        // Rollback
        return () => {
          setCategories(oldCategories);
          setConditions(oldConditions);
        };
      },
      // Database update
      async () => {
        const { deleteCategoryRealtime } = await import('./AdminPanelSupabase');
        return await deleteCategoryRealtime(categoryName);
      },
      `Deleted category "${categoryName}"`,
      `Failed to delete category "${categoryName}"`
    );
  };

  return (
    <div className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
      {/* Centered Categories Section */}
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Categories</h3>

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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-transparent"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryInput.trim()}
              className="px-4 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center transition-colors"
            >
              <Plus size={18} className="mr-2" />
              Add Category
            </button>
            <SaveStatusIndicator status={saveStatus[`category-add-${newCategoryInput.trim()}`]} />
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Category descriptions shown below will appear in the Therapeutic Wizard when users select condition categories.
          </p>
        </div>
        
        <div className="max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category}
                className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="font-semibold text-xl text-gray-800 mb-2">{category}</div>
                      <SaveStatusIndicator status={saveStatus[`category-delete-${category}`]} />
                    </div>
                    <div className="text-sm text-gray-600 mb-3 italic leading-relaxed">
                      "{getCategoryDescription(category)}"
                    </div>
                    <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {conditions.filter(c => c.category === category).length} conditions
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    {category !== 'All' && (
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-all"
                        title="Delete category"
                      >
                        <Trash2 size={18} />
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