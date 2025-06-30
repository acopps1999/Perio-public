import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, ExternalLink } from 'lucide-react';

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
          <div className="py-10 text-center text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No research articles available for this product.</p>
          </div>
        );
      }
      return researchArticles.map((article, index) => (
        <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
          <h3 className="font-medium text-lg text-indigo-600">
            {article.url ? (
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline flex items-start"
              >
                <span className="mr-2">{index + 1}.</span>
                <span>{article.title}</span>
              </a>
            ) : (
              <div className="flex items-start">
                <span className="mr-2">{index + 1}.</span>
                <span>{article.title}</span>
              </div>
            )}
          </h3>
          {article.author && <p className="text-gray-600 mt-1 pl-6">{article.author}</p>}
          {article.abstract && (
            <div className="mt-3 pl-6">
              <div className="bg-gray-50 border-l-4 border-indigo-600 p-4 rounded-r-md">
                <div className="text-gray-700 leading-relaxed text-justify">
                  {article.abstract.split('\n').map((paragraph, index) => (
                    <p key={index} className={index > 0 ? "mt-3" : ""}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {article.url && (
            <div className="mt-3 pl-6">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm inline-flex items-center">
                <ExternalLink size={14} className="mr-1" />
                <span>View Article</span>
              </a>
            </div>
          )}
        </div>
      ));
    }

    // Otherwise, show research for all currently filtered products
    if (!filteredProducts || filteredProducts.length === 0) {
      return (
        <div className="py-10 text-center text-gray-500">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No products selected or no research available for the current selection.</p>
        </div>
      );
    }

    return filteredProducts.map((product) => {
      const productResearch = getProductResearch(product);
      if (!productResearch || productResearch.length === 0) return null;
      
      return (
        <div key={product} className="mb-8">
          <h3 className="text-lg font-medium text-indigo-800 border-b pb-2">
            {product.replace(' (Type 3/4 Only)', '')}
          </h3>
          {productResearch.map((article, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0 mt-4">
              <h4 className="font-medium text-lg text-indigo-600">
                {article.url ? (
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-start">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{article.title}</span>
                  </a>
                ) : (
                  <div className="flex items-start">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{article.title}</span>
                  </div>
                )}
              </h4>
              {article.author && <p className="text-gray-600 mt-1 pl-6">{article.author}</p>}
              {article.abstract && (
                <div className="mt-3 pl-6">
                  <div className="bg-gray-50 border-l-4 border-indigo-600 p-4 rounded-r-md">
                    <div className="text-gray-700 leading-relaxed text-justify">
                      {article.abstract.split('\n').map((paragraph, index) => (
                        <p key={index} className={index > 0 ? "mt-3" : ""}>
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {article.url && (
                <div className="mt-3 pl-6">
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm inline-flex items-center">
                    <ExternalLink size={14} className="mr-1" />
                    <span>View Article</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }).filter(Boolean); // Filter out null entries if a product had no research
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-3xl w-[90vw] bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto z-50">
          <Dialog.Title className="text-xl font-semibold text-gray-900 flex items-center">
            <BookOpen size={24} className="mr-2 text-indigo-600" />
            {getResearchTitle()}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mt-1 mb-4">
            Scientific articles and studies supporting clinical recommendations
          </Dialog.Description>
          
          <div className="space-y-6">
            {renderResearchContent()}
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
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