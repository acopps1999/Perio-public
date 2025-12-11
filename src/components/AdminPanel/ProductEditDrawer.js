import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Plus, X, ExternalLink, FileText, Beaker, BookOpen, Copy } from 'lucide-react';
import DynamicTextarea from './DynamicTextarea';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useTheme } from '../../contexts/ThemeContext';
import CopyProductDetailsModal from './CopyProductDetailsModal';

/**
 * ProductEditDrawer - Full-page drawer for editing product details
 *
 * Opens on top of the conditions drawer to provide full editing space
 * for usage instructions, scientific rationale, research articles, etc.
 *
 * Matches the style and behavior of ProductDrawer.js
 */
function ProductEditDrawer({
  isOpen,
  onClose,
  productName,
  productDetails,
  condition,
  conditions,
  saveStatus,
  updateProductDetail,
  debouncedUpdateProductDetail,
  updateConditionField,
  getPhasesForProduct,
  parentDrawerWidth,
  onCopyProductDetails
}) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('usage');
  // Use parent drawer width if provided, otherwise default to 900px
  const [drawerWidth, setDrawerWidth] = useState(parentDrawerWidth || 900);
  const [isResizing, setIsResizing] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Sync with parent drawer width when it changes
  useEffect(() => {
    if (parentDrawerWidth) {
      setDrawerWidth(parentDrawerWidth);
    }
  }, [parentDrawerWidth]);

  // Reset state when product changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('usage');
    }
  }, [isOpen, productName]);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 500;
      const maxWidth = window.innerWidth * 0.95;
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setDrawerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  if (!productName || !condition) return null;

  const recommendedPhases = getPhasesForProduct(condition, productName);
  const research = condition?.conditionSpecificResearch?.[productName] || [];

  const tabs = [
    { id: 'usage', label: 'Usage Instructions', icon: FileText },
    { id: 'details', label: 'Scientific Details', icon: Beaker },
    { id: 'research', label: `Research (${research.length})`, icon: BookOpen }
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        />

        {/* Drawer */}
        <Dialog.Content
          className={`fixed top-0 right-0 h-full z-[70]
            ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}
            shadow-2xl flex flex-col overflow-hidden`}
          style={{
            width: typeof window !== 'undefined' && window.innerWidth <= 640 ? '100%' : `${drawerWidth}px`,
            transition: isResizing ? 'none' : 'width 200ms ease-out',
            animation: 'slideInFromRight 210ms ease-out'
          }}
        >
          {/* Resize Handle - Left edge */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group hover:w-2 transition-all
              ${isResizing
                ? 'bg-[#9b9cfa]'
                : isDarkMode
                  ? 'bg-[#2a2a2a] hover:bg-[#9b9cfa]/70'
                  : 'bg-gray-200 hover:bg-[#9b9cfa]/70'
              }`}
            style={{ zIndex: 100 }}
          >
            {/* Visual grab indicator */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-200 flex flex-col gap-1.5 pointer-events-none`}
            >
              <div className="w-1 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
          </div>

          {/* Header */}
          <div className={`flex-shrink-0 px-8 py-6 border-b ${
            isDarkMode ? 'border-[#2a2a2a]' : 'border-gray-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'
                  }`}
                  title="Back to condition"
                >
                  <ArrowLeft size={20} className={isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'} />
                </button>
                <div>
                  <Dialog.Title className={`text-2xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {productName}
                  </Dialog.Title>
                  <Dialog.Description className={`text-sm mt-1 ${
                    isDarkMode ? 'text-[#9ca3af]' : 'text-gray-600'
                  }`}>
                    Editing product details for {condition?.name}
                  </Dialog.Description>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCopyModal(true)}
                  className={`p-2 rounded-lg transition-all duration-250 flex items-center gap-2 ${
                    isDarkMode
                      ? 'hover:bg-[#9b9cfa]/20 text-[#9b9cfa] hover:text-[#b4b5ff]'
                      : 'hover:bg-[#9b9cfa]/10 text-[#7c7ddb] hover:text-[#9b9cfa]'
                  }`}
                  title="Copy details from another condition"
                >
                  <Copy size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Copy from...</span>
                </button>
                <Dialog.Close
                  className={`p-2 rounded-lg transition-all duration-250 ${
                    isDarkMode
                      ? 'hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  aria-label="Close"
                >
                  <X size={24} />
                </Dialog.Close>
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Sidebar + Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Vertical Navigation */}
            <div className={`w-64 flex-shrink-0 border-r overflow-y-auto ${
              isDarkMode
                ? 'bg-[#1a1a1a] border-[#2a2a2a]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-250
                        ${isActive
                          ? 'bg-[#9b9cfa] text-white shadow-md'
                          : isDarkMode
                            ? 'text-[#9ca3af] hover:bg-[#2a2a2a] hover:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Content Area */}
            <div className={`flex-1 overflow-y-auto px-6 py-6 ${
              isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'
            }`}>
              {activeTab === 'usage' && (
                <UsageTab
                  productName={productName}
                  productDetails={productDetails}
                  condition={condition}
                  saveStatus={saveStatus}
                  updateProductDetail={updateProductDetail}
                  debouncedUpdateProductDetail={debouncedUpdateProductDetail}
                  recommendedPhases={recommendedPhases}
                  isDarkMode={isDarkMode}
                />
              )}
              {activeTab === 'details' && (
                <DetailsTab
                  productName={productName}
                  productDetails={productDetails}
                  condition={condition}
                  saveStatus={saveStatus}
                  updateProductDetail={updateProductDetail}
                  debouncedUpdateProductDetail={debouncedUpdateProductDetail}
                  isDarkMode={isDarkMode}
                />
              )}
              {activeTab === 'research' && (
                <ResearchTab
                  productName={productName}
                  condition={condition}
                  research={research}
                  updateConditionField={updateConditionField}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Copy Product Details Modal */}
      <CopyProductDetailsModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        productName={productName}
        currentConditionId={condition?.db_id}
        currentConditionName={condition?.name}
        conditions={conditions}
        onCopyDetails={async (sourceCondition, sourceDetails, copyOptions) => {
          if (onCopyProductDetails) {
            await onCopyProductDetails(sourceCondition, sourceDetails, copyOptions);
          }
        }}
      />
    </Dialog.Root>
  );
}

// ===== Tab Components =====

const UsageTab = ({
  productName,
  productDetails,
  condition,
  saveStatus,
  updateProductDetail,
  debouncedUpdateProductDetail,
  recommendedPhases,
  isDarkMode
}) => (
  <div className="space-y-6">
    <div>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Usage by Modifier
      </h3>

      {recommendedPhases.length > 0 ? (
        <div className="space-y-4">
          {recommendedPhases.map((phase) => (
            <div key={phase} className={`rounded-xl p-5 ${
              isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
            }`}>
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'
              }`}>
                {phase}
              </label>
              <div className="relative">
                <DynamicTextarea
                  initialRows={4}
                  maxRows={12}
                  value={
                    productDetails?.usage &&
                    typeof productDetails.usage === 'object'
                      ? productDetails.usage[phase] || ''
                      : productDetails?.usage || ''
                  }
                  onChange={(e) => {
                    updateProductDetail(
                      condition.name,
                      productName,
                      'usage',
                      e.target.value,
                      phase
                    );
                    debouncedUpdateProductDetail(
                      condition.db_id,
                      productName,
                      `usage_${phase}`,
                      e.target.value
                    );
                  }}
                  placeholder={`Enter usage instructions for ${phase}. Line breaks will be preserved.`}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                    isDarkMode
                      ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <SaveStatusIndicator
                  status={saveStatus[`product-detail-${condition.db_id}-${productName}-usage_${phase}`]}
                  className="absolute right-3 top-3"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-6 text-center rounded-xl ${
          isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af]' : 'bg-gray-50 border border-gray-200 text-gray-600'
        }`}>
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p>This product is not assigned to any modifiers.</p>
          <p className="text-sm mt-1">Add it to a modifier first.</p>
        </div>
      )}
    </div>
  </div>
);

const DetailsTab = ({
  productName,
  productDetails,
  condition,
  saveStatus,
  updateProductDetail,
  debouncedUpdateProductDetail,
  isDarkMode
}) => (
  <div className="space-y-6">
    {/* Scientific Rationale */}
    <div className={`rounded-xl p-5 ${
      isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
    }`}>
      <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
        Scientific Rationale
      </label>
      <div className="relative">
        <DynamicTextarea
          initialRows={4}
          maxRows={12}
          value={productDetails?.rationale || ''}
          onChange={(e) => {
            updateProductDetail(condition.name, productName, 'rationale', e.target.value);
            debouncedUpdateProductDetail(condition.db_id, productName, 'rationale', e.target.value);
          }}
          className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
            isDarkMode
              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder="Enter scientific rationale..."
        />
        <SaveStatusIndicator
          status={saveStatus[`product-detail-${condition.db_id}-${productName}-rationale`]}
          className="absolute right-3 top-3"
        />
      </div>
    </div>

    {/* Clinical Evidence */}
    <div className={`rounded-xl p-5 ${
      isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
    }`}>
      <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
        Clinical Evidence
      </label>
      <div className="relative">
        <DynamicTextarea
          initialRows={4}
          maxRows={12}
          value={productDetails?.clinicalEvidence || ''}
          onChange={(e) => {
            updateProductDetail(condition.name, productName, 'clinicalEvidence', e.target.value);
            debouncedUpdateProductDetail(condition.db_id, productName, 'clinical_evidence', e.target.value);
          }}
          className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
            isDarkMode
              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder="Enter clinical evidence..."
        />
        <SaveStatusIndicator
          status={saveStatus[`product-detail-${condition.db_id}-${productName}-clinical_evidence`]}
          className="absolute right-3 top-3"
        />
      </div>
    </div>

    {/* Handling Objections */}
    <div className={`rounded-xl p-5 ${
      isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
    }`}>
      <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
        Handling Objections
      </label>
      <div className="relative">
        <DynamicTextarea
          initialRows={4}
          maxRows={12}
          value={productDetails?.handlingObjections || ''}
          onChange={(e) => {
            updateProductDetail(condition.name, productName, 'handlingObjections', e.target.value);
            debouncedUpdateProductDetail(condition.db_id, productName, 'objection_handling', e.target.value);
          }}
          className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
            isDarkMode
              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder="Enter objection handling tips..."
        />
        <SaveStatusIndicator
          status={saveStatus[`product-detail-${condition.db_id}-${productName}-objection_handling`]}
          className="absolute right-3 top-3"
        />
      </div>
    </div>

    {/* Key Pitch Points */}
    <div className={`rounded-xl p-5 ${
      isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
    }`}>
      <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
        Key Pitch Points
      </label>
      <div className="relative">
        <DynamicTextarea
          initialRows={4}
          maxRows={12}
          value={productDetails?.pitchPoints || ''}
          onChange={(e) => {
            updateProductDetail(condition.name, productName, 'pitchPoints', e.target.value);
            debouncedUpdateProductDetail(condition.db_id, productName, 'pitch_points', e.target.value);
          }}
          className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
            isDarkMode
              ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
              : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
          placeholder="Enter key pitch points..."
        />
        <SaveStatusIndicator
          status={saveStatus[`product-detail-${condition.db_id}-${productName}-pitch_points`]}
          className="absolute right-3 top-3"
        />
      </div>
    </div>
  </div>
);

const ResearchTab = ({
  productName,
  condition,
  research,
  updateConditionField,
  isDarkMode
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Research Articles
      </h3>
      <button
        onClick={() => {
          const updatedResearch = {...(condition.conditionSpecificResearch || {})};
          const updatedArticles = [...(updatedResearch[productName] || []), {
            title: '', author: '', abstract: '', url: ''
          }];
          updatedResearch[productName] = updatedArticles;
          updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
        }}
        className="px-4 py-2 bg-[#9b9cfa] text-white rounded-lg hover:bg-[#b4b5ff] text-sm flex items-center font-medium transition-colors"
      >
        <Plus size={16} className="mr-2" />
        Add Article
      </button>
    </div>

    {research.length > 0 ? (
      <div className="space-y-4">
        {research.map((article, index) => (
          <div
            key={index}
            className={`rounded-xl p-5 ${
              isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <input
                type="text"
                placeholder="Article title"
                value={article.title || ''}
                onChange={(e) => {
                  const updatedResearch = {...(condition.conditionSpecificResearch || {})};
                  const updatedArticles = [...(updatedResearch[productName] || [])];
                  updatedArticles[index] = { ...updatedArticles[index], title: e.target.value };
                  updatedResearch[productName] = updatedArticles;
                  updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
                }}
                className={`flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                  isDarkMode
                    ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={() => {
                  const updatedResearch = {...(condition.conditionSpecificResearch || {})};
                  const updatedArticles = [...(updatedResearch[productName] || [])];
                  updatedArticles.splice(index, 1);
                  updatedResearch[productName] = updatedArticles;
                  updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
                }}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Author/Source"
              value={article.author || ''}
              onChange={(e) => {
                const updatedResearch = {...(condition.conditionSpecificResearch || {})};
                const updatedArticles = [...(updatedResearch[productName] || [])];
                updatedArticles[index] = { ...updatedArticles[index], author: e.target.value };
                updatedResearch[productName] = updatedArticles;
                updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
              }}
              className={`w-full px-4 py-3 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                isDarkMode
                  ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                  : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />

            <DynamicTextarea
              initialRows={3}
              maxRows={8}
              placeholder="Abstract (optional)"
              value={article.abstract || ''}
              onChange={(e) => {
                const updatedResearch = {...(condition.conditionSpecificResearch || {})};
                const updatedArticles = [...(updatedResearch[productName] || [])];
                updatedArticles[index] = { ...updatedArticles[index], abstract: e.target.value };
                updatedResearch[productName] = updatedArticles;
                updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
              }}
              className={`w-full px-4 py-3 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                isDarkMode
                  ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                  : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="URL (optional)"
                value={article.url || ''}
                onChange={(e) => {
                  const updatedResearch = {...(condition.conditionSpecificResearch || {})};
                  const updatedArticles = [...(updatedResearch[productName] || [])];
                  updatedArticles[index] = { ...updatedArticles[index], url: e.target.value };
                  updatedResearch[productName] = updatedArticles;
                  updateConditionField(condition.name, 'conditionSpecificResearch', updatedResearch);
                }}
                className={`flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
                  isDarkMode
                    ? 'bg-[#2a2a2a] border border-[#3f3f46] text-white placeholder-[#6b7280]'
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 text-[#9b9cfa] hover:bg-[#9b9cfa]/10 rounded-lg transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className={`p-8 text-center rounded-xl ${
        isDarkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af]' : 'bg-gray-50 border border-gray-200 text-gray-600'
      }`}>
        <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
        <p>No research articles added yet.</p>
        <p className="text-sm mt-1">Click "Add Article" to add research.</p>
      </div>
    )}
  </div>
);

export default ProductEditDrawer;
