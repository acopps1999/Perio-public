import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, ExternalLink, X, FileText } from 'lucide-react';

function ResearchModal({
  isOpen,
  setIsOpen,
  selectedCondition, // Need the whole condition to access research data
  selectedResearchProduct, // Optional specific product name
  filteredProducts, // Fallback if no specific product is selected
  getProductResearch, // Function to get research articles
}) {
  const getResearchTitle = () => {
    if (selectedResearchProduct) {
      return `Published Research for ${selectedResearchProduct.replace(' (Type 3/4 Only)', '')}`;
    }
    if (selectedCondition) {
      return `Published Research for ${selectedCondition.name}`;
    }
    return 'Published Research';
  };

  const renderResearchContent = () => {
    if (!selectedCondition) return null;

    // Show research for a specific product if selectedResearchProduct is provided
    if (selectedResearchProduct) {
      const researchArticles = getProductResearch(selectedResearchProduct);
      if (!researchArticles || researchArticles.length === 0) {
        return (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md mx-auto">
              <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
              <h4 className="text-xl font-semibold text-gray-700 mb-3">No Research Articles Found</h4>
              <p className="text-gray-500 mb-2">No research articles are available for this product.</p>
              <p className="text-sm text-gray-400">Research articles can be added through the Admin Panel.</p>
            </div>
          </div>
        );
      }
      return researchArticles.map((article, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-lg text-[#15396c] hover:text-[#15396c]/80 flex-1 pr-4">
              <span className="text-gray-400 mr-3 font-normal">{index + 1}.</span>
              {article.title}
            </h3>
            {article.url && (
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center px-3 py-1.5 bg-[#15396c] text-white text-xs font-medium rounded-md hover:bg-[#15396c]/90 transition-colors"
              >
                <span>View Article</span>
                <ExternalLink size={12} className="ml-1" />
              </a>
            )}
          </div>
          
          {article.author && (
            <div className="text-gray-600 text-sm mb-4 border-b border-gray-100 pb-3">
              <p className="flex items-center">
                <span className="font-medium text-gray-700 mr-2">Authors:</span>
                <span>{article.author}</span>
              </p>
            </div>
          )}
          
          {article.abstract && (
            <div className="mt-4">
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                <FileText size={16} className="mr-2 text-[#15396c]" />
                Abstract
              </h5>
              <div className="bg-gradient-to-r from-[#15396c]/5 to-transparent border-l-4 border-[#15396c] p-4 rounded-r-md">
                <div className="text-gray-700 leading-relaxed text-justify">
                  {article.abstract.split('\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className={pIndex > 0 ? "mt-3" : ""}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ));
    }

    // Otherwise, show research for all currently filtered products
    if (!filteredProducts || filteredProducts.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md mx-auto">
            <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
            <h4 className="text-xl font-semibold text-gray-700 mb-3">No Research Available</h4>
            <p className="text-gray-500">No products selected or no research available for the current selection.</p>
          </div>
        </div>
      );
    }

    return filteredProducts.map((product) => {
      const productResearch = getProductResearch(product);
      if (!productResearch || productResearch.length === 0) return null;
      
      return (
        <div key={product} className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#15396c] text-white p-4">
              <h3 className="text-lg font-semibold flex items-center">
                <FileText size={20} className="mr-3" />
                {product.replace(' (Type 3/4 Only)', '')}
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {productResearch.map((article, index) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-lg text-[#15396c] hover:text-[#15396c]/80 flex-1 pr-4">
                      <span className="text-gray-400 mr-3 font-normal">{index + 1}.</span>
                      {article.title}
                    </h4>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 inline-flex items-center px-3 py-1.5 bg-[#15396c] text-white text-xs font-medium rounded-md hover:bg-[#15396c]/90 transition-colors">
                        <span>View Article</span>
                        <ExternalLink size={12} className="ml-1" />
                      </a>
                    )}
                  </div>
                  
                  {article.author && (
                    <div className="text-gray-600 text-sm mb-4 border-b border-gray-200 pb-3">
                      <p className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">Authors:</span>
                        <span>{article.author}</span>
                      </p>
                    </div>
                  )}
                  
                  {article.abstract && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <FileText size={16} className="mr-2 text-[#15396c]" />
                        Abstract
                      </h5>
                      <div className="bg-gradient-to-r from-[#15396c]/5 to-transparent border-l-4 border-[#15396c] p-4 rounded-r-md">
                        <div className="text-gray-700 leading-relaxed text-justify">
                          {article.abstract.split('\n').map((paragraph, pIndex) => (
                            <p key={pIndex} className={pIndex > 0 ? "mt-3" : ""}>
                              {paragraph.trim()}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }).filter(Boolean); // Filter out null entries if a product had no research
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-4xl w-[90vw] bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden z-50 flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-[#15396c] text-white rounded-t-lg">
            <Dialog.Title className="text-xl font-semibold flex items-center">
              <BookOpen size={24} className="mr-3 text-white" />
              {getResearchTitle()}
            </Dialog.Title>
            <Dialog.Close className="text-white/80 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
              <X size={24} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-gray-500 p-6 pb-3 bg-gray-50 border-b border-gray-200">
            Scientific articles and studies supporting clinical recommendations
          </Dialog.Description>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-6">
              {renderResearchContent()}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-white text-right rounded-b-lg">
            <Dialog.Close asChild>
              <button className="inline-flex items-center px-6 py-2.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:ring-offset-2 transition-colors font-medium">
                <X size={18} className="mr-2" />
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ResearchModal; 