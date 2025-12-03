import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, BookOpen, Target, Info, Microscope, FileText, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../supabaseClient';
import CompetitiveAdvantageModal from './CompetitiveAdvantageModal';
import ProductDetailsModal from './ProductDetailsModal';
import { getCategoryDescription } from '../utils/categoryDescriptions';
import { useTheme } from '../contexts/ThemeContext';

function DiagnosisWizard({ conditions, onClose, patientTypes }) {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedPatientType, setSelectedPatientType] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [filteredConditions, setFilteredConditions] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [activeResearchTab, setActiveResearchTab] = useState('');
  const [showResearch, setShowResearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [competitiveAdvantageModalOpen, setCompetitiveAdvantageModalOpen] = useState(false);
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState(null);

  // Product details modal state
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [currentModalSection, setCurrentModalSection] = useState(null);

  // Extract unique categories from conditions
  const categories = [...new Set(conditions.map(condition => condition.category)
    .filter(category => category && category.trim() !== '' && category !== 'All'))];

  // Handle category selection
  useEffect(() => {
    if (selectedCategory) {
      setFilteredConditions(conditions.filter(condition => condition.category === selectedCategory));
    } else {
      setFilteredConditions([]);
    }
  }, [selectedCategory, conditions]);

  // Clear subsequent selections when a change is made
  useEffect(() => {
    setSelectedCondition(null);
    setSelectedPatientType('');
    setSelectedPhase('');
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedPatientType('');
    setSelectedPhase('');
  }, [selectedCondition]);

  useEffect(() => {
    setSelectedPhase('');
  }, [selectedPatientType]);

  // Set recommended products based on selections using patient-specific configuration
  useEffect(() => {
    if (selectedCondition && selectedPhase && selectedPatientType) {
      let productsToShow = [];
      const config = selectedCondition.patientSpecificConfig;
      
      if (config && config[selectedPhase]) {
        const phaseConfig = config[selectedPhase];
      
        // Get the patient type name from the selected patient type ID
      const selectedPtObject = patientTypes.find(pt => pt.id === selectedPatientType);
        const patientTypeName = selectedPtObject ? selectedPtObject.name : null;
        
        if (patientTypeName) {
          // Get products for the specific patient type by NAME
          productsToShow = phaseConfig[patientTypeName] || [];
        }
      }
      
      // Ensure unique products and set them
      const filteredProducts = [...new Set(productsToShow)];
      setRecommendedProducts(filteredProducts);
      
      // Set first product as active research tab if products exist
      if (filteredProducts.length > 0) {
        setActiveResearchTab(filteredProducts[0].replace(' (Type 3/4 Only)', ''));
      }
    } else {
      setRecommendedProducts([]);
    }
  }, [selectedCondition, selectedPhase, selectedPatientType, patientTypes]);

  // Navigate to next step if valid
  const handleNext = () => {
    if (canProceed()) {
      setStep(prevStep => prevStep + 1);
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    setStep(prevStep => Math.max(1, prevStep - 1));
  };

  // Check if can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 1: return selectedCategory !== '';
      case 2: return selectedCondition !== null;
      case 3: return selectedPatientType !== '';
      case 4: return selectedPhase !== '';
      default: return true;
    }
  };

  // Reset all selections
  const handleReset = () => {
    setStep(1);
    setSelectedCategory('');
    setSelectedCondition(null);
    setSelectedPatientType('');
    setSelectedPhase('');
    setRecommendedProducts([]);
    setShowResearch(false);
    setSelectedProduct(null);
    setCompetitiveAdvantageModalOpen(false);
    setCompetitiveAdvantageData(null);
    setProductDetailsModalOpen(false);
    setCurrentModalSection(null);
  };

  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setStep(3); // Move to patient type selection step
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    const cleanProductName = product.replace(' (Type 3/4 Only)', '');
    setSelectedProduct(selectedProduct === cleanProductName ? null : cleanProductName);
    // Close any open modals when selecting a new product
    setProductDetailsModalOpen(false);
    setCurrentModalSection(null);
  };

  // Handle opening product details modal
  const handleOpenProductDetailsModal = (sectionType) => {
    setCurrentModalSection(sectionType);
    setProductDetailsModalOpen(true);
  };

  // Get product details
  const getProductDetails = (productName) => {
    if (!selectedCondition || !productName) return null;
    return selectedCondition.productDetails[productName] || null;
  };

  // Handle opening competitive advantage modal
  const handleOpenCompetitiveAdvantage = async () => {
    if (selectedProduct) {
      await loadCompetitiveAdvantageData(selectedProduct);
      setCompetitiveAdvantageModalOpen(true);
    }
  };

  // Load competitive advantage data from Supabase
  const loadCompetitiveAdvantageData = async (productName) => {
    try {
      
      // Fetch competitors data from Supabase
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitive_advantage_competitors')
        .select('competitor_name, advantages')
        .eq('product_name', productName);

      if (competitorsError) {
        console.error('Error fetching competitors data:', competitorsError);
      }

      // Fetch active ingredients data from Supabase
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('competitive_advantage_active_ingredients')
        .select('ingredient_name, advantages')
        .eq('product_name', productName);

      if (ingredientsError) {
        console.error('Error fetching active ingredients data:', ingredientsError);
      }

      // Transform the data to match the expected format
      const competitors = (competitorsData || []).map(comp => ({
        name: comp.competitor_name,
        description: '', // No description field in current schema
        advantages: comp.advantages || 'No competitive advantages listed.'
      }));

      const activeIngredients = (ingredientsData || []).map(ing => ({
        name: ing.ingredient_name,
        concentration: '', // No concentration field in current schema
        advantages: ing.advantages || 'No benefits listed for this ingredient.'
      }));


      // Set the competitive advantage data
      const competitiveData = {
        productName: productName,
        competitors: competitors,
        activeIngredients: activeIngredients,
        keyDifferentiators: [], // Not in current schema
        clinicalSuperiority: [] // Not in current schema
      };

      setCompetitiveAdvantageData(competitiveData);

      // If no data found, fall back to mock data
      if (competitors.length === 0 && activeIngredients.length === 0) {
        const mockData = {
          productName: productName,
          competitors: [
            {
              name: "Competitor Product A",
              description: "Standard antimicrobial rinse",
              advantages: "• Our product has longer-lasting effects\n• Better patient compliance due to improved taste\n• Lower concentration needed for same efficacy"
            },
            {
              name: "Competitor Product B", 
              description: "Traditional chlorhexidine solution",
              advantages: "• No staining side effects\n• Better tissue tolerance\n• More convenient application method"
            }
          ],
          activeIngredients: [
            {
              name: "Primary Active Ingredient",
              concentration: "1.5%",
              advantages: "• Proven antimicrobial efficacy\n• Anti-inflammatory properties\n• Enhanced tissue healing"
            }
          ]
        };
        
        setCompetitiveAdvantageData(mockData);
      }
    } catch (error) {
      console.error('Error loading competitive advantage data:', error);
      // Set empty data on error
      setCompetitiveAdvantageData({
        productName: productName,
        competitors: [],
        activeIngredients: [],
        keyDifferentiators: [],
        clinicalSuperiority: []
      });
    }
  };

  // Patient types description
  const patientTypeDesc = {
    '1': 'Healthy Patient',
    '2': 'Medically Controlled',
    '3': 'Moderately Compromised',
    '4': 'High-Risk Systematic Burden'
  };

  // State for research data
  const [researchArticles, setResearchArticles] = useState([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);

  // Fetch research data from Supabase
  const getResearchData = async (productName) => {
    const cleanProductName = productName.replace(' (Type 3/4 Only)', '');
    
    try {
      setIsLoadingResearch(true);
      
      // Get the product ID first
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('name', cleanProductName)
        .single();

      if (productError || !productData) {
        return [];
      }

      // Get research articles by product_id from condition_product_research_articles
      const { data: researchData, error: researchError } = await supabase
        .from('condition_product_research_articles')
        .select(`
          id,
          title,
          author,
          abstract,
          url,
          created_at,
          updated_at
        `)
        .eq('product_id', productData.id)
        .order('created_at', { ascending: false });

      if (researchError) {
        console.error('Error fetching research articles:', researchError);
        return [];
      }

      
      // Remove duplicates based on title and author combination
      const uniqueArticles = [];
      const seen = new Set();
      
      (researchData || []).forEach(article => {
        // Create a unique key based on title and author
        const key = `${(article.title || '').trim().toLowerCase()}|${(article.author || '').trim().toLowerCase()}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniqueArticles.push(article);
        }
      });
      
      return uniqueArticles;
      
    } catch (error) {
      console.error('Error in getResearchData:', error);
      return [];
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Render wizard content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Step 1: Select Condition Category</h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Choose the category of the patient's condition:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`p-4 border rounded-lg text-left transition-all duration-250 ease-smooth ${
                    selectedCategory === category
                      ? isDarkMode
                        ? 'border-prism-primary bg-prism-primary/15'
                        : 'border-prism-primary/50 bg-prism-primary/10'
                      : isDarkMode
                        ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/40'
                        : 'border-gray-300 hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{category}</div>
                  <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getCategoryDescription(category)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Step 2: Select Specific Condition</h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Choose the patient's specific condition:</p>
            <div className={`mt-4 max-h-96 overflow-y-auto border rounded-lg divide-y transition-all duration-250 ease-smooth ${
              isDarkMode
                ? 'border-prism-dark-border-elevated divide-prism-dark-border-elevated'
                : 'border-gray-300 divide-gray-200'
            }`}>
              {filteredConditions.map((condition) => (
                <button
                  key={condition.name}
                  className={`w-full p-4 text-left transition-all duration-250 ease-smooth flex justify-between items-center ${
                    isDarkMode
                      ? 'hover:bg-prism-dark-bg-tertiary'
                      : 'hover:bg-prism-light-bg-tertiary'
                  }`}
                  onClick={() => handleConditionSelect(condition)}
                >
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{condition.name}</div>
                    <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {condition.category}
                    </div>
                  </div>
                  <ChevronRight size={20} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                </button>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Step 3: Select Treatment Modifier</h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>What type of patient is being treated?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {patientTypes.map((pt) => (
                <button
                  key={pt.id}
                  className={`p-4 border rounded-lg text-left transition-all duration-250 ease-smooth ${
                    selectedPatientType === pt.id
                      ? isDarkMode
                        ? 'border-prism-primary bg-prism-primary/15'
                        : 'border-prism-primary/50 bg-prism-primary/10'
                      : isDarkMode
                        ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/40'
                        : 'border-gray-300 hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40'
                  }`}
                  onClick={() => {
                    setSelectedPatientType(pt.id);
                    setStep(4);
                  }}
                >
                  <div className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pt.name}</div>
                  <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pt.description}</div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Step 4: Select Treatment Phase</h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>What phase of treatment is the patient in?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {selectedCondition.phases.map((phase) => (
                <button
                  key={phase}
                  className={`p-4 border rounded-lg text-left transition-all duration-250 ease-smooth ${
                    selectedPhase === phase
                      ? isDarkMode
                        ? 'border-prism-primary bg-prism-primary/15'
                        : 'border-prism-primary/50 bg-prism-primary/10'
                      : isDarkMode
                        ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-tertiary hover:border-prism-primary/40'
                        : 'border-gray-300 hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40'
                  }`}
                  onClick={() => {
                    setSelectedPhase(phase);
                    setStep(5);
                  }}
                >
                  <div className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{phase} Phase</div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div className={`border rounded-lg p-4 transition-all duration-250 ease-smooth ${
              isDarkMode
                ? 'bg-prism-primary/15 border-prism-primary/30'
                : 'bg-prism-primary/10 border-prism-primary/30'
            }`}>
              <h2 className="text-xl font-semibold text-prism-primary">Diagnosis Complete</h2>
              <div className={`mt-1 ${isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary/80'}`}>
                Based on your selections, here are the recommended products:
              </div>
            </div>

            <div className={`border rounded-lg p-4 transition-all duration-250 ease-smooth ${
              isDarkMode
                ? 'bg-prism-primary/10 border-prism-primary/20'
                : 'bg-prism-primary/5 border-prism-primary/20'
            }`}>
              <h3 className="font-medium text-prism-primary">Patient Profile</h3>
              <ul className={`mt-2 space-y-1 ${isDarkMode ? 'text-prism-primary/70' : 'text-prism-primary/80'}`}>
                <li><span className="font-medium">Condition:</span> {selectedCondition.name}</li>
                <li><span className="font-medium">Treatment Modifier:</span> Type {selectedPatientType} - {patientTypeDesc[selectedPatientType]}</li>
                <li><span className="font-medium">Treatment Phase:</span> {selectedPhase}</li>
              </ul>
            </div>

            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recommended Products</h3>
            {recommendedProducts.length > 0 ? (
              <div className="space-y-4">
                {recommendedProducts.map((product) => {
                  const cleanProductName = product.replace(' (Type 3/4 Only)', '');
                  const isSelected = selectedProduct === cleanProductName;

                  return (
                    <div
                      key={product}
                      className={clsx(
                        "border-2 rounded-lg p-5 cursor-pointer transition-all duration-250 ease-smooth",
                        isSelected
                          ? "border-prism-primary bg-prism-primary shadow-sm"
                          : isDarkMode
                            ? "border-prism-dark-border-elevated bg-prism-dark-bg-tertiary hover:border-prism-primary/40 hover:bg-prism-dark-bg-tertiary/80"
                            : "border-gray-200 bg-prism-light-bg-secondary hover:bg-prism-light-bg-tertiary hover:border-prism-primary/40"
                      )}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className={clsx(
                          "text-lg font-semibold",
                          isSelected ? "text-white" : isDarkMode ? "text-white" : "text-black"
                        )}>
                          {product}
                        </h4>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setActiveResearchTab(cleanProductName);
                            setShowResearch(true);
                            const articles = await getResearchData(cleanProductName);
                            setResearchArticles(articles);
                          }}
                          className={clsx(
                            "text-sm flex items-center transition-colors duration-250 ease-smooth",
                            isSelected
                              ? "text-white hover:text-gray-200"
                              : isDarkMode
                                ? "text-prism-primary hover:text-prism-primary/80"
                                : "text-prism-primary hover:text-prism-primary/80"
                          )}
                        >
                          <BookOpen size={14} className="mr-1" />
                          <span>Research</span>
                        </button>
                      </div>
                      {product.includes('(Type 3/4 Only)') && (
                        <div className="mt-2">
                          <span className={clsx(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all duration-250 ease-smooth",
                            isSelected
                              ? "bg-white text-prism-primary"
                              : isDarkMode
                                ? "bg-amber-900/40 text-amber-300"
                                : "bg-amber-100 text-amber-800"
                          )}>
                            Recommended for Type 3/4 patients only
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Additional Information Section */}
                {selectedProduct && (
                  <div className="mt-6 space-y-2">
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Additional Information: {selectedProduct}
                    </h3>
                    
                    {(() => {
                      const selectedProductDetails = getProductDetails(selectedProduct);
                      if (!selectedProductDetails) {
                        return (
                          <div className={`p-4 border rounded-lg ${
                            isDarkMode
                              ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated text-gray-400'
                              : 'bg-prism-light-bg-tertiary border-gray-200 text-gray-500'
                          }`}>
                            No additional details available for this product.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {/* Usage Instructions - Prominently displayed */}
                          <div className={`border-l-4 p-4 mb-4 rounded-r-lg transition-all duration-250 ease-smooth ${
                            isDarkMode
                              ? 'border-prism-primary bg-prism-primary/10 shadow-sm'
                              : 'border-prism-primary bg-prism-primary/5 shadow-sm'
                          }`}>
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <Info className="h-5 w-5 text-prism-primary" />
                              </div>
                              <div className="ml-3 flex-1">
                                <h4 className="text-base font-semibold text-prism-primary mb-2">
                                  Usage Instructions for {selectedProduct} - {selectedPhase} Phase
                                </h4>
                                <div className={`p-3 rounded-lg border transition-all duration-250 ease-smooth ${
                                  isDarkMode
                                    ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
                                    : 'bg-prism-light-bg-secondary border-gray-200'
                                } shadow-sm`}>
                                  <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                    {typeof selectedProductDetails.usage === 'object'
                                      ? (selectedProductDetails.usage[selectedPhase]
                                          ? <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage[selectedPhase]}</div>
                                          : <div className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No specific instructions for {selectedPhase} phase. See general usage below.</div>)
                                      : <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage}</div>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Scientific Rationale */}
                          <div
                            className={`p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250 ease-smooth ${
                              isDarkMode
                                ? 'bg-prism-primary/10 border-prism-primary/20 hover:bg-prism-primary/15'
                                : 'bg-prism-primary/5 border-prism-primary/20 hover:bg-prism-primary/10'
                            }`}
                            onClick={() => handleOpenProductDetailsModal('scientificRationale')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-prism-primary">Scientific Rationale</div>
                              <Microscope size={18} className="text-prism-primary/70" />
                            </div>
                          </div>

                          {/* Clinical Evidence */}
                          <div
                            className={`p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250 ease-smooth ${
                              isDarkMode
                                ? 'bg-prism-primary/15 border-prism-primary/30 hover:bg-prism-primary/20'
                                : 'bg-prism-primary/10 border-prism-primary/30 hover:bg-prism-primary/15'
                            }`}
                            onClick={() => handleOpenProductDetailsModal('clinicalEvidence')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-prism-primary">Clinical Evidence</div>
                              <FileText size={18} className="text-prism-primary/70" />
                            </div>
                          </div>

                          {/* Competitive Advantage */}
                          <div
                            className={`p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250 ease-smooth ${
                              isDarkMode
                                ? 'bg-prism-primary/25 border-prism-primary/40 hover:bg-prism-primary/30'
                                : 'bg-prism-primary/15 border-prism-primary/40 hover:bg-prism-primary/20'
                            }`}
                            onClick={handleOpenCompetitiveAdvantage}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-prism-primary">
                                Competitive Advantage
                              </div>
                              <Target size={18} className="text-prism-primary/70" />
                            </div>
                          </div>

                          {/* Handling Objections */}
                          <div
                            className={`p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250 ease-smooth ${
                              isDarkMode
                                ? 'bg-prism-primary/35 border-prism-primary/50 hover:bg-prism-primary/40'
                                : 'bg-prism-primary/20 border-prism-primary/50 hover:bg-prism-primary/25'
                            }`}
                            onClick={() => handleOpenProductDetailsModal('handlingObjections')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-prism-primary">Handling Objections</div>
                              <MessageSquare size={18} className="text-prism-primary/70" />
                            </div>
                          </div>

                          {/* Key Pitch Points */}
                          {selectedProductDetails.pitchPoints && (
                            <div
                              className={`p-3 rounded-lg mb-2 border-2 cursor-pointer transition-all duration-250 ease-smooth ${
                                isDarkMode
                                  ? 'bg-prism-primary/45 border-prism-primary/60 hover:bg-prism-primary/50'
                                  : 'bg-prism-primary/30 border-prism-primary/60 hover:bg-prism-primary/35'
                              }`}
                              onClick={() => handleOpenProductDetailsModal('pitchPoints')}
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-white">Key Pitch Points</div>
                                <Target size={18} className="text-white/70" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className={`p-4 border rounded-lg ${
                isDarkMode
                  ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated text-gray-400'
                  : 'bg-prism-light-bg-tertiary border-gray-200 text-gray-500'
              }`}>
                No products recommended for this specific combination. Please adjust your selections.
              </div>
            )}
          </div>
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  // Render research modal
  const renderResearchModal = () => {
    if (!showResearch) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className={`rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-all duration-250 ease-smooth ${
          isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
        }`}>
          <div className={`flex justify-between items-center p-6 border-b transition-all duration-250 ease-smooth ${
            isDarkMode
              ? 'border-prism-dark-border-elevated bg-prism-primary text-white rounded-t-xl'
              : 'border-gray-200 bg-prism-primary text-white rounded-t-xl'
          }`}>
            <div className="flex items-center">
              <BookOpen size={24} className="mr-3 text-white" />
              <h3 className="text-xl font-semibold">Research Supporting {activeResearchTab}</h3>
            </div>
            <button
              onClick={() => {
                setShowResearch(false);
                setResearchArticles([]);
              }}
              className="text-white/80 hover:text-white transition-colors duration-250 ease-smooth p-1 rounded-md hover:bg-white/10"
            >
              <X size={24} />
            </button>
          </div>

          <div className={`overflow-y-auto p-6 flex-grow ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'}`}>
            {isLoadingResearch ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDarkMode ? 'border-prism-primary' : 'border-prism-primary'}`}></div>
                  <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading research articles...</p>
                </div>
              </div>
            ) : researchArticles.length > 0 ? (
              <div className="space-y-6">
                {researchArticles.map((article, index) => (
                  <div key={article.id || index} className={`rounded-lg border p-6 transition-all duration-250 ease-smooth ${
                    isDarkMode
                      ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated hover:shadow-md'
                      : 'bg-prism-light-bg-secondary border-gray-200 shadow-sm hover:shadow-md'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className={`font-semibold text-lg flex-1 pr-4 cursor-pointer transition-colors duration-250 ease-smooth ${
                        isDarkMode
                          ? 'text-prism-primary hover:text-prism-primary/80'
                          : 'text-prism-primary hover:text-prism-primary/80'
                      }`}>
                        {article.title}
                      </h4>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 inline-flex items-center px-3 py-1.5 bg-prism-primary text-white text-xs font-medium rounded-lg hover:bg-prism-primary/90 transition-colors duration-250 ease-smooth"
                        >
                          <span>View Article</span>
                          <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>

                    <div className={`text-sm mb-4 space-y-1 border-b pb-3 transition-all duration-250 ease-smooth ${
                      isDarkMode
                        ? 'border-prism-dark-border-elevated text-gray-400'
                        : 'border-gray-100 text-gray-600'
                    }`}>
                      {article.author && (
                        <p className="flex items-center">
                          <span className={`font-medium mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Authors:</span>
                          <span>{article.author}</span>
                        </p>
                      )}
                      {article.created_at && (
                        <p className="flex items-center">
                          <span className={`font-medium mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Added:</span>
                          <span>{new Date(article.created_at).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>

                    {article.abstract ? (
                      <div className="mt-4">
                        <h5 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          <FileText size={16} className="mr-2 text-prism-primary" />
                          Abstract
                        </h5>
                        <div className={`border-l-4 border-prism-primary p-4 rounded-r-lg transition-all duration-250 ease-smooth ${
                          isDarkMode
                            ? 'bg-prism-primary/10'
                            : 'bg-prism-primary/5'
                        }`}>
                          <div className={`leading-relaxed text-justify ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {article.abstract.split('\n').map((paragraph, index) => (
                              <p key={index} className={index > 0 ? "mt-3" : ""}>
                                {paragraph.trim()}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`mt-4 p-3 border rounded-lg transition-all duration-250 ease-smooth ${
                        isDarkMode
                          ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
                          : 'bg-prism-light-bg-tertiary border-gray-200'
                      }`}>
                        <p className={`italic text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Abstract not available for this article.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className={`rounded-lg border p-8 max-w-md mx-auto transition-all duration-250 ease-smooth ${
                  isDarkMode
                    ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated'
                    : 'bg-prism-light-bg-secondary border-gray-200 shadow-sm'
                }`}>
                  <BookOpen size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <h4 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>No Research Articles Found</h4>
                  <p className={`mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No research articles are currently available for <span className="font-medium text-prism-primary">{activeResearchTab}</span>.</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Research articles can be added through the Admin Panel.</p>
                </div>
              </div>
            )}
          </div>

          <div className={`p-6 border-t text-right transition-all duration-250 ease-smooth ${
            isDarkMode
              ? 'border-prism-dark-border-elevated bg-prism-dark-bg-tertiary rounded-b-xl'
              : 'border-gray-200 bg-prism-light-bg-tertiary rounded-b-xl'
          }`}>
            <button
              className="inline-flex items-center px-6 py-2.5 bg-prism-primary text-white rounded-lg hover:bg-prism-primary/90 focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2 transition-colors duration-250 ease-smooth font-medium"
              onClick={() => {
                setShowResearch(false);
                setResearchArticles([]);
              }}
            >
              <X size={18} className="mr-2" />
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className={`rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col transition-all duration-250 ease-smooth ${
        isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'
      }`}>
        {/* Wizard Header */}
        <div className={`flex justify-between items-center p-4 border-b transition-all duration-250 ease-smooth ${
          isDarkMode
            ? 'border-prism-dark-border-elevated'
            : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Therapeutic Wizard</h2>
          <button onClick={onClose} className={`transition-colors duration-250 ease-smooth ${
            isDarkMode
              ? 'text-gray-500 hover:text-gray-300'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className={`px-6 pt-4 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'}`}>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div
                  className={`flex items-center justify-center rounded-full w-8 h-8 transition-all duration-250 ease-smooth ${
                    stepNumber === step
                      ? 'bg-prism-primary text-white shadow-md'
                      : stepNumber < step
                        ? 'bg-prism-primary text-white'
                        : isDarkMode
                          ? 'bg-prism-dark-border-elevated text-gray-400'
                          : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {stepNumber < step ? <Check size={16} /> : stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all duration-250 ease-smooth ${
                      stepNumber < step
                        ? 'bg-prism-primary'
                        : isDarkMode
                          ? 'bg-prism-dark-border-elevated'
                          : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Wizard Content */}
        <div className={`p-6 overflow-y-auto flex-grow ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'}`}>
          {renderStepContent()}
        </div>

        {/* Wizard Actions */}
        <div className={`p-4 border-t flex justify-between transition-all duration-250 ease-smooth ${
          isDarkMode
            ? 'border-prism-dark-border-elevated bg-prism-dark-bg-tertiary'
            : 'border-gray-200 bg-prism-light-bg-tertiary'
        }`}>
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                className={`px-4 py-2 border rounded-lg inline-flex items-center transition-all duration-250 ease-smooth font-medium ${
                  isDarkMode
                    ? 'border-prism-dark-border-elevated text-gray-300 hover:bg-prism-dark-bg-secondary'
                    : 'border-gray-300 text-gray-700 hover:bg-prism-light-bg-tertiary'
                }`}
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </button>
            )}
          </div>
          <div className="space-x-3">
            <button
              onClick={handleReset}
              className={`px-4 py-2 border rounded-lg transition-all duration-250 ease-smooth font-medium ${
                isDarkMode
                  ? 'border-prism-dark-border-elevated text-gray-300 hover:bg-prism-dark-bg-secondary'
                  : 'border-gray-300 text-gray-700 hover:bg-prism-light-bg-tertiary'
              }`}
            >
              Reset
            </button>

            {step < 5 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-4 py-2 rounded-lg inline-flex items-center transition-all duration-250 ease-smooth font-medium ${
                  canProceed()
                    ? 'bg-prism-primary text-white hover:bg-prism-primary/90'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>
            )}

            {step === 5 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-prism-primary text-white rounded-lg hover:bg-prism-primary/90 transition-all duration-250 ease-smooth font-medium"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Research Modal */}
      {renderResearchModal()}
      
      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={productDetailsModalOpen}
        onClose={() => setProductDetailsModalOpen(false)}
        selectedProduct={selectedProduct}
        sectionType={currentModalSection}
        content={currentModalSection && selectedProduct ? 
          (() => {
            const selectedProductDetails = getProductDetails(selectedProduct);
            if (!selectedProductDetails) return null;
            
            switch (currentModalSection) {
              case 'scientificRationale':
                return selectedProductDetails.rationale;
              case 'clinicalEvidence':
                return selectedProductDetails.clinicalEvidence;
              case 'handlingObjections':
                return selectedProductDetails.handlingObjections;
              case 'pitchPoints':
                return selectedProductDetails.pitchPoints;
              default:
                return null;
            }
          })() : null
        }
        title={currentModalSection ? 
          (() => {
            switch (currentModalSection) {
              case 'scientificRationale':
                return 'Scientific Rationale';
              case 'clinicalEvidence':
                return 'Clinical Evidence';
              case 'handlingObjections':
                return 'Handling Objections';
              case 'pitchPoints':
                return 'Key Pitch Points';
              default:
                return '';
            }
          })() : ''
        }
      />

      {/* Competitive Advantage Modal */}
      <CompetitiveAdvantageModal
        isOpen={competitiveAdvantageModalOpen}
        onClose={() => setCompetitiveAdvantageModalOpen(false)}
        selectedProduct={selectedProduct}
        competitiveAdvantageData={competitiveAdvantageData}
      />
    </div>
  );
}

export default DiagnosisWizard;