import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

// AdminPanelCategories Component
function AdminPanelCategories({
  // Props from AdminPanelCore
  categories,
  ddsTypes,
  editedConditions,
  handleAddCategory,
  handleAddDdsType,
  confirmDelete
}) {
  return (
    <div className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Categories</h3>
            <button
              onClick={handleAddCategory}
              className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add Category
            </button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <ul className="space-y-2">
              {categories.map((category) => (
                <li 
                  key={category}
                  className="border rounded-md p-3 flex justify-between items-center bg-gray-50 group"
                >
                  <span>{category}</span>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-3">
                      {editedConditions.filter(c => c.category === category).length} conditions
                    </div>
                    {category !== 'All' && (
                      <button
                        onClick={() => confirmDelete('category', category)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                        title="Delete category"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* DDS Types - Hidden */}
        <div className="hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">DDS Types</h3>
            <button
              onClick={handleAddDdsType}
              className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add DDS Type
            </button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <ul className="space-y-2">
              {ddsTypes.map((ddsType) => (
                <li 
                  key={ddsType}
                  className="border rounded-md p-3 flex justify-between items-center bg-gray-50 group"
                >
                  <span>{ddsType}</span>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-3">
                      {editedConditions.filter(c => c.dds.includes(ddsType)).length} conditions
                    </div>
                    {ddsType !== 'All' && (
                      <button
                        onClick={() => confirmDelete('ddsType', ddsType)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                        title="Delete DDS type"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanelCategories;