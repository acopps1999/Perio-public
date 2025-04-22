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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching conditions data from Supabase...");

    try {
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
      ]);

      // Check for errors during fetch
      const errors = [procError, phaseError, dentistError, ptError, prodError, detailError, ppError, pdError, pptError, pppError].filter(Boolean);
      if (errors.length > 0) {
        console.error("Supabase fetch errors:", errors);
        throw new Error('Failed to fetch data from Supabase. ' + errors.map(e => e.message).join(', '));
      }
      
      console.log("Raw data fetched:", { procedures, phases, dentists, patientTypes, products, productDetails, procPhases, procDentists, procPt, procPhaseProds });

      // Create lookup maps for easier access
      const phaseMap = new Map(phases.map(p => [p.id, p.name]));
      const dentistMap = new Map(dentists.map(d => [d.id, d.name]));
      const patientTypeMap = new Map(patientTypes.map(pt => [pt.id, { name: pt.name }]));
      const productMap = new Map(products.map(p => [p.id, p.name]));
      const productDetailsMap = new Map(productDetails.map(pd => [pd.product_id, pd]));

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
            conditionProductDetails[productName] = {
                usage: details.usage,
                rationale: details.rationale,
                competitive: details.competitive,
                objection: details.objection,
                factSheet: details.fact_sheet,
                // Ensure product_id is not included if not needed
            };
          }
        });

        return {
          id: proc.id, // Keep id for potential admin panel use
          name: proc.name,
          category: proc.category,
          phases: conditionPhases,
          dds: conditionDentists,
          patientType: formatPatientTypes(conditionPatientTypes), // Format patient types
          products: conditionProducts,
          pitchPoints: proc.pitch_points,
          productDetails: conditionProductDetails,
          // Add placeholders for other fields if needed later
          // patientSpecificConfig: {}, // Example if you add this to DB
          // conditionSpecificResearch: {} // Example if you add this to DB
        };
      });

      console.log("Transformed conditions:", transformedConditions);
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

  return { conditions, loading, error, refetch: fetchData };
} 