import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

// AdminPanelProducts Component
function AdminPanelProducts({
  // Props from AdminPanelCore
  allProducts,
  editedConditions,
  handleAddProduct,
  handleEditProduct,
  handleProductAvailabilityToggle,
  confirmDelete
}) {

return (
  <div className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-medium">Product Library</h3>
      <button
        onClick={handleAddProduct}
        className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
      >
        <Plus size={16} className="mr-1" />
        Add New Product
      </button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allProducts.map((product) => {
        // Count how many conditions use this product in their patientSpecificConfig
        const conditionCount = editedConditions.filter(condition => {
          if (!condition.patientSpecificConfig) return false;
          
          // Check all phases and patient types for this product
          return Object.values(condition.patientSpecificConfig).some(phaseConfig => 
            Object.values(phaseConfig).some(patientTypeProducts => 
              Array.isArray(patientTypeProducts) && (
                patientTypeProducts.includes(product.name) || 
                patientTypeProducts.includes(`${product.name} (Type 3/4 Only)`)
              )
            )
          );
        }).length;
        
        return (
        <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 group">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-md">{product.name}</h4>
                {!product.is_available && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Not Available
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Used in: </span>
                {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => handleEditProduct(product.name)}
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1"
                title="Edit product name"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => confirmDelete('product', product.name)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                title="Delete product"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          {/* Availability Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Available to clients:</span>
            <button
              onClick={() => handleProductAvailabilityToggle(product.id, !product.is_available)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                product.is_available ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  product.is_available ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  </div>
);
}

export default AdminPanelProducts; 