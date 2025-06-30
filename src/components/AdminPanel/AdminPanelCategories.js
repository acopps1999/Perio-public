import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getCategoryDescription } from '../../utils/categoryDescriptions';

// AdminPanelCategories Component
function AdminPanelCategories({
  // Props from AdminPanelCore
  categories,
  editedConditions,
  handleAddCategory,
  confirmDelete
}) {
  return (
    <div className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
      {/* Centered Categories Section */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-800">Categories</h3>
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add Category
          </button>
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
                    <div className="font-semibold text-xl text-gray-800 mb-2">{category}</div>
                    <div className="text-sm text-gray-600 mb-3 italic leading-relaxed">
                      "{getCategoryDescription(category)}"
                    </div>
                    <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {editedConditions.filter(c => c.category === category).length} conditions
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    {category !== 'All' && (
                      <button
                        onClick={() => confirmDelete('category', category)}
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
    </div>
  );
}

export default AdminPanelCategories;