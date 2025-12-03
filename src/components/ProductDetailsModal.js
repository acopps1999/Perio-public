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
        return <Microscope size={24} className="text-prism-primary" />;
      case 'clinicalEvidence':
        return <FileText size={24} className="text-prism-primary" />;
      case 'handlingObjections':
        return <MessageSquare size={24} className="text-prism-primary" />;
      case 'pitchPoints':
        return <Target size={24} className="text-prism-primary" />;
      default:
        return <FileText size={24} className="text-prism-primary" />;
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 z-50" />
        <Dialog.Content className={`fixed ${
          isMobile
            ? 'inset-x-4 inset-y-8 transform-none'
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
        } bg-white dark:bg-prism-dark-bg-secondary ${getResponsiveValue('rounded-xl', 'rounded-xl', 'rounded-xl')} shadow-light-xl dark:shadow-xl z-50 w-full ${
          isMobile ? 'max-w-none' : getResponsiveValue('max-w-2xl', 'max-w-3xl', 'max-w-4xl')
        } ${isMobile ? 'h-full' : 'max-h-[90vh]'} overflow-hidden transition-all duration-250`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`flex justify-between items-start ${getResponsiveValue('p-6', 'p-8', 'p-8')} border-b border-prism-light-border-subtle dark:border-prism-dark-border-subtle`}>
              <div className={`flex items-center ${getResponsiveValue('space-x-2', 'space-x-3', 'space-x-3')}`}>
                <div className="flex-shrink-0">
                  {getSectionIcon(sectionType)}
                </div>
                <div>
                  <Dialog.Title className={`${getResponsiveValue('text-lg', 'text-xl', 'text-xl')} font-semibold text-prism-light-text-primary dark:text-prism-dark-text-primary`}>
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className={`${getResponsiveValue('text-xs', 'text-sm', 'text-sm')} text-prism-light-text-secondary dark:text-prism-dark-text-secondary mt-1`}>
                    {selectedProduct}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className={`text-prism-light-text-tertiary dark:text-prism-dark-text-tertiary hover:text-prism-primary transition-all duration-250 ${getResponsiveValue('p-1', 'p-0', 'p-0')}`}>
                <X size={isMobile ? 20 : 24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-scroll bg-white dark:bg-prism-dark-bg-primary"
              style={{
                minHeight: 0,
                maxHeight: isMobile ? 'calc(100vh - 200px)' : '60vh'
              }}
            >
              <div className={getResponsiveValue('p-6', 'p-8', 'p-8')}>
                {content ? (
                  <div className={`bg-white dark:bg-prism-dark-bg-secondary ${getResponsiveValue('p-6', 'p-8', 'p-8')} rounded-lg border-l-4 border-prism-primary shadow-light-sm dark:shadow-sm transition-all duration-250`}>
                    <div className={`text-prism-light-text-primary dark:text-prism-dark-text-primary whitespace-pre-line ${getResponsiveValue('leading-relaxed text-sm', 'leading-relaxed', 'leading-relaxed')} break-words`}>
                      {content}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center ${getResponsiveValue('py-8', 'py-10', 'py-12')} text-prism-light-text-secondary dark:text-prism-dark-text-secondary`}>
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
            <div className={`${getResponsiveValue('p-6', 'p-8', 'p-8')} border-t border-prism-light-border-subtle dark:border-prism-dark-border-subtle bg-white dark:bg-prism-dark-bg-secondary ${getResponsiveValue('text-center', 'text-right', 'text-right')}`}>
              <Dialog.Close className={`${
                getButtonSize() === 'lg' ? 'px-6 py-3 text-lg' : 'px-6 py-2.5'
              } bg-prism-primary dark:bg-prism-primary text-white rounded-lg hover:bg-prism-hover dark:hover:bg-prism-hover transition-all duration-250 font-medium ${
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