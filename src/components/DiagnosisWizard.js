import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, BookOpen, ChevronDown, Target, Info, Microscope, FileText, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../supabaseClient';
import CompetitiveAdvantageModal from './CompetitiveAdvantageModal';
import ProductDetailsModal from './ProductDetailsModal';
import { getCategoryDescription } from '../utils/categoryDescriptions';

function DiagnosisWizard({ conditions, onClose, patientTypes }) {
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
      console.log('Loading competitive advantage data for product:', productName);
      
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

      console.log('Fetched competitors:', competitors);
      console.log('Fetched active ingredients:', activeIngredients);

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
        console.log('No competitive advantage data found, using mock data');
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

  // Mock research data
  const researchData = {
    "AO ProVantage Gel": [
      { title: "Antioxidant Effects on Tissue Healing Post-Surgery", author: "Smith et al., Journal of Dental Research, 2023" },
      { title: "Clinical Efficacy of Antioxidant Therapy in Periodontal Surgery", author: "Johnson et al., Periodontology Today, 2022" },
      { title: "Free Radical Scavenging Properties of Antioxidants in Oral Care", author: "Williams et al., Oral Surgery Journal, 2023" },
      { title: "Comparative Study of Antioxidant Gels in Post-Surgical Recovery", author: "Davis et al., International Dental Journal, 2021" },
      { title: "Patient Outcomes with Antioxidant Treatment in Implant Procedures", author: "Martinez et al., Implant Dentistry, 2022" }
    ],
    "Synvaza": [
      { title: "Wound Healing Properties of Chitosan-Based Formulations", author: "Brown et al., Advanced Dental Materials, 2023" },
      { title: "Efficacy of Synvaza in Post-Extraction Socket Healing", author: "Taylor et al., Journal of Oral Surgery, 2022" },
      { title: "Comparative Analysis of Wound Healing Rinses in Dental Surgery", author: "Roberts et al., Clinical Dentistry Reviews, 2021" },
      { title: "Patient-Reported Outcomes with Synvaza After Implant Surgery", author: "Garcia et al., Implant Dentistry, 2023" },
      { title: "Reduction in Post-Surgical Complications with Synvaza", author: "White et al., Journal of Dental Medicine, 2022" }
    ],
    "Mint-X Rinse": [
      { title: "Antibacterial Efficacy of Mint-X in Periodontal Patients", author: "Lee et al., Journal of Clinical Periodontology, 2023" },
      { title: "Comparative Study of Rinses in Post-Extraction Care", author: "Wilson et al., Dental Medicine Today, 2022" },
      { title: "Patient Compliance with Mint-Based Rinses vs Chlorhexidine", author: "Thomas et al., Preventive Dentistry, 2021" },
      { title: "Effects of Mint-X on Oral Microbiome in Surgical Patients", author: "Anderson et al., Oral Microbiology Journal, 2023" },
      { title: "Long-term Outcomes with Mint-X Maintenance Therapy", author: "Miller et al., Dental Hygiene Journal, 2022" }
    ]
  };

  // Create generic research data for all products
  const getResearchData = (productName) => {
    const cleanProductName = productName.replace(' (Type 3/4 Only)', '');
    
    if (researchData[cleanProductName]) {
      return researchData[cleanProductName];
    }
    
    // Generate placeholder research if not defined
    return [
      { title: `Clinical Efficacy of ${cleanProductName} in Dental Practice`, author: "Johnson et al., Dental Research Journal, 2023" },
      { title: `${cleanProductName} Applications in Modern Dentistry`, author: "Smith et al., Journal of Clinical Dentistry, 2022" },
      { title: `Patient Outcomes with ${cleanProductName}: A Retrospective Study`, author: "Williams et al., Oral Health Today, 2023" },
      { title: `Comparative Analysis of ${cleanProductName} vs Standard Treatments`, author: "Brown et al., International Dental Journal, 2021" },
      { title: `Long-term Benefits of ${cleanProductName} in Dental Care`, author: "Davis et al., Preventive Dentistry, 2022" }
    ];
  };

  // Render wizard content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 1: Select Condition Category</h2>
            <p className="text-gray-600">Choose the category of the patient's condition:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`p-4 border rounded-lg text-left hover:bg-[#15396c]/10 transition-colors ${
                    selectedCategory === category ? 'border-[#15396c] bg-[#15396c]/10' : 'border-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className="font-medium text-lg">{category}</div>
                  <div className="text-sm text-gray-500 mt-1">
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
            <h2 className="text-xl font-semibold">Step 2: Select Specific Condition</h2>
            <p className="text-gray-600">Choose the patient's specific condition:</p>
            <div className="mt-4 max-h-96 overflow-y-auto border rounded-lg divide-y">
              {filteredConditions.map((condition) => (
                <button
                  key={condition.name}
                  className="w-full p-4 text-left hover:bg-[#15396c]/10 transition-colors flex justify-between items-center"
                  onClick={() => handleConditionSelect(condition)}
                >
                  <div>
                    <div className="font-medium">{condition.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {condition.category}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 3: Select Treatment Modifier</h2>
            <p className="text-gray-600">What type of patient is being treated?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {patientTypes.map((pt) => (
                <button
                  key={pt.id}
                  className={`p-4 border rounded-lg text-left hover:bg-[#15396c]/10 transition-colors ${
                    selectedPatientType === pt.id ? 'border-[#15396c] bg-[#15396c]/10' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedPatientType(pt.id);
                    setStep(4);
                  }}
                >
                  <div className="font-medium text-lg">{pt.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{pt.description}</div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 4: Select Treatment Phase</h2>
            <p className="text-gray-600">What phase of treatment is the patient in?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {selectedCondition.phases.map((phase) => (
                <button
                  key={phase}
                  className={`p-4 border rounded-lg text-left hover:bg-[#15396c]/10 transition-colors ${
                    selectedPhase === phase ? 'border-[#15396c] bg-[#15396c]/10' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedPhase(phase);
                    setStep(5);
                  }}
                >
                  <div className="font-medium text-lg">{phase} Phase</div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-[#15396c]/10 border border-[#15396c]/30 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-[#15396c]">Diagnosis Complete</h2>
              <div className="text-[#15396c]/80 mt-1">
                Based on your selections, here are the recommended products:
              </div>
            </div>
            
            <div className="bg-[#15396c]/5 border border-[#15396c]/20 rounded-lg p-4">
              <h3 className="font-medium text-[#15396c]">Patient Profile</h3>
              <ul className="mt-2 text-[#15396c]/80 space-y-1">
                <li><span className="font-medium">Condition:</span> {selectedCondition.name}</li>
                <li><span className="font-medium">Treatment Modifier:</span> Type {selectedPatientType} - {patientTypeDesc[selectedPatientType]}</li>
                <li><span className="font-medium">Treatment Phase:</span> {selectedPhase}</li>
              </ul>
            </div>
            
            <h3 className="text-lg font-medium">Recommended Products</h3>
            {recommendedProducts.length > 0 ? (
              <div className="space-y-4">
                {recommendedProducts.map((product) => {
                  const cleanProductName = product.replace(' (Type 3/4 Only)', '');
                  const isSelected = selectedProduct === cleanProductName;
                  
                  return (
                    <div 
                      key={product}
                      className={clsx(
                        "border-2 rounded-lg p-5 shadow-sm cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-[#15396c] !bg-[#15396c]" 
                          : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      )}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className={clsx(
                          "text-lg font-semibold",
                          isSelected ? "!text-white" : "text-black"
                        )}>
                          {product}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveResearchTab(cleanProductName);
                            setShowResearch(true);
                          }}
                          className={clsx(
                            "text-sm flex items-center transition-colors",
                            isSelected
                              ? "!text-white hover:!text-gray-200"
                              : "text-[#15396c] hover:text-[#15396c]/80"
                          )}
                        >
                          <BookOpen size={14} className="mr-1" />
                          <span>Research</span>
                        </button>
                      </div>
                      {product.includes('(Type 3/4 Only)') && (
                        <div className="mt-2">
                          <span className={clsx(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            isSelected
                              ? "bg-white text-[#15396c]"
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
                    <h3 className="text-lg font-medium text-gray-700 mb-3">
                      Additional Information: {selectedProduct}
                    </h3>
                    
                    {(() => {
                      const selectedProductDetails = getProductDetails(selectedProduct);
                      if (!selectedProductDetails) {
                        return (
                          <div className="text-gray-500 p-4 border rounded bg-gray-50">
                            No additional details available for this product.
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-2">
                          {/* Usage Instructions - Prominently displayed */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-6 border-[#15396c] p-4 mb-4 shadow-md rounded-r-md">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <Info className="h-5 w-5 text-[#15396c]" />
                              </div>
                              <div className="ml-3 flex-1">
                                <h4 className="text-base font-semibold text-[#15396c] mb-2">
                                  Usage Instructions for {selectedProduct} - {selectedPhase} Phase
                                </h4>
                                <div className="bg-white p-3 rounded-md border border-[#15396c]/20 shadow-sm">
                                  <div className="text-sm text-gray-800 leading-relaxed">
                                    {typeof selectedProductDetails.usage === 'object'
                                      ? (selectedProductDetails.usage[selectedPhase] 
                                          ? <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage[selectedPhase]}</div>
                                          : <div className="text-gray-600 italic">No specific instructions for {selectedPhase} phase. See general usage below.</div>)
                                      : <div className="whitespace-pre-line font-medium">{selectedProductDetails.usage}</div>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                                                    {/* Scientific Rationale */}
                          <div 
                            className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/10 border-[#15396c]/20 cursor-pointer hover:bg-[#15396c]/15 transition-colors"
                            onClick={() => handleOpenProductDetailsModal('scientificRationale')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-[#15396c]">Scientific Rationale</div>
                              <Microscope size={18} className="text-[#15396c]/70" />
                            </div>
                          </div>
                          
                          {/* Clinical Evidence */}
                          <div 
                            className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/25 border-[#15396c]/35 cursor-pointer hover:bg-[#15396c]/30 transition-colors"
                            onClick={() => handleOpenProductDetailsModal('clinicalEvidence')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-[#15396c]">Clinical Evidence</div>
                              <FileText size={18} className="text-[#15396c]/70" />
                            </div>
                          </div>
                          
                          {/* Competitive Advantage */}
                          <div 
                            className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/40 border-[#15396c]/50 cursor-pointer hover:bg-[#15396c]/45 transition-colors"
                            onClick={handleOpenCompetitiveAdvantage}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-[#15396c]">
                                Competitive Advantage
                              </div>
                              <Target size={18} className="text-[#15396c]/70" />
                            </div>
                          </div>
                          
                          {/* Handling Objections */}
                          <div 
                            className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/55 border-[#15396c]/65 cursor-pointer hover:bg-[#15396c]/60 transition-colors"
                            onClick={() => handleOpenProductDetailsModal('handlingObjections')}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-[#15396c]">Handling Objections</div>
                              <MessageSquare size={18} className="text-[#15396c]/70" />
                            </div>
                          </div>
                          
                          {/* Key Pitch Points */}
                          {selectedProductDetails.pitchPoints && (
                            <div 
                              className="p-3 rounded-md mb-2 border-2 bg-[#15396c]/70 border-[#15396c]/80 cursor-pointer hover:bg-[#15396c]/75 transition-colors"
                              onClick={() => handleOpenProductDetailsModal('pitchPoints')}
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-[#15396c]">Key Pitch Points</div>
                                <Target size={18} className="text-[#15396c]/70" />
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
              <div className="text-gray-500 p-4 border rounded bg-gray-50">
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
    
    const research = getResearchData(activeResearchTab);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-xl font-semibold">Research Supporting {activeResearchTab}</h3>
            <button 
              onClick={() => setShowResearch(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="overflow-y-auto p-6 flex-grow">
            <div className="space-y-6">
              {research.map((item, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-lg text-[#15396c] hover:underline cursor-pointer">
                    {item.title}
                  </h4>
                  <p className="text-gray-600 mt-1">{item.author}</p>
                  <p className="mt-3 text-gray-700">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in odio ac nunc efficitur 
                    vestibulum. Maecenas vel ante vel leo dictum eleifend. Suspendisse potenti. Vestibulum ante 
                    ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.
                  </p>
                  <div className="mt-3">
                    <button className="text-[#15396c] hover:text-[#15396c]/80 text-sm inline-flex items-center">
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t text-right">
            <button 
              className="px-4 py-2 bg-[#15396c] text-white rounded hover:bg-[#15396c]/90"
              onClick={() => setShowResearch(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Wizard Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Therapeutic Wizard</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div 
                  className={`flex items-center justify-center rounded-full w-8 h-8 ${
                    stepNumber === step 
                      ? 'bg-[#15396c] text-white' 
                      : stepNumber < step 
                        ? 'bg-[#15396c] text-white' 
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {stepNumber < step ? <Check size={16} /> : stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div 
                    className={`flex-1 h-1 mx-2 ${
                      stepNumber < step ? 'bg-[#15396c]' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Wizard Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {renderStepContent()}
        </div>
        
        {/* Wizard Actions */}
        <div className="p-4 border-t flex justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 inline-flex items-center"
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </button>
            )}
          </div>
          <div className="space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            
            {step < 5 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-4 py-2 rounded inline-flex items-center ${
                  canProceed() 
                    ? 'bg-[#15396c] text-white hover:bg-[#15396c]/90' 
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
                className="px-4 py-2 bg-[#15396c] text-white rounded hover:bg-[#15396c]/90"
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