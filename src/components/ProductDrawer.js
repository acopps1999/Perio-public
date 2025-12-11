import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Award, FileText, TrendingUp, ClipboardList, FlaskConical, Target, ShieldCheck } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/featureVisibility';
import SimpleMarkdown from './SimpleMarkdown';

/**
 * ProductDrawer - Slide-out panel for product details
 * Replaces ProductDetailsModal, ResearchModal, and CompetitiveAdvantageModal
 * with a unified, tab-based interface
 *
 * Layout: Vertical sidebar navigation with usage instructions at top of content area
 */
const ProductDrawer = ({
  isOpen,
  onClose,
  product,
  research = [],
  competitiveData = null,
  initialTab = 'scientific',
  activePhase = null, // Current treatment phase (Prep/Active/Maintenance)
  onLoadCompetitiveData = null // Callback to load competitive data when tab is clicked
}) => {
  const { isDarkMode } = useTheme();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [drawerWidth, setDrawerWidth] = useState(900); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setExpandedArticle(null);
      setExpandedCompetitor(null);
    }
  }, [isOpen, product?.product_id, initialTab]);

  // Load competitive data when switching to competitive tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);

    // If switching to competitive tab and data not loaded yet, request it
    if (tabId === 'competitive' && !competitiveData && onLoadCompetitiveData) {
      onLoadCompetitiveData();
    }
  };

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate new width based on distance from right edge
      const newWidth = window.innerWidth - e.clientX;

      // Constrain width between 500px and 95% of window width
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

  if (!product) return null;

  // Get phase-specific usage instructions
  const getUsageInstructions = () => {
    if (!product.usage || !activePhase) return null;

    if (typeof product.usage === 'object') {
      return product.usage[activePhase] || null;
    }
    return product.usage;
  };

  const usageInstructions = getUsageInstructions();

  // Define all tabs with visibility rules
  const allTabs = [
    { id: 'usage', label: 'Usage Instructions', icon: ClipboardList, feature: 'drawer_usage_tab', requiresData: !!usageInstructions },
    { id: 'scientific', label: 'Scientific Rationale', icon: FlaskConical, feature: 'drawer_scientific_tab' },
    { id: 'clinical', label: 'Clinical Evidence', icon: Award, feature: 'drawer_clinical_tab' },
    { id: 'pitch', label: 'Pitch Points', icon: Target, feature: 'drawer_pitch_tab' },
    { id: 'competitive', label: 'Competitive Advantage', icon: TrendingUp, feature: 'drawer_competitive_tab' },
    { id: 'objections', label: 'Handling Objections', icon: ShieldCheck, feature: 'drawer_objection_tab' },
    { id: 'research', label: 'Research', icon: ExternalLink, feature: null, requiresData: research && research.length > 0 }
  ];

  // Filter tabs based on role and data availability
  const tabs = allTabs.filter(tab => {
    // Check if tab requires specific data
    if (tab.requiresData === false) return false;

    // Check feature visibility (if no feature specified, show to all)
    if (tab.feature && !hasFeatureAccess(tab.feature, userRole)) return false;

    return true;
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        />

        {/* Drawer - Resizable width */}
        <Dialog.Content
          className={`fixed top-0 right-0 h-full z-50
            ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-primary'}
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
                ? isDarkMode ? 'bg-prism-primary' : 'bg-prism-primary-light'
                : isDarkMode ? 'bg-prism-dark-border-elevated hover:bg-prism-primary/70' : 'bg-prism-light-border-elevated hover:bg-prism-primary-light/70'
              }`}
            style={{ zIndex: 100 }}
          >
            {/* Visual grab indicator - Three vertical dots */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-200 flex flex-col gap-1.5 pointer-events-none`}
            >
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
            </div>
          </div>
          {/* Header */}
          <div className={`flex-shrink-0 px-8 py-6 border-b ${isDarkMode ? 'border-prism-dark-border-elevated' : 'border-prism-light-border-elevated'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <Dialog.Title className={`text-2xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                  {product.product_name}
                </Dialog.Title>
                <Dialog.Description className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                  {product.category || 'Product details and information'}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className={`p-2 rounded-lg transition-all duration-250
                  ${isDarkMode
                    ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-secondary hover:text-prism-dark-text-primary'
                    : 'hover:bg-prism-light-bg-hover text-prism-light-text-secondary hover:text-prism-light-text-primary'
                  }`}
                aria-label="Close"
              >
                <X size={24} />
              </Dialog.Close>
            </div>
          </div>

          {/* Two-Column Layout: Sidebar + Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Vertical Navigation */}
            <div className={`w-64 flex-shrink-0 border-r overflow-y-auto ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated' : 'bg-prism-light-bg-tertiary border-prism-light-border-elevated'}`}>
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-250
                        ${isActive
                          ? isDarkMode
                            ? 'bg-prism-primary text-white shadow-md'
                            : 'bg-prism-primary-light text-white shadow-md'
                          : isDarkMode
                            ? 'text-prism-dark-text-secondary hover:bg-prism-dark-bg-hover hover:text-prism-dark-text-primary'
                            : 'text-prism-light-text-secondary hover:bg-prism-light-bg-hover hover:text-prism-light-text-primary'
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
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {activeTab === 'usage' && (
                <UsageTab usageInstructions={usageInstructions} activePhase={activePhase} isDarkMode={isDarkMode} />
              )}
              {activeTab === 'scientific' && (
                <ScientificTab product={product} isDarkMode={isDarkMode} />
              )}
              {activeTab === 'clinical' && (
                <ClinicalTab product={product} isDarkMode={isDarkMode} />
              )}
              {activeTab === 'pitch' && (
                <PitchPointsTab product={product} isDarkMode={isDarkMode} />
              )}
              {activeTab === 'competitive' && (
                <CompetitiveTab
                  product={product}
                  competitiveData={competitiveData}
                  expandedCompetitor={expandedCompetitor}
                  setExpandedCompetitor={setExpandedCompetitor}
                  isDarkMode={isDarkMode}
                />
              )}
              {activeTab === 'objections' && (
                <ObjectionsTab product={product} isDarkMode={isDarkMode} />
              )}
              {activeTab === 'research' && (
                <ResearchTab
                  research={research}
                  expandedArticle={expandedArticle}
                  setExpandedArticle={setExpandedArticle}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// ===== Tab Components =====

const UsageTab = ({ usageInstructions, activePhase, isDarkMode }) => (
  <div className="space-y-6">
    {usageInstructions ? (
      <section>
        <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
          <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
            {activePhase} Phase
          </h3>
          <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
            {usageInstructions}
          </SimpleMarkdown>
        </div>
      </section>
    ) : (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
        <p>No usage instructions available for this product.</p>
      </div>
    )}
  </div>
);

const ScientificTab = ({ product, isDarkMode }) => {
  // Use rationale (detailed) if available, otherwise fall back to scientificRationale (short)
  const rationale = product.rationale || product.scientificRationale;

  return (
    <div className="space-y-6">
      {/* Scientific Rationale */}
      {rationale ? (
        <section>
          <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
            Scientific Rationale
          </h3>
          <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
            <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
              {rationale}
            </SimpleMarkdown>
          </div>
        </section>
      ) : (
        <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
          <FlaskConical size={48} className="mx-auto mb-4 opacity-50" />
          <p>No scientific rationale available for this product.</p>
        </div>
      )}

      {/* Key Ingredients */}
      {product.key_ingredients && product.key_ingredients.length > 0 && (
        <section>
          <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
            Key Ingredients
          </h3>
          <div className="grid gap-3">
            {product.key_ingredients.map((ingredient, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-prism-dark-bg-tertiary border border-prism-dark-border-subtle' : 'bg-prism-light-bg-tertiary border border-prism-light-border-subtle'}`}
              >
                <h4 className={`font-medium mb-1 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                  {ingredient.name}
                </h4>
                {ingredient.purpose && (
                  <p className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                    {ingredient.purpose}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const ClinicalTab = ({ product, isDarkMode }) => (
  <div className="space-y-6">
    {/* Clinical Evidence */}
    {product.clinicalEvidence ? (
      <section>
        <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
          <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
            {product.clinicalEvidence}
          </SimpleMarkdown>
        </div>
      </section>
    ) : (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <Award size={48} className="mx-auto mb-4 opacity-50" />
        <p>No clinical evidence available for this product.</p>
      </div>
    )}
  </div>
);

const PitchPointsTab = ({ product, isDarkMode }) => (
  <div className="space-y-6">
    {product.pitchPoints ? (
      <section>
        <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
          <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
            {product.pitchPoints}
          </SimpleMarkdown>
        </div>
      </section>
    ) : (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <Target size={48} className="mx-auto mb-4 opacity-50" />
        <p>No pitch points available for this product.</p>
      </div>
    )}
  </div>
);

const ObjectionsTab = ({ product, isDarkMode }) => (
  <div className="space-y-6">
    {product.handlingObjections ? (
      <section>
        <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
          <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
            {product.handlingObjections}
          </SimpleMarkdown>
        </div>
      </section>
    ) : (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
        <p>No objection handling information available for this product.</p>
      </div>
    )}
  </div>
);

const CompetitiveTab = ({ product, competitiveData, expandedCompetitor, setExpandedCompetitor, isDarkMode }) => {
  // All hooks must be at the top before any conditional returns
  const [selectedTab, setSelectedTab] = React.useState('competitors');
  const [selectedItem, setSelectedItem] = React.useState(null);

  // Compute values needed for rendering - memoized to prevent unnecessary re-renders
  const competitors = React.useMemo(() => competitiveData?.competitors || [], [competitiveData?.competitors]);
  const activeIngredients = React.useMemo(() => competitiveData?.activeIngredients || [], [competitiveData?.activeIngredients]);
  const hasCompetitors = competitors.length > 0;
  const hasIngredients = activeIngredients.length > 0;

  // Set default selected item when tab changes
  React.useEffect(() => {
    if (selectedTab === 'competitors' && competitors.length > 0) {
      setSelectedItem(competitors[0]);
    } else if (selectedTab === 'ingredients' && activeIngredients.length > 0) {
      setSelectedItem(activeIngredients[0]);
    }
  }, [selectedTab, competitors, activeIngredients]);

  // Conditional returns come AFTER all hooks
  if (!competitiveData) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
        <p>No competitive analysis available for this product.</p>
      </div>
    );
  }

  if (!hasCompetitors && !hasIngredients) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
        <p>No competitive analysis available for this product.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Switcher */}
      <div className={`flex gap-2 mb-4 p-1 rounded-lg ${isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-prism-light-bg-tertiary'}`}>
        <button
          onClick={() => setSelectedTab('competitors')}
          disabled={!hasCompetitors}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-250
            ${selectedTab === 'competitors'
              ? isDarkMode
                ? 'bg-prism-primary text-white'
                : 'bg-prism-primary-light text-white'
              : isDarkMode
                ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary'
                : 'text-prism-light-text-secondary hover:text-prism-light-text-primary'
            }
            ${!hasCompetitors ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Competitors ({competitors.length})
        </button>
        <button
          onClick={() => setSelectedTab('ingredients')}
          disabled={!hasIngredients}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-250
            ${selectedTab === 'ingredients'
              ? isDarkMode
                ? 'bg-prism-primary text-white'
                : 'bg-prism-primary-light text-white'
              : isDarkMode
                ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary'
                : 'text-prism-light-text-secondary hover:text-prism-light-text-primary'
            }
            ${!hasIngredients ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Active Ingredients ({activeIngredients.length})
        </button>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel - List */}
        <div className={`w-1/3 overflow-y-auto rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-subtle' : 'bg-prism-light-bg-secondary border-prism-light-border-subtle'}`}>
          <div className="p-3">
            {selectedTab === 'competitors' ? (
              competitors.length > 0 ? (
                <div className="space-y-2">
                  {competitors.map((comp, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedItem(comp)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-250
                        ${selectedItem === comp
                          ? isDarkMode
                            ? 'bg-prism-primary text-white'
                            : 'bg-prism-primary-light text-white'
                          : isDarkMode
                            ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-primary'
                            : 'hover:bg-prism-light-bg-hover text-prism-light-text-primary'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">{comp.name}</p>
                      <p className={`text-xs mt-1 ${selectedItem === comp ? 'opacity-90' : isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                        Click to view competitive advantages
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-sm text-center py-8 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                  No competitor data available
                </p>
              )
            ) : (
              activeIngredients.length > 0 ? (
                <div className="space-y-2">
                  {activeIngredients.map((ingredient, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedItem(ingredient)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-250
                        ${selectedItem === ingredient
                          ? isDarkMode
                            ? 'bg-prism-primary text-white'
                            : 'bg-prism-primary-light text-white'
                          : isDarkMode
                            ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-primary'
                            : 'hover:bg-prism-light-bg-hover text-prism-light-text-primary'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">{ingredient.name}</p>
                      <p className={`text-xs mt-1 ${selectedItem === ingredient ? 'opacity-90' : isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                        Click to view competitive advantages
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-sm text-center py-8 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                  No active ingredient data available
                </p>
              )
            )}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className={`flex-1 overflow-y-auto rounded-lg border ${isDarkMode ? 'bg-prism-dark-bg-secondary border-prism-dark-border-subtle' : 'bg-prism-light-bg-secondary border-prism-light-border-subtle'}`}>
          {selectedItem ? (
            <div className="p-6">
              <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                {selectedItem.name}
              </h3>
              <div className={`p-4 rounded-lg border-l-4 ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-primary' : 'bg-prism-light-bg-tertiary border-prism-primary-light'}`}>
                <SimpleMarkdown className={`${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} leading-relaxed`}>
                  {selectedItem.advantages}
                </SimpleMarkdown>
              </div>
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center p-6 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select an item to view competitive advantages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResearchTab = ({ research, expandedArticle, setExpandedArticle, isDarkMode }) => {
  if (!research || research.length === 0) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
        <ExternalLink size={48} className="mx-auto mb-4 opacity-50" />
        <p>No research articles available for this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
        Published Research ({research.length})
      </h3>
      {research.map((article, index) => (
        <div
          key={article.id || index}
          className={`rounded-lg overflow-hidden transition-all duration-250
            ${isDarkMode
              ? 'bg-prism-dark-bg-tertiary border border-prism-dark-border-subtle hover:shadow-md'
              : 'bg-prism-light-bg-tertiary border border-prism-light-border-subtle hover:shadow-light-md'
            }`}
        >
          <button
            onClick={() => setExpandedArticle(expandedArticle === index ? null : index)}
            className={`w-full p-4 text-left transition-colors duration-250
              ${isDarkMode ? 'hover:bg-prism-dark-bg-hover' : 'hover:bg-prism-light-bg-hover'}`}
          >
            <h4 className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
              {article.title}
            </h4>
          </button>
          {expandedArticle === index && (
            <div className={`px-4 pb-4 space-y-3 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
              {article.author && (
                <p className="text-sm">
                  <span className={`font-medium ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>Author: </span>
                  {article.author}
                </p>
              )}
              {article.abstract && (
                <p className="leading-relaxed">{article.abstract}</p>
              )}
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-250
                    ${isDarkMode
                      ? 'bg-prism-primary hover:bg-prism-primary-hover text-white'
                      : 'bg-prism-primary-light hover:bg-prism-primary-light-hover text-white'
                    }`}
                >
                  View Full Article
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductDrawer;
