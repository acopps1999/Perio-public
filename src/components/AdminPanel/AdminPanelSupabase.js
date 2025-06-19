import { supabase } from '../../supabaseClient';

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
    console.log('PERFORMANCE: Cache before invalidation:', conditionsCache ? 'EXISTS' : 'NULL');
    conditionsCache = null;
    cacheTimestamp = null;
    console.log('PERFORMANCE: Cache after invalidation:', conditionsCache ? 'EXISTS' : 'NULL');
  };
  
  const loadConditionsFromSupabase = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && conditionsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      console.log('PERFORMANCE: Using cached conditions data');
      return conditionsCache;
    }
    
    console.log('PERFORMANCE: Starting optimized conditions load from Supabase...');
    console.log('PERFORMANCE: forceRefresh =', forceRefresh);
    console.log('PERFORMANCE: conditionsCache exists =', !!conditionsCache);
    console.log('PERFORMANCE: cacheTimestamp exists =', !!cacheTimestamp);
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
      
      // Regular research articles are now managed separately from condition-specific research
      // Removing duplicate save to prevent 4x saving issue
      // const researchRecords = (details.researchArticles || []).map(article => ({
      //     procedure_id: newProcedureId,
      //     product_id: productId,
      //     title: article.title,
      //     author: article.author,
      //     abstract: article.abstract,
      //     url: article.url,
      // }));
      // if (!await batchInsert('condition_product_research_articles', researchRecords, `product ${productName} in procedure ${newProcedureId}`)) {
      //    // Rollback?
      // }
    }

    // 4c. Insert condition-specific research articles from conditionSpecificResearch field
    if (condition.conditionSpecificResearch) {
      for (const productName of Object.keys(condition.conditionSpecificResearch)) {
        const productId = productNameToId[productName];
        if (productId) {
          const conditionResearchRecords = (condition.conditionSpecificResearch[productName] || []).map(article => ({
            procedure_id: newProcedureId,
            product_id: productId,
            title: article.title,
            author: article.author,
            abstract: article.abstract,
            url: article.url,
          }));
          if (conditionResearchRecords.length > 0) {
            if (!await batchInsert('condition_product_research_articles', conditionResearchRecords, `condition-specific research for ${productName} in procedure ${newProcedureId}`)) {
              // Rollback?
            }
          }
        }
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
    }

    // 4c. Insert condition-specific research articles from conditionSpecificResearch field
    if (condition.conditionSpecificResearch) {
      for (const productName of Object.keys(condition.conditionSpecificResearch)) {
        const productId = productNameToId[productName];
        if (productId) {
          const conditionResearchRecords = (condition.conditionSpecificResearch[productName] || []).map(article => ({
            procedure_id: procedureId,
            product_id: productId,
            title: article.title,
            author: article.author,
            abstract: article.abstract,
            url: article.url,
          }));
          if (conditionResearchRecords.length > 0) {
            await supabase.from('condition_product_research_articles').insert(conditionResearchRecords);
          }
        }
      }
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
                  pppRecordsToInsert.push({
                    procedure_id: procedureId,
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
  

// Export all functions
export {
  addCategoryToSupabase,
  deleteCategoryFromSupabase,
  loadCategoriesFromSupabase,
  syncCategoriesWithSupabase,
  addDdsTypeToSupabase,
  deleteDdsTypeFromSupabase,
  loadDdsTypesFromSupabase,
  syncDdsTypesWithSupabase,
  addProductToSupabase,
  updateProductInSupabase,
  deleteProductFromSupabase,
  loadProductsFromSupabase,
  syncProductsWithSupabase,
  loadConditionsFromSupabase,
  addConditionToSupabase,
  updateConditionInSupabase,
  deleteConditionFromSupabase,
  syncPhasesWithSupabase,
  buildPatientTypeMaps,
  getEntityIdMaps,
  invalidateConditionsCache,
  CACHE_DURATION
}; 