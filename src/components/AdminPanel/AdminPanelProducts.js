import React, { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { deleteProductRealtime } from './AdminPanelSupabase';

// AdminPanelProducts Component
function AdminPanelProducts({
  // Props from AdminPanelCore
  allProducts,
  setAllProducts,
  conditions,
  setConditions,
  handleAddProduct,
  handleEditProduct,
  handleProductAvailabilityToggle,
  saveStatus,
  executeUpdate,
  ToastContainer
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open delete confirmation modal
  const handleDeleteClick = (productName) => {
    setProductToDelete(productName);
    setShowDeleteModal(true);
  };

  // Handle real-time product deletion
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    const productName = productToDelete;
    const operationId = `product-delete-${productName}`;

    await executeUpdate(
      operationId,
      // Optimistic update
      () => {
        const oldProducts = [...allProducts];
        const oldConditions = [...conditions];

        setAllProducts(prev => prev.filter(p => p.name !== productName));
        // Also remove from conditions
        setConditions(prev => prev.map(c => ({
          ...c,
          products: c.products ? Object.fromEntries(
            Object.entries(c.products).map(([phase, productList]) => [
              phase,
              Array.isArray(productList) ? productList.filter(p => p !== productName) : productList
            ])
          ) : c.products,
          productDetails: c.productDetails ? Object.fromEntries(
            Object.entries(c.productDetails).filter(([name]) => name !== productName)
          ) : c.productDetails,
          patientSpecificConfig: c.patientSpecificConfig ? Object.fromEntries(
            Object.entries(c.patientSpecificConfig).map(([phase, config]) => [
              phase,
              Object.fromEntries(
                Object.entries(config).map(([type, products]) => [
                  type,
                  Array.isArray(products) ? products.filter(p => p !== productName) : products
                ])
              )
            ])
          ) : c.patientSpecificConfig
        })));

        // Rollback function
        return () => {
          setAllProducts(oldProducts);
          setConditions(oldConditions);
        };
      },
      // Database update
      async () => {
        return await deleteProductRealtime(productName);
      },
      `Deleted product "${productName}"`,
      `Failed to delete product "${productName}"`
    );

    setIsDeleting(false);
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

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
        const conditionCount = conditions.filter(condition => {
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
                onClick={() => handleDeleteClick(product.name)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                title="Delete product"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          {/* Availability Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              Available to clients:
              <SaveStatusIndicator status={saveStatus?.[`product-availability-${product.id}`]} />
            </span>
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
    {ToastContainer && <ToastContainer />}

    {/* Delete Confirmation Modal */}
    <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 mr-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Delete Product
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">"{productToDelete}"</span>?
                  This will remove it from all conditions and delete all associated competitive advantage data.
                  This action cannot be undone.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Dialog.Close asChild>
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </Dialog.Close>

            <button
              onClick={confirmDeleteProduct}
              disabled={isDeleting}
              className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>
);
}

export default AdminPanelProducts; 