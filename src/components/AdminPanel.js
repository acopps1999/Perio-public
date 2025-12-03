import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import AdminPanelCore from './AdminPanel/AdminPanelCore';
import AdminPanelConditions from './AdminPanel/AdminPanelConditions';
import AdminPanelProducts from './AdminPanel/AdminPanelProducts';
import AdminPanelCategories from './AdminPanel/AdminPanelCategories';
import AdminPanelModals from './AdminPanel/AdminPanelModals';
import AdminPanelUserApprovals from './AdminPanel/AdminPanelUserApprovals';
import AdminPanelCompetitiveAdvantage from './AdminPanel/AdminPanelCompetitiveAdvantage';
import useResponsive from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';

function AdminPanel({ onSaveChangesSuccess, onClose, drawerWidth }) {
  const { isDarkMode } = useTheme();
  const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();
  const [activeTab, setActiveTab] = useState('conditions');

  return (
    <AdminPanelCore onSaveChangesSuccess={onSaveChangesSuccess} onClose={onClose}>
      {(coreProps) => (
        <div className="h-full flex flex-col overflow-hidden">
          <div
            className={`${isDarkMode ? 'bg-prism-dark-bg-primary' : 'bg-prism-light-bg-primary'} h-full flex flex-col overflow-hidden`}
            style={{
              fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif'
            }}
          >
            {/* Loading State */}
            {coreProps.isLoading && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prism-primary mx-auto mb-4"></div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'} mb-2`}>Loading Knowledge Base</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>Please wait while we load the admin panel...</p>
                </div>
              </div>
            )}
            
            {/* Main Content - Only show when not loading */}
            {!coreProps.isLoading && (
              <>
            {/* Header - Action buttons only */}
            <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row'} justify-end items-center ${getResponsiveValue('p-3', 'p-4', 'p-4')} border-b ${isDarkMode ? 'border-prism-dark-border-subtle' : 'border-prism-light-border-subtle'}`}>
              <div className={`flex items-center ${getResponsiveValue('space-x-1', 'space-x-2', 'space-x-2')} ${isMobile ? 'w-full justify-between' : ''}`}>
                {coreProps.isEditing && (
                  <>
                    <button
                      onClick={coreProps.handleResetChanges}
                      className={`${
                        getButtonSize() === 'lg' ? 'px-4 py-2.5' : 'px-3 py-1.5'
                      } border ${isDarkMode ? 'border-prism-dark-border-elevated text-prism-dark-text-primary hover:bg-prism-dark-bg-hover' : 'border-prism-light-border-elevated text-prism-light-text-primary hover:bg-prism-light-bg-hover'} rounded-md ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} ${
                        isMobile ? 'flex-1' : ''
                      } transition-all duration-250`}
                      disabled={coreProps.isSaving}
                    >
                      {isMobile ? 'Reset' : 'Reset Changes'}
                    </button>
                    <button
                      onClick={coreProps.handleSaveChanges}
                      className={`${
                        getButtonSize() === 'lg' ? 'px-4 py-2.5' : 'px-3 py-1.5'
                      } rounded-md text-white ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} ${
                        coreProps.isSaving ? (isDarkMode ? 'bg-prism-primary/60' : 'bg-prism-primary-light/60') : (isDarkMode ? 'bg-prism-primary hover:bg-prism-primary-hover' : 'bg-prism-primary-light hover:bg-prism-primary-light-hover')
                      } ${isMobile ? 'flex-1 ml-2' : ''} transition-all duration-250`}
                      disabled={coreProps.isSaving}
                    >
                      {coreProps.isSaving ? 'Saving...' : (isMobile ? 'Save' : 'Save Changes')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Save success notification */}
            {coreProps.showSuccess && (
              <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${
                isDarkMode
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}>
                ✓ Changes saved successfully!
              </div>
            )}

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className={`${isMobile ? 'grid grid-cols-2 gap-2 p-2' : 'flex gap-1'} ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'} ${isMobile ? 'rounded-md' : ''} p-1`}>
                <Tabs.Trigger
                  value="userApprovals"
                  className={clsx(
                    `${isMobile ? 'col-span-2' : 'flex-1'} ${getResponsiveValue('px-3 py-2.5', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-semibold text-center focus:outline-none transition-all duration-250 rounded-md`,
                    activeTab === "userApprovals"
                      ? isDarkMode
                        ? "bg-prism-primary text-white shadow-md"
                        : "bg-prism-primary-light text-white shadow-light-md"
                      : isDarkMode
                        ? "text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary"
                        : "text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  {isMobile ? 'User Approvals' : 'User Approvals'}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="conditions"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2.5', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-semibold text-center focus:outline-none transition-all duration-250 rounded-md`,
                    activeTab === "conditions"
                      ? isDarkMode
                        ? "bg-prism-primary text-white shadow-md"
                        : "bg-prism-primary-light text-white shadow-light-md"
                      : isDarkMode
                        ? "text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary"
                        : "text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  {isMobile ? 'Conditions' : 'Conditions & Surgical Procedures'}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="products"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2.5', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-semibold text-center focus:outline-none transition-all duration-250 rounded-md`,
                    activeTab === "products"
                      ? isDarkMode
                        ? "bg-prism-primary text-white shadow-md"
                        : "bg-prism-primary-light text-white shadow-light-md"
                      : isDarkMode
                        ? "text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary"
                        : "text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  Products
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="categories"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2.5', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-semibold text-center focus:outline-none transition-all duration-250 rounded-md`,
                    activeTab === "categories"
                      ? isDarkMode
                        ? "bg-prism-primary text-white shadow-md"
                        : "bg-prism-primary-light text-white shadow-light-md"
                      : isDarkMode
                        ? "text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary"
                        : "text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  Categories
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="competitive"
                  className={clsx(
                    `flex-1 ${getResponsiveValue('px-3 py-2.5', 'px-4 py-3', 'px-6 py-3')} ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-semibold text-center focus:outline-none transition-all duration-250 rounded-md`,
                    activeTab === "competitive"
                      ? isDarkMode
                        ? "bg-prism-primary text-white shadow-md"
                        : "bg-prism-primary-light text-white shadow-light-md"
                      : isDarkMode
                        ? "text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary"
                        : "text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary"
                  )}
                >
                  {isMobile ? 'Competitive' : 'Competitive Advantage'}
                </Tabs.Trigger>
              </Tabs.List>

              {/* User Approvals Tab */}
              <Tabs.Content value="userApprovals" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <AdminPanelUserApprovals />
              </Tabs.Content>

              {/* Conditions Tab */}
              <Tabs.Content value="conditions" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <AdminPanelConditions {...coreProps} parentDrawerWidth={drawerWidth} />
              </Tabs.Content>

              {/* Products Tab */}
              <Tabs.Content value="products" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <AdminPanelProducts {...coreProps} />
              </Tabs.Content>

              {/* Categories Tab */}
              <Tabs.Content value="categories" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <AdminPanelCategories {...coreProps} />
              </Tabs.Content>

              {/* Competitive Advantage Tab */}
              <Tabs.Content value="competitive" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <AdminPanelCompetitiveAdvantage />
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