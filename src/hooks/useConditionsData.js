import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Helper function to transform patient type IDs to string
const formatPatientTypes = (types) => {
  if (!types || types.length === 0) return 'N/A';
  // Assuming types are like 'Type 1', 'Type 2'
  // Sort them numerically based on the number
  const sortedTypes = types.sort((a, b) => {
    const numA = parseInt(a.name.split(' ')[1] || '0', 10);
    const numB = parseInt(b.name.split(' ')[1] || '0', 10);
    return numA - numB;
  });

  // Simple case: List all types if not sequential or not Types 1-4
  if (sortedTypes.length !== 4 || !sortedTypes.every((t, i) => t.name === `Type ${i + 1}`)) {
     return sortedTypes.map(t => t.name).join(', ');
  }

  // Specific case: 'Types 1 to 4'
  return 'Types 1 to 4';
};


export function useConditionsData() {
  const [conditions, setConditions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ddsTypes, setDdsTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching conditions data from Supabase...");

    try {
      // Removed column checking code that was causing errors
      
      // Fetch all necessary data in parallel
      const [ 
        { data: procedures, error: procError }, 
        { data: phases, error: phaseError },
        { data: dentists, error: dentistError },
        { data: patientTypes, error: ptError },
        { data: products, error: prodError },
        { data: productDetails, error: detailError },
        { data: procPhases, error: ppError },
        { data: procDentists, error: pdError },
        { data: procPt, error: pptError },
        { data: procPhaseProds, error: pppError },
        { data: patientSpecificConfigs, error: pscError },
        { data: phaseSpecificUsage, error: psuError },
        { data: researchArticles, error: raError },
        { data: categories, error: catError }
      ] = await Promise.all([
        supabase.from('procedures').select('*'),
        supabase.from('phases').select('*'),
        supabase.from('dentists').select('*'),
        supabase.from('patient_types').select('*'),
        supabase.from('products').select('*'),
        supabase.from('product_details').select('*'),
        supabase.from('procedure_phases').select('*'),
        supabase.from('procedure_dentists').select('*'),
        supabase.from('procedure_patient_types').select('*'),
        supabase.from('procedure_phase_products').select('*'),
        supabase.from('patient_specific_configs').select('*'),
        supabase.from('phase_specific_usage').select('*'),
        supabase.from('research_articles').select('*'),
        supabase.from('categories').select('*')
      ]);

      // Check for errors during fetch
      const errors = [procError, phaseError, dentistError, ptError, prodError, detailError, ppError, pdError, pptError, pppError, pscError, psuError, raError, catError].filter(Boolean);
      if (errors.length > 0) {
        console.error("Supabase fetch errors:", errors);
        throw new Error('Failed to fetch data from Supabase. ' + errors.map(e => e.message).join(', '));
      }
      
      console.log("Raw data fetched:", { procedures, phases, dentists, patientTypes, products, productDetails, procPhases, procDentists, procPt, procPhaseProds, patientSpecificConfigs, phaseSpecificUsage, researchArticles });

      // Create lookup maps for easier access
      const phaseMap = new Map(phases.map(p => [p.id, p.name]));
      const dentistMap = new Map(dentists.map(d => [d.id, d.name]));
      const patientTypeMap = new Map(patientTypes.map(pt => [pt.id, { name: pt.name }]));
      const productMap = new Map(products.map(p => [p.id, p.name]));
      const productDetailsMap = new Map(productDetails.map(pd => [pd.product_id, pd]));

      // Build a map of patient-specific configurations by procedure
      const patientSpecificConfigMap = new Map();
      if (patientSpecificConfigs && patientSpecificConfigs.length > 0) {
        patientSpecificConfigs.forEach(config => {
          const procedureId = config.procedure_id;
          const phaseName = phaseMap.get(config.phase_id);
          const patientTypeName = patientTypeMap.get(config.patient_type_id)?.name;
          
          if (procedureId && phaseName && patientTypeName) {
            if (!patientSpecificConfigMap.has(procedureId)) {
              patientSpecificConfigMap.set(procedureId, {});
            }
            
            const procConfig = patientSpecificConfigMap.get(procedureId);
            if (!procConfig[phaseName]) {
              procConfig[phaseName] = {};
            }
            
            // Convert Type 1 format to just 1 for the key
            const patientTypeKey = patientTypeName.replace('Type ', '');
            procConfig[phaseName][patientTypeKey] = config.config || [];
          }
        });
      }

      // Transform data into the desired structure
      const transformedConditions = procedures.map(proc => {
        // Get related phases
        const relatedPhaseIds = procPhases.filter(pp => pp.procedure_id === proc.id).map(pp => pp.phase_id);
        const conditionPhases = relatedPhaseIds.map(id => phaseMap.get(id)).filter(Boolean);

        // Get related dentists
        const relatedDentistIds = procDentists.filter(pd => pd.procedure_id === proc.id).map(pd => pd.dentist_id);
        const conditionDentists = relatedDentistIds.map(id => dentistMap.get(id)).filter(Boolean);
        
        // Get related patient types
        const relatedPatientTypeIds = procPt.filter(ppt => ppt.procedure_id === proc.id).map(ppt => ppt.patient_type_id);
        const conditionPatientTypes = relatedPatientTypeIds.map(id => patientTypeMap.get(id)).filter(Boolean);

        // Get related products per phase
        const conditionProducts = {};
        const allProductIds = new Set();
        conditionPhases.forEach(phaseName => {
            const phaseId = phases.find(p => p.name === phaseName)?.id;
            if (phaseId) {
                const phaseProductIds = procPhaseProds
                    .filter(ppp => ppp.procedure_id === proc.id && ppp.phase_id === phaseId)
                    .map(ppp => ppp.product_id);
                conditionProducts[phaseName] = phaseProductIds.map(id => {
                    allProductIds.add(id);
                    return productMap.get(id);
                }).filter(Boolean);
            } else {
                conditionProducts[phaseName] = [];
            }
        });

        // Get product details for all products used in this condition
        const conditionProductDetails = {};
        allProductIds.forEach(productId => {
          const productName = productMap.get(productId);
          const details = productDetailsMap.get(productId);
          if (productName && details) {
            // Add detailed logging to see what data we're getting from the database
            console.log(`Raw product detail data for ${productName}:`, details);
            
            // Try to parse the usage field if it's stored as JSON string
            let usageObj = details.usage;
            try {
              if (typeof details.usage === 'string' && details.usage.startsWith('{')) {
                usageObj = JSON.parse(details.usage);
              }
            } catch (e) {
              console.warn(`Failed to parse usage JSON for ${productName}:`, e);
            }
            
            // Get phase-specific usage if available
            if (phaseSpecificUsage && phaseSpecificUsage.length > 0 && typeof usageObj !== 'object') {
              usageObj = {};
              phaseSpecificUsage
                .filter(psu => psu.product_id === productId && psu.procedure_id === proc.id)
                .forEach(psu => {
                  const phaseName = phaseMap.get(psu.phase_id);
                  if (phaseName) {
                    usageObj[phaseName] = psu.instructions;
                  }
                });
              
              // If we didn't find any phase-specific usage, revert to string
              if (Object.keys(usageObj).length === 0) {
                usageObj = details.usage;
              }
            }
            
            // Look up research articles for this product
            const productArticles = researchArticles
              ? researchArticles.filter(ra => ra.product_detail_id === details.id)
              : [];
              
            conditionProductDetails[productName] = {
                usage: usageObj || '',
                scientificRationale: details.scientific_rationale || '',
                competitive: details.competitive || '',
                objection: details.objection || '',
                factSheet: details.fact_sheet || '',
                clinicalEvidence: details.clinical_evidence || '',
                pitchPoints: details.pitch_points || '',
                researchArticles: productArticles.map(a => ({
                  title: a.title || '',
                  author: a.author || '',
                  url: a.url || '',
                  abstract: a.abstract || ''
                }))
            };
            
            // Debug log to verify field mapping
            console.log(`Loaded product ${productName} details:`, {
              rationale: details.rationale ? 'present' : 'empty',
              scientific_rationale: details.scientific_rationale ? 'present' : 'empty',
              scientificRationale: details.scientific_rationale ? 'present' : 'empty', // Field mapping from database
              competitive: details.competitive ? 'present' : 'empty',
              objection: details.objection ? 'present' : 'empty',
              clinical_evidence: details.clinical_evidence ? 'present' : 'empty',
              clinicalEvidence: details.clinical_evidence ? 'present' : 'empty' // Field mapping from database
            });
          }
        });

        // Get patient-specific product configurations
        let patientSpecificConfig = null;
        if (patientSpecificConfigMap.has(proc.id)) {
          patientSpecificConfig = patientSpecificConfigMap.get(proc.id);
        }

        // Special handling for Dry Mouth condition
        if (proc.name === 'Dry Mouth' && conditionPhases.includes('Mild')) {
          patientSpecificConfig = {
            'Mild': {
              'all': [],
              '1': ['AO ProRinse Hydrating'],
              '2': ['Moisyn'],
              '3': ['Moisyn'],
              '4': ['Moisyn', 'AO ProVantage Gel']
            },
            'Moderate': {
              'all': ['Moisyn'],
              '1': ['Moisyn'],
              '2': ['Moisyn'],
              '3': ['Moisyn', 'AO ProVantage Gel'],
              '4': ['Moisyn', 'AO ProVantage Gel']
            },
            'Severe': {
              'all': ['Moisyn'],
              '1': ['Moisyn'],
              '2': ['Moisyn', 'AO ProVantage Gel'],
              '3': ['Moisyn', 'AO ProVantage Gel'],
              '4': ['Moisyn', 'AO ProVantage Gel']
            }
          };
        }

        return {
          id: proc.id, // Keep id for potential admin panel use
          name: proc.name,
          category: proc.category,
          phases: conditionPhases,
          dds: conditionDentists,
          patientType: formatPatientTypes(conditionPatientTypes), // Format patient types
          products: conditionProducts,
          pitchPoints: proc.pitch_points || '',
          // Set default empty values for fields that may not be in the database
          scientificRationale: '', // Default empty value
          clinicalEvidence: '', // Default empty value  
          competitiveAdvantage: '', // Default empty value
          handlingObjections: '', // Default empty value
          productDetails: conditionProductDetails,
          patientSpecificConfig: patientSpecificConfig
        };
      });

      console.log("Transformed conditions:", transformedConditions);

      // Extract and set unique categories from the categories table
      const uniqueCategories = categories ? categories.map(cat => cat.name) : [];
      console.log("Categories from Supabase:", uniqueCategories);

      // Fallback: if no categories table or no categories in it, extract from procedures
      if (uniqueCategories.length === 0) {
        const fromProcedures = new Set(procedures.map(proc => proc.category).filter(Boolean));
        console.log("Categories extracted from procedures:", [...fromProcedures]);
        uniqueCategories.push(...fromProcedures);
      }

      // Ensure "All" is included and at the beginning
      if (!uniqueCategories.includes('All')) {
        uniqueCategories.unshift('All');
      } else {
        // Move "All" to the beginning if it exists elsewhere in the array
        const allIndex = uniqueCategories.indexOf('All');
        if (allIndex > 0) {
          uniqueCategories.splice(allIndex, 1);
          uniqueCategories.unshift('All');
        }
      }

      setCategories(uniqueCategories);
      
      // Extract and set unique DDS types from dentists table
      const uniqueDdsTypes = dentists.map(d => d.name);
      console.log("DDS Types from Supabase:", uniqueDdsTypes);

      // Ensure "All" is included and at the beginning
      if (!uniqueDdsTypes.includes('All')) {
        uniqueDdsTypes.unshift('All');
      } else {
        // Move "All" to the beginning if it exists elsewhere in the array
        const allIndex = uniqueDdsTypes.indexOf('All');
        if (allIndex > 0) {
          uniqueDdsTypes.splice(allIndex, 1);
          uniqueDdsTypes.unshift('All');
        }
      }

      setDdsTypes(uniqueDdsTypes);
      
      setConditions(transformedConditions);

    } catch (err) {
      console.error("Error fetching or processing conditions data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { conditions, categories, ddsTypes, loading, error, refetch: fetchData };
} 