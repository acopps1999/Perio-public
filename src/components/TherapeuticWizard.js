/**
 * Therapeutic Wizard - Phase 3 Refactor
 *
 * A 4-step wizard for guided product recommendations based on:
 * 1. Condition Category
 * 2. Specific Condition
 * 3. Treatment Phase
 * 4. Product Recommendations
 *
 * Replaces the deprecated DiagnosisWizard.js which used legacy patient types.
 *
 * Features:
 * - Phase 3 data model (products[phaseName] instead of patientSpecificConfig)
 * - Radix Dialog for accessible modals
 * - Role-based feature visibility
 * - Responsive design with useResponsive hook
 * - Prism design system styling
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, ChevronRight, ChevronLeft, Check, BookOpen, Target, Info,
  Microscope, FileText, MessageSquare, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../supabaseClient';
import CompetitiveAdvantageModal from './CompetitiveAdvantageModal';
import ProductDetailsModal from './ProductDetailsModal';
import { getCategoryDescription } from '../utils/categoryDescriptions';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/featureVisibility';
// Note: useResponsive hook available for future responsive enhancements
// import useResponsive from '../hooks/useResponsive';

// ============================================================================
// SUB-COMPONENTS - WIZARD STEPS
// ============================================================================

/**
 * Step 1: Category Selection
 */
function CategoryStep({ categories, selectedCategory, onSelect, isDarkMode }) {
  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
        Step 1: Select Condition Category
      </h2>
      <p className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}>
        Choose the category of the patient's condition:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {categories.map((category) => (
          <button
            key={category}
            className={clsx(
              "p-4 border rounded-lg text-left transition-all duration-250",
              selectedCategory === category
                ? isDarkMode
                  ? 'border-prism-primary bg-prism-primary/15'
                  : 'border-prism-primary/50 bg-prism-primary/10'
                : isDarkMode
                  ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/40'
                  : 'border-prism-light-border-elevated hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40'
            )}
            onClick={() => onSelect(category)}
          >
            <div className={`font-medium text-lg ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
              {category}
            </div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
              {getCategoryDescription(category)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 2: Condition Selection
 */
function ConditionStep({ conditions, onSelect, isDarkMode }) {
  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
        Step 2: Select Specific Condition
      </h2>
      <p className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}>
        Choose the patient's specific condition:
      </p>
      <div className={clsx(
        "mt-4 max-h-96 overflow-y-auto border rounded-lg divide-y transition-all duration-250",
        isDarkMode
          ? 'border-prism-dark-border-elevated divide-prism-dark-border-elevated'
          : 'border-prism-light-border-elevated divide-prism-light-border-elevated'
      )}>
        {conditions.map((condition) => (
          <button
            key={condition.name}
            className={clsx(
              "w-full p-4 text-left transition-all duration-250 flex justify-between items-center",
              isDarkMode
                ? 'hover:bg-prism-dark-bg-tertiary'
                : 'hover:bg-prism-light-bg-tertiary'
            )}
            onClick={() => onSelect(condition)}
          >
            <div>
              <div className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                {condition.name}
              </div>
              <div className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                {condition.category}
              </div>
            </div>
            <ChevronRight size={20} className={isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 3: Phase Selection
 */
function PhaseStep({ phases, selectedPhase, onSelect, isDarkMode }) {
  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
        Step 3: Select Treatment Phase
      </h2>
      <p className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}>
        What phase of treatment is the patient in?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {phases.map((phase) => (
          <button
            key={phase}
            className={clsx(
              "p-4 border rounded-lg text-left transition-all duration-250",
              selectedPhase === phase
                ? isDarkMode
                  ? 'border-prism-primary bg-prism-primary/15'
                  : 'border-prism-primary/50 bg-prism-primary/10'
                : isDarkMode
                  ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/40'
                  : 'border-prism-light-border-elevated hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40'
            )}
            onClick={() => onSelect(phase)}
          >
            <div className={`font-medium text-lg ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
              {phase} Phase
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Product Information Section - shown when a product is selected
 */
function ProductInfoSection({
  productName,
  productDetails,
  selectedPhase,
  onOpenModal,
  onOpenCompetitive,
  userRole,
  isDarkMode
}) {
  if (!productDetails) {
    return (
      <div className={clsx(
        "p-4 border rounded-lg",
        isDarkMode
          ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated text-prism-dark-text-secondary'
          : 'bg-prism-light-bg-tertiary border-prism-light-border-elevated text-prism-light-text-secondary'
      )}>
        No additional details available for this product.
      </div>
    );
  }

  const canSeeSalesFeatures = hasFeatureAccess('pitch_points', userRole);

  return (
    <div className="space-y-2">
      {/* Usage Instructions - Prominently displayed */}
      <div className={clsx(
        "border-l-4 p-4 mb-4 rounded-r-lg transition-all duration-250",
        isDarkMode
          ? 'border-prism-primary bg-prism-primary/10 shadow-sm'
          : 'border-prism-primary bg-prism-primary/5 shadow-sm'
      )}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-prism-primary" />
          </div>
          <div className="ml-3 flex-1">
            <h4 className="text-base font-semibold text-prism-primary mb-2">
              Usage Instructions for {productName} - {selectedPhase} Phase
            </h4>
            <div className={clsx(
              "p-3 rounded-lg border transition-all duration-250 shadow-sm",
              isDarkMode
                ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
                : 'bg-prism-light-bg-secondary border-prism-light-border-elevated'
            )}>
              <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                {typeof productDetails.usage === 'object'
                  ? (productDetails.usage[selectedPhase]
                      ? <div className="whitespace-pre-line font-medium">{productDetails.usage[selectedPhase]}</div>
                      : <div className={`italic ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                          No specific instructions for {selectedPhase} phase.
                        </div>)
                  : <div className="whitespace-pre-line font-medium">{productDetails.usage}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Rationale */}
      <InfoButton
        label="Scientific Rationale"
        icon={Microscope}
        onClick={() => onOpenModal('scientificRationale')}
        isDarkMode={isDarkMode}
        variant={1}
      />

      {/* Clinical Evidence */}
      <InfoButton
        label="Clinical Evidence"
        icon={FileText}
        onClick={() => onOpenModal('clinicalEvidence')}
        isDarkMode={isDarkMode}
        variant={2}
      />

      {/* Competitive Advantage */}
      <InfoButton
        label="Competitive Advantage"
        icon={TrendingUp}
        onClick={onOpenCompetitive}
        isDarkMode={isDarkMode}
        variant={3}
      />

      {/* Handling Objections - Sales only */}
      {canSeeSalesFeatures && (
        <InfoButton
          label="Handling Objections"
          icon={MessageSquare}
          onClick={() => onOpenModal('handlingObjections')}
          isDarkMode={isDarkMode}
          variant={4}
        />
      )}

      {/* Key Pitch Points - Sales only */}
      {canSeeSalesFeatures && productDetails.pitchPoints && (
        <InfoButton
          label="Key Pitch Points"
          icon={Target}
          onClick={() => onOpenModal('pitchPoints')}
          isDarkMode={isDarkMode}
          variant={5}
          highlight
        />
      )}
    </div>
  );
}

/**
 * Reusable info button for product sections
 */
function InfoButton({ label, icon: Icon, onClick, isDarkMode, variant = 1, highlight = false }) {
  const variantStyles = {
    1: isDarkMode
      ? 'bg-prism-primary/10 border-prism-primary/20 hover:bg-prism-primary/15'
      : 'bg-prism-primary/5 border-prism-primary/20 hover:bg-prism-primary/10',
    2: isDarkMode
      ? 'bg-prism-primary/15 border-prism-primary/30 hover:bg-prism-primary/20'
      : 'bg-prism-primary/10 border-prism-primary/30 hover:bg-prism-primary/15',
    3: isDarkMode
      ? 'bg-prism-primary/25 border-prism-primary/40 hover:bg-prism-primary/30'
      : 'bg-prism-primary/15 border-prism-primary/40 hover:bg-prism-primary/20',
    4: isDarkMode
      ? 'bg-prism-primary/35 border-prism-primary/50 hover:bg-prism-primary/40'
      : 'bg-prism-primary/20 border-prism-primary/50 hover:bg-prism-primary/25',
    5: isDarkMode
      ? 'bg-prism-primary/45 border-prism-primary/60 hover:bg-prism-primary/50'
      : 'bg-prism-primary/30 border-prism-primary/60 hover:bg-prism-primary/35',
  };

  return (
    <button
      className={clsx(
        "w-full p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250",
        variantStyles[variant]
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className={`font-medium ${highlight ? 'text-white' : 'text-prism-primary'}`}>
          {label}
        </div>
        <Icon size={18} className={highlight ? 'text-white/70' : 'text-prism-primary/70'} />
      </div>
    </button>
  );
}

/**
 * Step 4: Recommendations
 */
function RecommendationsStep({
  selectedCondition,
  selectedPhase,
  products,
  selectedProduct,
  onProductSelect,
  onOpenResearch,
  onOpenModal,
  onOpenCompetitive,
  userRole,
  isDarkMode
}) {
  const productDetails = selectedCondition?.productDetails?.[selectedProduct] || null;

  return (
    <div className="space-y-6">
      {/* Completion Banner */}
      <div className={clsx(
        "border rounded-lg p-4 transition-all duration-250",
        isDarkMode
          ? 'bg-prism-primary/15 border-prism-primary/30'
          : 'bg-prism-primary/10 border-prism-primary/30'
      )}>
        <h2 className="text-xl font-semibold text-prism-primary">Recommendations Ready</h2>
        <div className={isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary/80'}>
          Based on your selections, here are the recommended products:
        </div>
      </div>

      {/* Patient Profile Summary */}
      <div className={clsx(
        "border rounded-lg p-4 transition-all duration-250",
        isDarkMode
          ? 'bg-prism-primary/10 border-prism-primary/20'
          : 'bg-prism-primary/5 border-prism-primary/20'
      )}>
        <h3 className="font-medium text-prism-primary">Patient Profile</h3>
        <ul className={`mt-2 space-y-1 ${isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary/80'}`}>
          <li><span className="font-medium">Condition:</span> {selectedCondition.name}</li>
          <li><span className="font-medium">Treatment Phase:</span> {selectedPhase}</li>
        </ul>
      </div>

      {/* Product List */}
      <h3 className={`text-lg font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
        Recommended Products
      </h3>

      {products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product) => {
            const isSelected = selectedProduct === product;

            return (
              <div
                key={product}
                className={clsx(
                  "border-2 rounded-lg p-5 cursor-pointer transition-all duration-250",
                  isSelected
                    ? "border-prism-primary bg-prism-primary shadow-sm"
                    : isDarkMode
                      ? "border-prism-dark-border-elevated bg-prism-dark-bg-tertiary hover:border-prism-primary/40 hover:bg-prism-dark-bg-tertiary/80"
                      : "border-prism-light-border-elevated bg-prism-light-bg-secondary hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40"
                )}
                onClick={() => onProductSelect(product)}
              >
                <div className="flex justify-between items-start">
                  <h4 className={clsx(
                    "text-lg font-semibold",
                    isSelected ? "text-white" : isDarkMode ? "text-prism-dark-text-primary" : "text-prism-light-text-primary"
                  )}>
                    {product}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenResearch(product);
                    }}
                    className={clsx(
                      "text-sm flex items-center transition-colors duration-250",
                      isSelected
                        ? "text-white hover:text-white/80"
                        : "text-prism-primary hover:text-prism-primary/80"
                    )}
                  >
                    <BookOpen size={14} className="mr-1" />
                    <span>Research</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Product Details Section */}
          {selectedProduct && (
            <div className="mt-6 space-y-2">
              <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                Additional Information: {selectedProduct}
              </h3>
              <ProductInfoSection
                productName={selectedProduct}
                productDetails={productDetails}
                selectedPhase={selectedPhase}
                onOpenModal={onOpenModal}
                onOpenCompetitive={onOpenCompetitive}
                userRole={userRole}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      ) : (
        <div className={clsx(
          "p-4 border rounded-lg",
          isDarkMode
            ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated text-prism-dark-text-secondary'
            : 'bg-prism-light-bg-tertiary border-prism-light-border-elevated text-prism-light-text-secondary'
        )}>
          No products recommended for this specific combination. Please adjust your selections.
        </div>
      )}
    </div>
  );
}

/**
 * Research Modal using Radix Dialog
 */
function ResearchModalContent({ productName, articles, isLoading, isDarkMode, onClose }) {
  return (
    <>
      <div className={clsx(
        "flex justify-between items-center p-6 border-b rounded-t-xl",
        "bg-prism-primary text-white"
      )}>
        <Dialog.Title className="text-xl font-semibold flex items-center">
          <BookOpen size={24} className="mr-3 text-white" />
          Research Supporting {productName}
        </Dialog.Title>
        <Dialog.Close className="text-white/80 hover:text-white transition-colors duration-250 p-1 rounded-md hover:bg-white/10">
          <X size={24} />
        </Dialog.Close>
      </div>

      <div className={clsx(
        "overflow-y-auto p-6 flex-grow",
        isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
      )}>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prism-primary mx-auto mb-4"></div>
              <p className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}>
                Loading research articles...
              </p>
            </div>
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-6">
            {articles.map((article, index) => (
              <div
                key={article.id || index}
                className={clsx(
                  "rounded-lg border p-6 transition-all duration-250",
                  isDarkMode
                    ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated hover:shadow-md'
                    : 'bg-prism-light-bg-secondary border-prism-light-border-elevated shadow-sm hover:shadow-md'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className={clsx(
                    "font-semibold text-lg flex-1 pr-4 cursor-pointer transition-colors duration-250",
                    "text-prism-primary hover:text-prism-primary/80"
                  )}>
                    {article.title}
                  </h4>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center px-3 py-1.5 bg-prism-primary text-white text-xs font-medium rounded-lg hover:bg-prism-primary/90 transition-colors duration-250"
                    >
                      View Article
                    </a>
                  )}
                </div>

                {article.author && (
                  <div className={clsx(
                    "text-sm mb-4 space-y-1 border-b pb-3",
                    isDarkMode
                      ? 'border-prism-dark-border-elevated text-prism-dark-text-secondary'
                      : 'border-prism-light-border-subtle text-prism-light-text-secondary'
                  )}>
                    <p className="flex items-center">
                      <span className={`font-medium mr-2 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        Authors:
                      </span>
                      <span>{article.author}</span>
                    </p>
                  </div>
                )}

                {article.abstract && (
                  <div className="mt-4">
                    <h5 className={clsx(
                      "font-semibold mb-3 flex items-center",
                      isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
                    )}>
                      <FileText size={16} className="mr-2 text-prism-primary" />
                      Abstract
                    </h5>
                    <div className={clsx(
                      "border-l-4 border-prism-primary p-4 rounded-r-lg",
                      isDarkMode ? 'bg-prism-primary/10' : 'bg-prism-primary/5'
                    )}>
                      <div className={clsx(
                        "leading-relaxed text-justify",
                        isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
                      )}>
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
        ) : (
          <div className="text-center py-16">
            <div className={clsx(
              "rounded-lg border p-8 max-w-md mx-auto transition-all duration-250",
              isDarkMode
                ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated'
                : 'bg-prism-light-bg-secondary border-prism-light-border-elevated shadow-sm'
            )}>
              <BookOpen size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} />
              <h4 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                No Research Articles Found
              </h4>
              <p className={`mb-2 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                No research articles are available for <span className="font-medium text-prism-primary">{productName}</span>.
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                Research articles can be added through the Admin Panel.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={clsx(
        "p-6 border-t text-right rounded-b-xl",
        isDarkMode
          ? 'border-prism-dark-border-elevated bg-prism-dark-bg-tertiary'
          : 'border-prism-light-border-elevated bg-prism-light-bg-tertiary'
      )}>
        <Dialog.Close asChild>
          <button className="inline-flex items-center px-6 py-2.5 bg-prism-primary text-white rounded-lg hover:bg-prism-primary/90 focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 transition-colors duration-250 font-medium">
            <X size={18} className="mr-2" />
            Close
          </button>
        </Dialog.Close>
      </div>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function TherapeuticWizard({ conditions, onClose }) {
  const { isDarkMode } = useTheme();
  const { userRole } = useAuth();
  // Note: useResponsive available for future mobile optimization
  // const { isMobile, getResponsiveValue, getButtonSize } = useResponsive();

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modal state
  const [showResearch, setShowResearch] = useState(false);
  const [researchProduct, setResearchProduct] = useState('');
  const [researchArticles, setResearchArticles] = useState([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [currentModalSection, setCurrentModalSection] = useState(null);
  const [competitiveAdvantageModalOpen, setCompetitiveAdvantageModalOpen] = useState(false);
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState(null);

  // Extract unique categories from conditions
  const categories = useMemo(() => {
    return [...new Set(conditions
      .map(condition => condition.category)
      .filter(category => category && category.trim() !== '' && category !== 'All')
    )];
  }, [conditions]);

  // Filter conditions by selected category
  const filteredConditions = useMemo(() => {
    if (!selectedCategory) return [];
    return conditions.filter(condition => condition.category === selectedCategory);
  }, [selectedCategory, conditions]);

  // Get products for selected phase (Phase 3 data model)
  const recommendedProducts = useMemo(() => {
    if (!selectedCondition || !selectedPhase) return [];

    // Phase 3: Use products[phaseName] directly
    const products = selectedCondition.products?.[selectedPhase] || [];
    return [...new Set(products)]; // Ensure unique
  }, [selectedCondition, selectedPhase]);

  // Clear subsequent selections when a change is made
  useEffect(() => {
    setSelectedCondition(null);
    setSelectedPhase('');
    setSelectedProduct(null);
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedPhase('');
    setSelectedProduct(null);
  }, [selectedCondition]);

  useEffect(() => {
    setSelectedProduct(null);
  }, [selectedPhase]);

  // Navigation handlers
  const canProceed = useCallback(() => {
    switch (step) {
      case 1: return selectedCategory !== '';
      case 2: return selectedCondition !== null;
      case 3: return selectedPhase !== '';
      default: return true;
    }
  }, [step, selectedCategory, selectedCondition, selectedPhase]);

  const handleNext = useCallback(() => {
    if (canProceed()) {
      setStep(prev => prev + 1);
    }
  }, [canProceed]);

  const handleBack = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1));
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedCategory('');
    setSelectedCondition(null);
    setSelectedPhase('');
    setSelectedProduct(null);
    setShowResearch(false);
    setResearchProduct('');
    setResearchArticles([]);
    setCompetitiveAdvantageModalOpen(false);
    setCompetitiveAdvantageData(null);
    setProductDetailsModalOpen(false);
    setCurrentModalSection(null);
  }, []);

  // Selection handlers
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    setStep(2);
  }, []);

  const handleConditionSelect = useCallback((condition) => {
    setSelectedCondition(condition);
    setStep(3);
  }, []);

  const handlePhaseSelect = useCallback((phase) => {
    setSelectedPhase(phase);
    setStep(4);
  }, []);

  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(prev => prev === product ? null : product);
    setProductDetailsModalOpen(false);
    setCurrentModalSection(null);
  }, []);

  // Research data fetching
  const fetchResearchData = useCallback(async (productName) => {
    try {
      setIsLoadingResearch(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('name', productName)
        .single();

      if (productError || !productData) {
        setResearchArticles([]);
        return;
      }

      const { data: researchData, error: researchError } = await supabase
        .from('condition_product_research_articles')
        .select('id, title, author, abstract, url, created_at')
        .eq('product_id', productData.id)
        .order('created_at', { ascending: false });

      if (researchError) {
        setResearchArticles([]);
        return;
      }

      // Remove duplicates
      const uniqueArticles = [];
      const seen = new Set();

      (researchData || []).forEach(article => {
        const key = `${(article.title || '').trim().toLowerCase()}|${(article.author || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueArticles.push(article);
        }
      });

      setResearchArticles(uniqueArticles);
    } catch (error) {
      setResearchArticles([]);
    } finally {
      setIsLoadingResearch(false);
    }
  }, []);

  const handleOpenResearch = useCallback(async (productName) => {
    setResearchProduct(productName);
    setShowResearch(true);
    await fetchResearchData(productName);
  }, [fetchResearchData]);

  // Product details modal
  const handleOpenProductDetailsModal = useCallback((sectionType) => {
    setCurrentModalSection(sectionType);
    setProductDetailsModalOpen(true);
  }, []);

  // Competitive advantage
  const loadCompetitiveAdvantageData = useCallback(async (productName) => {
    try {
      const { data: competitorsData } = await supabase
        .from('competitive_advantage_competitors')
        .select('competitor_name, advantages')
        .eq('product_name', productName);

      const { data: ingredientsData } = await supabase
        .from('competitive_advantage_active_ingredients')
        .select('ingredient_name, advantages')
        .eq('product_name', productName);

      const competitors = (competitorsData || []).map(comp => ({
        name: comp.competitor_name,
        description: '',
        advantages: comp.advantages || 'No competitive advantages listed.'
      }));

      const activeIngredients = (ingredientsData || []).map(ing => ({
        name: ing.ingredient_name,
        concentration: '',
        advantages: ing.advantages || 'No benefits listed.'
      }));

      setCompetitiveAdvantageData({
        productName,
        competitors,
        activeIngredients,
        keyDifferentiators: [],
        clinicalSuperiority: []
      });
    } catch (error) {
      setCompetitiveAdvantageData({
        productName,
        competitors: [],
        activeIngredients: [],
        keyDifferentiators: [],
        clinicalSuperiority: []
      });
    }
  }, []);

  const handleOpenCompetitiveAdvantage = useCallback(async () => {
    if (selectedProduct) {
      await loadCompetitiveAdvantageData(selectedProduct);
      setCompetitiveAdvantageModalOpen(true);
    }
  }, [selectedProduct, loadCompetitiveAdvantageData]);

  // Get content for product details modal
  const getModalContent = useCallback(() => {
    if (!selectedProduct || !selectedCondition) return null;
    const details = selectedCondition.productDetails?.[selectedProduct];
    if (!details) return null;

    switch (currentModalSection) {
      case 'scientificRationale':
        return details.scientificRationale || details.rationale;
      case 'clinicalEvidence':
        return details.clinicalEvidence;
      case 'handlingObjections':
        return details.handlingObjections;
      case 'pitchPoints':
        return details.pitchPoints;
      default:
        return null;
    }
  }, [selectedProduct, selectedCondition, currentModalSection]);

  const getModalTitle = useCallback(() => {
    switch (currentModalSection) {
      case 'scientificRationale': return 'Scientific Rationale';
      case 'clinicalEvidence': return 'Clinical Evidence';
      case 'handlingObjections': return 'Handling Objections';
      case 'pitchPoints': return 'Key Pitch Points';
      default: return '';
    }
  }, [currentModalSection]);

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <CategoryStep
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            isDarkMode={isDarkMode}
          />
        );
      case 2:
        return (
          <ConditionStep
            conditions={filteredConditions}
            onSelect={handleConditionSelect}
            isDarkMode={isDarkMode}
          />
        );
      case 3:
        return (
          <PhaseStep
            phases={selectedCondition?.phases || []}
            selectedPhase={selectedPhase}
            onSelect={handlePhaseSelect}
            isDarkMode={isDarkMode}
          />
        );
      case 4:
        return (
          <RecommendationsStep
            selectedCondition={selectedCondition}
            selectedPhase={selectedPhase}
            products={recommendedProducts}
            selectedProduct={selectedProduct}
            onProductSelect={handleProductSelect}
            onOpenResearch={handleOpenResearch}
            onOpenModal={handleOpenProductDetailsModal}
            onOpenCompetitive={handleOpenCompetitiveAdvantage}
            userRole={userRole}
            isDarkMode={isDarkMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Wizard Dialog */}
      <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
          <Dialog.Content className={clsx(
            "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
            "w-[95vw] max-w-3xl max-h-[90vh] rounded-xl shadow-xl z-50 flex flex-col",
            "transition-all duration-250",
            isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
          )}>
            {/* Header */}
            <div className={clsx(
              "flex justify-between items-center p-4 border-b",
              isDarkMode ? 'border-prism-dark-border-elevated' : 'border-prism-light-border-elevated'
            )}>
              <Dialog.Title className={`text-xl font-bold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                Therapeutic Wizard
              </Dialog.Title>
              <Dialog.Close className={clsx(
                "transition-colors duration-250 p-1 rounded-md",
                isDarkMode
                  ? 'text-prism-dark-text-tertiary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-tertiary'
                  : 'text-prism-light-text-tertiary hover:text-prism-light-text-primary hover:bg-prism-light-bg-tertiary'
              )}>
                <X size={20} />
              </Dialog.Close>
            </div>

            {/* Progress Indicator */}
            <div className={clsx(
              "px-6 pt-4",
              isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
            )}>
              <div className="flex items-center">
                {[1, 2, 3, 4].map((stepNumber) => (
                  <React.Fragment key={stepNumber}>
                    <div
                      className={clsx(
                        "flex items-center justify-center rounded-full w-8 h-8 transition-all duration-250",
                        stepNumber === step
                          ? 'bg-prism-primary text-white shadow-md'
                          : stepNumber < step
                            ? 'bg-prism-primary text-white'
                            : isDarkMode
                              ? 'bg-prism-dark-border-elevated text-prism-dark-text-tertiary'
                              : 'bg-prism-light-border-elevated text-prism-light-text-primary'
                      )}
                    >
                      {stepNumber < step ? <Check size={16} /> : stepNumber}
                    </div>
                    {stepNumber < 4 && (
                      <div
                        className={clsx(
                          "flex-1 h-1 mx-2 transition-all duration-250",
                          stepNumber < step
                            ? 'bg-prism-primary'
                            : isDarkMode
                              ? 'bg-prism-dark-border-elevated'
                              : 'bg-prism-light-border-elevated'
                        )}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Content */}
            <Dialog.Description className="sr-only">
              Step {step} of 4 in the therapeutic wizard
            </Dialog.Description>
            <div className={clsx(
              "p-6 overflow-y-auto flex-grow",
              isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
            )}>
              {renderStepContent()}
            </div>

            {/* Footer */}
            <div className={clsx(
              "p-4 border-t flex justify-between transition-all duration-250",
              isDarkMode
                ? 'border-prism-dark-border-elevated bg-prism-dark-bg-tertiary'
                : 'border-prism-light-border-elevated bg-prism-light-bg-tertiary'
            )}>
              <div>
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className={clsx(
                      "px-4 py-2 border rounded-lg inline-flex items-center transition-all duration-250 font-medium",
                      isDarkMode
                        ? 'border-prism-dark-border-elevated text-prism-dark-text-primary hover:bg-prism-dark-bg-secondary'
                        : 'border-prism-light-border-elevated text-prism-light-text-primary hover:bg-prism-light-bg-tertiary'
                    )}
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                  </button>
                )}
              </div>
              <div className="space-x-3">
                <button
                  onClick={handleReset}
                  className={clsx(
                    "px-4 py-2 border rounded-lg transition-all duration-250 font-medium",
                    isDarkMode
                      ? 'border-prism-dark-border-elevated text-prism-dark-text-primary hover:bg-prism-dark-bg-secondary'
                      : 'border-prism-light-border-elevated text-prism-light-text-primary hover:bg-prism-light-bg-tertiary'
                  )}
                >
                  Reset
                </button>

                {step < 4 ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={clsx(
                      "px-4 py-2 rounded-lg inline-flex items-center transition-all duration-250 font-medium",
                      canProceed()
                        ? 'bg-prism-primary text-white hover:bg-prism-primary/90'
                        : isDarkMode
                          ? 'bg-prism-dark-bg-tertiary text-prism-dark-text-tertiary cursor-not-allowed'
                          : 'bg-prism-light-bg-tertiary text-prism-light-text-tertiary cursor-not-allowed'
                    )}
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-prism-primary text-white rounded-lg hover:bg-prism-primary/90 transition-all duration-250 font-medium"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Research Modal */}
      <Dialog.Root open={showResearch} onOpenChange={setShowResearch}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
          <Dialog.Content className={clsx(
            "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
            "w-[95vw] max-w-4xl max-h-[90vh] rounded-xl shadow-xl z-50 flex flex-col",
            "transition-all duration-250",
            isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
          )}>
            <ResearchModalContent
              productName={researchProduct}
              articles={researchArticles}
              isLoading={isLoadingResearch}
              isDarkMode={isDarkMode}
              onClose={() => setShowResearch(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={productDetailsModalOpen}
        onClose={() => setProductDetailsModalOpen(false)}
        selectedProduct={selectedProduct}
        sectionType={currentModalSection}
        content={getModalContent()}
        title={getModalTitle()}
      />

      {/* Competitive Advantage Modal */}
      <CompetitiveAdvantageModal
        isOpen={competitiveAdvantageModalOpen}
        onClose={() => setCompetitiveAdvantageModalOpen(false)}
        selectedProduct={selectedProduct}
        competitiveAdvantageData={competitiveAdvantageData}
      />
    </>
  );
}

export default TherapeuticWizard;
