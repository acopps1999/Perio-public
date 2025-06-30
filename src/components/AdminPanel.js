import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import AdminPanelCore from './AdminPanel/AdminPanelCore';
import AdminPanelConditions from './AdminPanel/AdminPanelConditions';
import AdminPanelProducts from './AdminPanel/AdminPanelProducts';
import AdminPanelCategories from './AdminPanel/AdminPanelCategories';
import AdminPanelImportExport from './AdminPanel/AdminPanelImportExport';
import AdminPanelModals from './AdminPanel/AdminPanelModals';
import useResponsive from '../hooks/useResponsive';

function AdminPanel({ onSaveChangesSuccess, onClose }) {
  const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();
  const [activeTab, setActiveTab] = useState('conditions');

  return (
    <AdminPanelCore onSaveChangesSuccess={onSaveChangesSuccess} onClose={onClose}>
      {(coreProps) => (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${getResponsiveValue('p-2', 'p-3', 'p-4')} overflow-hidden`}>
          <div 
            className={`bg-white ${getResponsiveValue('rounded-md', 'rounded-lg', 'rounded-lg')} shadow-xl w-full ${
              isMobile ? 'max-w-none h-full' : getResponsiveValue('max-w-3xl', 'max-w-5xl', 'max-w-6xl')
            } ${isMobile ? 'max-h-none' : 'max-h-[90vh]'} flex flex-col overflow-hidden`}
            style={{ 
              fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif' 
            }}
          >
            {/* Loading State */}
            {coreProps.isLoading && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#15396c] mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Knowledge Base</h3>
                  <p className="text-sm text-gray-500">Please wait while we load the admin panel...</p>
                </div>
              </div>
            )}
            
            {/* Main Content - Only show when not loading */}
            {!coreProps.isLoading && (
              <>
            {/* Header */}
            <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row'} justify-between items-center ${getResponsiveValue('p-3', 'p-4', 'p-4')} border-b`}>
              <h2 className={`${getResponsiveValue('text-lg', 'text-xl', 'text-xl')} font-bold ${isMobile ? 'text-center' : ''}`}>
                {isMobile ? 'Admin Panel' : 'Knowledge Base Administrator'}
              </h2>
              <div className={`flex items-center ${getResponsiveValue('space-x-1', 'space-x-2', 'space-x-2')} ${isMobile ? 'w-full justify-between' : ''}`}>
                {coreProps.isEditing && (
                  <>
                    <button
                      onClick={coreProps.handleResetChanges}
                      className={`${
                        getButtonSize() === 'lg' ? 'px-4 py-2.5' : 'px-3 py-1.5'
                      } border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} ${
                        isMobile ? 'flex-1' : ''
                      }`}
                      disabled={coreProps.isSaving}
                    >
                      {isMobile ? 'Reset' : 'Reset Changes'}
                    </button>
                    <button
                      onClick={coreProps.handleSaveChanges}
                      className={`${
                        getButtonSize() === 'lg' ? 'px-4 py-2.5' : 'px-3 py-1.5'
                      } rounded-md text-white ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} ${
                        coreProps.isSaving ? 'bg-[#15396c]/60' : 'bg-[#15396c] hover:bg-[#15396c]/90'
                      } ${isMobile ? 'flex-1 ml-2' : ''}`}
                      disabled={coreProps.isSaving}
                    >
                      {coreProps.isSaving ? 'Saving...' : (isMobile ? 'Save' : 'Save Changes')}
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose} 
                  className={`text-gray-500 hover:text-gray-700 ${getResponsiveValue('text-2xl', 'text-xl', 'text-xl')} ${
                    isMobile ? 'ml-2' : ''
                  }`}
                >
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
              <Tabs.List className={`${isMobile ? 'grid grid-cols-2 gap-1 p-1' : 'flex'} bg-gray-100 ${isMobile ? 'rounded-md' : 'rounded-t-lg'} overflow-hidden`}>
                <Tabs.Trigger
                  value="importExport"
                  className={clsx(
                    `${isMobile ? 'col-span-2' : 'flex-1'} ${getResponsiveValue('px-3 py-2', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium text-center focus:outline-none transition-all duration-200`,
                    activeTab === "importExport" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c] rounded-md"
                      : "text-black hover:bg-gray-200 hover:text-gray-700 rounded-md"
                  )}
                >
                  {isMobile ? 'Import/Export' : 'Import/Export'}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="conditions"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium text-center focus:outline-none transition-all duration-200`,
                    activeTab === "conditions" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c] rounded-md"
                      : "text-black hover:bg-gray-200 hover:text-gray-700 rounded-md"
                  )}
                >
                  {isMobile ? 'Conditions' : 'Conditions & Surgical Procedures'}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="products"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium text-center focus:outline-none transition-all duration-200`,
                    activeTab === "products" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c] rounded-md"
                      : "text-black hover:bg-gray-200 hover:text-gray-700 rounded-md"
                  )}
                >
                  Products
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="categories"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium text-center focus:outline-none transition-all duration-200`,
                    activeTab === "categories" 
                      ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c] rounded-md"
                      : "text-black hover:bg-gray-200 hover:text-gray-700 rounded-md"
                  )}
                >
                  Categories
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

              {/* Categories Tab */}
              <Tabs.Content value="categories">
                <AdminPanelCategories {...coreProps} />
              </Tabs.Content>
            </Tabs.Root>

            {/* Modals */}
            <AdminPanelModals {...coreProps} />
              </>
            )}
          </div>
        </div>
      )}
    </AdminPanelCore>
  );
}

export default AdminPanel;