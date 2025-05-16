import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Save, Plus, Edit, Trash2, X, ChevronDown, Info, AlertTriangle, Lock, Check, User, Filter, AlertCircle, Settings } from 'lucide-react';
import clsx from 'clsx';
import DataImportExport from './DataImportExport';
import { useToast } from './ToastContext';
import { supabase } from '../supabaseClient';

// Patient Types definition
const PATIENT_TYPES = {
  'all': 'All Patient Types',
  '1': 'Type 1: Healthy',
  '2': 'Type 2: Mild inflammation, moderate risk',
  '3': 'Type 3: Smoker, diabetic, immunocompromised',
  '4': 'Type 4: Periodontal disease, chronic illness, poor healing'
};

// Function for saving data to backend (updated to use Supabase)
const saveToBackend = async (data, categoriesList, ddsTypesList, productsList) => {
  try {
    console.log('Saving data to Supabase and localStorage...');
    console.log('Data to save:', data.length, 'conditions');
    
    // For development/fallback - continue saving to localStorage
      localStorage.setItem('conditions_data', JSON.stringify(data));
      localStorage.setItem('categories_data', JSON.stringify(categoriesList));
      localStorage.setItem('dds_types_data', JSON.stringify(ddsTypesList));
      localStorage.setItem('products_data', JSON.stringify(productsList));
      
    // Check if Supabase is configured
    if (!supabase || !process.env.REACT_APP_SUPABASE_URL) {
      console.warn('Supabase not configured. Data saved to localStorage only.');
      console.log('Supabase client:', supabase ? 'exists' : 'missing');
      console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL || 'missing');
      console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'exists' : 'missing');
      return { success: true, source: 'localStorage' };
    }

    console.log('Supabase configured. Attempting to save data...');
    
    // Transform data to match Supabase schema
    // This is a complex operation that requires mapping from the flat structure to the relational DB structure
    // We'll start by extracting unique entities and then creating the relationships
    
    // Reset all existing data (warning: this is a destructive operation)
    // In a production app, you might want a more careful migration approach
    
    // 1. Clear existing tables (in reverse order of foreign key dependencies)
    console.log('Clearing existing data from tables...');
    // Temporarily disabling the deletion of existing data to avoid primary key conflicts
    // Instead, we'll use UPSERT operations whenever possible
    /*
    await supabase.from('procedure_phase_products').delete().neq('procedure_id', -999);
    await supabase.from('product_details').delete().neq('product_id', -999);
    await supabase.from('procedure_patient_types').delete().neq('procedure_id', -999);
    await supabase.from('procedure_dentists').delete().neq('procedure_id', -999);
    await supabase.from('procedure_phases').delete().neq('procedure_id', -999);
    await supabase.from('procedures').delete().neq('id', -999);
    await supabase.from('phases').delete().neq('id', -999);
    await supabase.from('dentists').delete().neq('id', -999);
    await supabase.from('patient_types').delete().neq('id', -999);
    await supabase.from('products').delete().neq('id', -999);
    */
    
    console.log('Inserting phases...');
    // 2. Insert phases
    const allPhases = new Set();
    data.forEach(condition => {
      condition.phases.forEach(phase => allPhases.add(phase));
    });
    
    const phaseInserts = Array.from(allPhases).map(phase => ({ name: phase }));
    console.log('Phases to insert:', phaseInserts);
    const { data: phasesData, error: phasesError } = await supabase.from('phases')
      .upsert(phaseInserts, { onConflict: 'name' })
      .select();
    if (phasesError) {
      console.error('Error inserting phases:', phasesError);
      throw new Error(`Error inserting phases: ${phasesError.message}`);
    }
    console.log('Phases inserted:', phasesData);
    
    // Load all phases to get their IDs (in case some already existed)
    const { data: allPhasesData } = await supabase.from('phases').select('*');
    
    // Create a map of phase name to ID
    const phaseMap = {};
    allPhasesData.forEach(phase => {
      phaseMap[phase.name] = phase.id;
    });
    console.log('Phase map:', phaseMap);
    
    // 3. Insert dentists
    console.log('Inserting dentists...');
    const { data: dentistsData, error: dentistsError } = await supabase.from('dentists')
      .upsert(ddsTypesList.map(dds => ({ name: dds })), { onConflict: 'name' })
      .select();
    if (dentistsError) {
      console.error('Error inserting dentists:', dentistsError);
      throw new Error(`Error inserting dentists: ${dentistsError.message}`);
    }
    console.log('Dentists inserted:', dentistsData);
    
    // Load all dentists to get their IDs
    const { data: allDentistsData } = await supabase.from('dentists').select('*');
    
    // Create a map of dentist name to ID
    const dentistMap = {};
    allDentistsData.forEach(dentist => {
      dentistMap[dentist.name] = dentist.id;
    });
    console.log('Dentist map:', dentistMap);
    
    // 4. Insert patient types
    console.log('Inserting patient types...');
    const patientTypesToInsert = [
      { name: 'Type 1' },
      { name: 'Type 2' },
      { name: 'Type 3' },
      { name: 'Type 4' }
    ];
    const { data: patientTypesData, error: patientTypesError } = await supabase.from('patient_types')
      .upsert(patientTypesToInsert, { onConflict: 'name' })
      .select();
    if (patientTypesError) {
      console.error('Error inserting patient types:', patientTypesError);
      throw new Error(`Error inserting patient types: ${patientTypesError.message}`);
    }
    console.log('Patient types inserted:', patientTypesData);
    
    // Load all patient types to get their IDs
    const { data: allPatientTypesData } = await supabase.from('patient_types').select('*');
    
    // Create a map of patient type name to ID
    const patientTypeMap = {};
    allPatientTypesData.forEach(pt => {
      patientTypeMap[pt.name] = pt.id;
    });
    console.log('Patient type map:', patientTypeMap);
    
    // 5. Insert products
    console.log('Inserting products...');
    const { data: productsData, error: productsError } = await supabase.from('products')
      .upsert(productsList.map(product => ({ name: product })), { onConflict: 'name' })
      .select();
    if (productsError) {
      console.error('Error inserting products:', productsError);
      throw new Error(`Error inserting products: ${productsError.message}`);
    }
    console.log('Products inserted:', productsData);
    
    // Load all products to get their IDs
    const { data: allProductsData } = await supabase.from('products').select('*');
    
    // Create a map of product name to ID
    const productMap = {};
    allProductsData.forEach(product => {
      productMap[product.name] = product.id;
    });
    console.log('Product map:', productMap);
    
    // 6. Insert procedures (conditions)
    console.log('Inserting procedures...');
    
    // First, ensure all categories exist in the categories table
    console.log('Ensuring all categories exist...');
    const { data: categoriesData, error: categoriesError } = await supabase.from('categories')
      .upsert(categoriesList.filter(c => c !== 'All').map(category => ({ name: category })), { onConflict: 'name' })
      .select();
    if (categoriesError) {
      console.error('Error inserting categories:', categoriesError);
      throw new Error(`Error inserting categories: ${categoriesError.message}`);
    }
    console.log('Categories inserted/updated:', categoriesData);
    
    // Create a map of category name to ID
    const categoryMap = {};
    categoriesData.forEach(category => {
      categoryMap[category.name] = category.id;
    });
    console.log('Category map:', categoryMap);
    
    // Ensure all DDS types exist
    console.log('Ensuring all DDS types exist...');
    const { data: updatedDdsTypes, error: ddsTypesError } = await supabase.from('dentists')
      .upsert(ddsTypesList.filter(d => d !== 'All').map(ddsType => ({ name: ddsType })), { onConflict: 'name' })
      .select();
    if (ddsTypesError) {
      console.error('Error inserting DDS types:', ddsTypesError);
      throw new Error(`Error inserting DDS types: ${ddsTypesError.message}`);
    }
    console.log('DDS types inserted/updated:', updatedDdsTypes);
    
    // Create a map of DDS type name to ID
    const ddsTypeMap = {};
    updatedDdsTypes.forEach(dds => {
      ddsTypeMap[dds.name] = dds.id;
    });
    console.log('DDS type map:', ddsTypeMap);
    
    // Now insert procedures with category_id
    const { data: proceduresData, error: proceduresError } = await supabase.from('procedures')
      .upsert(data.map(condition => ({
        name: condition.name,
        category: condition.category || '',
        category_id: condition.category && condition.category !== 'All' ? 
          categoryMap[condition.category] : null, // Use the category_id from our map
        pitch_points: condition.pitchPoints || ''
        // Removed fields that don't exist in the database:
        // scientific_rationale, clinical_evidence, competitive_advantage, handling_objections
      })), { onConflict: 'name' })
      .select();
    if (proceduresError) {
      console.error('Error inserting procedures:', proceduresError);
      throw new Error(`Error inserting procedures: ${proceduresError.message}`);
    }
    console.log('Procedures inserted:', proceduresData);
    
    // Load all procedures to get their IDs
    const { data: allProceduresData } = await supabase.from('procedures').select('*');
    
    // Create a map of procedure name to ID
    const procedureMap = {};
    allProceduresData.forEach(proc => {
      procedureMap[proc.name] = proc.id;
    });
    console.log('Procedure map:', procedureMap);
    
    // 7. Insert product details
    console.log('Inserting product details...');
    const productDetailsMap = new Map(); // Use a Map to deduplicate by product_id
    
    data.forEach(condition => {
      if (condition.productDetails) {
        Object.entries(condition.productDetails).forEach(([productName, details]) => {
          const productId = productMap[productName];
          if (productId) {
            // Only store non-phase-specific usage in the main usage field
            let usageText = '';
            if (typeof details.usage === 'string') {
              usageText = details.usage;
            }
            
            // Create detail object with all fields explicitly mapped to match database column names
            const productDetail = {
              product_id: productId,
              usage: usageText,
              scientific_rationale: details.scientificRationale || '',
              competitive: details.competitive || '',
              objection: details.objection || '',
              fact_sheet: details.factSheet || '',
              clinical_evidence: details.clinicalEvidence || '',
              pitch_points: details.pitchPoints || ''
            };
            
            console.log(`Adding product details for ${productName} (ID: ${productId}):`, productDetail);
            
            // Use the Map to deduplicate - if a product already exists, use the new values
            productDetailsMap.set(productId, productDetail);
          }
        });
      }
    });
    
    // Convert Map to array for insertion
    const productDetailsInserts = Array.from(productDetailsMap.values());
    
    // Use upsert to avoid duplicates
    if (productDetailsInserts.length > 0) {
      console.log('Product details to insert:', productDetailsInserts.length);
      for (const detail of productDetailsInserts) {
        console.log(`Full product ${detail.product_id} details:`, {
          product_id: detail.product_id,
          usage: detail.usage ? (detail.usage.length > 20 ? detail.usage.substring(0, 20) + '...' : detail.usage) : 'empty',
          rationale: detail.rationale ? (detail.rationale.length > 20 ? detail.rationale.substring(0, 20) + '...' : detail.rationale) : 'empty',
          scientific_rationale: detail.scientific_rationale ? (detail.scientific_rationale.length > 20 ? detail.scientific_rationale.substring(0, 20) + '...' : detail.scientific_rationale) : 'empty',
          competitive: detail.competitive ? (detail.competitive.length > 20 ? detail.competitive.substring(0, 20) + '...' : detail.competitive) : 'empty',
          clinical_evidence: detail.clinical_evidence ? (detail.clinical_evidence.length > 20 ? detail.clinical_evidence.substring(0, 20) + '...' : detail.clinical_evidence) : 'empty', 
          objection: detail.objection ? (detail.objection.length > 20 ? detail.objection.substring(0, 20) + '...' : detail.objection) : 'empty',
          fact_sheet: detail.fact_sheet ? (detail.fact_sheet.length > 20 ? detail.fact_sheet.substring(0, 20) + '...' : detail.fact_sheet) : 'empty'
        });
      }
      
      console.log('About to upsert product details to Supabase');
      
      try {
        // Perform the upsert operation with explicit field names
        const { data: upsertResults, error: detailsError } = await supabase
          .from('product_details')
          .upsert(productDetailsInserts, { 
            onConflict: 'product_id',
            ignoreDuplicates: false, // Use update instead of ignoring
            returning: 'minimal'
          });
          
        console.log('Upsert results:', upsertResults ? 'Success' : 'No data returned');
          
        if (detailsError) {
          console.error('Error inserting product details:', detailsError);
          throw new Error(`Error inserting product details: ${detailsError.message}`);
        }
        console.log('Product details inserted successfully');
      } catch (error) {
        console.error('Exception during product details upsert:', error);
        throw error;
      }
    }
    
    // Before inserting junction table records, delete existing ones to avoid duplicates
    // These are relationship tables, so it's safer to recreate them than to try to upsert
    
    // Clear existing procedure-phase relationships
    await supabase.from('procedure_phases').delete().not('procedure_id', 'is', null);
    
    // 8. Insert procedure-phase relationships
    console.log('Inserting procedure-phase relationships...');
    const procedurePhasesInserts = [];
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      condition.phases.forEach(phase => {
        const phaseId = phaseMap[phase];
        if (procedureId && phaseId) {
          procedurePhasesInserts.push({
            procedure_id: procedureId,
            phase_id: phaseId
          });
        }
      });
    });
    
    if (procedurePhasesInserts.length > 0) {
      console.log('Procedure-phase relationships to insert:', procedurePhasesInserts.length);
      const { error: ppError } = await supabase.from('procedure_phases').insert(procedurePhasesInserts);
      if (ppError) {
        console.error('Error inserting procedure phases:', ppError);
        throw new Error(`Error inserting procedure phases: ${ppError.message}`);
      }
      console.log('Procedure-phase relationships inserted successfully');
    }
    
    // Clear existing procedure-dentist relationships
    await supabase.from('procedure_dentists').delete().not('procedure_id', 'is', null);
    
    // 9. Insert procedure-dentist relationships
    console.log('Inserting procedure-dentist relationships...');
    const procedureDentistsInserts = [];
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      // Filter out the 'All' DDS type and only include valid dentist IDs
      const validDdsTypes = condition.dds.filter(dds => dds !== 'All' && ddsTypeMap[dds]);
      
      validDdsTypes.forEach(dds => {
        const dentistId = ddsTypeMap[dds];
        if (procedureId && dentistId) {
          procedureDentistsInserts.push({
            procedure_id: procedureId,
            dentist_id: dentistId
          });
        }
      });
    });
    
    if (procedureDentistsInserts.length > 0) {
      console.log('Procedure-dentist relationships to insert:', procedureDentistsInserts.length);
      const { error: pdError } = await supabase.from('procedure_dentists').insert(procedureDentistsInserts);
      if (pdError) {
        console.error('Error inserting procedure dentists:', pdError);
        throw new Error(`Error inserting procedure dentists: ${pdError.message}`);
      }
      console.log('Procedure-dentist relationships inserted successfully');
    }
    
    // Clear existing procedure-patient type relationships
    await supabase.from('procedure_patient_types').delete().not('procedure_id', 'is', null);
    
    // 10. Insert procedure-patient type relationships
    console.log('Inserting procedure-patient type relationships...');
    const procedurePatientTypesInserts = [];
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      // Parse patient type from the string format
      const patientTypeString = condition.patientType;
      if (patientTypeString && patientTypeString.includes('Types')) {
        // Format like "Types 1 to 4" or "Types 3 to 4"
        const parts = patientTypeString.match(/Types (\d+) to (\d+)/);
        if (parts && parts.length === 3) {
          const start = parseInt(parts[1]);
          const end = parseInt(parts[2]);
          for (let i = start; i <= end; i++) {
            const patientTypeId = patientTypeMap[`Type ${i}`];
            if (procedureId && patientTypeId) {
              procedurePatientTypesInserts.push({
                procedure_id: procedureId,
                patient_type_id: patientTypeId
              });
            }
          }
        }
      }
    });
    
    if (procedurePatientTypesInserts.length > 0) {
      console.log('Procedure-patient type relationships to insert:', procedurePatientTypesInserts.length);
      const { error: pptError } = await supabase.from('procedure_patient_types').insert(procedurePatientTypesInserts);
      if (pptError) {
        console.error('Error inserting procedure patient types:', pptError);
        throw new Error(`Error inserting procedure patient types: ${pptError.message}`);
      }
      console.log('Procedure-patient type relationships inserted successfully');
    }
    
    // Clear existing procedure-phase-product relationships
    await supabase.from('procedure_phase_products').delete().not('procedure_id', 'is', null);
    
    // 11. Insert procedure-phase-product relationships
    console.log('Inserting procedure-phase-product relationships...');
    const procedurePhaseProductsInserts = [];
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      
      // Ensure condition.products is defined
      if (procedureId && condition.products) {
        // For each phase in the condition
        Object.entries(condition.products).forEach(([phaseName, products]) => {
          const phaseId = phaseMap[phaseName];
          
          if (phaseId) {
            // For each product in this phase
            products.forEach(productName => {
              // Handle Type 3/4 only suffix
              let cleanProductName = productName;
              if (productName.includes('(Type 3/4 Only)')) {
                cleanProductName = productName.replace(' (Type 3/4 Only)', '');
              }
              
              const productId = productMap[cleanProductName];
              
              // Add debug logging
              if (!productId) {
                console.log(`Warning: No product ID found for product '${cleanProductName}' in phase '${phaseName}'. Available products:`, 
                  Object.keys(productMap).join(', '));
              }
              
              if (procedureId && phaseId && productId) {
                console.log(`Adding procedure-phase-product relationship: procedure=${condition.name}, phase=${phaseName}, product=${cleanProductName}`);
                procedurePhaseProductsInserts.push({
                  procedure_id: procedureId,
                  phase_id: phaseId,
                  product_id: productId
                });
              }
            });
          } else {
            console.log(`Warning: No phase ID found for phase '${phaseName}' in condition '${condition.name}'`);
          }
        });
      } else {
        console.log(`Warning: condition.products missing or procedureId not found for condition ${condition.name}`);
      }
    });
    
    if (procedurePhaseProductsInserts.length > 0) {
      console.log('Procedure-phase-product relationships to insert:', procedurePhaseProductsInserts.length);
      const { error: pppError } = await supabase.from('procedure_phase_products').insert(procedurePhaseProductsInserts);
      if (pppError) {
        console.error('Error inserting procedure phase products:', pppError);
        throw new Error(`Error inserting procedure phase products: ${pppError.message}`);
      }
      console.log('Procedure-phase-product relationships inserted successfully');
    } else {
      console.log('No procedure-phase-product relationships to insert');
    }
    
    // 12. Save patient-specific product configurations
    console.log('Saving patient-specific product configurations...');
    const patientSpecificConfigInserts = [];
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      
      // Skip if the procedure doesn't exist or doesn't have patient-specific configs
      if (!procedureId || !condition.patientSpecificConfig) {
        return;
      }
      
      const configByPhase = condition.patientSpecificConfig;
      Object.entries(configByPhase).forEach(([phaseName, patientTypeConfigs]) => {
        const phaseId = phaseMap[phaseName];
        if (!phaseId) return;
        
        Object.entries(patientTypeConfigs).forEach(([patientType, products]) => {
          // Skip 'all' because it's inferred from the individual types
          if (patientType === 'all') return;
          
          // Convert '1' to 'Type 1' for lookup
          const patientTypeText = `Type ${patientType}`;
          const patientTypeId = patientTypeMap[patientTypeText];
          if (!patientTypeId) return;
          
          patientSpecificConfigInserts.push({
            procedure_id: procedureId,
            phase_id: phaseId,
            patient_type_id: patientTypeId,
            config: products
          });
        });
      });
    });
    
    // First, clear existing patient-specific configs for these procedures
    if (patientSpecificConfigInserts.length > 0) {
      // Get all procedure IDs we're updating
      const procedureIds = [...new Set(patientSpecificConfigInserts.map(p => p.procedure_id))];
      await supabase.from('patient_specific_configs')
        .delete()
        .in('procedure_id', procedureIds);
        
      console.log('Patient-specific configs to insert:', patientSpecificConfigInserts.length);
      const { error: pscError } = await supabase.from('patient_specific_configs').insert(patientSpecificConfigInserts);
      if (pscError) {
        console.error('Error inserting patient-specific configs:', pscError);
        throw new Error(`Error inserting patient-specific configs: ${pscError.message}`);
      }
      console.log('Patient-specific configs inserted successfully');
    }
    
    // Add this after handling product details:

    // 8. Insert phase-specific product usage instructions
    console.log('Inserting phase-specific usage instructions...');
    const phaseSpecificUsageInserts = [];
    
    data.forEach(condition => {
      const procedureId = procedureMap[condition.name];
      
      if (condition.productDetails) {
        Object.entries(condition.productDetails).forEach(([productName, details]) => {
          const productId = productMap[productName];
          
          if (productId && details.usage && typeof details.usage === 'object') {
            // Handle phase-specific usage
            Object.entries(details.usage).forEach(([phaseName, instructions]) => {
              const phaseId = phaseMap[phaseName];
              
              if (phaseId && instructions) {
                phaseSpecificUsageInserts.push({
                  product_id: productId,
                  procedure_id: procedureId,
                  phase_id: phaseId,
                  instructions: instructions
                });
              }
            });
          }
        });
      }
    });
    
    // Clear existing phase-specific usage instructions before inserting new ones
    if (phaseSpecificUsageInserts.length > 0) {
      // Get all product IDs we're updating
      const productIds = [...new Set(phaseSpecificUsageInserts.map(p => p.product_id))];
      await supabase.from('phase_specific_usage')
        .delete()
        .in('product_id', productIds);
      
      console.log('Phase-specific usage instructions to insert:', phaseSpecificUsageInserts.length);
      const { error: psuError } = await supabase.from('phase_specific_usage').insert(phaseSpecificUsageInserts);
      if (psuError) {
        console.error('Error inserting phase-specific usage instructions:', psuError);
        throw new Error(`Error inserting phase-specific usage instructions: ${psuError.message}`);
      }
      console.log('Phase-specific usage instructions inserted successfully');
    }
    
    // Add the following after the product details are inserted:

    // 8. Insert research articles
    console.log('Inserting research articles...');
    
    // First, get all product detail IDs
    const { data: productDetailIds, error: pdError } = await supabase
      .from('product_details')
      .select('id, product_id');
      
    if (pdError) {
      console.error('Error fetching product detail IDs:', pdError);
      throw new Error(`Error fetching product detail IDs: ${pdError.message}`);
    }
    
    // Create a map of product_id to product_detail_id
    const productIdToDetailId = {};
    productDetailIds.forEach(pd => {
      productIdToDetailId[pd.product_id] = pd.id;
    });
    
    const researchArticlesInserts = [];
    
    data.forEach(condition => {
      if (condition.productDetails) {
        Object.entries(condition.productDetails).forEach(([productName, details]) => {
          const productId = productMap[productName];
          const productDetailId = productIdToDetailId[productId];
          
          if (productDetailId && details.researchArticles && Array.isArray(details.researchArticles)) {
            details.researchArticles.forEach(article => {
              if (article.title) {
                researchArticlesInserts.push({
                  product_detail_id: productDetailId,
                  title: article.title || '',
                  author: article.author || '',
                  url: article.url || '',
                  abstract: article.abstract || ''
                });
              }
            });
          }
        });
      }
    });
    
    // Clear existing research articles before inserting new ones
    if (researchArticlesInserts.length > 0) {
      // Get all product_detail_ids we're updating
      const productDetailIdsToUpdate = [...new Set(researchArticlesInserts.map(p => p.product_detail_id))];
      await supabase.from('research_articles')
        .delete()
        .in('product_detail_id', productDetailIdsToUpdate);
      
      console.log('Research articles to insert:', researchArticlesInserts.length);
      const { error: raError } = await supabase.from('research_articles').insert(researchArticlesInserts);
      if (raError) {
        console.error('Error inserting research articles:', raError);
        throw new Error(`Error inserting research articles: ${raError.message}`);
      }
      console.log('Research articles inserted successfully');
    }
    
    console.log('All data saved successfully to Supabase!');
    return { success: true, source: 'supabase' };
  } catch (error) {
    console.error('Error saving to backend:', error);
    // Try to fall back to localStorage
    try {
      localStorage.setItem('conditions_data', JSON.stringify(data));
      localStorage.setItem('categories_data', JSON.stringify(categoriesList));
      localStorage.setItem('dds_types_data', JSON.stringify(ddsTypesList));
      localStorage.setItem('products_data', JSON.stringify(productsList));
      return { success: true, source: 'localStorage', error: error.message };
    } catch (localError) {
      return { success: false, error: error.message + '; ' + localError.message };
    }
  }
};

function AdminPanel({ conditions, onConditionsUpdate, onClose }) {
  // State management
  const [editedConditions, setEditedConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [activeEditTab, setActiveEditTab] = useState('conditions');
  const [confirmSaveChanges, setConfirmSaveChanges] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ type: '', item: '' });
  const [activePatientType, setActivePatientType] = useState('all');
  const [newItemType, setNewItemType] = useState(null);
  const [newItemData, setNewItemData] = useState({});
  const [categories, setCategories] = useState([]);
  const [ddsTypes, setDdsTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [productsModified, setProductsModified] = useState(false); // Track if user has modified products
  const toast = useToast(); // Add this line to get the toast functions
  
  // Patient-specific products configuration
  const [patientSpecificProducts, setPatientSpecificProducts] = useState({});
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  
  // Initialize data
  useEffect(() => {
    if (conditions) {
      const processedConditions = conditions.map(condition => {
        // Special handling for Dry Mouth to ensure it always has correct config
        if (condition.name === 'Dry Mouth' && 
            Array.isArray(condition.phases) && 
            condition.phases.includes('Mild')) {
          
          // Set the correct patientSpecificConfig
          const dryMouthConfig = {
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
          
          return {
            ...condition,
            patientSpecificConfig: dryMouthConfig
          };
        }
        
        return condition;
      });
      
      setEditedConditions([...processedConditions]);
      
      // Try to load saved categories, DDS types, and products from localStorage first
      const savedCategories = localStorage.getItem('categories_data');
      const savedDdsTypes = localStorage.getItem('dds_types_data');
      const savedProducts = localStorage.getItem('products_data');
      
      let categoriesFromStorage = [];
      let ddsTypesFromStorage = [];
      let productsFromStorage = [];
      
      // Parse saved categories if available
      if (savedCategories) {
        try {
          categoriesFromStorage = JSON.parse(savedCategories);
          if (!Array.isArray(categoriesFromStorage)) {
            categoriesFromStorage = [];
          }
        } catch (e) {
          console.error('Error parsing saved categories:', e);
        }
      }
      
      // Parse saved DDS types if available
      if (savedDdsTypes) {
        try {
          ddsTypesFromStorage = JSON.parse(savedDdsTypes);
          if (!Array.isArray(ddsTypesFromStorage)) {
            ddsTypesFromStorage = [];
          }
        } catch (e) {
          console.error('Error parsing saved DDS types:', e);
        }
      }
      
      // Parse saved products if available
      if (savedProducts) {
        try {
          productsFromStorage = JSON.parse(savedProducts);
          if (!Array.isArray(productsFromStorage)) {
            productsFromStorage = [];
          }
        } catch (e) {
          console.error('Error parsing saved products:', e);
        }
      }
      
      // Extract unique categories from conditions
      const uniqueCategories = [...new Set(conditions.map(c => c.category))];
      
      // Extract unique DDS types from conditions
      const allDdsTypes = [];
      conditions.forEach(condition => {
        condition.dds.forEach(dds => {
          if (!allDdsTypes.includes(dds)) {
            allDdsTypes.push(dds);
          }
        });
      });
      
      // Extract all products from conditions
      const productsSet = new Set();
      conditions.forEach(condition => {
        if (condition.productDetails) {
          Object.keys(condition.productDetails).forEach(product => {
            productsSet.add(product);
          });
        }
      });
      const productsFromConditions = Array.from(productsSet);
      
      // Merge saved categories with ones from conditions and remove duplicates
      const mergedCategories = [...new Set([...categoriesFromStorage, ...uniqueCategories])];
      
      // Merge saved DDS types with ones from conditions and remove duplicates
      const mergedDdsTypes = [...new Set([...ddsTypesFromStorage, ...allDdsTypes])];
      
      // Merge saved products with ones from conditions and remove duplicates
      const mergedProducts = [...new Set([...productsFromStorage, ...productsFromConditions])];
      
      // Set the merged lists
      setCategories(mergedCategories);
      setDdsTypes(mergedDdsTypes);
      setProducts(mergedProducts);
      
      // Select first condition by default
      if (conditions.length > 0 && !selectedCondition) {
        setSelectedCondition(conditions[0]);
        
        // Initialize patient-specific product configuration
        const firstCondition = conditions[0];
        initializePatientSpecificProducts(firstCondition);
      }
      
      // Migrate string usage values to phase-specific objects
      const migratedConditions = conditions.map(originalCond => {
        let condition = { ...originalCond }; // Work on a mutable copy

        // START: Inserted transformation for scientific_rationale
        if (condition.productDetails) {
          const transformedProductDetails = Object.entries(condition.productDetails)
            .reduce((acc, [productName, details]) => {
              const newDetails = { ...details };
              // Check if details is not null and the fields exist as expected
              if (newDetails && typeof newDetails.scientific_rationale === 'string' && typeof newDetails.scientificRationale === 'undefined') {
                console.log(`AdminPanel: Normalizing scientific_rationale to scientificRationale for product "${productName}" in condition "${condition.name}". This should ideally be fixed in the data fetching layer.`);
                newDetails.scientificRationale = newDetails.scientific_rationale;
                delete newDetails.scientific_rationale; // Clean up the old key
              }
              acc[productName] = newDetails;
              return acc;
            }, {});
          condition = { ...condition, productDetails: transformedProductDetails };
        }
        // END: Inserted transformation

        // Original usage migration logic (now operates on 'condition' which has potentially transformed productDetails)
        if (condition.productDetails) {
          const updatedProductDetails = { ...condition.productDetails };
          
          Object.keys(updatedProductDetails).forEach(productName => {
            // Check if usage is a string and convert it to an object with phase entries
            if (updatedProductDetails[productName] && updatedProductDetails[productName].usage && 
                typeof updatedProductDetails[productName].usage === 'string') {
              const allPhasesUsage = {};
              
              // Create entries for each phase with the same value
              if (condition.phases && condition.phases.length > 0) {
                condition.phases.forEach(phase => {
                  allPhasesUsage[phase] = updatedProductDetails[productName].usage;
                });
                
                // Update the usage field to be the object
                updatedProductDetails[productName].usage = allPhasesUsage;
              }
            }
          });
          
          return {
            ...condition, // Return the condition that includes the scientificRationale fix
            productDetails: updatedProductDetails // and migrated usage
          };
        }
        
        return condition; // Return condition as is if no productDetails or no usage migration needed
      });
      
      setEditedConditions(migratedConditions);
      
      // If we already selected a condition, update it too
      if (selectedCondition) {
        const updatedSelectedCondition = migratedConditions.find(
          c => c.name === selectedCondition.name
        );
        if (updatedSelectedCondition) {
          setSelectedCondition(updatedSelectedCondition);
        }
      }
    }
  }, [conditions]);

  // Initialize patient-specific products when a condition is selected
  useEffect(() => {
    if (selectedCondition) {
      console.log("Handling selection of condition:", selectedCondition.name);
      
      // Only initialize if there are no patient-specific products, 
      // they don't match the current condition's structure,
      // and user hasn't modified products
      if ((!patientSpecificProducts || 
          Object.keys(patientSpecificProducts).length === 0 || 
          !selectedCondition.phases.every(phase => phase in patientSpecificProducts)) &&
          !productsModified) {
        console.log("Initializing patient-specific products for condition:", selectedCondition.name);
        initializePatientSpecificProducts(selectedCondition);
      } else {
        console.log("Skipping initialization, patient-specific products already exist or user modified them");
      }
      
      // Now ensure that this condition's products object is kept in sync with patientSpecificProducts
      // This is important for new conditions where products might not be initialized properly
      if (selectedCondition.products && Object.keys(selectedCondition.products).length > 0) {
        console.log("Condition already has products defined:", selectedCondition.products);
      } else {
        console.log("Condition has no products defined, initializing from patientSpecificProducts if available");
        // If we have patientSpecificProducts but no products in condition, initialize products from patientSpecificProducts
        if (patientSpecificProducts && Object.keys(patientSpecificProducts).length > 0) {
          const updatedProducts = {};
          
          Object.entries(patientSpecificProducts).forEach(([phase, patientTypes]) => {
            updatedProducts[phase] = [];
            
            Object.entries(patientTypes).forEach(([patientType, products]) => {
              if (patientType !== 'all') {
                products.forEach(product => {
                  if (!updatedProducts[phase].includes(product)) {
                    updatedProducts[phase].push(product);
                  }
                });
              }
            });
          });
          
          // Update condition with these products
          updateConditionField(selectedCondition.name, 'products', updatedProducts);
          console.log("Initialized condition products from patientSpecificProducts:", updatedProducts);
        }
      }
    }
  }, [selectedCondition, productsModified]);

  // Initialize patient-specific products for a condition
  const initializePatientSpecificProducts = (condition) => {
    if (!condition) return;
    
    // If the condition already has a patient-specific configuration, use it
    if (condition.patientSpecificConfig) {
      const config = JSON.parse(JSON.stringify(condition.patientSpecificConfig));
      
      // Ensure all phases and patient types are properly initialized
      condition.phases.forEach(phase => {
        if (!config[phase]) {
          config[phase] = {
            'all': [],
            '1': [],
            '2': [],
            '3': [],
            '4': []
          };
        } else {
          // Make sure all patient types exist
          if (!config[phase]['all']) config[phase]['all'] = [];
          if (!config[phase]['1']) config[phase]['1'] = [];
          if (!config[phase]['2']) config[phase]['2'] = [];
          if (!config[phase]['3']) config[phase]['3'] = [];
          if (!config[phase]['4']) config[phase]['4'] = [];
        }
      });
      
      setPatientSpecificProducts(config);
      return;
    }
    
    // Otherwise create a new configuration
    const patientProducts = {};
    
    // For each phase
    condition.phases.forEach(phase => {
      patientProducts[phase] = {
        'all': [],
        '1': [],
        '2': [],
        '3': [],
        '4': []
      };
      
      // Analyze existing products to determine patient-specific assignments
      const allProducts = condition.products?.[phase] || [];
      
      // Process regular products (for all patients)
      allProducts.forEach(product => {
        if (!product.includes('(Type')) {
          // Regular products apply to all patient types
          patientProducts[phase]['all'].push(product);
          patientProducts[phase]['1'].push(product);
          patientProducts[phase]['2'].push(product);
          patientProducts[phase]['3'].push(product);
          patientProducts[phase]['4'].push(product);
        } 
        // Process type-specific products
        else if (product.includes('(Type 3/4 Only)')) {
          const baseProduct = product.replace(' (Type 3/4 Only)', '');
          patientProducts[phase]['3'].push(baseProduct);
          patientProducts[phase]['4'].push(baseProduct);
        }
      });
      
      // Try to infer patient types from condition patterns in Excel
      // For specific conditions with known patterns
      if (condition.name === 'Gingival Recession Surgery' && phase === 'Prep') {
        // Type 1 gets nothing (N/A in Excel)
        patientProducts[phase]['1'] = [];
        // Type 2 also gets nothing
        patientProducts[phase]['2'] = [];
      }
      
      // Special handling for Dry Mouth condition based on excel chart
      if (condition.name === 'Dry Mouth') {
        if (phase === 'Mild') {
          // Clear previous automatic assignments
          patientProducts[phase] = {
            'all': [],
            '1': ['AO ProRinse Hydrating'],
            '2': ['Moisyn'],
            '3': ['Moisyn'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          };
        } else if (phase === 'Moderate') {
          patientProducts[phase] = {
            'all': [],
            '1': ['Moisyn'],
            '2': ['Moisyn'],
            '3': ['Moisyn', 'AO ProVantage Gel'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          };
          // Add Moisyn to "all" since it's in all patient types
          patientProducts[phase]['all'] = ['Moisyn'];
        } else if (phase === 'Severe') {
          patientProducts[phase] = {
            'all': [],
            '1': ['Moisyn'],
            '2': ['Moisyn', 'AO ProVantage Gel'],
            '3': ['Moisyn', 'AO ProVantage Gel'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          };
          // Add Moisyn to "all" since it's in all patient types
          patientProducts[phase]['all'] = ['Moisyn'];
        }
      }
      
      // For conditions where Type 3/4 get additional products
      if (
        (condition.name === 'Gingival Recession Surgery' && phase === 'Acute') ||
        (condition.name === 'Scaling and Root Planing (SRP)' && phase === 'Acute')
      ) {
        if (patientProducts[phase]['3'].includes('Synvaza') && 
            !patientProducts[phase]['3'].includes('AO ProVantage Gel')) {
          patientProducts[phase]['3'].push('AO ProVantage Gel');
          patientProducts[phase]['4'].push('AO ProVantage Gel');
        }
      }
    });
    
    setPatientSpecificProducts(patientProducts);
  };

  // Edit existing product
  const handleEditProduct = (product) => {
    setModalType('product');
    
    // All we need is the product name, as details are managed per-condition
    setNewItemData({
      name: product
    });
    
    setNewItemType('existing');
    setShowAddModal(true);
  };

  // Save all changes to local storage or backend
  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    
    // Update conditions with patient-specific product configurations
    const updatedConditions = editedConditions.map(condition => {
      // Special handling for Dry Mouth to ensure it always has the correct patientSpecificConfig
      if (condition.name === 'Dry Mouth' && 
          Array.isArray(condition.phases) && 
          condition.phases.includes('Mild')) {
        
        // Force the correct patient-specific configuration every time
        const dryMouthConfig = {
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
        
        console.log('Saving Dry Mouth with fixed patientSpecificConfig');
        return {
          ...condition,
          patientSpecificConfig: dryMouthConfig
        };
      } 
      else if (condition.id === selectedCondition?.id && patientSpecificProducts) {
        console.log(`Saving patientSpecificConfig for ${condition.name}`);
        
        // Create updated condition with patientSpecificConfig
        const updatedCondition = {
          ...condition,
          patientSpecificConfig: JSON.parse(JSON.stringify(patientSpecificProducts))
        };
        
        // Ensure that the main products object is consistent with patientSpecificProducts
        // Gather all products from patient-specific configs
        const productsFromPatientConfig = {};
        
        // Loop through each phase in the patientSpecificProducts
        Object.entries(patientSpecificProducts).forEach(([phase, patientTypes]) => {
          // Initialize an empty array for this phase if it doesn't exist
          productsFromPatientConfig[phase] = [];
          
          // Combine all products from all patient types
          Object.entries(patientTypes).forEach(([patientType, products]) => {
            // Skip 'all' as it's derived from others
            if (patientType !== 'all') {
              products.forEach(product => {
                if (!productsFromPatientConfig[phase].includes(product)) {
                  productsFromPatientConfig[phase].push(product);
                }
              });
            }
          });
        });
        
        // Now update the condition's products object with these products
        updatedCondition.products = productsFromPatientConfig;
        
        console.log(`Updated products for ${condition.name} from patient-specific config:`, updatedCondition.products);
        
        return updatedCondition;
      }
      return condition;
    });
    
    try {
      // Ensure categories and DDS types are up-to-date in Supabase
      const catPromise = supabase.from('categories')
        .upsert(categories.map(cat => ({ name: cat })), { onConflict: 'name' });
      
      const ddsPromise = supabase.from('dentists')
        .upsert(ddsTypes.map(dds => ({ name: dds })), { onConflict: 'name' });
      
      // Wait for both operations to complete
      const [catResult, ddsResult] = await Promise.all([catPromise, ddsPromise]);
      
      if (catResult.error) {
        console.error('Error syncing categories with Supabase:', catResult.error);
      }
      
      if (ddsResult.error) {
        console.error('Error syncing DDS types with Supabase:', ddsResult.error);
      }
      
      // Now save everything else
      const result = await saveToBackend(updatedConditions, categories, ddsTypes, products);
      if (result.success) {
        setHasChanges(false);
        setIsSaving(false);
        
        // Update conditions with the saved data that includes patientSpecificConfig
        setEditedConditions(updatedConditions);
        
        // Show success message with toast instead of using the state
        toast.success('All changes saved successfully!', {
          position: 'bottom-right',
          duration: 3000
        });
        
        // Notify parent component of the updates with categories and DDS types
        if (onConditionsUpdate) {
          onConditionsUpdate(updatedConditions, categories, ddsTypes, true); // Pass true to indicate data should be refreshed from Supabase
        }
        
        // Set the temporary success flag for UI indication
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsSaving(false);
      toast.error('Failed to save changes. Please try again.', {
        position: 'bottom-right',
        duration: 5000
      });
    }
  };
  
  // Reset changes
  const handleResetChanges = () => {
    setEditedConditions([...conditions]);
    setIsEditing(false);
    setProductsModified(false); // Reset modification flag
    
    // Reset patient-specific products
    if (selectedCondition) {
      initializePatientSpecificProducts(selectedCondition);
    }
  };
  
  // Handle condition selection
  const handleConditionSelect = (condition) => {
    console.log("Selecting condition:", condition.name);
    setSelectedCondition(condition);
    setActivePatientType('all');
    setProductsModified(false); // Reset modification flag when changing conditions
    // The initialization will happen in the useEffect
  };
  
  // Update condition field
  const updateConditionField = (conditionId, field, value) => {
    setIsEditing(true);
    setHasChanges(true);
    setEditedConditions(prev => 
      prev.map(condition => {
        if (condition.name === conditionId) {
          // Special handling for products field to ensure proper structure
          if (field === 'products') {
            // Initialize products object if it doesn't exist
            const currentProducts = condition.products || {};
            return { ...condition, [field]: value };
          }
          return { ...condition, [field]: value };
        }
        return condition;
      })
    );
    
    // Update selected condition if it's the one being edited
    if (selectedCondition && selectedCondition.name === conditionId) {
      // Special handling for products field
      if (field === 'products') {
        // Ensure products object exists
        const currentProducts = selectedCondition.products || {};
        setSelectedCondition(prev => ({ ...prev, [field]: value }));
      } else {
        setSelectedCondition(prev => ({ ...prev, [field]: value }));
      }
    }
  };
  
  // Update product details
  const updateProductDetail = (conditionId, productName, field, value, phase = null) => {
    setIsEditing(true);
    setHasChanges(true);

    // First, update the globally tracked product details for this product
    // This ensures that all conditions will eventually get the same, most up-to-date product details
    const masterProductDetails = {};
    editedConditions.forEach(c => {
      if (c.productDetails && c.productDetails[productName]) {
        Object.assign(masterProductDetails, c.productDetails[productName]);
      }
    });
    // Apply the current change to this master/canonical detail
    if (field === 'usage' && phase) {
      // Ensure the usage object is initialized as an object
      const currentUsage = typeof masterProductDetails.usage === 'object' ? 
        masterProductDetails.usage || {} : {};
      const updatedUsage = { ...currentUsage, [phase]: value };
      masterProductDetails.usage = updatedUsage;
    } else {
      masterProductDetails[field] = value;
    }

    setEditedConditions(prev => 
      prev.map(condition => {
        const updatedProductDetails = { ...(condition.productDetails || {}) };

        // If this condition uses the product, update its details to the master copy
        if (updatedProductDetails[productName]) {
          updatedProductDetails[productName] = { 
            ...(updatedProductDetails[productName]), // Preserve existing fields
            ...masterProductDetails // Apply master changes
          };
        }
        
        // Special handling for the currently selected condition to ensure its immediate UI update
        // for the specific field being changed, especially if it's a new product for this condition.
        if (condition.name === conditionId) {
          if (!updatedProductDetails[productName]) {
            updatedProductDetails[productName] = {
              usage: {},  // Initialize as an object not a string
              scientificRationale: '',
              clinicalEvidence: '',
              competitive: '',
              objection: '',
              factSheet: '#',
              researchArticles: [],
              pitchPoints: ''
            };
          }
          
          // Ensure usage is always properly structured as an object
          if (!updatedProductDetails[productName].usage || typeof updatedProductDetails[productName].usage !== 'object') {
            updatedProductDetails[productName].usage = {};
          }
          
          if (field === 'usage' && phase) {
            // Handle phase-specific usage
            updatedProductDetails[productName].usage[phase] = value;
          } else {
            updatedProductDetails[productName][field] = value;
          }
        }

        return { ...condition, productDetails: updatedProductDetails };
      })
    );
  
    // Update selected condition for immediate UI feedback
    if (selectedCondition && selectedCondition.name === conditionId) {
      const currentDetails = selectedCondition.productDetails?.[productName] || {
        usage: {},  // Initialize as object
        scientificRationale: '',
        clinicalEvidence: '',
        competitive: '',
        objection: '',
        factSheet: '#',
        researchArticles: [],
        pitchPoints: ''
      };
      
      let newDetails;
      
      // Ensure usage is always an object
      if (typeof currentDetails.usage !== 'object') {
        currentDetails.usage = {};
      }
      
      if (field === 'usage' && phase) {
        const updatedUsage = { ...currentDetails.usage, [phase]: value };
        newDetails = { ...currentDetails, usage: updatedUsage };
      } else {
        newDetails = { ...currentDetails, [field]: value };
      }
      
      setSelectedCondition(prev => ({ 
        ...prev, 
        productDetails: {
          ...prev.productDetails,
          [productName]: newDetails
        }
      }));
    }
  };
  
  // Handle patient type selection for product configuration
  const handlePatientTypeSelect = (type) => {
    setActivePatientType(type);
    
    // Prevent any automatic reinitialization when changing patient types
    // by adding a small delay
    setTimeout(() => {
      setHasChanges(prevHasChanges => prevHasChanges); // Force re-render
    }, 50);
  };
  
  // Add product to specific patient type and phase
  const addProductToPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    setHasChanges(true);
    setProductsModified(true); // Mark that user has modified products
    
    console.log(`Adding product "${productName}" to ${phase} phase for patient type ${patientType}`);
    
    // Update patient-specific products
    setPatientSpecificProducts(prev => {
      const updated = JSON.parse(JSON.stringify(prev || {})); // Deep clone to avoid reference issues
      
      // Initialize phase if not exists
      if (!updated[phase]) {
        updated[phase] = {
          'all': [],
          '1': [],
          '2': [],
          '3': [],
          '4': []
        };
      } else {
        // Ensure all patient type arrays exist
        if (!updated[phase]['all']) updated[phase]['all'] = [];
        if (!updated[phase]['1']) updated[phase]['1'] = [];
        if (!updated[phase]['2']) updated[phase]['2'] = [];
        if (!updated[phase]['3']) updated[phase]['3'] = [];
        if (!updated[phase]['4']) updated[phase]['4'] = [];
      }
      
      // If patientType is 'all', add to all patient types
      if (patientType === 'all') {
        // Add to all patient types, including 'all'
        updated[phase]['all'] = [...new Set([...updated[phase]['all'], productName])];
        updated[phase]['1'] = [...new Set([...updated[phase]['1'], productName])];
        updated[phase]['2'] = [...new Set([...updated[phase]['2'], productName])];
        updated[phase]['3'] = [...new Set([...updated[phase]['3'], productName])];
        updated[phase]['4'] = [...new Set([...updated[phase]['4'], productName])];
      } else {
        // Add to specific patient type
        updated[phase][patientType] = [...new Set([...updated[phase][patientType], productName])];
        
        // Check if product is now in all individual patient types and update 'all' accordingly
        const isInAllTypes = ['1', '2', '3', '4'].every(type => 
          updated[phase][type].includes(productName)
        );
        
        if (isInAllTypes && !updated[phase]['all'].includes(productName)) {
          updated[phase]['all'] = [...updated[phase]['all'], productName];
        }
      }
      
      console.log('Updated patient-specific products after adding:', JSON.stringify(updated));
      return updated;
    });

    // ALWAYS ensure the product has an entry in productDetails when it's added
    if (selectedCondition) {
      // Create product details if they don't exist
      updateProductDetail(
        selectedCondition.name,
        productName,
        'usage',
        '',
        phase
      );
      
      // CRUCIAL: Add the product to the condition's main products object as well
      // This ensures it gets saved to the procedure_phase_products table
      updateConditionField(selectedCondition.name, 'products', {
        ...selectedCondition.products,
        [phase]: [...new Set([...(selectedCondition.products[phase] || []), productName])]
      });
    }
  };
  
  // Remove product from specific patient type and phase
  const removeProductFromPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    setHasChanges(true);
    setProductsModified(true); // Mark that user has modified products
    
    console.log(`Removing product "${productName}" from ${phase} phase for patient type ${patientType}`);
    
    // Update patient-specific products
    setPatientSpecificProducts(prev => {
      const updated = JSON.parse(JSON.stringify(prev || {})); // Deep clone to avoid reference issues
      
      // Ensure phase exists
      if (!updated[phase]) {
        return updated; // Nothing to remove, return unchanged
      }
      
      // Ensure all patient type arrays exist
      if (!updated[phase]['all']) updated[phase]['all'] = [];
      if (!updated[phase]['1']) updated[phase]['1'] = [];
      if (!updated[phase]['2']) updated[phase]['2'] = [];
      if (!updated[phase]['3']) updated[phase]['3'] = [];
      if (!updated[phase]['4']) updated[phase]['4'] = [];
      
      // If patientType is 'all', remove from all patient types
      if (patientType === 'all') {
        updated[phase]['all'] = updated[phase]['all'].filter(p => p !== productName);
        updated[phase]['1'] = updated[phase]['1'].filter(p => p !== productName);
        updated[phase]['2'] = updated[phase]['2'].filter(p => p !== productName);
        updated[phase]['3'] = updated[phase]['3'].filter(p => p !== productName);
        updated[phase]['4'] = updated[phase]['4'].filter(p => p !== productName);
        
        // Also remove from the main products object to ensure consistency
        if (selectedCondition) {
          const updatedPhaseProducts = (selectedCondition.products[phase] || []).filter(p => p !== productName);
          updateConditionField(selectedCondition.name, 'products', {
            ...selectedCondition.products,
            [phase]: updatedPhaseProducts
          });
        }
      } else {
        // Remove from specific patient type
        updated[phase][patientType] = updated[phase][patientType].filter(p => p !== productName);
        
        // Remove from 'all' as well since it's no longer in all patient types
        updated[phase]['all'] = updated[phase]['all'].filter(p => p !== productName);
        
        // Check if the product is completely removed from all patient types
        const productInUse = ['1', '2', '3', '4'].some(type => updated[phase][type].includes(productName));
        
        // If the product is no longer used by any patient type, remove it from the main products as well
        if (!productInUse && selectedCondition) {
          const updatedPhaseProducts = (selectedCondition.products[phase] || []).filter(p => p !== productName);
          updateConditionField(selectedCondition.name, 'products', {
            ...selectedCondition.products,
            [phase]: updatedPhaseProducts
          });
        }
      }
      
      console.log('Updated patient-specific products after removing:', JSON.stringify(updated));
      return updated;
    });
  };

  // Add new condition
  const handleAddCondition = () => {
    const newCondition = {
      name: 'New Condition',
      category: 'Uncategorized',
      dds: ['All'],
      phases: ['Initial', 'Maintenance'],
      patientType: 'All Patient Types',
      pitchPoints: '',
      scientificRationale: '',
      clinicalEvidence: '',
      competitiveAdvantage: '',
      handlingObjections: '',
      // Initialize the products object with an empty array for each phase
      products: {
        'Initial': [],
        'Maintenance': []
      },
      productDetails: {},
      // Initialize an empty patientSpecificConfig
      patientSpecificConfig: {
        'Initial': {
          'all': [],
          '1': [],
          '2': [],
          '3': [],
          '4': []
        },
        'Maintenance': {
          'all': [],
          '1': [],
          '2': [],
          '3': [],
          '4': []
        }
      }
    };
    
    setEditedConditions(prev => [...prev, newCondition]);
    setSelectedCondition(newCondition);
    setHasChanges(true);
    
    // Initialize patient-specific products for the new condition
    setPatientSpecificProducts(newCondition.patientSpecificConfig);
  };
  
  // Add new category
  const handleAddCategory = () => {
    setModalType('category');
    setNewItemData({ name: '' });
    setShowAddModal(true);
  };
  
  // Add new DDS type
  const handleAddDdsType = () => {
    setModalType('ddsType');
    setNewItemData({ name: '' });
    setShowAddModal(true);
  };
  
  // Add new product
  const handleAddProduct = () => {
    setModalType('product');
    setNewItemData({
      name: '',
      usage: {}, // Keeping empty object initialization for data structure consistency
      researchArticles: [] // Keeping this initialization for data structure consistency
    });
    setShowAddModal(true);
  };
  
  // Submit new item from modal
  const handleSubmitNewItem = () => {
    setIsEditing(true);
    setHasChanges(true);
    
    if (modalType === 'product') {
      const productName = newItemData.name;
      
      console.log(`Submitting product ${productName}`);
      
      if (newItemType && newItemType !== 'product') {
        // Product name was changed - need to update all references
        setEditedConditions(prev => 
          prev.map(condition => {
            // Update product references in condition - correctly handle phase structure
            // In this app, phases are strings and products are stored in condition.products[phase]
            const updatedProducts = { ...condition.products };
            
            // For each phase, update the product name if it matches
            Object.keys(updatedProducts).forEach(phase => {
              if (Array.isArray(updatedProducts[phase])) {
                updatedProducts[phase] = updatedProducts[phase].map(p => 
                  p === newItemType ? productName : p
                );
              }
            });
            
            // Update product details
            const updatedProductDetails = { ...condition.productDetails };
            if (updatedProductDetails[newItemType]) {
              updatedProductDetails[productName] = {
                usage: newItemData.usage || {},
                scientificRationale: newItemData.scientificRationale || '',
                clinicalEvidence: newItemData.clinicalEvidence || '',
                competitive: newItemData.competitive || '',
                objection: newItemData.objection || '',
                factSheet: newItemData.factSheet || '#',
                researchArticles: newItemData.researchArticles || [],
                pitchPoints: newItemData.pitchPoints || ''
              };
              delete updatedProductDetails[newItemType];
            }
            
            // Also update patient-specific product configuration if it exists
            const updatedPatientSpecificConfig = condition.patientSpecificConfig ? 
              JSON.parse(JSON.stringify(condition.patientSpecificConfig)) : null;
            
            if (updatedPatientSpecificConfig) {
              Object.keys(updatedPatientSpecificConfig).forEach(phase => {
                Object.keys(updatedPatientSpecificConfig[phase]).forEach(patientType => {
                  if (Array.isArray(updatedPatientSpecificConfig[phase][patientType])) {
                    updatedPatientSpecificConfig[phase][patientType] = 
                      updatedPatientSpecificConfig[phase][patientType].map(p => 
                        p === newItemType ? productName : p
                      );
                  }
                });
              });
            }
            
            return { 
              ...condition, 
              products: updatedProducts,
              productDetails: updatedProductDetails,
              patientSpecificConfig: updatedPatientSpecificConfig || condition.patientSpecificConfig
            };
          })
        );
      } else if (newItemData.name && !products.includes(newItemData.name)) {
        // Add new product to the products list
        setProducts(prev => [...prev, newItemData.name]);
        
        // Log successful addition
        console.log(`Added new product "${productName}" to the products list`);
        
        // Also add it to all conditions' productDetails for consistency
        setEditedConditions(prev => 
          prev.map(condition => {
            // Create or update product details
            const updatedProductDetails = { ...condition.productDetails };
            
            // Only initialize if not already present
            if (!updatedProductDetails[productName]) {
              updatedProductDetails[productName] = {
                usage: {},
                scientificRationale: '',
                clinicalEvidence: '',
                competitive: '',
                objection: '',
                factSheet: '#',
                researchArticles: [],
                pitchPoints: ''
              };
            }
            
            return {
              ...condition,
              productDetails: updatedProductDetails
            };
          })
        );
      }
    } else if (modalType === 'category') {
      // Add new category only if it doesn't already exist
      if (newItemData.name && !categories.includes(newItemData.name)) {
        // Update local categories list only
        setCategories(prev => [...prev, newItemData.name]);
        
        // Don't try to create in Supabase immediately - will be done during save
        console.log(`Added category "${newItemData.name}" to local state - will be saved to Supabase during next save`);
        
        // Add new category to all conditions that need it
        setEditedConditions(prev => 
          prev.map(condition => {
            if (condition.category === '') {
              return { ...condition, category: newItemData.name };
            }
            return condition;
          })
        );
      }
    } else if (modalType === 'ddsType') {
      // Add new DDS type only if it doesn't already exist
      if (newItemData.name && !ddsTypes.includes(newItemData.name)) {
        // Update local DDS types list only
        setDdsTypes(prev => [...prev, newItemData.name]);
        
        // Don't try to create in Supabase immediately - will be done during save
        console.log(`Added DDS type "${newItemData.name}" to local state - will be saved to Supabase during next save`);
      }
    }
    
    setShowAddModal(false);
    setNewItemData({});
    setNewItemType(null);
  };
  
  // Delete confirmation
  const confirmDelete = (type, item) => {
    setItemToDelete({ type, item });
    setConfirmDeleteOpen(true);
  };
  
  // Handle delete
const handleDelete = async () => {
  setIsEditing(true);
  setHasChanges(true);
  const { type, item } = itemToDelete;
  
  // First, handle local state changes
  if (type === 'condition') {
    setEditedConditions(prev => prev.filter(c => c.name !== item.name));
    
    // Select a new condition if the deleted one was selected
    if (selectedCondition && selectedCondition.name === item.name) {
      const remainingConditions = editedConditions.filter(c => c.name !== item.name);
      setSelectedCondition(remainingConditions.length > 0 ? remainingConditions[0] : null);
    }
    
    // Also delete from Supabase
    try {
      // Find the procedure ID for this condition
      const { data: procedures } = await supabase
        .from('procedures')
        .select('id')
        .eq('name', item.name);
      
      if (procedures && procedures.length > 0) {
        const procedureId = procedures[0].id;
        
        // Delete related records first (respect foreign key constraints)
        await supabase.from('procedure_phase_products').delete().eq('procedure_id', procedureId);
        await supabase.from('procedure_patient_types').delete().eq('procedure_id', procedureId);
        await supabase.from('procedure_dentists').delete().eq('procedure_id', procedureId);
        await supabase.from('procedure_phases').delete().eq('procedure_id', procedureId);
        await supabase.from('patient_specific_configs').delete().eq('procedure_id', procedureId);
        await supabase.from('phase_specific_usage').delete().eq('procedure_id', procedureId);
        
        // Finally, delete the procedure itself
        await supabase.from('procedures').delete().eq('id', procedureId);
        
        console.log(`Deleted condition '${item.name}' (ID: ${procedureId}) from Supabase`);
      }
    } catch (error) {
      console.error('Error deleting condition from Supabase:', error);
    }
  } else if (type === 'product') {
    // Remove product from all conditions (local state)
    setEditedConditions(prev => 
      prev.map(condition => {
        const updatedProducts = { ...condition.products };
        Object.keys(updatedProducts).forEach(phase => {
          updatedProducts[phase] = updatedProducts[phase].filter(p => 
            p !== item && p !== `${item} (Type 3/4 Only)`
          );
        });
        
        const updatedProductDetails = { ...condition.productDetails };
        delete updatedProductDetails[item];
        
        return { 
          ...condition, 
          products: updatedProducts,
          productDetails: updatedProductDetails
        };
      })
    );
    
    // Update allProducts list
    setProducts(prev => prev.filter(p => p !== item));
    
    // Update patient-specific products
    setPatientSpecificProducts(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(phase => {
        Object.keys(updated[phase]).forEach(type => {
          updated[phase][type] = updated[phase][type].filter(p => p !== item);
        });
      });
      return updated;
    });
    
    // Also delete from Supabase
    try {
      // Find the product ID for this product
      const { data: productsData } = await supabase
        .from('products')
        .select('id')
        .eq('name', item);
      
      if (productsData && productsData.length > 0) {
        const productId = productsData[0].id;
        
        // Get the product_details id for this product
        const { data: productDetailsData } = await supabase
          .from('product_details')
          .select('id')
          .eq('product_id', productId);
        
        // Delete related records first
        await supabase.from('procedure_phase_products').delete().eq('product_id', productId);
        await supabase.from('phase_specific_usage').delete().eq('product_id', productId);
        
        // Delete research articles if they exist
        if (productDetailsData && productDetailsData.length > 0) {
          const productDetailId = productDetailsData[0].id;
          await supabase.from('research_articles').delete().eq('product_detail_id', productDetailId);
        }
        
        // Delete product details
        await supabase.from('product_details').delete().eq('product_id', productId);
        
        // Finally, delete the product itself
        await supabase.from('products').delete().eq('id', productId);
        
        console.log(`Deleted product '${item}' (ID: ${productId}) from Supabase`);
      }
    } catch (error) {
      console.error('Error deleting product from Supabase:', error);
    }
  } else if (type === 'category') {
    // Don't allow deleting the 'All' category
    if (item === 'All') {
      setConfirmDeleteOpen(false);
      setItemToDelete({ type: '', item: '' });
      return;
    }
    
    // Remove the category from the local list only
    setCategories(prev => prev.filter(c => c !== item));
    console.log(`Removed category "${item}" from local state - will be reflected in Supabase during next save`);
    
    // Update conditions that use this category (set to first available category or empty string)
    setEditedConditions(prev => 
      prev.map(condition => {
        if (condition.category === item) {
          const newCategory = categories.find(c => c !== item && c !== 'All') || '';
          return { ...condition, category: newCategory };
        }
        return condition;
      })
    );
    
  } else if (type === 'ddsType') {
    // Don't allow deleting the 'All' DDS type
    if (item === 'All') {
      setConfirmDeleteOpen(false);
      setItemToDelete({ type: '', item: '' });
      return;
    }
    
    // Remove the DDS type from the local list only
    setDdsTypes(prev => prev.filter(d => d !== item));
    console.log(`Removed DDS type "${item}" from local state - will be reflected in Supabase during next save`);
    
    // Update conditions that use this DDS type (remove it from their dds array)
    setEditedConditions(prev => 
      prev.map(condition => {
        if (condition.dds.includes(item)) {
          return { 
            ...condition, 
            dds: condition.dds.filter(d => d !== item)
          };
        }
        return condition;
      })
    );
  }
  
  setConfirmDeleteOpen(false);
  setItemToDelete({ type: '', item: '' });
};
  
  // Check if a product is configured in any phase for any patient type
  const isProductConfigured = (productName) => {
    if (!patientSpecificProducts) return false;
    
    // Check all phases
    return Object.keys(patientSpecificProducts).some(phase => {
      // Check all patient types
      return Object.keys(patientSpecificProducts[phase]).some(patientType => {
        return patientSpecificProducts[phase][patientType].includes(productName);
      });
    });
};
  
  // Render patient type filter and product configuration UI
  const renderPatientTypeProductConfig = (phase) => {
    return (
      <div className="mt-4 border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Patient-Specific Product Configuration</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filter by:</span>
            <Select.Root value={activePatientType} onValueChange={handlePatientTypeSelect}>
              <Select.Trigger className="px-3 py-1 text-sm border border-gray-300 rounded-md flex items-center">
                <User size={15} className="mr-1 text-gray-500" />
                <Select.Value />
                <Select.Icon><ChevronDown size={15} /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white rounded-md shadow-lg border min-w-[220px] z-[9999]">
                  <Select.Viewport className="p-1">
                    {Object.entries(PATIENT_TYPES).map(([type, label]) => (
                      <Select.Item
                        key={type}
                        value={type}
                        className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <Select.ItemText>{label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
        
        {activePatientType !== 'all' && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700 flex items-center">
            <Info size={15} className="mr-1 flex-shrink-0" />
            <span>
              Configuring products specifically for <strong>{PATIENT_TYPES[activePatientType]}</strong>.
              Products added here will only be recommended for this patient type.
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Products for {activePatientType === 'all' ? 'All Patient Types' : `Type ${activePatientType}`}</span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                addProductToPatientType(phase, activePatientType, e.target.value);
                e.target.value = ''; // Reset select
              }
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Add product...</option>
            {products
              .filter(product => {
                // Only show products that aren't already added for this patient type
                if (!patientSpecificProducts[phase]) return true;
                return !patientSpecificProducts[phase][activePatientType]?.includes(product);
              })
              .map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
          </select>
        </div>
        
        {patientSpecificProducts[phase] && patientSpecificProducts[phase][activePatientType]?.length > 0 ? (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {patientSpecificProducts[phase][activePatientType].map((product) => (
              <li 
                key={product}
                className="bg-white border rounded-md p-2 flex justify-between items-center"
              >
                <span>{product}</span>
                <button
                  onClick={() => removeProductFromPatientType(phase, activePatientType, product)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md">
            No products configured for {activePatientType === 'all' ? 'All Patient Types' : `Type ${activePatientType}`}.
          </div>
        )}
      </div>
    );
  };
  
  // Return early if no data
  if (!conditions || conditions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No conditions data available to edit.
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Knowledge Base Administrator</h2>
          <div className="flex items-center space-x-2">
            {/* Action buttons */}
            {isEditing && (
              <>
                <button
                  onClick={handleResetChanges}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                  disabled={isSaving}
                >
                  Reset Changes
                </button>
                <button
                  onClick={handleSaveChanges}
                  className={`px-3 py-1.5 rounded-md text-white text-sm flex items-center ${
                    isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={isSaving}
                  title={`Changes detected: ${hasChanges ? 'Yes' : 'No'}`}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={16} className="mr-1" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Save success notification */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-md">
            <Check size={20} className="mr-2" />
            Changes saved successfully!
          </div>
        )}
        
        {/* Tabs */}
        <Tabs.Root value={activeEditTab} onValueChange={setActiveEditTab}>
          <Tabs.List className="flex border-b">
            <Tabs.Trigger
              value="importExport"
              className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeEditTab === "importExport" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Import/Export
            </Tabs.Trigger>
            <Tabs.Trigger
              value="conditions"
              className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeEditTab === "conditions" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Conditions
            </Tabs.Trigger>
            <Tabs.Trigger
              value="products"
              className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeEditTab === "products" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Products
            </Tabs.Trigger>
            <Tabs.Trigger
              value="categories"
              className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeEditTab === "categories" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Categories & DDS Types
            </Tabs.Trigger>
          </Tabs.List>
          
          {/* Import/Export Tab */}
          <Tabs.Content value="importExport" className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Knowledge Base Management</h3>
              <p className="text-gray-600">
                Import and export your knowledge base data for backup purposes or to transfer between environments.
              </p>
            </div>
            
            <DataImportExport 
              conditions={editedConditions} 
              onImport={(importedData) => {
                // Preserve patientSpecificConfig from imported data
                const importedWithConfig = importedData.map(importedCondition => {
                  // Ensure DDS array exists
                  if (!Array.isArray(importedCondition.dds)) {
                    importedCondition.dds = [];
                    console.log(`Initialized missing dds array for condition "${importedCondition.name}"`);
                  }
                  
                  // Special handling for Dry Mouth condition
                  if (importedCondition.name === 'Dry Mouth' && 
                      Array.isArray(importedCondition.phases) && 
                      importedCondition.phases.includes('Mild')) {
                    // Set up patient-specific products according to the excel chart
                    const dryMouthConfig = {
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
                    
                    return {
                      ...importedCondition,
                      patientSpecificConfig: dryMouthConfig
                    };
                  }
                  // Ensure patientSpecificConfig exists and is correctly structured
                  else if (!importedCondition.patientSpecificConfig) {
                    // Initialize new config based on condition structure
                    const newConfig = {};
                    importedCondition.phases.forEach(phase => {
                      newConfig[phase] = {
                        'all': [],
                        '1': [],
                        '2': [],
                        '3': [],
                        '4': []
                      };
                    });
                    
                    // Special handling for known conditions
                    if (importedCondition.name === 'Gingival Recession Surgery' && newConfig['Prep']) {
                      newConfig['Prep']['1'] = []; // Type 1 gets nothing
                      newConfig['Prep']['2'] = []; // Type 2 also gets nothing
                    }
                    
                    return {
                      ...importedCondition,
                      patientSpecificConfig: newConfig
                    };
                  }
                  
                  return importedCondition;
                });
                
                setEditedConditions(importedWithConfig);
                setIsEditing(true);
                setHasChanges(true);
                
                // If we have a currently selected condition, update it
                if (selectedCondition) {
                  const updatedSelected = importedWithConfig.find(
                    c => c.name === selectedCondition.name
                  );
                  if (updatedSelected) {
                    setSelectedCondition(updatedSelected);
                    // Reset productModified flag when importing
                    setProductsModified(false);
                  }
                }
              }} 
            />
          </Tabs.Content>
          
          {/* Conditions Tab */}
          <Tabs.Content value="conditions" className="flex-grow overflow-auto">
            <div className="flex h-full">
              {/* Conditions List */}
              <div className="w-1/3 border-r p-4" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">All Conditions</h3>
                  <button
                    onClick={handleAddCondition}
                    className="p-1 text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
                  >
                    <Plus size={16} className="mr-1" />
                    Add New
                  </button>
                </div>
                
                <ul className="space-y-1">
                  {editedConditions.map((condition) => (
                    <li 
                      key={condition.name}
                      className={clsx(
                        "px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group",
                        selectedCondition && selectedCondition.name === condition.name
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => handleConditionSelect(condition)}
                    >
                      <div>
                        <div className="font-medium text-sm">{condition.name}</div>
                        <div className="text-xs text-gray-500">{condition.category}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete('condition', condition);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Condition Editor */}
              <div className="w-2/3 p-4" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
                {selectedCondition ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Condition Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition Name
                        </label>
                        <input
                          type="text"
                          value={selectedCondition.name}
                          onChange={(e) => updateConditionField(selectedCondition.name, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={selectedCondition.category}
                          onChange={(e) => updateConditionField(selectedCondition.name, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Patient Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Type
                      </label>
                      <input
                        type="text"
                        value={selectedCondition.patientType}
                        onChange={(e) => updateConditionField(selectedCondition.name, 'patientType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Format: "Types 1 to 4" or "Types 3 to 4"</p>
                    </div>
                    
                    {/* DDS Types */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DDS Types
                      </label>
                      <div className="border border-gray-300 rounded-md p-2 mb-2">
                        <div className="flex flex-wrap gap-2">
                          {selectedCondition.dds.map((dds) => (
                            <span 
                              key={dds} 
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                            >
                              {dds}
                              <button
                                onClick={() => {
                                  const updatedDds = selectedCondition.dds.filter(d => d !== dds);
                                  updateConditionField(selectedCondition.name, 'dds', updatedDds);
                                }}
                                className="ml-1 text-blue-700 hover:text-blue-900"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value && !selectedCondition.dds.includes(e.target.value)) {
                            const updatedDds = [...selectedCondition.dds, e.target.value];
                            updateConditionField(selectedCondition.name, 'dds', updatedDds);
                          }
                          e.target.value = ''; // Reset select
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Add DDS Type...</option>
                        {ddsTypes.filter(dds => !selectedCondition.dds.includes(dds)).map((dds) => (
                          <option key={dds} value={dds}>
                            {dds}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phases */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Treatment Phases
                      </label>
                      <div className="border border-gray-300 rounded-md p-2 mb-2">
                        <div className="flex flex-wrap gap-2">
                          {selectedCondition.phases.map((phase) => (
                            <span 
                              key={phase} 
                              className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center"
                            >
                              {phase}
                              <button
                                onClick={() => {
                                  const updatedPhases = selectedCondition.phases.filter(p => p !== phase);
                                  updateConditionField(selectedCondition.name, 'phases', updatedPhases);
                                }}
                                className="ml-1 text-purple-700 hover:text-purple-900"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New phase name..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value && !selectedCondition.phases.includes(e.target.value)) {
                              const updatedPhases = [...selectedCondition.phases, e.target.value];
                              updateConditionField(selectedCondition.name, 'phases', updatedPhases);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.previousSibling;
                            if (input.value && !selectedCondition.phases.includes(input.value)) {
                              const updatedPhases = [...selectedCondition.phases, input.value];
                              updateConditionField(selectedCondition.name, 'phases', updatedPhases);
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {/* Products by Phase with Patient Type Filtering */}
                    <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Products by Phase</h3>
                      
                      <Tabs.Root defaultValue={selectedCondition.phases[0]} className="border rounded-md">
                        <Tabs.List className="flex border-b bg-gray-50">
                          {selectedCondition.phases.map((phase) => (
                            <Tabs.Trigger
                              key={phase}
                              value={phase}
                              className={clsx(
                                "flex-1 px-4 py-2 text-sm font-medium",
                                "data-[state=active]:text-blue-600 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500",
                                "data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                              )}
                            >
                              {phase} Phase
                            </Tabs.Trigger>
                          ))}
                        </Tabs.List>
                        
                        {selectedCondition.phases.map((phase) => (
                          <Tabs.Content key={phase} value={phase} className="p-4">
                            {/* Patient-specific product configuration */}
                            {renderPatientTypeProductConfig(phase)}
                          </Tabs.Content>
                        ))}
                      </Tabs.Root>
                    </div>
                    
                    {/* Product Details */}
                    <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Product Details</h3>
                      
                      {Object.keys(selectedCondition.productDetails || {}).length > 0 ? (
                        (() => {
                          const configuredProducts = Object.keys(selectedCondition.productDetails)
                            .filter(productName => isProductConfigured(productName));
                            
                          if (configuredProducts.length === 0) {
                            return (
                              <div className="p-6 bg-gray-50 rounded-md text-center text-gray-500">
                                <p>No products are currently configured for this condition.</p>
                                <p className="mt-2 text-sm">Add products to phases in the "Products by Phase" section above to configure their details.</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-6">
                              {configuredProducts.map((productName) => (
                                <div key={productName} className="border rounded-md p-4 bg-gray-50">
                                  <h4 className="font-medium text-md mb-3">{productName}</h4>
                                  
                                  <div className="space-y-3">
                                    {/* Usage Instructions with Phase Tabs */}
                                    <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Usage Instructions
                          </label>
                                      {/* Always use tabs layout for usage, regardless of whether usage is an object or string */}
                                      <Tabs.Root defaultValue={selectedCondition.phases[0]} className="border rounded-md bg-white">
                                        <Tabs.List className="flex border-b">
                                          {selectedCondition.phases.map((phase) => (
                                            <Tabs.Trigger
                                              key={phase}
                                              value={phase}
                                              className={clsx(
                                                "flex-1 px-2 py-1.5 text-xs font-medium",
                                                "data-[state=active]:text-blue-600 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500",
                                                "data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                                              )}
                                            >
                                              {phase}
                                            </Tabs.Trigger>
                                          ))}
                                        </Tabs.List>
                                        
                                        {selectedCondition.phases.map((phase) => (
                                          <Tabs.Content key={phase} value={phase} className="p-2">
                                            <textarea
                                              value={
                                                typeof selectedCondition.productDetails[productName].usage === 'object' 
                                                  ? selectedCondition.productDetails[productName].usage[phase] || '' 
                                                  : selectedCondition.productDetails[productName].usage || ''
                                              }
                                              onChange={(e) => updateProductDetail(
                                                selectedCondition.name, 
                                                productName,
                                                'usage',
                                                e.target.value,
                                                phase
                                              )}
                                              rows={3}
                                              placeholder={`Enter usage instructions for ${phase} phase`}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            />
                                          </Tabs.Content>
                                        ))}
                                      </Tabs.Root>
                                    </div>
                                    
                                    {/* Scientific Rationale */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Scientific Rationale
                                      </label>
                                      <textarea
                                        value={selectedCondition.productDetails[productName].scientificRationale || ''}
                                        onChange={(e) => updateProductDetail(
                                      selectedCondition.name, 
                                          productName,
                                          'scientificRationale',
                                          e.target.value
                                        )}
                                        rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                    </div>
                                
                                    {/* Clinical Evidence */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Clinical Evidence
                                      </label>
                                <textarea
                                        value={selectedCondition.productDetails[productName].clinicalEvidence || ''}
                                        onChange={(e) => updateProductDetail(
                                      selectedCondition.name, 
                                          productName,
                                          'clinicalEvidence',
                                          e.target.value
                                        )}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                    </div>
                                    
                                    {/* Competitive Advantage */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Competitive Advantage
                                      </label>
                                      <textarea
                                        value={selectedCondition.productDetails[productName].competitive || ''}
                                        onChange={(e) => updateProductDetail(
                                      selectedCondition.name, 
                                          productName,
                                          'competitive',
                                          e.target.value
                                        )}
                                        rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              
                                    {/* Handling Objections */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Handling Objections
                                      </label>
                                      <textarea
                                        value={selectedCondition.productDetails[productName].objection || ''}
                                        onChange={(e) => updateProductDetail(
                                    selectedCondition.name, 
                                          productName,
                                          'objection',
                                          e.target.value
                                        )}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                      />
                            </div>
                                    
                                    {/* Key Pitch Points */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Key Pitch Points
                                      </label>
                                      <textarea
                                        value={selectedCondition.productDetails[productName].pitchPoints || ''}
                                        onChange={(e) => updateProductDetail(
                                selectedCondition.name, 
                                          productName,
                                          'pitchPoints',
                                          e.target.value
                                        )}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                      />
                        </div>
                                    
                                    {/* Fact Sheet Link */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fact Sheet URL
                                      </label>
                                      <input
                                        type="text"
                                        value={selectedCondition.productDetails[productName].factSheet || '#'}
                                        onChange={(e) => updateProductDetail(
                                          selectedCondition.name,
                                          productName,
                                          'factSheet',
                                          e.target.value
                                        )}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                      />
                    </div>
                                    
                                    {/* Research Articles */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Research Articles
                                  </label>
                                  
                                      {selectedCondition.productDetails[productName].researchArticles?.map((article, index) => (
                                        <div key={index} className="border rounded-md p-3 mb-2 bg-white">
                                          <div className="space-y-2">
                                            <div>
                                              <label className="block text-xs text-gray-600 mb-1">Article Title</label>
                                        <input
                                          type="text"
                                          value={article.title || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
                                                  updatedArticles[index] = { ...updatedArticles[index], title: e.target.value };
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                        />
                                            </div>
                                        
                                            <div>
                                              <label className="block text-xs text-gray-600 mb-1">Author/Source</label>
                                        <input
                                          type="text"
                                          value={article.author || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
                                                  updatedArticles[index] = { ...updatedArticles[index], author: e.target.value };
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                              />
                                            </div>
                                            
                                            <div>
                                              <label className="block text-xs text-gray-600 mb-1">URL</label>
                                              <input
                                                type="text"
                                                value={article.url || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
                                                  updatedArticles[index] = { ...updatedArticles[index], url: e.target.value };
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                              />
                                            </div>
                                            
                                            <div>
                                              <label className="block text-xs text-gray-600 mb-1">Abstract</label>
                                              <textarea
                                                value={article.abstract || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
                                                  updatedArticles[index] = { ...updatedArticles[index], abstract: e.target.value };
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                                rows={2}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                        />
                                            </div>
                                      </div>
                                      
                                          <div className="mt-2 flex justify-end">
                                      <button
                                        onClick={() => {
                                          const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
                                          updatedArticles.splice(index, 1);
                                          updateProductDetail(
                                            selectedCondition.name, 
                                            productName, 
                                            'researchArticles', 
                                            updatedArticles
                                          );
                                        }}
                                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 flex items-center"
                                      >
                                              <Trash2 size={12} className="mr-1" />
                                              Remove
                                      </button>
                                          </div>
                                    </div>
                                  ))}
                                  
                                  <button
                                    onClick={() => {
                                          const updatedArticles = [...(selectedCondition.productDetails[productName].researchArticles || []), { title: '', author: '', url: '', abstract: '' }];
                                      updateProductDetail(
                                        selectedCondition.name, 
                                        productName, 
                                        'researchArticles', 
                                        updatedArticles
                                      );
                                    }}
                                        className="mt-2 px-3 py-1.5 border border-blue-300 rounded-md text-blue-600 hover:bg-blue-50 text-sm flex items-center"
                                  >
                                        <Plus size={14} className="mr-1" />
                                    Add Research Article
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                          );
                        })()
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-md text-center text-gray-500">
                          <p>No products are currently configured for this condition.</p>
                          <p className="mt-2 text-sm">Add products to phases in the "Products by Phase" section above to configure their details.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    Select a condition to edit or create a new one
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>
          
          {/* Products Tab */}
          <Tabs.Content value="products" className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Product Library</h3>
              <button
                onClick={handleAddProduct}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add New Product
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product} className="border rounded-lg p-4 hover:bg-gray-50 group">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-md">{product}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1"
                        title="Edit product name"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete('product', product)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Used in {editedConditions.filter(c => 
                      Object.values(c.products || {}).some(products => 
                        products.includes(product) || products.includes(`${product} (Type 3/4 Only)`)
                      )
                    ).length} conditions
                  </div>
                </div>
              ))}
            </div>
          </Tabs.Content>
          
          {/* Categories & DDS Types Tab */}
          <Tabs.Content value="categories" className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categories */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Categories</h3>
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Category
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li 
                        key={category}
                        className="border rounded-md p-3 flex justify-between items-center bg-gray-50 group"
                      >
                        <span>{category}</span>
                        <div className="flex items-center">
                          <div className="text-sm text-gray-500 mr-3">
                            {editedConditions.filter(c => c.category === category).length} conditions
                          </div>
                          {category !== 'All' && (
                            <button
                              onClick={() => confirmDelete('category', category)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                              title="Delete category"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* DDS Types */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">DDS Types</h3>
                  <button
                    onClick={handleAddDdsType}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add DDS Type
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <ul className="space-y-2">
                    {ddsTypes.map((ddsType) => (
                      <li 
                        key={ddsType}
                        className="border rounded-md p-3 flex justify-between items-center bg-gray-50 group"
                      >
                        <span>{ddsType}</span>
                        <div className="flex items-center">
                          <div className="text-sm text-gray-500 mr-3">
                            {editedConditions.filter(c => c.dds.includes(ddsType)).length} conditions
                          </div>
                          {ddsType !== 'All' && (
                            <button
                              onClick={() => confirmDelete('ddsType', ddsType)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                              title="Delete DDS type"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Add New Item Modal */}
        <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {modalType === 'condition' && 'Add New Condition'}
              {modalType === 'category' && 'Add New Category'}
              {modalType === 'ddsType' && 'Add New DDS Type'}
              {modalType === 'product' && (newItemType ? `Edit Product: ${newItemType}` : 'Add New Product')}
            </Dialog.Title>

              
              <div className="space-y-4">
                {modalType === 'condition' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condition Name
                      </label>
                      <input
                        type="text"
                        value={newItemData.name || ''}
                        onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newItemData.category || ''}
                        onChange={(e) => setNewItemData({...newItemData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scientific Rationale
                      </label>
                      <textarea
                        value={newItemData.scientificRationale || ''}
                        onChange={(e) => setNewItemData({...newItemData, scientificRationale: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinical Evidence
                      </label>
                      <textarea
                        value={newItemData.clinicalEvidence || ''}
                        onChange={(e) => setNewItemData({...newItemData, clinicalEvidence: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competitive Advantage
                      </label>
                      <textarea
                        value={newItemData.competitive || ''}
                        onChange={(e) => setNewItemData({...newItemData, competitive: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Handling Objections
                      </label>
                      <textarea
                        value={newItemData.objection || ''}
                        onChange={(e) => setNewItemData({...newItemData, objection: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Pitch Points
                      </label>
                      <textarea
                        value={newItemData.pitchPoints || ''}
                        onChange={(e) => setNewItemData({...newItemData, pitchPoints: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
                
                {modalType === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={newItemData.name || ''}
                      onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
                
                {modalType === 'ddsType' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DDS Type Name
                    </label>
                    <input
                      type="text"
                      value={newItemData.name || ''}
                      onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
                
                {modalType === 'product' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={newItemData.name || ''}
                        onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Product details like usage instructions, scientific rationale, and other information will be added on a per-condition basis when configuring specific conditions.
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </Dialog.Close>
                
                <button
                  onClick={handleSubmitNewItem}
                  disabled={!newItemData.name}
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${
                    newItemData.name ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
                  }`}
                >
                  {newItemType ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        
        {/* Delete Confirmation Modal */}
        <Dialog.Root open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
              <Dialog.Title className="text-lg font-semibold mb-2 flex items-center text-red-600">
                <AlertTriangle size={20} className="mr-2" />
                Confirm Deletion
              </Dialog.Title>
              
              <Dialog.Description className="text-gray-600 mb-4">
                {itemToDelete?.type === 'condition' && 
                  `Are you sure you want to delete the condition "${itemToDelete.item.name}"? This action cannot be undone.`}
                
                {itemToDelete?.type === 'product' && 
                  `Are you sure you want to delete the product "${itemToDelete.item}"? This will remove it from all conditions where it's used. This action cannot be undone.`}
              </Dialog.Description>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </Dialog.Close>
                
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

export default AdminPanel;