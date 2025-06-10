import React, { useState, useEffect, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Plus, Edit, Trash2, X, ChevronDown, Info, AlertTriangle, Check, User, Target } from 'lucide-react';
import clsx from 'clsx';
import DataImportExport from './DataImportExport';
import { supabase } from '../supabaseClient';

// NEW Supabase helper for adding a single category
const addCategoryToSupabase = async (categoryName) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: categoryName }])
      .select();
    if (error) {
      console.error('SUPABASE_DIRECT: Error adding category to Supabase:', error);
      return { success: false, error };
    }
    console.log('SUPABASE_DIRECT: Category added to Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('SUPABASE_DIRECT: Error adding category (catch):', error);
    return { success: false, error };
  }
};

// NEW Supabase helper for deleting a single category
const deleteCategoryFromSupabase = async (categoryName) => {
  console.log(`SUPABASE_DIRECT: Attempting to delete category: ${categoryName}`);
  try {
    // Fetch category ID first
    const { data: categoryData, error: fetchCatError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (fetchCatError || !categoryData) {
      console.error('SUPABASE_DIRECT: Could not fetch category ID for deletion:', fetchCatError);
      return { success: false, error: fetchCatError || 'Category not found' };
    }
    const categoryId = categoryData.id;

    // Find procedures using this category
    const { data: procedures, error: fetchProcsError } = await supabase
      .from('procedures')
      .select('id')
      .eq('category_id', categoryId);

    if (fetchProcsError) {
      console.error('SUPABASE_DIRECT: Error checking procedures for category before delete:', fetchProcsError);
      // Decide if to proceed or return error
    }

    if (procedures && procedures.length > 0) {
      console.warn(`SUPABASE_DIRECT: Category "${categoryName}" (ID: ${categoryId}) is used by ${procedures.length} procedures. Nullifying their category_id.`);
      const procedureIdsToUpdate = procedures.map(p => p.id);
      const { error: updateError } = await supabase
        .from('procedures')
        .update({ category_id: null })
        .in('id', procedureIdsToUpdate);
      if (updateError) {
         console.error(`SUPABASE_DIRECT: Error nullifying category_id for procedures before deleting category ${categoryName}:`, updateError);
         return { success: false, error: updateError };
      }
       console.log(`SUPABASE_DIRECT: Successfully nullified category_id for ${procedureIdsToUpdate.length} procedures.`);
    }

    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('name', categoryName) // or .eq('id', categoryId)
      .select();
    if (error) {
      console.error('SUPABASE_DIRECT: Error deleting category from Supabase:', error);
      return { success: false, error };
    }
    console.log('SUPABASE_DIRECT: Category deleted from Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('SUPABASE_DIRECT: Error deleting category (catch):', error);
    return { success: false, error };
  }
};

// NEW Supabase helper for adding a single DDS Type
const addDdsTypeToSupabase = async (ddsTypeName) => {
  try {
    const { data, error } = await supabase
      .from('dentists')
      .insert([{ name: ddsTypeName }])
      .select();
    if (error) {
      console.error('SUPABASE_DIRECT: Error adding DDS type to Supabase:', error);
      return { success: false, error };
    }
    console.log('SUPABASE_DIRECT: DDS type added to Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('SUPABASE_DIRECT: Error adding DDS type (catch):', error);
    return { success: false, error };
  }
};

// NEW Supabase helper for deleting a single DDS Type
const deleteDdsTypeFromSupabase = async (ddsTypeName) => {
  console.log(`SUPABASE_DIRECT: Attempting to delete DDS Type: ${ddsTypeName}`);
  try {
    const { data: dentistData, error: fetchDentistError } = await supabase
      .from('dentists')
      .select('id')
      .eq('name', ddsTypeName)
      .single();

    if (fetchDentistError || !dentistData) {
      console.error('SUPABASE_DIRECT: Could not fetch DDS Type ID for deletion:', fetchDentistError);
      return { success: false, error: fetchDentistError || 'DDS Type not found' };
    }
    const dentistId = dentistData.id;

    // Remove relations from 'procedure_dentists'
    console.log(`SUPABASE_DIRECT: Deleting relations from procedure_dentists for dentist ID: ${dentistId}`);
    const { error: deleteRelationsError } = await supabase
        .from('procedure_dentists')
        .delete()
        .eq('dentist_id', dentistId);
    if (deleteRelationsError) {
        console.error('SUPABASE_DIRECT: Error deleting procedure_dentist relations:', deleteRelationsError);
        // Depending on policy, might want to return error or just log and proceed
    } else {
        console.log('SUPABASE_DIRECT: Successfully deleted procedure_dentist relations for DDS Type:', ddsTypeName);
    }

    const { data, error } = await supabase
      .from('dentists')
      .delete()
      .eq('id', dentistId) // Delete by ID for safety
      .select();
    if (error) {
      console.error('SUPABASE_DIRECT: Error deleting DDS type from Supabase:', error);
      return { success: false, error };
    }
    console.log('SUPABASE_DIRECT: DDS type deleted from Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('SUPABASE_DIRECT: Error deleting DDS type (catch):', error);
    return { success: false, error };
  }
};

// Mock function for saving data - in a real app, this would connect to backend
const saveToBackend = async (data, categoriesList, ddsTypesList, productsList) => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // console.log('Data saved:', data); // Keep for conditions if needed for localStorage backup
      console.log('Legacy saveToBackend: Categories saved to localStorage:', categoriesList);
      console.log('Legacy saveToBackend: DDS Types saved to localStorage:', ddsTypesList);
      console.log('Legacy saveToBackend: Products saved to localStorage:', productsList);
      
      // Save everything to localStorage
      // localStorage.setItem('conditions_data', JSON.stringify(data)); // Conditions will be saved via Supabase
      localStorage.setItem('categories_data', JSON.stringify(categoriesList));
      localStorage.setItem('dds_types_data', JSON.stringify(ddsTypesList));
      localStorage.setItem('products_data', JSON.stringify(productsList));
      
      resolve({ success: true });
    }, 1500);
  });
};

// Supabase functions for product management
const addProductToSupabase = async (productName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{ name: productName }])
      .select();
    
    if (error) {
      console.error('Error adding product to Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Product added to Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding product to Supabase:', error);
    return { success: false, error };
  }
};

const updateProductInSupabase = async (oldName, newName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ name: newName })
      .eq('name', oldName)
      .select();
    
    if (error) {
      console.error('Error updating product in Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Product updated in Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating product in Supabase:', error);
    return { success: false, error };
  }
};

const deleteProductFromSupabase = async (productName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('name', productName)
      .select();
    
    if (error) {
      console.error('Error deleting product from Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Product deleted from Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting product from Supabase:', error);
    return { success: false, error };
  }
};

const loadProductsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('name')
      .order('name');
    
    if (error) {
      console.error('Error loading products from Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Products loaded from Supabase:', data);
    return { success: true, data: data.map(p => p.name) };
  } catch (error) {
    console.error('Error loading products from Supabase:', error);
    return { success: false, error };
  }
};

// Supabase functions for categories
const loadCategoriesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name');
    if (error) {
      console.error('Error loading categories from Supabase:', error);
      return [];
    }
    return data.map(c => c.name);
  } catch (error) {
    console.error('Error loading categories from Supabase:', error);
    return [];
  }
};

const syncCategoriesWithSupabase = async (localCategories) => {
  try {
    const { data: supabaseCategoriesData, error: fetchError } = await supabase
      .from('categories')
      .select('name');

    if (fetchError) {
      console.error('SYNC_CATEGORIES: Error fetching categories from Supabase for sync:', fetchError);
      return { success: false, error: fetchError };
    }
    const supabaseCategories = supabaseCategoriesData.map(c => c.name);
    console.log('SYNC_CATEGORIES: Fetched Supabase categories:', supabaseCategories);
    console.log('SYNC_CATEGORIES: Local categories for sync:', localCategories);

    const categoriesToAdd = localCategories.filter(lc => !supabaseCategories.includes(lc));
    const categoriesToDelete = supabaseCategories.filter(sc => !localCategories.includes(sc));

    console.log('SYNC_CATEGORIES: Categories to add:', categoriesToAdd);
    console.log('SYNC_CATEGORIES: Categories to delete:', categoriesToDelete);

    if (categoriesToAdd.length > 0) {
      console.log('SYNC_CATEGORIES: Attempting to add categories:', categoriesToAdd);
      const { error: insertError } = await supabase
        .from('categories')
        .insert(categoriesToAdd.map(name => ({ name })));
      if (insertError) {
        console.error('SYNC_CATEGORIES: Error adding categories to Supabase:', insertError);
        // Optionally, return or throw error to handle in UI
      } else {
        console.log('SYNC_CATEGORIES: Successfully added categories:', categoriesToAdd);
      }
    }

    if (categoriesToDelete.length > 0) {
      console.log('SYNC_CATEGORIES: Attempting to delete categories:', categoriesToDelete);
      for (const categoryName of categoriesToDelete) {
        const deleteResult = await deleteCategoryFromSupabase(categoryName);
        if (!deleteResult.success) {
          console.error(`SYNC_CATEGORIES: Failed to delete category ${categoryName}:`, deleteResult.error);
        }
      }
    }
    console.log('SYNC_CATEGORIES: Categories synced with Supabase');
    return { success: true };
  } catch (error) {
    console.error('SYNC_CATEGORIES: General error syncing categories with Supabase:', error);
    return { success: false, error };
  }
};

// Supabase functions for DDS Types (using 'dentists' table)
const loadDdsTypesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('dentists') // Assuming table name is 'dentists' as per CSV
      .select('name')
      .order('name');
    if (error) {
      console.error('Error loading DDS types from Supabase:', error);
      return [];
    }
    return data.map(d => d.name);
  } catch (error) {
    console.error('Error loading DDS types from Supabase:', error);
    return [];
  }
};

const syncDdsTypesWithSupabase = async (localDdsTypes) => {
  try {
    const { data: supabaseDdsTypesData, error: fetchError } = await supabase
      .from('dentists') // Assuming table name is 'dentists'
      .select('name');

    if (fetchError) {
      console.error('SYNC_DDS_TYPES: Error fetching DDS types from Supabase for sync:', fetchError);
      return { success: false, error: fetchError };
    }
    const supabaseDdsTypes = supabaseDdsTypesData.map(d => d.name);
    console.log('SYNC_DDS_TYPES: Fetched Supabase DDS types:', supabaseDdsTypes);
    console.log('SYNC_DDS_TYPES: Local DDS types for sync:', localDdsTypes);

    const ddsTypesToAdd = localDdsTypes.filter(ldt => !supabaseDdsTypes.includes(ldt));
    const ddsTypesToDelete = supabaseDdsTypes.filter(sdt => !localDdsTypes.includes(sdt));

    console.log('SYNC_DDS_TYPES: DDS types to add:', ddsTypesToAdd);
    console.log('SYNC_DDS_TYPES: DDS types to delete:', ddsTypesToDelete);

    if (ddsTypesToAdd.length > 0) {
      console.log('SYNC_DDS_TYPES: Attempting to add DDS types:', ddsTypesToAdd);
      const { error: insertError } = await supabase
        .from('dentists') // Assuming table name is 'dentists'
        .insert(ddsTypesToAdd.map(name => ({ name })));
      if (insertError) {
        console.error('SYNC_DDS_TYPES: Error adding DDS types to Supabase:', insertError);
      } else {
        console.log('SYNC_DDS_TYPES: Successfully added DDS types:', ddsTypesToAdd);
      }
    }

    if (ddsTypesToDelete.length > 0) {
      console.log('SYNC_DDS_TYPES: Attempting to delete DDS types:', ddsTypesToDelete);
      for (const ddsTypeName of ddsTypesToDelete) {
        const deleteResult = await deleteDdsTypeFromSupabase(ddsTypeName);
        if (!deleteResult.success) {
          console.error(`SYNC_DDS_TYPES: Failed to delete DDS type ${ddsTypeName}:`, deleteResult.error);
        }
      }
    }
    console.log('SYNC_DDS_TYPES: DDS types synced with Supabase');
    return { success: true };
  } catch (error) {
    console.error('SYNC_DDS_TYPES: General error syncing DDS types with Supabase:', error);
    return { success: false, error };
  }
};

const syncPhasesWithSupabase = async (allLocalPhaseNames) => {
  // allLocalPhaseNames is a Set of all phase names used across all conditions
  console.log('SYNC_PHASES: Starting phase sync. Local names:', allLocalPhaseNames);
  try {
    const { data: supabasePhasesData, error: fetchError } = await supabase
      .from('phases')
      .select('name');
    if (fetchError) {
      console.error('SYNC_PHASES: Error fetching phases:', fetchError);
      return { success: false, error: fetchError };
    }
    const supabasePhaseNames = supabasePhasesData.map(p => p.name);
    const phasesToAdd = [...allLocalPhaseNames].filter(name => !supabasePhaseNames.includes(name) && name); // ensure name is not empty

    if (phasesToAdd.length > 0) {
      console.log('SYNC_PHASES: Adding new phases to Supabase:', phasesToAdd);
      const { error: insertError } = await supabase
        .from('phases')
        .insert(phasesToAdd.map(name => ({ name })));
      if (insertError) {
        console.error('SYNC_PHASES: Error adding new phases:', insertError);
        return { success: false, error: insertError };
      }
      console.log('SYNC_PHASES: Successfully added new phases.');
    } else {
        console.log('SYNC_PHASES: No new phases to add.');
    }
    return { success: true };
  } catch (error) {
    console.error('SYNC_PHASES: General error during phase sync:', error);
    return { success: false, error };
  }
};

// Supabase functions for syncing products
const syncProductsWithSupabase = async (localProductNames, productRenames = []) => { // Ensure productRenames has a default
  console.log('SYNC_PRODUCTS: Starting product sync. Local names:', localProductNames, 'Renames:', productRenames);
  // This function might become less important if CUD ops for products are immediate.
  // For now, it's a robust way to handle renames and ensure lists are in sync.
  try {
    // Step 1: Process Renames
    if (productRenames && productRenames.length > 0) {
      console.log('SYNC_PRODUCTS: Processing renames:', productRenames);
      for (const rename of productRenames) {
        const { oldName, newName } = rename;
        if (oldName === newName) {
          console.log(`SYNC_PRODUCTS: Skipping rename, oldName and newName are the same: ${oldName}`);
          continue;
        }
        console.log(`SYNC_PRODUCTS: Attempting to rename product ${oldName} to ${newName}`);
        const { data: renameData, error: renameError } = await supabase
          .from('products')
          .update({ name: newName })
          .eq('name', oldName)
          .select(); // Added select to see what was updated

        if (renameError) {
          console.error(`SYNC_PRODUCTS: Error renaming product ${oldName} to ${newName} in Supabase:`, renameError);
        } else {
          console.log(`SYNC_PRODUCTS: Product ${oldName} renamed to ${newName} in Supabase. Result:`, renameData);
        }
      }
    } else {
      console.log('SYNC_PRODUCTS: No renames to process.');
    }

    // Step 2: Fetch current product names from Supabase *after* renames
    console.log('SYNC_PRODUCTS: Fetching current product names from Supabase post-renames.');
    const { data: supabaseProductsData, error: fetchError } = await supabase
      .from('products')
      .select('name');

    if (fetchError) {
      console.error('SYNC_PRODUCTS: Error fetching products from Supabase for sync:', fetchError);
      return { success: false, error: fetchError };
    }
    const supabaseProductNames = supabaseProductsData.map(p => p.name);
    console.log('SYNC_PRODUCTS: Supabase product names after renames:', supabaseProductNames);
    console.log('SYNC_PRODUCTS: Local product names for comparison:', localProductNames);

    // Step 3: Identify and add new products
    const productsToAdd = localProductNames.filter(name => !supabaseProductNames.includes(name));
    console.log('SYNC_PRODUCTS: Products to add:', productsToAdd);
    if (productsToAdd.length > 0) {
      console.log('SYNC_PRODUCTS: Attempting to add new products:', productsToAdd);
      const { data: insertData, error: insertError } = await supabase
        .from('products')
        .insert(productsToAdd.map(name => ({ name }))) // Assuming 'name' is the column
        .select(); // Added select to see what was inserted
      if (insertError) {
        console.error('SYNC_PRODUCTS: Error adding new products to Supabase:', insertError);
      } else {
        console.log('SYNC_PRODUCTS: New products added to Supabase:', productsToAdd, 'Result:', insertData);
      }
    }

    // Step 4: Identify and delete old products
    // Products to delete are those in Supabase but not in the (potentially renamed) localProductNames list
    const productsToDelete = supabaseProductNames.filter(name => !localProductNames.includes(name));
    console.log('SYNC_PRODUCTS: Products to delete:', productsToDelete);
    if (productsToDelete.length > 0) {
      console.log('SYNC_PRODUCTS: Attempting to delete products:', productsToDelete);
      const { data: deleteData, error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('name', productsToDelete)
        .select(); // Added select to see what was deleted
      if (deleteError) {
        console.error('SYNC_PRODUCTS: Error deleting products from Supabase:', deleteError);
      } else {
        console.log('SYNC_PRODUCTS: Products deleted from Supabase:', productsToDelete, 'Result:', deleteData);
      }
    }

    console.log('SYNC_PRODUCTS: Products synced successfully with Supabase.');
    return { success: true };
  } catch (error) {
    console.error('SYNC_PRODUCTS: General error syncing products with Supabase:', error);
    return { success: false, error };
  }
};

// Helper to build a map from patient type name to ID and vice-versa
// This replaces the old function that relied on a 'code' column.
const buildPatientTypeMaps = async () => {
  try {
    const { data: patientTypesData, error } = await supabase
      .from('patient_types')
      .select('id, name');

    if (error) {
      console.error('Error fetching patient types for maps:', error);
      return { nameToId: {}, idToName: {} };
    }

    console.log('PATIENT_TYPES: Fetched patient types from DB:', patientTypesData);

    const nameToId = {};
    const idToName = {};

    patientTypesData.forEach(pt => {
      nameToId[pt.name] = pt.id;
      idToName[pt.id] = pt.name;
    });
    
    console.log('PATIENT_TYPES: Name to ID map:', nameToId);
    console.log('PATIENT_TYPES: ID to Name map:', idToName);
    
    return { nameToId, idToName };
  } catch (fetchError) {
    console.error('Error in buildPatientTypeMaps:', fetchError);
    return { nameToId: {}, idToName: {} };
  }
};

// Simple cache for conditions data
let conditionsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds cache

// Cache invalidation helper
const invalidateConditionsCache = () => {
  console.log('PERFORMANCE: Invalidating conditions cache');
  conditionsCache = null;
  cacheTimestamp = null;
};

export const loadConditionsFromSupabase = async (forceRefresh = false) => {
  // Check cache first
  if (!forceRefresh && conditionsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('PERFORMANCE: Using cached conditions data');
    return conditionsCache;
  }
  
  console.log('PERFORMANCE: Starting optimized conditions load from Supabase...');
  const startTime = performance.now();
  
  try {
    // Get patient type maps once
    const { idToName: patientTypeIdToNameMap } = await buildPatientTypeMaps();
    
    console.log('PERFORMANCE: Fetching all data in parallel...');
    
    // OPTIMIZATION: Fetch ALL data in parallel with a single query each
    const [
      proceduresResult,
      procedurePhasesResult, 
      procedureDentistsResult,
      procedurePhaseProductsResult,
      productDetailsResult,
      phaseUsageResult,
      researchResult
    ] = await Promise.all([
      // Get all procedures with categories
      supabase
        .from('procedures')
        .select(`
          id, name, category_id, pitch_points, patient_type, created_at, updated_at,
          categories:category_id (name)
        `),
      
      // Get all procedure phases with phase names
      supabase
        .from('procedure_phases')
        .select('procedure_id, phase_id, phases:phase_id(id, name)'),
      
      // Get all procedure dentists
      supabase
        .from('procedure_dentists')
        .select('procedure_id, dentists:dentist_id(name)'),
      
      // Get all procedure phase products
      supabase
        .from('procedure_phase_products')
        .select(`
          procedure_id, product_id, phase_id, patient_type_id,
          products:product_id(name), phases:phase_id(name)
        `),
      
      // Get all product details
      supabase
        .from('product_details')
        .select(`
          procedure_id, product_id, objection_handling, fact_sheet_url,
          clinical_evidence, pitch_points, scientific_rationale, rationale,
          products:product_id(name)
        `),
      
      // Get all phase usage
      supabase
        .from('phase_specific_usage')
        .select('procedure_id, product_id, instructions, phases:phase_id(name)'),
      
      // Get all research articles
      supabase
        .from('condition_product_research_articles')
        .select('procedure_id, product_id, title, author, abstract, url')
    ]);

    // Check for errors
    const errors = [
      proceduresResult.error,
      procedurePhasesResult.error,
      procedureDentistsResult.error, 
      procedurePhaseProductsResult.error,
      productDetailsResult.error,
      phaseUsageResult.error,
      researchResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('PERFORMANCE: Database errors:', errors);
      return [];
    }
    
    console.log('PERFORMANCE: Data fetched, now processing...');

    // Create lookup maps for fast access
    const procedurePhaseMap = new Map();
    const procedureDentistMap = new Map();
    const procedurePhaseProductMap = new Map();
    const productDetailsMap = new Map();
    const phaseUsageMap = new Map();
    const researchMap = new Map();

    // Build lookup maps
    procedurePhasesResult.data?.forEach(item => {
      if (!procedurePhaseMap.has(item.procedure_id)) {
        procedurePhaseMap.set(item.procedure_id, []);
      }
      if (item.phases) {
        procedurePhaseMap.get(item.procedure_id).push(item.phases.name);
      }
    });

    procedureDentistsResult.data?.forEach(item => {
      if (!procedureDentistMap.has(item.procedure_id)) {
        procedureDentistMap.set(item.procedure_id, []);
      }
      if (item.dentists) {
        procedureDentistMap.get(item.procedure_id).push(item.dentists.name);
      }
    });

    procedurePhaseProductsResult.data?.forEach(item => {
      if (!procedurePhaseProductMap.has(item.procedure_id)) {
        procedurePhaseProductMap.set(item.procedure_id, []);
      }
      procedurePhaseProductMap.get(item.procedure_id).push(item);
    });

    productDetailsResult.data?.forEach(item => {
      if (!productDetailsMap.has(item.procedure_id)) {
        productDetailsMap.set(item.procedure_id, []);
      }
      productDetailsMap.get(item.procedure_id).push(item);
    });

    phaseUsageResult.data?.forEach(item => {
      const key = `${item.procedure_id}-${item.product_id}`;
      if (!phaseUsageMap.has(key)) {
        phaseUsageMap.set(key, []);
      }
      phaseUsageMap.get(key).push(item);
    });

    researchResult.data?.forEach(item => {
      const key = `${item.procedure_id}-${item.product_id}`;
      if (!researchMap.has(key)) {
        researchMap.set(key, []);
      }
      researchMap.get(key).push(item);
    });

    // Process all conditions
    const conditions = [];
    const allPatientTypeNames = Object.values(patientTypeIdToNameMap);

    for (const proc of proceduresResult.data || []) {
      const condition = {
        name: proc.name,
        db_id: proc.id,
        category: proc.categories?.name || null,
        pitchPoints: proc.pitch_points || '',
        patientType: proc.patient_type || '',
        phases: procedurePhaseMap.get(proc.id) || [],
        dds: procedureDentistMap.get(proc.id) || [],
        products: {},
        productDetails: {},
        patientSpecificConfig: {},
        conditionSpecificResearch: {},
        scientificRationale: '',
        clinicalEvidence: '',
        handlingObjections: ''
      };

      // Initialize patient specific config structure
      condition.phases.forEach(phaseName => {
        condition.patientSpecificConfig[phaseName] = {};
        allPatientTypeNames.forEach(ptName => {
          condition.patientSpecificConfig[phaseName][ptName] = [];
        });
      });

      // Process phase products
      const phaseProducts = procedurePhaseProductMap.get(proc.id) || [];
      phaseProducts.forEach(ppp_item => {
        if (!ppp_item.phases?.name || !ppp_item.products?.name) return;

        const phaseName = ppp_item.phases.name;
        const productName = ppp_item.products.name;
        let patientTypeName = patientTypeIdToNameMap[ppp_item.patient_type_id];
        
        if (!patientTypeName && allPatientTypeNames.length > 0) {
          patientTypeName = allPatientTypeNames[0];
        }

        if (patientTypeName && condition.patientSpecificConfig[phaseName]) {
          if (!condition.patientSpecificConfig[phaseName][patientTypeName].includes(productName)) {
            condition.patientSpecificConfig[phaseName][patientTypeName].push(productName);
          }
        }
      });

      // Process product details
      const productDetails = productDetailsMap.get(proc.id) || [];
      let firstProductDetailProcessed = false;
      
      for (const pdItem of productDetails) {
        if (!pdItem.products?.name) continue;
        
        const productName = pdItem.products.name;
        
        // Set condition-level fields from first product
        if (!firstProductDetailProcessed) {
          condition.scientificRationale = pdItem.scientific_rationale || '';
          condition.clinicalEvidence = pdItem.clinical_evidence || '';
          condition.handlingObjections = pdItem.objection_handling || '';
          firstProductDetailProcessed = true;
        }

        // Process usage instructions
        const usageKey = `${proc.id}-${pdItem.product_id}`;
        const usageData = phaseUsageMap.get(usageKey) || [];
        const usageInstructionsByPhase = {};
        usageData.forEach(u => {
          if (u.phases?.name) {
            usageInstructionsByPhase[u.phases.name] = u.instructions;
          }
        });

        // Process research articles
        const researchKey = `${proc.id}-${pdItem.product_id}`;
        const researchArticles = researchMap.get(researchKey) || [];

        // Store product details
        condition.productDetails[productName] = {
          scientificRationale: pdItem.scientific_rationale || '',
          clinicalEvidence: pdItem.clinical_evidence || '',
          handlingObjections: pdItem.objection_handling || '',
          pitchPoints: pdItem.pitch_points || '',
          rationale: pdItem.rationale || '',
          factSheetUrl: pdItem.fact_sheet_url || '',
          usage: usageInstructionsByPhase,
          researchArticles: researchArticles
        };

        // Store condition-specific research
        if (researchArticles.length > 0) {
          condition.conditionSpecificResearch[productName] = researchArticles;
        }
      }

      // Add patient type names for filtering
      const patientTypeIds = [...new Set(phaseProducts.map(p => p.patient_type_id).filter(Boolean))];
      condition.patientTypeNames = patientTypeIds.map(id => patientTypeIdToNameMap[id]).filter(Boolean);

      conditions.push(condition);
    }

    const endTime = performance.now();
    console.log(`PERFORMANCE: Loaded ${conditions.length} conditions in ${Math.round(endTime - startTime)}ms`);
    
    // Cache the results
    conditionsCache = conditions;
    cacheTimestamp = Date.now();
    
    return conditions;

  } catch (error) {
    console.error('PERFORMANCE: Critical error in loadConditionsFromSupabase:', error);
    return [];
  }
};

// Placeholder for getting name-to-ID maps
const getEntityIdMaps = async () => {
  console.log("getEntityIdMaps: Fetching and creating name-to-ID maps");
  let categoryNameToId = {};
  let productNameToId = {};
  let phaseNameToId = {}; // This might be static or fetched if dynamic
  let ddsTypeNameToId = {};
  // The new patient type map will be name -> ID.
  let patientTypeNameToIdMap = {};

  try {
    const { data: categoriesData, error: catError } = await supabase.from('categories').select('id, name');
    if (catError) console.error("Error fetching categories for map:", catError);
    else categoryNameToId = Object.fromEntries(categoriesData.map(c => [c.name, c.id]));

    const { data: productsData, error: prodError } = await supabase.from('products').select('id, name');
    if (prodError) console.error("Error fetching products for map:", prodError);
    else productNameToId = Object.fromEntries(productsData.map(p => [p.name, p.id]));
    
    const { data: phasesData, error: phaseError } = await supabase.from('phases').select('id, name');
    if (phaseError) console.error("Error fetching phases for map:", phaseError);
    else phaseNameToId = Object.fromEntries(phasesData.map(ph => [ph.name, ph.id]));

    const { data: ddsData, error: ddsError } = await supabase.from('dentists').select('id, name');
    if(ddsError) console.error("Error fetching dentists for map:", ddsError);
    else ddsTypeNameToId = Object.fromEntries(ddsData.map(d => [d.name, d.id]));

    const patientTypeMaps = await buildPatientTypeMaps();
    patientTypeNameToIdMap = patientTypeMaps.nameToId;

  } catch (error) {
    console.error("Error in getEntityIdMaps:", error);
  }
  
  return {
    categoryNameToId,
    productNameToId,
    phaseNameToId,
    ddsTypeNameToId,
    patientTypeNameToIdMap,
  };
};

const addConditionToSupabase = async (condition, entityIdMaps) => {
  console.log('SUPABASE_CUD: Adding condition:', condition.name);
  const { categoryNameToId, productNameToId, phaseNameToId, ddsTypeNameToId, patientTypeNameToIdMap } = entityIdMaps;

  // 1. Insert into 'procedures'
  const categoryId = categoryNameToId[condition.category] || null;
  const { data: procedureData, error: procedureError } = await supabase
    .from('procedures')
    .insert([{
      name: condition.name,
      category_id: categoryId,
      pitch_points: condition.pitchPoints,
      patient_type: condition.patientType, // This is the descriptive string e.g. "Types 1 to 4"
      // created_at and updated_at are handled by Supabase
    }])
    .select()
    .single();

  if (procedureError || !procedureData) {
    console.error('SUPABASE_CUD: Error adding procedure:', procedureError);
    return { success: false, error: procedureError, data: null };
  }
  const newProcedureId = procedureData.id;
  console.log('SUPABASE_CUD: Added procedure, new ID:', newProcedureId);

  // Helper function to batch inserts and log errors
  const batchInsert = async (tableName, records, context) => {
    if (records.length === 0) return true;
    const { error } = await supabase.from(tableName).insert(records);
    if (error) {
      console.error(`SUPABASE_CUD: Error batch inserting into ${tableName} for ${context}:`, error);
      return false;
    }
    return true;
  };

  // 2. Insert into 'procedure_phases'
  const procedurePhaseRecords = condition.phases
    .map(phaseName => ({
      procedure_id: newProcedureId,
      phase_id: phaseNameToId[phaseName],
    }))
    .filter(pp => pp.phase_id); // Ensure phase_id exists
  if (!await batchInsert('procedure_phases', procedurePhaseRecords, `procedure ${newProcedureId}`)) {
    // Consider rollback or cleanup if critical
  }

  // 3. Insert into 'procedure_dentists'
  const procedureDentistRecords = condition.dds
    .map(ddsName => ({
      procedure_id: newProcedureId,
      dentist_id: ddsTypeNameToId[ddsName],
    }))
    .filter(pd => pd.dentist_id);
  if (!await batchInsert('procedure_dentists', procedureDentistRecords, `procedure ${newProcedureId}`)) {
    // Consider rollback
  }
  
  // 4. Insert into 'product_details' (and related phase_specific_usage, condition_product_research_articles)
  for (const productName of Object.keys(condition.productDetails)) {
    const details = condition.productDetails[productName];
    const productId = productNameToId[productName];
    if (!productId) {
        console.warn(`SUPABASE_CUD: Product ID not found for ${productName}, skipping product_details.`);
        continue;
    }

    const { data: pdData, error: pdError } = await supabase
        .from('product_details')
        .insert([{
            procedure_id: newProcedureId,
            product_id: productId,
            objection_handling: details.handlingObjections,
            fact_sheet_url: details.factSheetUrl,
            clinical_evidence: details.clinicalEvidence,
            pitch_points: details.pitchPoints, // Ensure this is the product-specific one
            scientific_rationale: details.scientificRationale,
            rationale: details.rationale,
        }])
        .select()
        .single();
    
    if (pdError) {
        console.error(`SUPABASE_CUD: Error adding product_details for ${productName} in procedure ${newProcedureId}:`, pdError);
        continue; // Or handle more gracefully
    }

    // 4a. Insert into 'phase_specific_usage'
    const usageRecords = [];
    if (details.usage && typeof details.usage === 'object') {
        for (const phaseName of Object.keys(details.usage)) {
            const phaseId = phaseNameToId[phaseName];
            if (phaseId && details.usage[phaseName]) {
                usageRecords.push({
                    procedure_id: newProcedureId,
                    product_id: productId,
                    phase_id: phaseId,
                    instructions: details.usage[phaseName],
                });
            }
        }
    }
    if (!await batchInsert('phase_specific_usage', usageRecords, `product ${productName} in procedure ${newProcedureId}`)) {
        // Rollback?
    }
    
    // 4b. Insert into 'condition_product_research_articles'
    const researchRecords = (details.researchArticles || []).map(article => ({
        procedure_id: newProcedureId,
        product_id: productId,
        title: article.title,
        author: article.author,
        abstract: article.abstract,
        url: article.url,
    }));
    if (!await batchInsert('condition_product_research_articles', researchRecords, `product ${productName} in procedure ${newProcedureId}`)) {
       // Rollback?
    }
  }

    // 5. Create basic product_details entries for all products referenced in patientSpecificConfig
  const referencedProducts = new Set();
  if (condition.patientSpecificConfig) {
    for (const phaseName of Object.keys(condition.patientSpecificConfig)) {
      for (const patientTypeName of Object.keys(condition.patientSpecificConfig[phaseName])) {
        const productsForType = condition.patientSpecificConfig[phaseName][patientTypeName];
        if (Array.isArray(productsForType)) {
          productsForType.forEach(productName => referencedProducts.add(productName));
        }
      }
    }
  }

  // Create basic product_details entries for products that don't already have them
  for (const productName of referencedProducts) {
    const productId = productNameToId[productName];
    if (productId && !condition.productDetails[productName]) {
      const { error: pdError } = await supabase
        .from('product_details')
        .insert([{
          procedure_id: newProcedureId,
          product_id: productId,
          objection_handling: `Basic objection handling for ${productName}`,
          fact_sheet_url: '#',
          clinical_evidence: `Clinical evidence for ${productName} in ${condition.name}`,
          pitch_points: `Key benefits of ${productName}`,
          scientific_rationale: `Scientific rationale for using ${productName}`,
          rationale: `Recommended for use in ${condition.name} treatment`,
        }]);
      if (pdError) {
        console.error(`Error creating basic product_details for ${productName}:`, pdError);
      }
    }
  }

  // 6. Insert into 'procedure_phase_products' (The new relational way)
  const pppRecords = [];
  if (condition.patientSpecificConfig) {
    for (const phaseName of Object.keys(condition.patientSpecificConfig)) {
      const phaseId = phaseNameToId[phaseName];
      if (!phaseId) continue;
      // Key change: The key is now the patient type's name
      for (const patientTypeName of Object.keys(condition.patientSpecificConfig[phaseName])) {
        const patientTypeId = patientTypeNameToIdMap[patientTypeName]; // Use the map to get the ID
        const productsForType = condition.patientSpecificConfig[phaseName][patientTypeName];
        if (patientTypeId && Array.isArray(productsForType) && productsForType.length > 0) {
          // Create a record for each product
          productsForType.forEach(productName => {
            const productId = productNameToId[productName];
            if (productId) {
              pppRecords.push({
            procedure_id: newProcedureId,
            phase_id: phaseId,
            patient_type_id: patientTypeId,
                product_id: productId,
          });
        }
          });
      }
    }
  }
  }
  if (!await batchInsert('procedure_phase_products', pppRecords, `procedure ${newProcedureId}`)) {
    // Rollback?
  }

  console.log(`SUPABASE_CUD: Successfully added condition ${condition.name} and related data.`);
  // Return the condition with its new db_id, potentially re-fetch or merge other generated fields if needed
  return { success: true, error: null, data: { ...condition, db_id: newProcedureId } };
};

const updateConditionInSupabase = async (condition, entityIdMaps) => {
  console.log('SUPABASE_CUD: Updating condition:', condition.name, '(db_id:', condition.db_id,')');
  const { categoryNameToId, productNameToId, phaseNameToId, ddsTypeNameToId, patientTypeNameToIdMap } = entityIdMaps;
  const procedureId = condition.db_id;

  if (!procedureId) {
    console.error("SUPABASE_CUD: Cannot update condition without db_id", condition);
    return { success: false, error: "Missing db_id for update.", data: null };
  }

  // 1. Update 'procedures' table
  const categoryId = categoryNameToId[condition.category] || null;
  const { data: procedureData, error: procedureError } = await supabase
    .from('procedures')
    .update({
      name: condition.name,
      category_id: categoryId,
      pitch_points: condition.pitchPoints,
      patient_type: condition.patientType,
      updated_at: new Date().toISOString(), // Explicitly set updated_at
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (procedureError || !procedureData) {
    console.error(`SUPABASE_CUD: Error updating procedure ${procedureId}:`, procedureError);
    return { success: false, error: procedureError, data: null };
  }
  console.log('SUPABASE_CUD: Updated procedure', procedureId);

  // Helper for performing a diff-based sync on simple join tables
  const syncSimpleJoinTable = async (tableName, procedureId, localItemNames, idMap, fkColumn) => {
    console.log(`SUPABASE_CUD: Efficiently syncing ${tableName} for procedure ${procedureId}`);
    
    // Get existing items from DB
    const { data: dbData, error: fetchError } = await supabase
      .from(tableName)
      .select(fkColumn)
      .eq('procedure_id', procedureId);
    
    if (fetchError) {
      console.error(`Error fetching from ${tableName} for diff-sync:`, fetchError);
      return; // Or handle error more gracefully
    }

    const dbItemIds = dbData.map(row => row[fkColumn]);
    const localItemIds = localItemNames.map(name => idMap[name]).filter(id => id);

    const toAddIds = localItemIds.filter(id => !dbItemIds.includes(id));
    const toDeleteIds = dbItemIds.filter(id => !localItemIds.includes(id));

    if (toDeleteIds.length > 0) {
      console.log(`SYNC_JOIN: Deleting from ${tableName}:`, toDeleteIds);
      await supabase.from(tableName).delete().eq('procedure_id', procedureId).in(fkColumn, toDeleteIds);
    }
    if (toAddIds.length > 0) {
      console.log(`SYNC_JOIN: Adding to ${tableName}:`, toAddIds);
      await supabase.from(tableName).insert(toAddIds.map(id => ({ procedure_id: procedureId, [fkColumn]: id })));
    }
     console.log(`SUPABASE_CUD: Finished sync for ${tableName}`);
  };

  // 2. Sync 'procedure_phases'
  await syncSimpleJoinTable('procedure_phases', procedureId, condition.phases, phaseNameToId, 'phase_id');

  // 3. Sync 'procedure_dentists'
  await syncSimpleJoinTable('procedure_dentists', procedureId, condition.dds, ddsTypeNameToId, 'dentist_id');
  
  // 4. Sync 'product_details' and their sub-tables.
  // This remains delete-then-insert due to its complexity, but the simpler joins above are now efficient.
  console.log(`SUPABASE_CUD: Clearing old product-related data for procedure ${procedureId}`);
  await supabase.from('phase_specific_usage').delete().eq('procedure_id', procedureId);
  await supabase.from('condition_product_research_articles').delete().eq('procedure_id', procedureId);
  await supabase.from('product_details').delete().eq('procedure_id', procedureId);
  
  console.log(`SUPABASE_CUD: Re-inserting product-related data for procedure ${procedureId}`);
  for (const productName of Object.keys(condition.productDetails)) {
    const details = condition.productDetails[productName];
    const productId = productNameToId[productName];
    if (!productId) {
        console.warn(`SUPABASE_CUD: Product ID not found for ${productName}, skipping product_details.`);
        continue;
    }
    const { data: pdData, error: pdError } = await supabase
        .from('product_details')
        .insert([{
            procedure_id: procedureId,
            product_id: productId,
            objection_handling: details.handlingObjections,
            fact_sheet_url: details.factSheetUrl,
            clinical_evidence: details.clinicalEvidence,
            pitch_points: details.pitchPoints,
            scientific_rationale: details.scientificRationale,
            rationale: details.rationale,
        }]);
    if (pdError) console.error(`SUPABASE_CUD: Error re-inserting product_details for ${productName} in proc ${procedureId}:`, pdError);

    const usageRecords = [];
    if (details.usage && typeof details.usage === 'object') {
        for (const phaseName of Object.keys(details.usage)) {
            const phaseId = phaseNameToId[phaseName];
            if (phaseId && details.usage[phaseName]) {
                usageRecords.push({ procedure_id: procedureId, product_id: productId, phase_id: phaseId, instructions: details.usage[phaseName] });
            }
        }
    }
    if(usageRecords.length > 0) await supabase.from('phase_specific_usage').insert(usageRecords);
    
    const researchRecords = (details.researchArticles || []).map(article => ({
        procedure_id: procedureId, product_id: productId, title: article.title, author: article.author, abstract: article.abstract, url: article.url,
    }));
    if(researchRecords.length > 0) await supabase.from('condition_product_research_articles').insert(researchRecords);
  }

  // 5. Create basic product_details entries for any new products referenced in patientSpecificConfig
  const referencedProducts = new Set();
  if (condition.patientSpecificConfig) {
    for (const phaseName of Object.keys(condition.patientSpecificConfig)) {
      for (const patientTypeName of Object.keys(condition.patientSpecificConfig[phaseName])) {
        const productsForType = condition.patientSpecificConfig[phaseName][patientTypeName];
        if (Array.isArray(productsForType)) {
          productsForType.forEach(productName => referencedProducts.add(productName));
        }
      }
    }
  }

  // Create basic product_details entries for products that don't already have them
  for (const productName of referencedProducts) {
    const productId = productNameToId[productName];
    if (productId) {
      // Check if product_details already exists for this product/procedure combination
      const { data: existingPd, error: checkError } = await supabase
        .from('product_details')
        .select('id')
        .eq('procedure_id', procedureId)
        .eq('product_id', productId)
        .maybeSingle();
      
      if (checkError) {
        console.error(`Error checking existing product_details for ${productName}:`, checkError);
      } else if (!existingPd) {
        // No existing record, create one
        const { error: pdError } = await supabase
          .from('product_details')
          .insert([{
            procedure_id: procedureId,
            product_id: productId,
            objection_handling: `Basic objection handling for ${productName}`,
            fact_sheet_url: '#',
            clinical_evidence: `Clinical evidence for ${productName} in ${condition.name}`,
            pitch_points: `Key benefits of ${productName}`,
            scientific_rationale: `Scientific rationale for using ${productName}`,
            rationale: `Recommended for use in ${condition.name} treatment`,
          }]);
        if (pdError) {
          console.error(`Error creating basic product_details for ${productName}:`, pdError);
        }
      }
    }
  }

  // 6. Sync 'procedure_phase_products'
  console.log(`SUPABASE_CUD: Syncing procedure_phase_products for procedure ${procedureId}`);
  
  // First, get all existing recommendations for this procedure from the DB
  const { data: existingPppData, error: fetchPppError } = await supabase
    .from('procedure_phase_products')
    .select('id, phase_id, patient_type_id, product_id')
    .eq('procedure_id', procedureId);

  if (fetchPppError) {
    console.error(`SUPABASE_CUD: Error fetching existing product recommendations for sync:`, fetchPppError);
  } else {
    // Create a set of local recommendations for easy lookup, e.g., "phaseId-patientTypeId-productId"
    const localPppSet = new Set();
    const pppRecordsToInsert = [];

  if (condition.patientSpecificConfig) {
    for (const phaseName of Object.keys(condition.patientSpecificConfig)) {
      const phaseId = phaseNameToId[phaseName];
      if (!phaseId) continue;
        // Key change: The key is now the patient type's name
        for (const patientTypeName of Object.keys(condition.patientSpecificConfig[phaseName])) {
          const patientTypeId = patientTypeNameToIdMap[patientTypeName]; // Use map to get the ID
          const productsForType = condition.patientSpecificConfig[phaseName][patientTypeName];
          if (patientTypeId && Array.isArray(productsForType)) {
            productsForType.forEach(productName => {
              const productId = productNameToId[productName];
              if (productId) {
                const key = `${phaseId}-${patientTypeId}-${productId}`;
                if (!localPppSet.has(key)) {
                  localPppSet.add(key);
                  pppRecordsToInsert.push({
                    procedure_id: procedureId,
                    phase_id: phaseId,
                    patient_type_id: patientTypeId,
                    product_id: productId,
                  });
                }
              }
            });
    }
  }
      }
    }
    
    // As a simple, robust sync strategy for now, we'll just delete all and re-insert.
    // A more complex diff-based approach could be implemented later if performance is an issue.
    console.log(`SUPABASE_CUD: Deleting all old product recommendations for procedure ${procedureId}.`);
    await supabase.from('procedure_phase_products').delete().eq('procedure_id', procedureId);
    
    if (pppRecordsToInsert.length > 0) {
        console.log(`SUPABASE_CUD: Inserting ${pppRecordsToInsert.length} new product recommendations.`);
        const { error: pppInsertError } = await supabase.from('procedure_phase_products').insert(pppRecordsToInsert);
        if (pppInsertError) {
            console.error(`SUPABASE_CUD: Error inserting product recommendations for ${procedureId}:`, pppInsertError);
  }
    }
  }

  console.log(`SUPABASE_CUD: Successfully updated condition ${condition.name}`);
  return { success: true, error: null, data: condition };
};

const deleteConditionFromSupabase = async (conditionId) => {
  console.log('SUPABASE_CUD: Deleting condition with db_id:', conditionId);
  // Order of deletion matters if cascade is not set up or to be explicit.
  // Start with tables that have foreign keys to 'procedures'.
  const tablesToDeleteFrom = [
    'phase_specific_usage', 
    'condition_product_research_articles',
    'procedure_phase_products', // Replaces patient_specific_configs
    'product_details', // product_details references procedures
    'procedure_phases',
    'procedure_dentists',
  ];

  for (const table of tablesToDeleteFrom) {
    const { error } = await supabase.from(table).delete().eq('procedure_id', conditionId);
    if (error) {
      console.error(`SUPABASE_CUD: Error deleting from ${table} for procedure ${conditionId}:`, error);
      // Potentially stop or collect errors
    } else {
      console.log(`SUPABASE_CUD: Deleted from ${table} for procedure ${conditionId}`);
    }
  }

  // Finally, delete from 'procedures' table itself
  const { error: procError } = await supabase.from('procedures').delete().eq('id', conditionId);
  if (procError) {
    console.error(`SUPABASE_CUD: Error deleting procedure ${conditionId} from procedures table:`, procError);
    return { success: false, error: procError, data: null };
  }
  console.log(`SUPABASE_CUD: Successfully deleted procedure ${conditionId} from procedures table.`);
  return { success: true, error: null, data: { id: conditionId } };
};

function AdminPanel({ onSaveChangesSuccess, onClose }) {
  const [activeTab, setActiveTab] = useState('conditions');
  const [initialConditions, setInitialConditions] = useState([]); // For diffing
  const [editedConditions, setEditedConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null); // Stores the *original* name of the product being edited
  const [selectedResearchProduct, setSelectedResearchProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [ddsTypes, setDdsTypes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productRenames, setProductRenames] = useState([]); // To track {oldName, newName}
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conditionsToDelete, setConditionsToDelete] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Patient-specific products configuration
  const [patientTypes, setPatientTypes] = useState([]); // To hold [{id, name}, ...] from DB
  const [activePatientType, setActivePatientType] = useState('All'); // Holds the name or "All"
  const [patientSpecificProducts, setPatientSpecificProducts] = useState({});
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [newItemData, setNewItemData] = useState({});
  
  // Competitive advantage modal state
  const [competitiveAdvantageModalOpen, setCompetitiveAdvantageModalOpen] = useState(false);
  const [selectedProductForAdvantage, setSelectedProductForAdvantage] = useState(null);
  const [competitiveAdvantageData, setCompetitiveAdvantageData] = useState({
    competitors: [],
    activeIngredients: []
  });
  
  // Initialize data
  const loadInitialData = useCallback(async (forceRefresh = false) => {
    console.log("PERFORMANCE_ADMIN: AdminPanel loading data...");
    
    // Load conditions from Supabase (use cache when possible)
    const supabaseConditions = await loadConditionsFromSupabase(forceRefresh);
    const deepClonedConditions = JSON.parse(JSON.stringify(supabaseConditions || []));
    setInitialConditions(deepClonedConditions);
    setEditedConditions(JSON.parse(JSON.stringify(supabaseConditions || [])));
    
    // Auto-select the first condition
    if (supabaseConditions.length > 0) {
        setSelectedCondition(supabaseConditions[0]);
    } else {
        setSelectedCondition(null);
    }

    // Load categories, DDS types, and products directly into AdminPanel state
    const supabaseCategories = await loadCategoriesFromSupabase();
    const supabaseDdsTypes = await loadDdsTypesFromSupabase();
    const productsResult = await loadProductsFromSupabase();
    
    setCategories(supabaseCategories.sort());
    setDdsTypes(supabaseDdsTypes.sort());
    if (productsResult.success) {
      setAllProducts(productsResult.data.sort());
    }
    
    // Load dynamic patient types
    const { data: ptData, error: ptError } = await supabase.from('patient_types').select('id, name').order('name');
    if (ptError) {
      console.error("Failed to load patient types", ptError);
      setPatientTypes([]);
    } else {
      setPatientTypes(ptData);
    }
    
    setIsEditing(false); // Reset editing state after a full load
    console.log("PERFORMANCE_ADMIN: AdminPanel data fetch completed.");
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Initialize patient-specific products when a condition is selected
  useEffect(() => {
    if (selectedCondition) {
      initializePatientSpecificProducts(selectedCondition);
    }
  }, [selectedCondition]);

  // Load products from Supabase
  useEffect(() => {
    const loadSupabaseProducts = async () => {
      const result = await loadProductsFromSupabase();
      if (result.success) {
        // Merge Supabase products with existing products from conditions
        setAllProducts(prev => {
          const existingProducts = new Set(prev);
          const supabaseProducts = result.data || [];
          const mergedProducts = [...existingProducts];
          
          // Add any new products from Supabase that aren't already in the list
          supabaseProducts.forEach(product => {
            if (!existingProducts.has(product)) {
              mergedProducts.push(product);
            }
          });
          
          return mergedProducts;
        });
      }
    };
    
    loadSupabaseProducts();
  }, []);

  // Initialize patient-specific products for a condition
  const initializePatientSpecificProducts = (condition) => {
    if (!condition) {
        return;
    }
    
    const newPatientSpecificProducts = {};
    const phases = condition.phases || [];

    phases.forEach(phase => {
        // The config is already keyed by name, so this is simpler.
        // We just ensure all patient types exist in the structure for the UI.
        const phaseConfig = (condition.patientSpecificConfig && condition.patientSpecificConfig[phase])
            ? JSON.parse(JSON.stringify(condition.patientSpecificConfig[phase])) // Deep copy
            : {};

        const fullPhaseConfig = {};
        patientTypes.forEach(pt => {
          fullPhaseConfig[pt.name] = phaseConfig[pt.name] || [];
        });

        // Derive the 'all' list for UI display. 'all' represents products common to all patient types.
        const allProductsInPhase = new Set();
        Object.values(fullPhaseConfig).forEach(prodList => {
            prodList.forEach(prod => allProductsInPhase.add(prod));
        });

        const commonProducts = [];
        if (allProductsInPhase.size > 0 && patientTypes.length > 0) {
            allProductsInPhase.forEach(product => {
                const isInAllTypes = patientTypes.every(pt => (fullPhaseConfig[pt.name] || []).includes(product));
                if(isInAllTypes) {
                    commonProducts.push(product);
                }
            });
        }
        
        fullPhaseConfig.all = [...new Set(commonProducts)];
        newPatientSpecificProducts[phase] = fullPhaseConfig;
    });
    
    setPatientSpecificProducts(newPatientSpecificProducts);
  };

  // Edit existing product
  const handleEditProduct = (product) => {
    setModalType('product');
    setEditingProductId(product);
    
    setNewItemData({
      name: product
    });
    
    setShowAddModal(true);
  };

  // Save all changes
  const handleSaveChanges = async () => {
    console.log('PERFORMANCE_SAVE: Starting optimized save to Supabase...');
    const saveStartTime = performance.now();
    setIsSaving(true);
    let overallSuccess = true;
    let finalError = null;

    try {
      // Step 0: Apply the patient-specific product configurations from the UI state
      // back to the `editedConditions` array before we start the save process.
      applyPatientSpecificProductsToCondition();

      // Step 1: Sync all lookup tables in parallel (Categories, DDS, Products, Phases)
      console.log('PERFORMANCE_SAVE: Syncing all lookup tables in parallel...');
      const allPhaseNames = new Set(editedConditions.flatMap(c => c.phases || []));
      
      await Promise.all([
        syncCategoriesWithSupabase(categories),
        syncDdsTypesWithSupabase(ddsTypes),
        syncProductsWithSupabase(allProducts, productRenames),
        syncPhasesWithSupabase(allPhaseNames)
      ]);
      
      setProductRenames([]); // Clear renames after they are processed
      console.log('PERFORMANCE_SAVE: All lookup tables synced in parallel.');

      // Step 2: Get fresh ID maps AFTER syncing everything.
      console.log('SAVE_CHANGES: Fetching latest entity ID maps post-sync...');
      const entityIdMaps = await getEntityIdMaps();
      if (!entityIdMaps.categoryNameToId || !entityIdMaps.productNameToId || !entityIdMaps.phaseNameToId || !entityIdMaps.ddsTypeNameToId || !entityIdMaps.patientTypeNameToIdMap) {
          console.error("SAVE_CHANGES: Failed to fetch critical ID maps after sync. Aborting save.");
          setIsSaving(false);
          // Show error to user
          return;
      }
      console.log('SAVE_CHANGES: Entity ID maps fetched successfully.');

      // Step 3: Process DELETED conditions
      const conditionsToDeleteCopy = [...conditionsToDelete];
      setConditionsToDelete([]); // Clear immediately
      for (const condIdToDelete of conditionsToDeleteCopy) {
        console.log(`SAVE_CHANGES: Deleting condition with ID: ${condIdToDelete}`);
        const deleteResult = await deleteConditionFromSupabase(condIdToDelete);
        if (!deleteResult.success) {
            overallSuccess = false;
            finalError = deleteResult.error;
            console.error(`SAVE_CHANGES: Failed to delete condition ${condIdToDelete}:`, deleteResult.error);
        }
      }

      // Step 4: Determine ADDED and UPDATED conditions from the single source of truth: `editedConditions`
      const conditionsToUpdate = [];
      const conditionsToAdd = [];
      const initialConditionsMap = new Map(initialConditions.map(c => [c.db_id, c]));

      for (const editedCond of editedConditions) {
        if (editedCond.db_id) { // Existing condition
          const originalCond = initialConditionsMap.get(editedCond.db_id);
          if (originalCond) {
            const originalStr = JSON.stringify(originalCond);
            const editedStr = JSON.stringify(editedCond);
            
            if (originalStr !== editedStr) {
              console.log(`CHANGE_DETECTION: Condition "${editedCond.name}" has changes detected.`);
              console.log('Original patientSpecificConfig:', JSON.stringify(originalCond.patientSpecificConfig, null, 2));
              console.log('Edited patientSpecificConfig:', JSON.stringify(editedCond.patientSpecificConfig, null, 2));
              conditionsToUpdate.push(editedCond);
            } else {
              console.log(`CHANGE_DETECTION: No changes detected for condition "${editedCond.name}".`);
            }
          }
        } else { // New condition
          conditionsToAdd.push(editedCond);
        }
      }
      console.log('SAVE_CHANGES: Conditions to add:', conditionsToAdd.map(c => c.name));
      console.log('SAVE_CHANGES: Conditions to update:', conditionsToUpdate.map(c => c.name));
      
      // Step 5: Process ADDED new conditions
      for (const condToAdd of conditionsToAdd) {
        console.log(`SAVE_CHANGES: Adding new condition: ${condToAdd.name}`);
        const addResult = await addConditionToSupabase(condToAdd, entityIdMaps);
         if (!addResult.success) {
          overallSuccess = false;
          finalError = addResult.error;
          console.error(`SAVE_CHANGES: Failed to add condition ${condToAdd.name}:`, addResult.error);
        }
      }

      // Step 6: Process UPDATED existing conditions
      for (const condToUpdate of conditionsToUpdate) {
        console.log(`SAVE_CHANGES: Updating condition: ${condToUpdate.name}`);
        const updateResult = await updateConditionInSupabase(condToUpdate, entityIdMaps);
        if (!updateResult.success) {
          overallSuccess = false;
          finalError = updateResult.error;
          console.error(`SAVE_CHANGES: Failed to update condition ${condToUpdate.name}:`, updateResult.error);
        }
      }

      // Step 7: Finalize and reload
      if (overallSuccess) {
        const saveEndTime = performance.now();
        console.log(`PERFORMANCE_SAVE: All operations successful in ${Math.round(saveEndTime - saveStartTime)}ms`);
        console.log('PERFORMANCE_SAVE: Reloading data and notifying parent...');
        
        // Invalidate cache and reload data in parallel
        invalidateConditionsCache();
        await Promise.all([
          loadInitialData(true), // Force refresh for admin panel state
          Promise.resolve(onSaveChangesSuccess()) // Notifies the parent to reload its own data
        ]);
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        console.error('PERFORMANCE_SAVE: One or more operations failed.', finalError);
        // Attempt to reload to reflect DB state even on partial failure
        await Promise.all([
          loadInitialData(true),
          Promise.resolve(onSaveChangesSuccess())
        ]);
      }

    } catch (error) {
      console.error('PERFORMANCE_SAVE: Critical error during save process:', error);
      overallSuccess = false;
      await Promise.all([
        loadInitialData(true),
        Promise.resolve(onSaveChangesSuccess())
      ]);
    } finally {
      setIsSaving(false);
      const totalTime = performance.now() - saveStartTime;
      console.log(`PERFORMANCE_SAVE: Total save process completed in ${Math.round(totalTime)}ms`);
    }
  };
  
  const applyPatientSpecificProductsToCondition = () => {
    if (!selectedCondition || !patientSpecificProducts) {
      console.log("APPLY_CONFIG: Skipping - no selected condition or patient specific products");
      return;
    }
    
    console.log("APPLY_CONFIG: Applying patient-specific products to condition:", selectedCondition.name);
    console.log("APPLY_CONFIG: Current patientSpecificProducts:", JSON.stringify(patientSpecificProducts, null, 2));
    
    // This helper updates the `editedConditions` array, which is the single source of truth.
    setEditedConditions(prevConditions =>
      prevConditions.map(cond => {
        if (cond.db_id ? cond.db_id === selectedCondition.db_id : cond.name === selectedCondition.name) {
          // The patientSpecificProducts state has a `all` key for the UI which we must omit before saving.
          const configToSave = {};
          Object.keys(patientSpecificProducts).forEach(phase => {
            configToSave[phase] = {};
            Object.keys(patientSpecificProducts[phase]).forEach(ptName => {
              if (ptName !== 'all') { // Exclude the 'all' property
                configToSave[phase][ptName] = patientSpecificProducts[phase][ptName];
              }
            });
          });
          
          console.log("APPLY_CONFIG: Config to save:", JSON.stringify(configToSave, null, 2));
          
          // Return a new condition object with the updated config
          return { ...cond, patientSpecificConfig: configToSave };
        }
        return cond;
      })
    );
    console.log("APPLY_CONFIG: Synced patient-specific product config to the main editedConditions state for saving.");
  };

  // Get all products that should be shown in Product Details (both saved and newly added)
  const getAllProductsForCondition = (condition) => {
    if (!condition) return {};
      
    // Start with saved product details
    const allProducts = { ...(condition.productDetails || {}) };

    // Add products from current session's patient-specific configuration
    const currentConfig = patientSpecificProducts || {};
    Object.keys(currentConfig).forEach(phase => {
      if (phase && currentConfig[phase]) {
        Object.keys(currentConfig[phase]).forEach(patientTypeName => {
          if (patientTypeName !== 'all') {
            const products = currentConfig[phase][patientTypeName] || [];
            products.forEach(productName => {
              if (!allProducts[productName]) {
                // Create a basic product detail entry for newly added products
                allProducts[productName] = {
                  usage: {},
            rationale: '',
            handlingObjections: '',
            factSheetUrl: '#',
                  researchArticles: [],
                  clinicalEvidence: '',
                  pitchPoints: '',
                  scientificRationale: '',
                };
            }
            });
        }
      });
      }
    });
    
    return allProducts;
  };
  
  // Reset changes
  const handleResetChanges = () => {
    const deepClonedInitial = JSON.parse(JSON.stringify(initialConditions));
    setEditedConditions(deepClonedInitial);
    
    // Find the currently selected condition in the newly reset list
    const newSelectedCond = selectedCondition 
      ? deepClonedInitial.find(c => c.db_id ? c.db_id === selectedCondition.db_id : c.name === selectedCondition.name)
      : deepClonedInitial[0] || null;

    setSelectedCondition(newSelectedCond);
    setIsEditing(false);
    setProductRenames([]); // Clear pending renames on reset
    setConditionsToDelete([]); // Clear pending deletes
    
    // The useEffect for selectedCondition will re-initialize patient-specific products
  };
  
  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setActivePatientType('All');
    initializePatientSpecificProducts(condition);
  };
  
  // Update condition field
  const updateConditionField = (conditionId, field, value) => {
    setIsEditing(true);
    setEditedConditions(prev => 
      prev.map(condition => 
        condition.name === conditionId
          ? { ...condition, [field]: value }
          : condition
      )
    );
    
    // Update selected condition if it's the one being edited
    if (selectedCondition && selectedCondition.name === conditionId) {
      setSelectedCondition(prev => ({ ...prev, [field]: value }));
    }
  };
  
  // Update product details
  const updateProductDetail = (conditionId, productName, field, value, phase = null) => {
    setIsEditing(true);
    setEditedConditions(prev => 
      prev.map(condition => {
        if (condition.name === conditionId) {
          const updatedProductDetails = { ...condition.productDetails };
          if (!updatedProductDetails[productName]) {
            updatedProductDetails[productName] = {
              usage: {},
              rationale: '',
              clinicalEvidence: '',
              competitive: '',
              handlingObjections: '',
              factSheetUrl: '#',
              researchArticles: [],
              pitchPoints: '' // Add this field for new products
            };
          }
          
          // Handle phase-specific usage instructions
          if (field === 'usage' && phase) {
            const updatedUsage = { ...(typeof updatedProductDetails[productName].usage === 'object' ? 
              updatedProductDetails[productName].usage : { [phase]: updatedProductDetails[productName].usage || '' }) };
            updatedUsage[phase] = value;
            updatedProductDetails[productName].usage = updatedUsage;
          } else {
          updatedProductDetails[productName][field] = value;
          }
          
          return { ...condition, productDetails: updatedProductDetails };
        }
        return condition;
      })
    );
  
  // Update selected condition if it's the one being edited
  if (selectedCondition && selectedCondition.name === conditionId) {
    const updatedProductDetails = { ...selectedCondition.productDetails };
    if (!updatedProductDetails[productName]) {
      updatedProductDetails[productName] = {
          usage: {},
        rationale: '',
          clinicalEvidence: '',
        competitive: '',
        handlingObjections: '',
        factSheetUrl: '#',
          researchArticles: [],
          pitchPoints: '' // Add this field for new products
      };
    }
      
      // Handle phase-specific usage instructions
      if (field === 'usage' && phase) {
        const updatedUsage = { ...(typeof updatedProductDetails[productName].usage === 'object' ? 
          updatedProductDetails[productName].usage : { [phase]: updatedProductDetails[productName].usage || '' }) };
        updatedUsage[phase] = value;
        updatedProductDetails[productName].usage = updatedUsage;
      } else {
    updatedProductDetails[productName][field] = value;
      }
      
    setSelectedCondition(prev => ({ 
      ...prev, 
      productDetails: updatedProductDetails 
    }));
  }
};
  
  // Handle patient type selection for product configuration
  const handlePatientTypeSelect = (type) => {
    setActivePatientType(type);
  };
  
  const updatePatientSpecificConfigForSelectedCondition = (newConfig) => {
    if (!selectedCondition) return;
    
    // This helper updates the `editedConditions` array, which is the single source of truth.
    setEditedConditions(prevConditions => 
      prevConditions.map(cond => {
        if (cond.db_id ? cond.db_id === selectedCondition.db_id : cond.name === selectedCondition.name) {
          // Return a new condition object with the updated config
          return { ...cond, patientSpecificConfig: newConfig };
        }
        return cond;
      })
    );
  };
  
  // Add product to specific patient type and phase
  const addProductToPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    
    setPatientSpecificProducts(prev => {
        const newConfig = JSON.parse(JSON.stringify(prev));
        
        if (!newConfig[phase]) {
            newConfig[phase] = { 'all': [], ...Object.fromEntries(patientTypes.map(pt => [pt.name, []])) };
        }

      if (patientType === 'all') {
            // Add product to every patient type
            patientTypes.forEach(type => {
                newConfig[phase][type.name] = [...new Set([...(newConfig[phase][type.name] || []), productName])];
            });
      } else {
            newConfig[phase][patientType] = [...new Set([...(newConfig[phase][patientType] || []), productName])];
        }

        // Recalculate the 'all' list for UI display
        const allProductsInPhase = new Set();
        const commonProducts = [];

        patientTypes.forEach(pt => {
            (newConfig[phase][pt.name] || []).forEach(prod => allProductsInPhase.add(prod));
        });

        if (patientTypes.length > 0 && allProductsInPhase.size > 0) {
            allProductsInPhase.forEach(product => {
                const isInAllTypes = patientTypes.every(pt => (newConfig[phase][pt.name] || []).includes(product));
                if (isInAllTypes) {
                    commonProducts.push(product);
                }
            });
        }
        newConfig[phase].all = [...new Set(commonProducts)];

        // Immediately update editedConditions to ensure proper change detection
        if (selectedCondition) {
          const configToSave = {};
          Object.keys(newConfig).forEach(phaseName => {
            configToSave[phaseName] = {};
            Object.keys(newConfig[phaseName]).forEach(ptName => {
              if (ptName !== 'all') { // Exclude the 'all' property
                configToSave[phaseName][ptName] = newConfig[phaseName][ptName];
              }
            });
          });

          setEditedConditions(prevConditions =>
            prevConditions.map(cond => {
              if (cond.db_id ? cond.db_id === selectedCondition.db_id : cond.name === selectedCondition.name) {
                return { ...cond, patientSpecificConfig: configToSave };
              }
              return cond;
            })
          );
        }

        return newConfig;
    });
  };
  
  // Remove product from specific patient type and phase
  const removeProductFromPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    
    setPatientSpecificProducts(prev => {
        const newConfig = JSON.parse(JSON.stringify(prev));
      
        if (!newConfig[phase]) return prev; // No change if phase doesn't exist

      if (patientType === 'all') {
            // When removing from 'all', remove from every patient type
            patientTypes.forEach(type => {
                if (newConfig[phase][type.name]) {
                    newConfig[phase][type.name] = newConfig[phase][type.name].filter(p => p !== productName);
                }
            });
      } else {
            // Just remove from the specific type
            if (newConfig[phase][patientType]) {
                newConfig[phase][patientType] = newConfig[phase][patientType].filter(p => p !== productName);
            }
        }

        // Recalculate the 'all' list since a product was removed
        const allProductsInPhase = new Set();
        const commonProducts = [];

        patientTypes.forEach(pt => {
            (newConfig[phase][pt.name] || []).forEach(prod => allProductsInPhase.add(prod));
        });
        
        if (patientTypes.length > 0 && allProductsInPhase.size > 0) {
            allProductsInPhase.forEach(product => {
                const isInAllTypes = patientTypes.every(pt => (newConfig[phase][pt.name] || []).includes(product));
                if (isInAllTypes) {
                    commonProducts.push(product);
      }
            });
        }
        newConfig[phase].all = [...new Set(commonProducts)];

        // Immediately update editedConditions to ensure proper change detection
        if (selectedCondition) {
          const configToSave = {};
          Object.keys(newConfig).forEach(phaseName => {
            configToSave[phaseName] = {};
            Object.keys(newConfig[phaseName]).forEach(ptName => {
              if (ptName !== 'all') { // Exclude the 'all' property
                configToSave[phaseName][ptName] = newConfig[phaseName][ptName];
              }
            });
          });

          setEditedConditions(prevConditions =>
            prevConditions.map(cond => {
              if (cond.db_id ? cond.db_id === selectedCondition.db_id : cond.name === selectedCondition.name) {
                return { ...cond, patientSpecificConfig: configToSave };
              }
              return cond;
            })
          );
        }
      
        return newConfig;
    });
  };
  // Add new condition
  const handleAddCondition = () => {
    setModalType('condition');
    const defaultPhases = ['Prep', 'Acute', 'Maintenance']; // Example default phases
    const defaultProducts = {};
    defaultPhases.forEach(phase => defaultProducts[phase] = []);

    setNewItemData({
      name: '',
      category: categories[0] || '',
      phases: defaultPhases, 
      dds: [],
      patientType: 'Types 1 to 4', // Default value
      products: defaultProducts, 
      productDetails: {},
      patientSpecificConfig: {}, // Initialize this
      conditionSpecificResearch: {}
      // db_id will be undefined, marking it as new
    });
    setShowAddModal(true);
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
      name: ''
    });
    setShowAddModal(true);
  };
  
  // Submit new item from modal
  const handleSubmitNewItem = async () => {
    setIsEditing(true); // General editing flag, might need refinement
    const itemName = newItemData.name ? newItemData.name.trim() : '';

    if (!itemName) {
      setShowAddModal(false);
      setNewItemData({});
      setEditingProductId(null);
      return; 
    }
    
    let success = false;

    if (modalType === 'product') {
      const productName = itemName;
      if (editingProductId) { // Editing existing product (rename)
        if (editingProductId !== productName) {
          console.log(`SUBMIT_NEW_ITEM: Staging rename of product ${editingProductId} to ${productName}`);
          // Instead of immediate Supabase call, stage the rename
          setProductRenames(prev => [...prev, { oldName: editingProductId, newName: productName }]);
          // Update allProducts list locally for immediate UI feedback
          setAllProducts(prev => prev.map(p => p === editingProductId ? productName : p).sort());
          // Update editedConditions to reflect the rename
          setEditedConditions(prevConditions =>
            prevConditions.map(condition => {
                const updatedProductsInPhases = { ...condition.products };
                Object.keys(updatedProductsInPhases).forEach(phase => {
                    updatedProductsInPhases[phase] = updatedProductsInPhases[phase].map(p =>
                        p === editingProductId ? productName :
                        p === `${editingProductId} (Type 3/4 Only)` ? `${productName} (Type 3/4 Only)` : p
                    );
                });
                const updatedProductDetails = { ...condition.productDetails };
                if (updatedProductDetails[editingProductId]) {
                    updatedProductDetails[productName] = updatedProductDetails[editingProductId];
                    delete updatedProductDetails[editingProductId];
                }
                const updatedPatientSpecificConfig = JSON.parse(JSON.stringify(condition.patientSpecificConfig || {}));
                Object.keys(updatedPatientSpecificConfig).forEach(phase => {
                    Object.keys(updatedPatientSpecificConfig[phase]).forEach(type => {
                        updatedPatientSpecificConfig[phase][type] = (updatedPatientSpecificConfig[phase][type] || []).map(p => p === editingProductId ? productName : p);
                    });
                });

                return {
                    ...condition,
                    products: updatedProductsInPhases,
                    productDetails: updatedProductDetails,
                    patientSpecificConfig: updatedPatientSpecificConfig,
                };
            })
          );
          success = true;
        } else { // Name didn't change
          success = true; 
        }
      } else { // Adding new product
        console.log(`SUBMIT_NEW_ITEM: Staging addition of new product ${productName}`);
        // Instead of immediate Supabase call, add to local list
        if (!allProducts.includes(productName)) {
          setAllProducts(prev => [...prev, productName].sort());
        }
          success = true;
        }

  } else if (modalType === 'condition') {
    // This is now handled by handleSaveChanges
    console.log(`SUBMIT_NEW_ITEM: Staging new condition for addition: ${itemName}`);
    const newConditionObject = {
        name: itemName,
        category: newItemData.category || (categories.length > 0 ? categories[0] : ''),
        phases: newItemData.phases || ['Prep', 'Acute', 'Maintenance'],
        dds: newItemData.dds || [],
        patientType: newItemData.patientType || 'Types 1 to 4',
        products: newItemData.products || { Prep: [], Acute: [], Maintenance: [] },
        productDetails: newItemData.productDetails || {},
        patientSpecificConfig: newItemData.patientSpecificConfig || {},
        conditionSpecificResearch: newItemData.conditionSpecificResearch || {},
        pitchPoints: newItemData.pitchPoints || '',
        scientificRationale: newItemData.scientificRationale || '',
        clinicalEvidence: newItemData.clinicalEvidence || '',
        handlingObjections: newItemData.handlingObjections || '',
        // No db_id, which marks it as new
      };
    setEditedConditions(prev => [...prev, newConditionObject]);
      success = true;

  } else if (modalType === 'category') {
    console.log(`SUBMIT_NEW_ITEM: Staging addition of new category ${itemName}`);
    if (!categories.includes(itemName)) {
      setCategories(prev => [...prev, itemName].sort());
    }
    success = true;
  } else if (modalType === 'ddsType') {
    console.log(`SUBMIT_NEW_ITEM: Staging addition of new DDS Type ${itemName}`);
    if (!ddsTypes.includes(itemName)) {
      setDdsTypes(prev => [...prev, itemName].sort());
    }
        success = true;
  }
  
  if (success) {
    // For product edits, ensure local UI reflects change before full reload if needed
    // For adds, the reload will bring in the new item.
     if (modalType === 'product' && editingProductId && editingProductId !== itemName) {
        // If a product was renamed, update allProducts list locally for immediate UI feedback
        // The full reload from loadInitialData will solidify this.
        setAllProducts(prev => prev.map(p => p === editingProductId ? itemName : p).sort());
        // Also update editedConditions to reflect the rename in product lists and details
        setEditedConditions(prevConditions =>
            prevConditions.map(condition => {
              const updatedProductsInPhases = { ...condition.products };
              Object.keys(updatedProductsInPhases).forEach(phase => {
                updatedProductsInPhases[phase] = updatedProductsInPhases[phase].map(p =>
                p === editingProductId ? itemName : 
                p === `${editingProductId} (Type 3/4 Only)` ? `${itemName} (Type 3/4 Only)` : p
              );
            });
            const updatedProductDetails = { ...condition.productDetails };
            if (updatedProductDetails[editingProductId]) {
                updatedProductDetails[itemName] = updatedProductDetails[editingProductId];
              delete updatedProductDetails[editingProductId];
            }
            // Update patientSpecificConfig if it contains the product name
            const updatedPatientSpecificConfig = JSON.parse(JSON.stringify(condition.patientSpecificConfig || {}));
            Object.keys(updatedPatientSpecificConfig).forEach(phase => {
                Object.keys(updatedPatientSpecificConfig[phase]).forEach(type => {
                    updatedPatientSpecificConfig[phase][type] = (updatedPatientSpecificConfig[phase][type] || []).map(p => p === editingProductId ? itemName : p);
                });
            });

            return { 
              ...condition, 
                products: updatedProductsInPhases,
                productDetails: updatedProductDetails,
                patientSpecificConfig: updatedPatientSpecificConfig,
            };
          })
        );
     }


    setShowAddModal(false);
    setNewItemData({});
    setEditingProductId(null);
    // setIsEditing(false); // Might reset too early if other edits are pending for conditions
  } else {
    // Handle failure (e.g., show error message to user)
    // Modal remains open for correction or explicit close
    console.error("handleSubmitNewItem: An error occurred, item not saved/added.");
  }
};
  
  // Delete confirmation
  const confirmDelete = (type, item) => {
    setItemToDelete({ type, item });
    setShowDeleteModal(true);
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (isDeleting) return;
  
    try {
      setIsEditing(true);
      setIsDeleting(true);
  const { type, item } = itemToDelete;
  let success = false;
  
  if (type === 'condition') {
    if (!item.db_id) {
            console.log("DELETE: Staging deletion of a new, unsaved condition locally:", item.name);
        setEditedConditions(prev => prev.filter(c => c.name !== item.name));
        if (selectedCondition && selectedCondition.name === item.name) {
                const remainingConditions = editedConditions.filter(c => c.name !== item.name);
                setSelectedCondition(remainingConditions.length > 0 ? remainingConditions[0] : null);
            }
            success = true;
        } else {
            console.log(`DELETE: Staging deletion of condition "${item.name}" (ID: ${item.db_id}).`);
            setConditionsToDelete(prev => {
              if (prev.includes(item.db_id)) {
                  return prev;
              }
              return [...prev, item.db_id];
            });
            setEditedConditions(prev => prev.filter(c => c.db_id !== item.db_id));
            if (selectedCondition && selectedCondition.db_id === item.db_id) {
                const remainingConditions = editedConditions.filter(c => c.db_id !== item.db_id);
                setSelectedCondition(remainingConditions.length > 0 ? remainingConditions[0] : null);
            }
        success = true;
        }
      } else if (type === 'product') {
        console.log(`DELETE: Staging deletion of product "${item}".`);
        // Instead of immediate Supabase call, remove from local lists
        setAllProducts(prev => prev.filter(p => p !== item));
        // Clean up from local productRenames if any involve this product
        setProductRenames(prevRenames => prevRenames.filter(r => r.oldName !== item && r.newName !== item));
        success = true;
  } else if (type === 'category') {
    if (item === 'All') { // 'All' category should not be deleted
      setShowDeleteModal(false); setItemToDelete(null); return;
    }
        console.log(`DELETE: Staging deletion of category "${item}".`);
        setCategories(prev => prev.filter(c => c !== item));
        // When a category is deleted, conditions using it should be updated to have no category.
        setEditedConditions(prev => prev.map(cond => {
            if (cond.category === item) {
                return { ...cond, category: null }; // or a default category if that's preferred
            }
            return cond;
        }));
        success = true;
  } else if (type === 'ddsType') {
     if (item === 'All') { // 'All' DDS type should not be deleted
      setShowDeleteModal(false); setItemToDelete(null); return;
    }
        console.log(`DELETE: Staging deletion of DDS Type "${item}".`);
        setDdsTypes(prev => prev.filter(d => d !== item));
        // When a DDS Type is deleted, remove it from any conditions that use it.
        setEditedConditions(prev => prev.map(cond => {
            if (cond.dds.includes(item)) {
                return { ...cond, dds: cond.dds.filter(d => d !== item) };
            }
            return cond;
        }));
        success = true;
  }
  
  if (success) {
        // For local-only changes, we don't need to reload, just close the modal.
        // The main save button will handle Supabase sync and subsequent reload.
        // console.log("DELETE: Operation successful, reloading initial data.");
        // await loadInitialData();
  } else {
    console.error("DELETE: An error occurred during deletion. Data might be out of sync.");
  }
    } finally {
  setShowDeleteModal(false);
  setItemToDelete(null);
      setIsDeleting(false);
    }
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
              <Select.Trigger className="px-3 py-1 text-sm border border-gray-300 rounded-md flex items-center focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c]">
                <User size={15} className="mr-1 text-[#15396c]" />
                <Select.Value />
                <Select.Icon><ChevronDown size={15} /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white rounded-md shadow-lg border min-w-[220px] z-[9999]">
                  <Select.Viewport className="p-1">
                      <Select.Item
                        key="all"
                        value="All"
                        className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                      >
                      <Select.ItemText>All Patient Types</Select.ItemText>
                    </Select.Item>
                    {patientTypes.map((type) => (
                      <Select.Item
                        key={type.id}
                        value={type.name}
                        className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                      >
                        <Select.ItemText>{type.name}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
        
        {activePatientType !== 'all' && (
          <div className="mb-4 p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-700 flex items-center">
            <Info size={15} className="mr-1 flex-shrink-0 text-[#15396c]" />
            <span>
              Configuring products specifically for <strong>{activePatientType}</strong>.
              Products added here will only be recommended for this patient type.
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Products for {activePatientType === 'all' ? 'All Patient Types' : `${activePatientType}`}</span>
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
            {allProducts
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
  if (editedConditions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8">
              <h2 className="text-xl font-bold mb-4">Knowledge Base Administrator</h2>
              <p>Loading conditions...</p>
              <button onClick={onClose} className="mt-4 px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                  Close
              </button>
          </div>
      </div>
    );
  }

  // Competitive advantage functions
  const handleOpenCompetitiveAdvantage = (productName) => {
    setSelectedProductForAdvantage(productName);
    
    // Load existing competitive advantage data from Supabase
    loadCompetitiveAdvantageFromSupabase(productName);
    
    setCompetitiveAdvantageModalOpen(true);
  };

  const loadCompetitiveAdvantageFromSupabase = async (productName) => {
    try {
      // Load competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitive_advantage_competitors')
        .select('competitor_name, advantages')
        .eq('product_name', productName);
      
      if (competitorsError) {
        console.error('Error loading competitors:', competitorsError);
      }
      
      // Load active ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('competitive_advantage_active_ingredients')
        .select('ingredient_name, advantages')
        .eq('product_name', productName);
      
      if (ingredientsError) {
        console.error('Error loading active ingredients:', ingredientsError);
      }
      
      // Format data for the component
      const competitors = (competitorsData || []).map(item => ({
        name: item.competitor_name,
        advantages: item.advantages || ''
      }));
      
      const activeIngredients = (ingredientsData || []).map(item => ({
        name: item.ingredient_name,
        advantages: item.advantages || ''
      }));
      
      setCompetitiveAdvantageData({
        competitors,
        activeIngredients
      });
      
    } catch (error) {
      console.error('Error loading competitive advantage:', error);
      // Initialize with empty structure on error
      setCompetitiveAdvantageData({
        competitors: [],
        activeIngredients: []
      });
    }
  };

  const saveCompetitiveAdvantage = async () => {
    if (!selectedProductForAdvantage) return;
    
    try {
      setIsEditing(true);
      
      // Delete existing competitors for this product
      await supabase
        .from('competitive_advantage_competitors')
        .delete()
        .eq('product_name', selectedProductForAdvantage);
      
      // Delete existing active ingredients for this product
      await supabase
        .from('competitive_advantage_active_ingredients')
        .delete()
        .eq('product_name', selectedProductForAdvantage);
      
      // Insert new competitors
      if (competitiveAdvantageData.competitors && competitiveAdvantageData.competitors.length > 0) {
        const competitorsToInsert = competitiveAdvantageData.competitors
          .filter(comp => comp.name.trim()) // Only insert competitors with names
          .map(comp => ({
            product_name: selectedProductForAdvantage,
            competitor_name: comp.name,
            advantages: comp.advantages || ''
          }));
        
        if (competitorsToInsert.length > 0) {
          const { error: competitorsError } = await supabase
            .from('competitive_advantage_competitors')
            .insert(competitorsToInsert);
          
          if (competitorsError) {
            console.error('Error saving competitors:', competitorsError);
            return;
          }
        }
      }
      
      // Insert new active ingredients
      if (competitiveAdvantageData.activeIngredients && competitiveAdvantageData.activeIngredients.length > 0) {
        const ingredientsToInsert = competitiveAdvantageData.activeIngredients
          .filter(ing => ing.name.trim()) // Only insert ingredients with names
          .map(ing => ({
            product_name: selectedProductForAdvantage,
            ingredient_name: ing.name,
            advantages: ing.advantages || ''
          }));
        
        if (ingredientsToInsert.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('competitive_advantage_active_ingredients')
            .insert(ingredientsToInsert);
          
          if (ingredientsError) {
            console.error('Error saving active ingredients:', ingredientsError);
            return;
          }
        }
      }
      
      console.log('Competitive advantage saved successfully for', selectedProductForAdvantage);
      
      // Close modal
      setCompetitiveAdvantageModalOpen(false);
      setSelectedProductForAdvantage(null);
      
      // Show success notification
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving competitive advantage:', error);
    }
  };

  const addCompetitor = () => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: [...prev.competitors, {
        name: '',
        advantages: ''
      }]
    }));
  };

  const addActiveIngredient = () => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: [...prev.activeIngredients, {
        name: '',
        advantages: ''
      }]
    }));
  };

  const updateCompetitor = (index, field, value) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const updateActiveIngredient = (index, field, value) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: prev.activeIngredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeCompetitor = (index) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const removeActiveIngredient = (index) => {
    setCompetitiveAdvantageData(prev => ({
      ...prev,
      activeIngredients: prev.activeIngredients.filter((_, i) => i !== index)
    }));
  };

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
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${
                    isSaving ? 'bg-[#15396c]/60' : 'bg-[#15396c] hover:bg-[#15396c]/90'
                  }`}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
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
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
            <Tabs.Trigger
              value="importExport"
              className={clsx(
                "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                activeTab === "importExport" 
                  ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                  : "text-black hover:bg-gray-200 hover:text-gray-700"
              )}
            >
              Import/Export
            </Tabs.Trigger>
            <Tabs.Trigger
              value="conditions"
              className={clsx(
                "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                activeTab === "conditions" 
                  ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                  : "text-black hover:bg-gray-200 hover:text-gray-700"
              )}
            >
              Conditions
            </Tabs.Trigger>
            <Tabs.Trigger
              value="products"
              className={clsx(
                "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                activeTab === "products" 
                  ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                  : "text-black hover:bg-gray-200 hover:text-gray-700"
              )}
            >
              Products
            </Tabs.Trigger>
            <Tabs.Trigger
              value="categories"
              className={clsx(
                "flex-1 px-6 py-3 text-sm font-medium text-center focus:outline-none transition-all duration-200",
                activeTab === "categories" 
                  ? "bg-[#15396c] text-white shadow-[inset_0_0_0_4px_#15396c]"
                  : "text-black hover:bg-gray-200 hover:text-gray-700"
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
                setEditedConditions(importedData);
                setIsEditing(true);
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
                    className="p-1 text-[#15396c] hover:text-[#15396c]/80 inline-flex items-center text-sm"
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
                        "px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group transition-colors border-l-4",
                        selectedCondition && selectedCondition.name === condition.name
                          ? "bg-[#15396c] border-[#15396c]"
                          : "hover:bg-gray-50 border-transparent"
                      )}
                      onClick={() => handleConditionSelect(condition)}
                    >
                      <div>
                        <div className={clsx(
                          "font-medium text-sm",
                          selectedCondition && selectedCondition.name === condition.name ? "text-white" : "text-black"
                        )}>
                          {condition.name}
                        </div>
                        <div className={clsx(
                          "text-xs",
                          selectedCondition && selectedCondition.name === condition.name ? "text-gray-200" : "text-gray-500"
                        )}>
                          {condition.category}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete('condition', condition);
                        }}
                        className={clsx(
                          "opacity-0 group-hover:opacity-100 hover:text-red-700 p-1",
                          selectedCondition && selectedCondition.name === condition.name ? "text-red-300" : "text-red-500"
                        )}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
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
                              className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-sm flex items-center"
                            >
                              {dds}
                              <button
                                onClick={() => {
                                  const updatedDds = selectedCondition.dds.filter(d => d !== dds);
                                  updateConditionField(selectedCondition.name, 'dds', updatedDds);
                                }}
                                className="ml-1 text-slate-700 hover:text-slate-900"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
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
                          className="px-3 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {/* Products by Phase with Patient Type Filtering */}
                    <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Products by Phase</h3>
                      
                      <Tabs.Root defaultValue={selectedCondition.phases[0]} className="border rounded-md">
                        <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
                          {selectedCondition.phases.map((phase, index) => {
                            // Different opacity levels of the selected condition color for each phase
                            const getPhaseColor = (phaseIndex) => {
                              const colors = [
                                'bg-[#15396c]/40', // First phase - 40% opacity
                                'bg-[#15396c]/60', // Second phase - 60% opacity  
                                'bg-[#15396c]/80'  // Third phase - 80% opacity
                              ];
                              return colors[phaseIndex] || 'bg-[#15396c]/40';
                            };
                            
                            return (
                            <Tabs.Trigger
                              key={phase}
                              value={phase}
                              className={clsx(
                                  "flex-1 px-4 py-2 text-sm font-medium text-center focus:outline-none transition-all duration-200 text-white",
                                  getPhaseColor(index),
                                  "data-[state=active]:shadow-[inset_0_0_0_4px_#15396c]",
                                  "data-[state=inactive]:hover:shadow-[inset_0_0_0_2px_rgba(156,163,175,0.5)]"
                              )}
                            >
                              {phase} Phase
                            </Tabs.Trigger>
                            );
                          })}
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
                    {/* Condition-Specific Research */}
                    <div>
                      <h3 className="font-medium text-lg mb-3">Condition-Specific Research</h3>
                      
                      {selectedCondition && selectedCondition.productDetails && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Product to Manage Research:
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            onChange={(e) => {
                              if (e.target.value) {
                                // Store the selected product name in state
                                setSelectedResearchProduct(e.target.value);
                              }
                            }}
                            value={selectedResearchProduct || ''}
                          >
                            <option value="">Select a product...</option>
                            {Object.keys(selectedCondition.productDetails).map(prod => (
                              <option key={prod} value={prod}>{prod}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {selectedResearchProduct && (
                        <div>
                          <h4 className="font-medium text-md mb-2">
                            Research Articles for {selectedResearchProduct}
                          </h4>
                          
                          {/* Initialize condition-specific research if it doesn't exist */}
                          {!selectedCondition.conditionSpecificResearch && updateConditionField(
                            selectedCondition.name, 
                            'conditionSpecificResearch', 
                            {}
                          )}
                          
                          {/* Check if we have condition-specific research for this product */}
                          {selectedCondition.conditionSpecificResearch && 
                          selectedCondition.conditionSpecificResearch[selectedResearchProduct] && 
                          selectedCondition.conditionSpecificResearch[selectedResearchProduct].map((article, index) => (
                            <div key={index} className="flex space-x-2 mb-4 border-b pb-4">
                              <div className="flex-grow space-y-2">
                                <input
                                  type="text"
                                  placeholder="Article title"
                                  value={article.title || ''}
                                  onChange={(e) => {
                                    const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                                    const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                                    updatedArticles[index].title = e.target.value;
                                    
                                    updatedResearch[selectedResearchProduct] = updatedArticles;
                                    
                                    updateConditionField(
                                      selectedCondition.name, 
                                      'conditionSpecificResearch', 
                                      updatedResearch
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                
                                <input
                                  type="text"
                                  placeholder="Author/Source"
                                  value={article.author || ''}
                                  onChange={(e) => {
                                    const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                                    const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                                    updatedArticles[index].author = e.target.value;
                                    
                                    updatedResearch[selectedResearchProduct] = updatedArticles;
                                    
                                    updateConditionField(
                                      selectedCondition.name, 
                                      'conditionSpecificResearch', 
                                      updatedResearch
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                
                                <textarea
                                  placeholder="Abstract (optional)"
                                  value={article.abstract || ''}
                                  onChange={(e) => {
                                    const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                                    const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                                    updatedArticles[index].abstract = e.target.value;
                                    
                                    updatedResearch[selectedResearchProduct] = updatedArticles;
                                    
                                    updateConditionField(
                                      selectedCondition.name, 
                                      'conditionSpecificResearch', 
                                      updatedResearch
                                    );
                                  }}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                
                                <input
                                  type="text"
                                  placeholder="URL (optional)"
                                  value={article.url || ''}
                                  onChange={(e) => {
                                    const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                                    const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                                    updatedArticles[index].url = e.target.value;
                                    
                                    updatedResearch[selectedResearchProduct] = updatedArticles;
                                    
                                    updateConditionField(
                                      selectedCondition.name, 
                                      'conditionSpecificResearch', 
                                      updatedResearch
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              
                              <button
                                onClick={() => {
                                  const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                                  const updatedArticles = [...(updatedResearch[selectedResearchProduct] || [])];
                                  updatedArticles.splice(index, 1);
                                  
                                  updatedResearch[selectedResearchProduct] = updatedArticles;
                                  
                                  updateConditionField(
                                    selectedCondition.name, 
                                    'conditionSpecificResearch', 
                                    updatedResearch
                                  );
                                }}
                                className="p-2 border border-red-300 rounded-md text-red-500 hover:bg-red-50 self-start"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          
                          <button
                            onClick={() => {
                              const updatedResearch = {...(selectedCondition.conditionSpecificResearch || {})};
                              const updatedArticles = [...(updatedResearch[selectedResearchProduct] || []), { title: '', author: '', abstract: '', url: '' }];
                              
                              updatedResearch[selectedResearchProduct] = updatedArticles;
                              
                              updateConditionField(
                                selectedCondition.name, 
                                'conditionSpecificResearch', 
                                updatedResearch
                              );
                            }}
                            className="mt-2 px-3 py-2 border border-indigo-300 rounded-md text-indigo-600 hover:bg-indigo-50 text-sm flex items-center"
                          >
                            <Plus size={16} className="mr-1" />
                            Add Research Article
                          </button>
                        </div>
                      )}
                      
                      {!selectedResearchProduct && selectedCondition && (
                        <div className="text-gray-500 italic">
                          Select a product from the dropdown above to manage its research articles.
                        </div>
                      )}
                    </div>
                    <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Product Details</h3>
                      
                      {Object.keys(getAllProductsForCondition(selectedCondition)).length > 0 ? (
                        <div className="space-y-6">
                          {Object.keys(getAllProductsForCondition(selectedCondition)).map((productName) => {
                            const allProducts = getAllProductsForCondition(selectedCondition);
                            const productDetails = allProducts[productName];
                            return (
                            <div key={productName} className="border rounded-md p-4 bg-gray-50">
                              <h4 className="font-medium text-md mb-3">{productName}</h4>
                              
                              <div className="space-y-3">
                                {/* Usage Instructions with Phase Tabs */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usage Instructions
                                  </label>
                                  
                                  {selectedCondition.phases && selectedCondition.phases.length > 0 ? (
                                    <div className="border rounded-md">
                                      <Tabs.Root defaultValue={selectedCondition.phases[0]} className="w-full">
                                        <Tabs.List className="flex bg-gray-100 rounded-t-lg overflow-hidden">
                                          {selectedCondition.phases.map((phase, index) => {
                                            // Different opacity levels of the selected condition color for each phase
                                            const getPhaseColor = (phaseIndex) => {
                                              const colors = [
                                                'bg-[#15396c]/40', // First phase - 40% opacity
                                                'bg-[#15396c]/60', // Second phase - 60% opacity  
                                                'bg-[#15396c]/80'  // Third phase - 80% opacity
                                              ];
                                              return colors[phaseIndex] || 'bg-[#15396c]/40';
                                            };
                                            
                                            return (
                                              <Tabs.Trigger
                                                key={phase}
                                                value={phase}
                                                className={clsx(
                                                  "flex-1 px-4 py-2 text-sm font-medium text-center focus:outline-none transition-all duration-200 text-white",
                                                  getPhaseColor(index),
                                                  "data-[state=active]:shadow-[inset_0_0_0_4px_#15396c]",
                                                  "data-[state=inactive]:hover:shadow-[inset_0_0_0_2px_rgba(156,163,175,0.5)]"
                                                )}
                                              >
                                                {phase}
                                              </Tabs.Trigger>
                                            );
                                          })}
                                        </Tabs.List>
                                        
                                        {selectedCondition.phases.map((phase) => (
                                          <Tabs.Content key={phase} value={phase} className="p-4">
                                            <textarea
                                              value={
                                                productDetails.usage && 
                                                typeof productDetails.usage === 'object' ?
                                                productDetails.usage[phase] || '' :
                                                productDetails.usage || ''
                                              }
                                              onChange={(e) => updateProductDetail(
                                                selectedCondition.name,
                                                productName,
                                                'usage',
                                                e.target.value,
                                                phase
                                              )}
                                              rows={3}
                                              placeholder={`Enter usage instructions for ${phase} phase. Line breaks will be preserved in the display.`}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                                            />
                                          </Tabs.Content>
                                        ))}
                                      </Tabs.Root>
                                    </div>
                                  ) : (
                                    <textarea
                                      value={productDetails.usage || ''}
                                      onChange={(e) => updateProductDetail(
                                        selectedCondition.name,
                                        productName,
                                        'usage',
                                        e.target.value
                                      )}
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                                    />
                                  )}
                                </div>
                                
                                {/* Scientific Rationale */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Scientific Rationale
                                  </label>
                                  <textarea
                                    value={productDetails.rationale || ''}
                                    onChange={(e) => updateProductDetail(
                                      selectedCondition.name,
                                      productName,
                                      'rationale',
                                      e.target.value
                                    )}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter scientific rationale. Line breaks will be preserved in the display."
                                  />
                                </div>
                                
                                {/* Clinical Evidence */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Clinical Evidence
                                  </label>
                                  <textarea
                                    value={productDetails.clinicalEvidence || ''}
                                    onChange={(e) => updateProductDetail(
                                      selectedCondition.name,
                                      productName,
                                      'clinicalEvidence',
                                      e.target.value
                                    )}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter clinical evidence. Line breaks will be preserved in the display."
                                  />
                                </div>
                                
                                {/* Handling Objections */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Handling Objections
                                  </label>
                                  <textarea
                                                          value={productDetails.handlingObjections || ''}
                      onChange={(e) => updateProductDetail(
                        selectedCondition.name,
                        productName,
                        'handlingObjections',
                                      e.target.value
                                    )}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter objection handling information. Line breaks will be preserved in the display."
                                  />
                                </div>
                                
                                {/* Key Pitch Points */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Key Pitch Points
                                  </label>
                                  <textarea
                                    value={productDetails.pitchPoints || ''}
                                    onChange={(e) => updateProductDetail(
                                      selectedCondition.name,
                                      productName,
                                      'pitchPoints',
                                      e.target.value
                                    )}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter key pitch points. Line breaks will be preserved in the display."
                                  />
                                </div>
                                
                                {/* Research Articles Section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Research Articles
                                  </label>
                                  
                                  {productDetails.researchArticles && 
                                    productDetails.researchArticles.map((article, index) => (
                                    <div key={index} className="flex space-x-2 mb-2">
                                      <div className="flex-grow space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Article title"
                                          value={article.title || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...productDetails.researchArticles];
                                            updatedArticles[index].title = e.target.value;
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <input
                                          type="text"
                                          placeholder="Author/Source"
                                          value={article.author || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...productDetails.researchArticles];
                                            updatedArticles[index].author = e.target.value;
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <textarea
                                          placeholder="Abstract (optional)"
                                          value={article.abstract || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...productDetails.researchArticles];
                                            updatedArticles[index].abstract = e.target.value;
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                          rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <input
                                          type="text"
                                          placeholder="URL (optional)"
                                          value={article.url || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...productDetails.researchArticles];
                                            updatedArticles[index].url = e.target.value;
                                            updateProductDetail(
                                              selectedCondition.name, 
                                              productName, 
                                              'researchArticles', 
                                              updatedArticles
                                            );
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                      </div>
                                      
                                      <button
                                        onClick={() => {
                                          const updatedArticles = [...productDetails.researchArticles];
                                          updatedArticles.splice(index, 1);
                                          updateProductDetail(
                                            selectedCondition.name, 
                                            productName, 
                                            'researchArticles', 
                                            updatedArticles
                                          );
                                        }}
                                        className="p-2 border border-red-300 rounded-md text-red-500 hover:bg-red-50 self-start"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                  
                                  <button
                                    onClick={() => {
                                      const currentArticles = productDetails.researchArticles || [];
                                      const updatedArticles = [...currentArticles, { title: '', author: '', url: '' }];
                                      updateProductDetail(
                                        selectedCondition.name, 
                                        productName, 
                                        'researchArticles', 
                                        updatedArticles
                                      );
                                    }}
                                    className="mt-2 px-3 py-2 border border-indigo-300 rounded-md text-indigo-600 hover:bg-indigo-50 text-sm flex items-center"
                                  >
                                    <Plus size={16} className="mr-1" />
                                    Add Research Article
                                  </button>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">
                          No product details available. Add products to phases first.
                        </p>
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
                className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add New Product
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProducts.map((product) => {
                // Count how many conditions use this product
                const conditionCount = editedConditions.filter(c => 
                  Object.values(c.products || {}).some(products => 
                    products.includes(product) || products.includes(`${product} (Type 3/4 Only)`)
                  )
                ).length;
                
                return (
                <div key={product} className="border rounded-lg p-4 hover:bg-gray-50 group">
                <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-md mb-2">{product}</h4>
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Used in: </span>
                          {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
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
                    </div>
                );
              })}
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
                    className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
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
                    className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
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
              {modalType === 'product' && (editingProductId ? `Edit Product: ${editingProductId}` : 'Add New Product')}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                        placeholder="Enter condition name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newItemData.category || ''}
                        onChange={(e) => setNewItemData({...newItemData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                      >
                        <option value="">Select a category</option>
                        {categories.filter(cat => cat !== 'All').map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-gray-500">
                      All detailed configuration (phases, products, scientific rationale, etc.) can be configured after creating the condition in the Conditions tab.
                    </p>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={newItemData.name || ''}
                        onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#15396c] focus:border-[#15396c]"
                      placeholder="Enter product name"
                      />
                    <p className="mt-2 text-sm text-gray-500">
                      Product details (usage, rationale, etc.) are configured per condition in the Conditions tab.
                    </p>
                    
                    {/* Competitive Advantage Button - only show when editing existing product */}
                    {editingProductId && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => {
                            // Use the current product name (either original or edited)
                            const productName = newItemData.name || editingProductId;
                            handleOpenCompetitiveAdvantage(productName);
                            }}
                          className="w-full px-3 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center justify-center"
                          >
                          <Target size={16} className="mr-2" />
                          Manage Competitive Advantage
                          </button>
                        <p className="mt-1 text-xs text-gray-500">
                          Configure competitive advantages against competitors and active ingredients.
                        </p>
                        </div>
                    )}
                    </div>
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
                    newItemData.name ? 'bg-[#15396c] hover:bg-[#15396c]/90' : 'bg-[#15396c]/40 cursor-not-allowed'
                  }`}
                >
                  {editingProductId ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        
        {/* Delete Confirmation Modal */}
        <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
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
                  disabled={isDeleting}
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${
                    isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Competitive Advantage Modal */}
        <Dialog.Root open={competitiveAdvantageModalOpen} onOpenChange={setCompetitiveAdvantageModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Competitive Advantage - {selectedProductForAdvantage}
                  </Dialog.Title>
                  <Dialog.Close className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </Dialog.Close>
                </div>

                <div className="space-y-8">
                  {/* Competitors Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Competitors</h3>
                      <button
                        onClick={addCompetitor}
                        className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Competitor
                      </button>
                    </div>

                    {competitiveAdvantageData.competitors.map((competitor, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <input
                            type="text"
                            placeholder="Competitor name"
                            value={competitor.name}
                            onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-3 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                          />
                          <button
                            onClick={() => removeCompetitor(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {competitor.name || 'Competitor Information'}:
                          </label>
                          <textarea
                            placeholder="Enter competitive advantage information..."
                            value={competitor.advantages}
                            onChange={(e) => updateCompetitor(index, 'advantages', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                            rows={4}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active Ingredients Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Active Ingredients</h3>
                      <button
                        onClick={addActiveIngredient}
                        className="px-3 py-1.5 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90 text-sm flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Active Ingredient
                      </button>
                    </div>

                    {competitiveAdvantageData.activeIngredients.map((ingredient, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <input
                            type="text"
                            placeholder="Active ingredient name"
                            value={ingredient.name}
                            onChange={(e) => updateActiveIngredient(index, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-3 focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                          />
                          <button
                            onClick={() => removeActiveIngredient(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {ingredient.name || 'Active Ingredient Information'}:
                          </label>
                          <textarea
                            placeholder="Enter competitive advantage information..."
                            value={ingredient.advantages}
                            onChange={(e) => updateActiveIngredient(index, 'advantages', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] hover:border-[#15396c]"
                            rows={4}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setCompetitiveAdvantageModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCompetitiveAdvantage}
                    className="px-4 py-2 bg-[#15396c] text-white rounded-md hover:bg-[#15396c]/90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

export default AdminPanel;