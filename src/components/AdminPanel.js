import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import AdminPanelCore from './AdminPanel/AdminPanelCore';
import AdminPanelConditions from './AdminPanel/AdminPanelConditions';
import AdminPanelProducts from './AdminPanel/AdminPanelProducts';
import AdminPanelCategories from './AdminPanel/AdminPanelCategories';
import AdminPanelImportExport from './AdminPanel/AdminPanelImportExport';
import AdminPanelModals from './AdminPanel/AdminPanelModals';

function AdminPanel({ onSaveChangesSuccess, onClose }) {
  const [activeTab, setActiveTab] = useState('conditions');

  return (
    <AdminPanelCore onSaveChangesSuccess={onSaveChangesSuccess} onClose={onClose}>
      {(coreProps) => (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Knowledge Base Administrator</h2>
              <div className="flex items-center space-x-2">
                {coreProps.isEditing && (
                  <>
                    <button
                      onClick={coreProps.handleResetChanges}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                      disabled={coreProps.isSaving}
                    >
                      Reset Changes
                    </button>
                    <button
                      onClick={coreProps.handleSaveChanges}
                      className={`px-3 py-1.5 rounded-md text-white text-sm ${
                        coreProps.isSaving ? 'bg-[#15396c]/60' : 'bg-[#15396c] hover:bg-[#15396c]/90'
                      }`}
                      disabled={coreProps.isSaving}
                    >
                      {coreProps.isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  ×
                </button>
              </div>
            </div>

            {/* Save success notification */}
            {coreProps.showSuccess && (
              <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-md">
                ✓ Changes saved successfully!
              </div>
            )}

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
                <Tabs.Trigger
                  value="importExport"
                  className={clsx(
                    "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                    activeTab === "importExport" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                      : "text-black hover:bg-gray-200 hover:text-gray-700"
                  )}
                >
                  Import/Export
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="conditions"
                  className={clsx(
                    "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                    activeTab === "conditions" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                      : "text-black hover:bg-gray-200 hover:text-gray-700"
                  )}
                >
                  Conditions
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="products"
                  className={clsx(
                    "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                    activeTab === "products" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                      : "text-black hover:bg-gray-200 hover:text-gray-700"
                  )}
                >
                  Products
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="categories"
                  className={clsx(
                    "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                    activeTab === "categories" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                      : "text-black hover:bg-gray-200 hover:text-gray-700"
                  )}
                >
                  Categories & DDS Types
                </Tabs.Trigger>
              </Tabs.List>

              {/* Import/Export Tab */}
              <Tabs.Content value="importExport">
                <AdminPanelImportExport
                  editedConditions={coreProps.editedConditions}
                  setIsEditing={coreProps.setIsEditing}
                />
              </Tabs.Content>

              {/* Conditions Tab */}
              <Tabs.Content value="conditions">
                <AdminPanelConditions {...coreProps} />
              </Tabs.Content>

              {/* Products Tab */}
              <Tabs.Content value="products">
                <AdminPanelProducts {...coreProps} />
              </Tabs.Content>

              {/* Categories & DDS Types Tab */}
              <Tabs.Content value="categories">
                <AdminPanelCategories {...coreProps} />
              </Tabs.Content>
            </Tabs.Root>

            {/* Modals */}
            <AdminPanelModals {...coreProps} />
          </div>
        </div>
      )}
    </AdminPanelCore>
  );
}

export default AdminPanel;