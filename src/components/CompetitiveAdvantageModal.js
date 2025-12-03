import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Target, Users, Beaker } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/featureVisibility';

function CompetitiveAdvantageModal({
  isOpen,
  onClose,
  selectedProduct,
  competitiveAdvantageData
}) {
  const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();
  const { isDarkMode } = useTheme();
  const { userRole } = useAuth();
  const [selectedTab, setSelectedTab] = useState('competitors');
  const [selectedItem, setSelectedItem] = useState(null);

  // Hide entire modal for users without competitive_advantage access (clinicians)
  if (!hasFeatureAccess('competitive_advantage', userRole)) {
    return null;
  }

  if (!competitiveAdvantageData) {
    return null;
  }

  const { competitors = [], activeIngredients = [] } = competitiveAdvantageData;

  const handleItemSelect = (item, type) => {
    setSelectedItem({ ...item, type });
  };

  const renderItemList = (items, type, icon, title) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No {type} data available for this product.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemSelect(item, type)}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-250 ease-smooth ${
                selectedItem && selectedItem.name === item.name
                  ? isDarkMode
                    ? 'border-prism-primary bg-prism-primary/15'
                    : 'border-prism-primary/50 bg-prism-primary/10'
                  : isDarkMode
                    ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/50 hover:shadow-sm'
                    : 'border-gray-200 hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40 hover:shadow-sm'
              }`}
            >
              <div className={`font-medium ${isDarkMode ? 'text-prism-primary' : 'text-prism-primary'}`}>{item.name}</div>
              <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Click to view competitive advantages
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdvantageDetails = () => {
    if (!selectedItem) {
      return (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Target size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p>Select a {selectedTab === 'competitors' ? 'competitor' : 'active ingredient'} to view our advantages</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedItem.name}
          </h3>
          <button
            onClick={() => setSelectedItem(null)}
            className={`transition-colors duration-250 ease-smooth ${
              isDarkMode
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {selectedItem.advantages ? (
          <div className={`p-6 rounded-lg border transition-all duration-250 ease-smooth ${
            isDarkMode
              ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated shadow-sm'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className={`whitespace-pre-line leading-relaxed break-words ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {selectedItem.advantages}
            </div>
          </div>
        ) : (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Target size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p>No advantages listed for this {selectedItem.type}.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className={`fixed ${
          isMobile
            ? 'inset-x-4 inset-y-8 transform-none'
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
        } ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-white'} rounded-xl shadow-lg z-50 w-full ${
          isMobile ? 'max-w-none' : getResponsiveValue('max-w-2xl', 'max-w-3xl', 'max-w-4xl')
        } ${isMobile ? 'h-full' : 'max-h-[90vh]'} overflow-hidden`}>
          <div className="flex flex-col h-full max-h-full">
            {/* Header */}
            <div className={`flex justify-between items-start p-6 border-b-2 transition-all duration-250 ease-smooth ${
              isDarkMode
                ? 'bg-prism-primary/15 border-prism-primary/30'
                : 'bg-prism-primary/10 border-prism-primary/30'
            }`}>
              <div className="flex items-center space-x-3">
                <Target size={24} className="text-prism-primary" />
                <div>
                  <Dialog.Title className={`text-xl font-semibold text-prism-primary`}>
                    Competitive Advantage
                  </Dialog.Title>
                  <Dialog.Description className={`text-sm mt-1 ${isDarkMode ? 'text-prism-primary/60' : 'text-prism-primary/70'}`}>
                    {selectedProduct}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className={`transition-colors duration-250 ease-smooth ${
                isDarkMode
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
                <X size={24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className={`flex-1 p-6 overflow-y-auto min-h-0 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-white'}`}>
              {/* Tab Navigation */}
              <div className={`flex ${getResponsiveValue('mb-4', 'mb-5', 'mb-6')} rounded-lg p-1 shadow-sm ${
                isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => {
                    setSelectedTab('competitors');
                    setSelectedItem(null);
                  }}
                  className={`flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-2', 'px-4 py-2')} rounded-md ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium transition-all duration-250 ease-smooth border-b-2 ${
                    selectedTab === 'competitors'
                      ? `bg-transparent border-prism-primary text-prism-primary ${isDarkMode ? 'shadow-none' : 'shadow-sm'}`
                      : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-prism-primary' : 'text-gray-600 hover:text-prism-primary'}`
                  }`}
                >
                  <Users size={isMobile ? 14 : 16} className="inline mr-2" />
                  {isMobile ? `Competitors (${competitors.length})` : `Competitors (${competitors.length})`}
                </button>
                <button
                  onClick={() => {
                    setSelectedTab('activeIngredients');
                    setSelectedItem(null);
                  }}
                  className={`flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-2', 'px-4 py-2')} rounded-md ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium transition-all duration-250 ease-smooth border-b-2 ${
                    selectedTab === 'activeIngredients'
                      ? `bg-transparent border-prism-primary text-prism-primary ${isDarkMode ? 'shadow-none' : 'shadow-sm'}`
                      : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-prism-primary' : 'text-gray-600 hover:text-prism-primary'}`
                  }`}
                >
                  <Beaker size={isMobile ? 14 : 16} className="inline mr-2" />
                  {isMobile ? `Ingredients (${activeIngredients.length})` : `Active Ingredients (${activeIngredients.length})`}
                </button>
              </div>

              <div className={`rounded-lg border flex-1 min-h-0 ${
                isDarkMode
                  ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated shadow-sm'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className={`${isMobile ? 'block' : 'flex'} ${isMobile ? 'min-h-[300px]' : 'min-h-[400px] max-h-[500px]'} h-full`}>
                  {/* Left Panel - List */}
                  <div className={`${
                    isMobile ? 'w-full border-b' : 'w-1/2 border-r'
                  } transition-all duration-250 ease-smooth ${
                    isDarkMode
                      ? 'border-prism-dark-border-elevated bg-prism-dark-bg-secondary'
                      : 'border-gray-200 bg-gray-50'
                  } ${getResponsiveValue('p-4', 'p-5', 'p-6')} overflow-y-auto min-h-0`}>
                    {/* Content based on selected tab */}
                    {selectedTab === 'competitors' &&
                      renderItemList(competitors, 'competitor', <Users size={20} className="text-prism-primary" />, 'Competitors')
                    }
                    {selectedTab === 'activeIngredients' &&
                      renderItemList(activeIngredients, 'active ingredient', <Beaker size={20} className="text-prism-primary" />, 'Active Ingredients')
                    }
                  </div>

                  {/* Right Panel - Details */}
                  <div className={`${
                    isMobile ? 'w-full' : 'w-1/2'
                  } ${getResponsiveValue('p-4', 'p-5', 'p-6')} overflow-y-auto ${isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-white'} min-h-0`}>
                    {renderAdvantageDetails()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`${getResponsiveValue('p-3', 'p-4', 'p-4')} border-t transition-all duration-250 ease-smooth ${
              isDarkMode
                ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated'
                : 'bg-gray-50 border-gray-200'
            } ${getResponsiveValue('text-center', 'text-right', 'text-right')}`}>
              <Dialog.Close className={`${
                getButtonSize() === 'lg' ? 'px-6 py-3 text-lg' : 'px-4 py-2'
              } rounded-lg transition-all duration-250 ease-smooth font-medium ${
                isDarkMode
                  ? 'bg-prism-primary text-prism-dark-bg-primary hover:bg-prism-primary/90'
                  : 'bg-prism-primary text-white hover:bg-prism-light-hover'
              } ${
                isMobile ? 'w-full' : 'inline-block'
              }`}>
                Close
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CompetitiveAdvantageModal; 