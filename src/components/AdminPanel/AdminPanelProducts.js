import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

// AdminPanelProducts Component
function AdminPanelProducts({
  // Props from AdminPanelCore
  allProducts,
  editedConditions,
  handleAddProduct,
  handleEditProduct,
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
                patientTypeProducts.includes(product) || 
                patientTypeProducts.includes(`${product} (Type 3/4 Only)`)
              )
            )
          );
        }).length;
        
        return (
        <div key={product} className="border rounded-lg p-4 hover:bg-gray-50 group">
        <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-md mb-2">{product}</h4>
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Used in: </span>
                  {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
            <button
              onClick={() => handleEditProduct(product)}
              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1"
                  title="Edit product name"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => confirmDelete('product', product)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
              title="Delete product"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
            </div>
        );
      })}
    </div>
  </div>
);
}

export default AdminPanelProducts; 