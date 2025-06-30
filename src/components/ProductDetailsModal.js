import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Microscope, FileText, MessageSquare, Target } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';

function ProductDetailsModal({ 
  isOpen, 
  onClose, 
  selectedProduct, 
  sectionType,
  content,
  title
}) {
  const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();
  
  if (!content) {
    return null;
  }

  const getSectionIcon = (type) => {
    switch (type) {
      case 'scientificRationale':
        return <Microscope size={24} className="text-[#15396c]" />;
      case 'clinicalEvidence':
        return <FileText size={24} className="text-[#15396c]" />;
      case 'handlingObjections':
        return <MessageSquare size={24} className="text-[#15396c]" />;
      case 'pitchPoints':
        return <Target size={24} className="text-[#15396c]" />;
      default:
        return <FileText size={24} className="text-[#15396c]" />;
    }
  };

  const getSectionColor = (type) => {
    switch (type) {
      case 'scientificRationale':
        return 'bg-[#15396c]/10 border-[#15396c]/20';
      case 'clinicalEvidence':
        return 'bg-[#15396c]/25 border-[#15396c]/35';
      case 'handlingObjections':
        return 'bg-[#15396c]/55 border-[#15396c]/65';
      case 'pitchPoints':
        return 'bg-[#15396c]/70 border-[#15396c]/80';
      default:
        return 'bg-[#15396c]/10 border-[#15396c]/20';
    }
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
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`flex justify-between items-start ${getResponsiveValue('p-4', 'p-5', 'p-6')} border-b-2 ${getSectionColor(sectionType)}`}>
              <div className={`flex items-center ${getResponsiveValue('space-x-2', 'space-x-3', 'space-x-3')}`}>
                {getSectionIcon(sectionType)}
                <div>
                  <Dialog.Title className={`${getResponsiveValue('text-lg', 'text-xl', 'text-xl')} font-semibold text-[#15396c]`}>
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className={`${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} text-[#15396c]/70 mt-1`}>
                    {selectedProduct}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className={`text-gray-400 hover:text-gray-600 transition-colors ${getResponsiveValue('p-1', 'p-0', 'p-0')}`}>
                <X size={isMobile ? 20 : 24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div 
              className="flex-1 overflow-y-scroll" 
              style={{ 
                minHeight: 0, 
                maxHeight: isMobile ? 'calc(100vh - 200px)' : '60vh'
              }}
            >
              <div className={getResponsiveValue('p-4', 'p-5', 'p-6')}>
                {content ? (
                  <div className={`bg-white ${getResponsiveValue('p-4', 'p-5', 'p-6')} rounded-md border border-gray-200 shadow-sm`}>
                    <div className={`text-gray-800 whitespace-pre-line ${getResponsiveValue('leading-relaxed text-sm', 'leading-relaxed', 'leading-relaxed')} break-words`}>
                      {content}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center ${getResponsiveValue('py-8', 'py-10', 'py-12')} text-gray-500`}>
                    <div className="mb-4">
                      {getSectionIcon(sectionType)}
                    </div>
                    <p className={getResponsiveValue('text-sm', 'text-base', 'text-base')}>
                      No {title.toLowerCase()} information available for this product.
                    </p>
                  </div>
                )}
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

export default ProductDetailsModal; 