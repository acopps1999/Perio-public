import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, BookOpen } from 'lucide-react';

function DiagnosisWizard({ conditions, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedDDS, setSelectedDDS] = useState('');
  const [selectedPatientType, setSelectedPatientType] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [filteredConditions, setFilteredConditions] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [activeResearchTab, setActiveResearchTab] = useState('');
  const [showResearch, setShowResearch] = useState(false);

  // Extract unique categories from conditions
  const categories = [...new Set(conditions.map(condition => condition.category))];

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
    setSelectedDDS('');
    setSelectedPatientType('');
    setSelectedPhase('');
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedDDS('');
    setSelectedPatientType('');
    setSelectedPhase('');
  }, [selectedCondition]);

  useEffect(() => {
    setSelectedPatientType('');
    setSelectedPhase('');
  }, [selectedDDS]);

  useEffect(() => {
    setSelectedPhase('');
  }, [selectedPatientType]);

  // Set recommended products based on selections
  useEffect(() => {
    if (selectedCondition && selectedPhase) {
      const products = selectedCondition.products[selectedPhase] || [];
      
      // Filter products based on patient type if needed
      let filteredProducts = [...products];
      
      // For Type 3/4 Only products
      if (selectedPatientType === '1' || selectedPatientType === '2') {
        filteredProducts = filteredProducts.filter(product => !product.includes('Type 3/4 Only'));
      }
      
      setRecommendedProducts(filteredProducts);
      
      // Set first product as active research tab if products exist
      if (filteredProducts.length > 0) {
        setActiveResearchTab(filteredProducts[0].replace(' (Type 3/4 Only)', ''));
      }
    }
  }, [selectedCondition, selectedPhase, selectedPatientType]);

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
      case 3: return selectedDDS !== '';
      case 4: return selectedPatientType !== '';
      case 5: return selectedPhase !== '';
      default: return true;
    }
  };

  // Reset all selections
  const handleReset = () => {
    setStep(1);
    setSelectedCategory('');
    setSelectedCondition(null);
    setSelectedDDS('');
    setSelectedPatientType('');
    setSelectedPhase('');
    setRecommendedProducts([]);
    setShowResearch(false);
  };

  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setStep(3); // Move to next step
  };

  // Patient types description
  const patientTypeDesc = {
    '1': 'Healthy',
    '2': 'Mild inflammation, moderate risk',
    '3': 'Smoker, diabetic, immunocompromised',
    '4': 'Periodontal disease, chronic illness, poor healing'
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
                  className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                    selectedCategory === category ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className="font-medium text-lg">{category}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {category === 'Surgical' ? 
                      'Procedures involving tissue manipulation or surgery' : 
                      'Conditions affecting the oral soft tissues'
                    }
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
                  className="w-full p-4 text-left hover:bg-blue-50 transition-colors flex justify-between items-center"
                  onClick={() => handleConditionSelect(condition)}
                >
                  <div>
                    <div className="font-medium">{condition.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {condition.dds.join(', ')}
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
            <h2 className="text-xl font-semibold">Step 3: Select Dentist Type</h2>
            <p className="text-gray-600">What type of dental professional is treating the patient?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {selectedCondition.dds.map((dds) => (
                <button
                  key={dds}
                  className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                    selectedDDS === dds ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedDDS(dds);
                    setStep(4);
                  }}
                >
                  <div className="font-medium text-lg">{dds}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {dds === 'General Dentist' && 'Provides comprehensive dental care'}
                    {dds === 'Periodontist' && 'Specializes in gum disease and implants'}
                    {dds === 'Oral Surgeon' && 'Specializes in surgical procedures'}
                    {dds === 'Prosthodontist' && 'Specializes in dental prosthetics'}
                    {dds === 'Hygienist' && 'Focuses on preventive oral care'}
                    {dds === 'Oral Medicine Specialist' && 'Diagnoses and manages oral conditions'}
                    {dds === 'Oral Pathologist' && 'Diagnoses diseases affecting the oral cavity'}
                    {dds === 'Oncologist' && 'Treats cancer-related conditions'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 4: Select Patient Type</h2>
            <p className="text-gray-600">What is the patient's health status?</p>
            <div className="grid grid-cols-1 gap-4 mt-4">
              {Object.entries(patientTypeDesc).map(([type, desc]) => (
                <button
                  key={type}
                  className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                    selectedPatientType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedPatientType(type);
                    setStep(5);
                  }}
                >
                  <div className="font-medium text-lg">Type {type}</div>
                  <div className="text-sm text-gray-600 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 5: Select Treatment Phase</h2>
            <p className="text-gray-600">What phase of treatment is the patient in?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {selectedCondition.phases.map((phase) => (
                <button
                  key={phase}
                  className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                    selectedPhase === phase ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedPhase(phase);
                    setStep(6);
                  }}
                >
                  <div className="font-medium text-lg">{phase} Phase</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {phase.includes('Prep') && 'Preparation before primary treatment'}
                    {(phase === 'Acute' || phase === 'Active Treatment') && 'During or immediately after primary treatment'}
                    {(phase === 'Maintenance' || phase === 'Long-term Management') && 'Ongoing care after primary treatment'}
                    {phase === 'Diagnosis' && 'Initial assessment and diagnosis'}
                    {phase === 'Early' && 'Initial stages of condition'}
                    {phase === 'Established' && 'Fully developed condition'}
                    {phase === 'Intervention' && 'Active intervention for the condition'}
                    {phase === 'Monitoring' && 'Observation and monitoring phase'}
                    {phase === 'Initial Therapy' && 'First-line treatment approach'}
                    {phase === 'Surgical Phase' && 'Surgical intervention period'}
                    {phase === 'Symptomatic Treatment' && 'Managing symptoms of condition'}
                    {phase === 'Prevention' && 'Preventing recurrence or progression'}
                    {phase === 'Pretreatment' && 'Before primary treatment begins'}
                    {phase === 'During Treatment' && 'During active treatment period'}
                    {phase === 'Post-Treatment' && 'After completing treatment'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-green-800">Diagnosis Complete</h2>
              <div className="text-green-700 mt-1">
                Based on your selections, here are the recommended products:
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800">Patient Profile</h3>
              <ul className="mt-2 text-blue-700 space-y-1">
                <li><span className="font-medium">Condition:</span> {selectedCondition.name}</li>
                <li><span className="font-medium">Treating Specialist:</span> {selectedDDS}</li>
                <li><span className="font-medium">Patient Type:</span> Type {selectedPatientType} - {patientTypeDesc[selectedPatientType]}</li>
                <li><span className="font-medium">Treatment Phase:</span> {selectedPhase}</li>
              </ul>
            </div>
            
            <h3 className="text-lg font-medium">Recommended Products</h3>
            {recommendedProducts.length > 0 ? (
              <div className="space-y-4">
                {recommendedProducts.map((product) => {
                  const cleanProductName = product.replace(' (Type 3/4 Only)', '');
                  const productDetails = selectedCondition.productDetails[cleanProductName];
                  
                  return (
                    <div key={product} className="bg-white border rounded-lg p-4 shadow-sm">
                      <h4 className="text-lg font-medium">{product}</h4>
                      {productDetails && (
                        <div className="mt-3 space-y-3">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="font-medium text-gray-700">Usage Instructions:</div>
                            <div className="text-gray-700 mt-1">
                              {typeof productDetails.usage === 'object' ? (
                                productDetails.usage[selectedPhase] ? (
                                  // Show phase-specific instructions if available
                                  <span>{productDetails.usage[selectedPhase]}</span>
                                ) : (
                                  // If not available for current phase, show all phases
                                  <div className="space-y-2">
                                    {Object.entries(productDetails.usage).map(([phase, instruction]) => (
                                      <div key={phase}><strong>{phase} phase:</strong> {instruction}</div>
                                    ))}
                                  </div>
                                )
                              ) : (
                                // For backwards compatibility with string usage
                                productDetails.usage || 'No usage instructions available'
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-medium text-blue-700">Clinical Rationale:</div>
                            <div className="text-blue-700 mt-1">{productDetails.rationale}</div>
                          </div>
                          
                          <div className="bg-purple-50 p-3 rounded">
                            <div className="font-medium text-purple-700">Competitive Advantage:</div>
                            <div className="text-purple-700 mt-1">{productDetails.competitive}</div>
                          </div>
                          
                          <div className="bg-amber-50 p-3 rounded">
                            <div className="font-medium text-amber-700">Handling Objections:</div>
                            <div className="text-amber-700 mt-1">{productDetails.objection}</div>
                          </div>
                          
                          <button
                            className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              setActiveResearchTab(cleanProductName);
                              setShowResearch(true);
                            }}
                          >
                            <BookOpen size={16} className="mr-1" />
                            View supporting research
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  <h4 className="font-medium text-lg text-blue-600 hover:underline cursor-pointer">
                    {item.title}
                  </h4>
                  <p className="text-gray-600 mt-1">{item.author}</p>
                  <p className="mt-3 text-gray-700">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in odio ac nunc efficitur 
                    vestibulum. Maecenas vel ante vel leo dictum eleifend. Suspendisse potenti. Vestibulum ante 
                    ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.
                  </p>
                  <div className="mt-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center">
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t text-right">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
          <h2 className="text-xl font-bold">Diagnosis Wizard</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div 
                  className={`flex items-center justify-center rounded-full w-8 h-8 ${
                    stepNumber === step 
                      ? 'bg-blue-600 text-white' 
                      : stepNumber < step 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {stepNumber < step ? <Check size={16} /> : stepNumber}
                </div>
                {stepNumber < 6 && (
                  <div 
                    className={`flex-1 h-1 mx-2 ${
                      stepNumber < step ? 'bg-green-600' : 'bg-gray-200'
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
            
            {step < 6 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-4 py-2 rounded inline-flex items-center ${
                  canProceed() 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>
            )}
            
            {step === 6 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Research Modal */}
      {renderResearchModal()}
    </div>
  );
}

export default DiagnosisWizard;