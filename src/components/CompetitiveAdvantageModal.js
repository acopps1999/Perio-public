import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Target, Users, Beaker } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';

function CompetitiveAdvantageModal({ 
  isOpen, 
  onClose, 
  selectedProduct, 
  competitiveAdvantageData 
}) {
  const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();
  const [selectedTab, setSelectedTab] = useState('competitors');
  const [selectedItem, setSelectedItem] = useState(null);

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
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No {type} data available for this product.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemSelect(item, type)}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedItem && selectedItem.name === item.name
                  ? 'border-[#15396c] bg-[#15396c]/10'
                  : 'border-gray-200 hover:bg-white hover:border-[#15396c] hover:shadow-sm'
              }`}
            >
              <div className="font-medium text-[#15396c]">{item.name}</div>
              <div className="text-sm text-gray-500 mt-1">
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
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Select a {selectedTab === 'competitors' ? 'competitor' : 'active ingredient'} to view our advantages</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedItem.name}
          </h3>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        {selectedItem.advantages ? (
          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
            <div className="text-gray-800 whitespace-pre-line leading-relaxed break-words">
              {selectedItem.advantages}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Target size={48} className="mx-auto mb-4 text-gray-300" />
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
        } bg-white ${getResponsiveValue('rounded-md', 'rounded-lg', 'rounded-lg')} shadow-lg z-50 w-full ${
          isMobile ? 'max-w-none' : getResponsiveValue('max-w-2xl', 'max-w-3xl', 'max-w-4xl')
        } ${isMobile ? 'h-full' : 'max-h-[90vh]'} overflow-hidden`}>
          <div className="flex flex-col h-full max-h-full">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b-2 bg-[#15396c]/40 border-[#15396c]/50">
              <div className="flex items-center space-x-3">
                <Target size={24} className="text-[#15396c]" />
                <div>
                  <Dialog.Title className="text-xl font-semibold text-[#15396c]">
                    Competitive Advantage
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-[#15396c]/70 mt-1">
                    {selectedProduct}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {/* Tab Navigation */}
              <div className={`flex ${getResponsiveValue('mb-4', 'mb-5', 'mb-6')} bg-gray-100 rounded-lg p-1 shadow-sm`}>
                <button
                  onClick={() => {
                    setSelectedTab('competitors');
                    setSelectedItem(null);
                  }}
                  className={`flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-2', 'px-4 py-2')} rounded-md ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium transition-all duration-200 ${
                    selectedTab === 'competitors'
                      ? 'bg-[#15396c] text-white shadow-md'
                      : 'text-gray-600 hover:text-[#15396c] hover:bg-gray-50'
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
                  className={`flex-1 ${getResponsiveValue('px-3 py-2', 'px-4 py-2', 'px-4 py-2')} rounded-md ${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} font-medium transition-all duration-200 ${
                    selectedTab === 'activeIngredients'
                      ? 'bg-[#15396c] text-white shadow-md'
                      : 'text-gray-600 hover:text-[#15396c] hover:bg-gray-50'
                  }`}
                >
                  <Beaker size={isMobile ? 14 : 16} className="inline mr-2" />
                  {isMobile ? `Ingredients (${activeIngredients.length})` : `Active Ingredients (${activeIngredients.length})`}
                </button>
              </div>

              <div className="bg-white rounded-md border border-gray-200 shadow-sm flex-1 min-h-0">
                <div className={`${isMobile ? 'block' : 'flex'} ${isMobile ? 'min-h-[300px]' : 'min-h-[400px] max-h-[500px]'} h-full`}>
                  {/* Left Panel - List */}
                  <div className={`${
                    isMobile ? 'w-full border-b' : 'w-1/2 border-r'
                  } border-gray-200 ${getResponsiveValue('p-4', 'p-5', 'p-6')} overflow-y-auto bg-gray-50 min-h-0`}>
                    {/* Content based on selected tab */}
                    {selectedTab === 'competitors' && 
                      renderItemList(competitors, 'competitor', <Users size={20} className="text-[#15396c]" />, 'Competitors')
                    }
                    {selectedTab === 'activeIngredients' && 
                      renderItemList(activeIngredients, 'active ingredient', <Beaker size={20} className="text-[#15396c]" />, 'Active Ingredients')
                    }
                  </div>

                  {/* Right Panel - Details */}
                  <div className={`${
                    isMobile ? 'w-full' : 'w-1/2'
                  } ${getResponsiveValue('p-4', 'p-5', 'p-6')} overflow-y-auto bg-white min-h-0`}>
                    {renderAdvantageDetails()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`${getResponsiveValue('p-3', 'p-4', 'p-4')} border-t bg-gray-50 ${getResponsiveValue('text-center', 'text-right', 'text-right')}`}>
              <Dialog.Close className={`${
                getButtonSize() === 'lg' ? 'px-6 py-3 text-lg' : 'px-4 py-2'
              } bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 transition-colors ${
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