import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Target, Users, Beaker } from 'lucide-react';

function CompetitiveAdvantageModal({ 
  isOpen, 
  onClose, 
  selectedProduct, 
  competitiveAdvantageData 
}) {
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
              className="p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#15396c] cursor-pointer transition-all duration-200"
            >
              <div className="font-medium text-gray-900">{item.name}</div>
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
          <div className="p-6 bg-white border-6 border-[#15396c] rounded-md shadow-md">
            <div className="text-gray-800 whitespace-pre-line">
              {selectedItem.advantages}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No advantages listed for this {selectedItem.type}.
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-50 w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Competitive Advantage - {selectedProduct}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex h-96">
              {/* Left Panel - List */}
              <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
                {/* Tab Navigation */}
                <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => {
                      setSelectedTab('competitors');
                      setSelectedItem(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTab === 'competitors'
                        ? 'bg-[#15396c] text-white shadow-md'
                        : 'text-gray-600 hover:text-[#15396c] hover:bg-gray-50'
                    }`}
                  >
                    <Users size={16} className="inline mr-2" />
                    Competitors ({competitors.length})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTab('activeIngredients');
                      setSelectedItem(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTab === 'activeIngredients'
                        ? 'bg-[#15396c] text-white shadow-md'
                        : 'text-gray-600 hover:text-[#15396c] hover:bg-gray-50'
                    }`}
                  >
                    <Beaker size={16} className="inline mr-2" />
                    Active Ingredients ({activeIngredients.length})
                  </button>
                </div>

                {/* Content based on selected tab */}
                {selectedTab === 'competitors' && 
                  renderItemList(competitors, 'competitor', <Users size={20} className="text-[#15396c]" />, 'Competitors')
                }
                {selectedTab === 'activeIngredients' && 
                  renderItemList(activeIngredients, 'active ingredient', <Beaker size={20} className="text-[#15396c]" />, 'Active Ingredients')
                }
              </div>

              {/* Right Panel - Details */}
              <div className="w-1/2 p-6 overflow-y-auto bg-white">
                {renderAdvantageDetails()}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CompetitiveAdvantageModal; 