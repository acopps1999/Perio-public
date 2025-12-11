import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Search, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * CopyProductDetailsModal - Modal for copying product details from another condition
 *
 * Allows admins to copy a product's details (rationale, clinical evidence, objections,
 * pitch points, usage instructions, research articles) from another condition where
 * the same product is recommended.
 */
function CopyProductDetailsModal({
  isOpen,
  onClose,
  productName,
  currentConditionId,
  currentConditionName,
  conditions,
  onCopyDetails
}) {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [copyOptions, setCopyOptions] = useState({
    rationale: true,
    clinicalEvidence: true,
    handlingObjections: true,
    pitchPoints: true,
    usage: true,
    researchArticles: true
  });
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCondition(null);
      setCopySuccess(false);
      setCopyOptions({
        rationale: true,
        clinicalEvidence: true,
        handlingObjections: true,
        pitchPoints: true,
        usage: true,
        researchArticles: true
      });
    }
  }, [isOpen]);

  // Find conditions that have product details for this product (excluding current condition)
  const availableConditions = useMemo(() => {
    if (!conditions || !productName) return [];

    return conditions.filter(condition => {
      // Exclude the current condition
      if (condition.db_id === currentConditionId) return false;

      // Check if this condition has product details for this product
      const hasProductDetails = condition.productDetails &&
        condition.productDetails[productName] &&
        hasAnyContent(condition.productDetails[productName]);

      // Also check conditionSpecificResearch
      const hasResearch = condition.conditionSpecificResearch &&
        condition.conditionSpecificResearch[productName] &&
        condition.conditionSpecificResearch[productName].length > 0;

      return hasProductDetails || hasResearch;
    });
  }, [conditions, productName, currentConditionId]);

  // Filter by search query
  const filteredConditions = useMemo(() => {
    if (!searchQuery.trim()) return availableConditions;

    const query = searchQuery.toLowerCase();
    return availableConditions.filter(condition =>
      condition.name.toLowerCase().includes(query) ||
      (condition.category && condition.category.toLowerCase().includes(query))
    );
  }, [availableConditions, searchQuery]);

  // Check if product details has any non-empty content
  function hasAnyContent(details) {
    if (!details) return false;
    return (
      (details.rationale && details.rationale.trim()) ||
      (details.clinicalEvidence && details.clinicalEvidence.trim()) ||
      (details.handlingObjections && details.handlingObjections.trim()) ||
      (details.pitchPoints && details.pitchPoints.trim()) ||
      (details.usage && typeof details.usage === 'object' && Object.values(details.usage).some(v => v && v.trim()))
    );
  }

  // Get preview of what will be copied from selected condition
  const getPreviewContent = (condition) => {
    if (!condition) return null;

    const details = condition.productDetails?.[productName] || {};
    const research = condition.conditionSpecificResearch?.[productName] || [];

    return {
      rationale: details.rationale || '',
      clinicalEvidence: details.clinicalEvidence || '',
      handlingObjections: details.handlingObjections || '',
      pitchPoints: details.pitchPoints || '',
      usage: details.usage || {},
      researchArticles: research
    };
  };

  const previewContent = selectedCondition ? getPreviewContent(selectedCondition) : null;

  // Handle the copy action
  const handleCopy = async () => {
    if (!selectedCondition || !previewContent) return;

    setIsCopying(true);
    try {
      await onCopyDetails(selectedCondition, previewContent, copyOptions);
      setCopySuccess(true);
      // Close after a brief delay to show success state
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsCopying(false);
    }
  };

  // Toggle a copy option
  const toggleOption = (option) => {
    setCopyOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Count how many fields have content
  const getContentSummary = (condition) => {
    const details = condition.productDetails?.[productName] || {};
    const research = condition.conditionSpecificResearch?.[productName] || [];
    const fields = [];

    if (details.rationale?.trim()) fields.push('Rationale');
    if (details.clinicalEvidence?.trim()) fields.push('Evidence');
    if (details.handlingObjections?.trim()) fields.push('Objections');
    if (details.pitchPoints?.trim()) fields.push('Pitch');
    if (details.usage && typeof details.usage === 'object' &&
        Object.values(details.usage).some(v => v?.trim())) {
      fields.push('Usage');
    }
    if (research.length > 0) fields.push(`${research.length} Article${research.length > 1 ? 's' : ''}`);

    return fields;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] animate-in fade-in duration-200"
        />

        {/* Modal */}
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90]
            w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden
            ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}
            animate-in fade-in zoom-in-95 duration-200`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkMode ? 'border-[#2a2a2a]' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-[#9b9cfa]/20' : 'bg-[#9b9cfa]/10'
              }`}>
                <Copy size={20} className="text-[#9b9cfa]" />
              </div>
              <div>
                <Dialog.Title className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Copy Product Details
                </Dialog.Title>
                <Dialog.Description className={`text-sm ${
                  isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'
                }`}>
                  Copy {productName} details from another condition
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {availableConditions.length === 0 ? (
              /* No conditions available */
              <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${
                isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'
              }`}>
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="font-medium">No other conditions have details for {productName}</p>
                <p className="text-sm mt-1">
                  Add product details to other conditions first, then you can copy them here.
                </p>
              </div>
            ) : selectedCondition ? (
              /* Preview and options view */
              <div className="flex-1 overflow-y-auto">
                {/* Back button and selected condition */}
                <div className={`sticky top-0 px-6 py-3 border-b ${
                  isDarkMode ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
                }`}>
                  <button
                    onClick={() => setSelectedCondition(null)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      isDarkMode ? 'text-[#9b9cfa] hover:text-[#b4b5ff]' : 'text-[#7c7ddb] hover:text-[#9b9cfa]'
                    }`}
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Back to condition list
                  </button>
                  <div className={`mt-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Copying from: <span className="font-semibold">{selectedCondition.name}</span>
                  </div>
                </div>

                {/* Copy options */}
                <div className="px-6 py-4 space-y-3">
                  <h4 className={`text-sm font-medium mb-3 ${
                    isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'
                  }`}>
                    Select what to copy:
                  </h4>

                  {/* Option checkboxes */}
                  {[
                    { key: 'rationale', label: 'Scientific Rationale', content: previewContent?.rationale },
                    { key: 'clinicalEvidence', label: 'Clinical Evidence', content: previewContent?.clinicalEvidence },
                    { key: 'handlingObjections', label: 'Handling Objections', content: previewContent?.handlingObjections },
                    { key: 'pitchPoints', label: 'Key Pitch Points', content: previewContent?.pitchPoints },
                    {
                      key: 'usage',
                      label: 'Usage Instructions',
                      content: previewContent?.usage && Object.values(previewContent.usage).some(v => v?.trim())
                        ? `${Object.keys(previewContent.usage).filter(k => previewContent.usage[k]?.trim()).length} phase(s)`
                        : null
                    },
                    {
                      key: 'researchArticles',
                      label: 'Research Articles',
                      content: previewContent?.researchArticles?.length
                        ? `${previewContent.researchArticles.length} article(s)`
                        : null
                    }
                  ].map(({ key, label, content }) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        !content
                          ? 'opacity-50 cursor-not-allowed'
                          : copyOptions[key]
                            ? isDarkMode ? 'bg-[#9b9cfa]/10' : 'bg-[#9b9cfa]/5'
                            : isDarkMode ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={copyOptions[key] && !!content}
                        onChange={() => content && toggleOption(key)}
                        disabled={!content}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#9b9cfa] focus:ring-[#9b9cfa]"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {label}
                        </div>
                        {content ? (
                          <div className={`text-xs mt-1 line-clamp-2 ${
                            isDarkMode ? 'text-[#9ca3af]' : 'text-gray-500'
                          }`}>
                            {typeof content === 'string'
                              ? content.substring(0, 100) + (content.length > 100 ? '...' : '')
                              : content}
                          </div>
                        ) : (
                          <div className={`text-xs mt-1 italic ${
                            isDarkMode ? 'text-[#6b7280]' : 'text-gray-400'
                          }`}>
                            No content available
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* Condition list view */
              <div className="flex-1 overflow-y-auto">
                {/* Search */}
                <div className={`sticky top-0 px-6 py-3 border-b ${
                  isDarkMode ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
                }`}>
                  <div className="relative">
                    <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDarkMode ? 'text-[#6b7280]' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conditions..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                        isDarkMode
                          ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Condition list */}
                <div className="py-2">
                  {filteredConditions.length === 0 ? (
                    <div className={`text-center py-8 ${
                      isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'
                    }`}>
                      <p>No conditions match your search</p>
                    </div>
                  ) : (
                    filteredConditions.map(condition => {
                      const contentSummary = getContentSummary(condition);
                      return (
                        <button
                          key={condition.db_id}
                          onClick={() => setSelectedCondition(condition)}
                          className={`w-full px-6 py-3 flex items-center justify-between text-left transition-colors ${
                            isDarkMode
                              ? 'hover:bg-[#2a2a2a]'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className={`font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {condition.name}
                            </div>
                            {condition.category && (
                              <div className={`text-xs mt-0.5 ${
                                isDarkMode ? 'text-[#9ca3af]' : 'text-gray-500'
                              }`}>
                                {condition.category}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {contentSummary.map(field => (
                                <span
                                  key={field}
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    isDarkMode
                                      ? 'bg-[#2a2a2a] text-[#9ca3af]'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight size={18} className={
                            isDarkMode ? 'text-[#6b7280]' : 'text-gray-400'
                          } />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer - only show when condition is selected */}
          {selectedCondition && (
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
              isDarkMode ? 'border-[#2a2a2a]' : 'border-gray-200'
            }`}>
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'text-[#9ca3af] hover:bg-[#2a2a2a]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                disabled={isCopying || copySuccess || !Object.values(copyOptions).some(v => v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-[#9b9cfa] text-white hover:bg-[#b4b5ff]'
                } ${(isCopying || !Object.values(copyOptions).some(v => v)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {copySuccess ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : isCopying ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Selected
                  </>
                )}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CopyProductDetailsModal;
