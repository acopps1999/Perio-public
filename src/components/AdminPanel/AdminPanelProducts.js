import React, { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { deleteProductRealtime } from './AdminPanelSupabase';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDarkMode } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open delete confirmation modal
  const handleDeleteClick = (productName) => {
    setProductToDelete(productName);
    setShowDeleteModal(true);
  };

  // Handle real-time product deletion - close modal immediately, delete in background
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const productName = productToDelete;

    // Close modal immediately for better UX
    setShowDeleteModal(false);
    setProductToDelete(null);

    const operationId = `product-delete-${productName}`;

    // Run delete in background - executeUpdate handles optimistic updates
    executeUpdate(
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
  };

return (
  <div className="p-8" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
    <div className="flex justify-between items-center mb-6">
      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Product Library</h3>
      <button
        onClick={handleAddProduct}
        className={`px-6 py-3 text-white rounded-lg text-sm font-semibold flex items-center shadow-md transition-colors ${
          isDarkMode
            ? 'bg-prism-primary hover:bg-prism-primary-hover'
            : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'
        }`}
      >
        <Plus size={18} className="mr-2" />
        Add New Product
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div key={product.id} className={`rounded-xl p-5 group transition-all shadow-md ${isDarkMode ? 'border border-[#3f3f46] bg-[#1a1a1a] hover:bg-[#2a2a2a]' : 'border border-gray-200 bg-white hover:bg-gray-50'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</h4>
                {!product.is_available && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-[#78350f] text-[#f59e0b]' : 'bg-yellow-100 text-yellow-700'}`}>
                    Not Available
                  </span>
                )}
              </div>
              <div className={`text-sm mb-3 ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                <span className={`font-medium ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>Used in: </span>
                {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => handleEditProduct(product.name)}
                className={`opacity-0 group-hover:opacity-100 text-[#9b9cfa] hover:text-[#b4b5ff] p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'}`}
                title="Edit product name"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDeleteClick(product.name)}
                className={`opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-[#78350f]' : 'hover:bg-red-50'}`}
                title="Delete product"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className={`flex items-center justify-between pt-3 ${isDarkMode ? 'border-t border-[#3f3f46]' : 'border-t border-gray-200'}`}>
            <span className={`text-sm font-medium flex items-center ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
              Available to clients:
              <SaveStatusIndicator status={saveStatus?.[`product-availability-${product.id}`]} />
            </span>
            <button
              onClick={() => handleProductAvailabilityToggle(product.id, !product.is_available)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] focus:ring-offset-2 ${isDarkMode ? 'focus:ring-offset-[#1a1a1a]' : 'focus:ring-offset-white'} ${
                product.is_available ? 'bg-[#10b981]' : isDarkMode ? 'bg-[#3f3f46]' : 'bg-gray-300'
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
        <Dialog.Overlay className="fixed inset-0 bg-black/75 z-50" />
        <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] rounded-2xl shadow-2xl p-8 z-50 ${isDarkMode ? 'bg-[#1a1a1a] border border-[#3f3f46]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start">
              <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full mr-4 ${isDarkMode ? 'bg-[#78350f]' : 'bg-yellow-100'}`}>
                <AlertTriangle className={`h-6 w-6 ${isDarkMode ? 'text-[#f59e0b]' : 'text-yellow-600'}`} />
              </div>
              <div>
                <Dialog.Title className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Delete Product
                </Dialog.Title>
                <Dialog.Description className={`mt-2 text-sm ${isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'}`}>
                  Are you sure you want to delete <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>"{productToDelete}"</span>?
                  This will remove it from all conditions and delete all associated competitive advantage data.
                  This action cannot be undone.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className={`transition-colors ${isDarkMode ? 'text-[#6b7280] hover:text-[#9ca3af]' : 'text-gray-400 hover:text-gray-600'}`}>
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Dialog.Close asChild>
              <button
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${isDarkMode ? 'border border-[#3f3f46] bg-[#2a2a2a] text-white hover:bg-[#3f3f46]' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </Dialog.Close>

            <button
              onClick={confirmDeleteProduct}
              disabled={isDeleting}
              className={`px-6 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
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