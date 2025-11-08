import { supabase } from '../../supabaseClient';
import { loadProcedures, refreshProceduresView } from '../../services/database';

// NEW Supabase helper for adding a single category
const addCategoryToSupabase = async (categoryName) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: categoryName }])
        .select();
      if (error) {
        return { success: false, error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error adding category (catch):', error);
      return { success: false, error };
    }
  };
  
  // NEW Supabase helper for deleting a single category
  const deleteCategoryFromSupabase = async (categoryName) => {
    try {
      // Fetch category ID first
      const { data: categoryData, error: fetchCatError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();
  
      if (fetchCatError || !categoryData) {
        return { success: false, error: fetchCatError || 'Category not found' };
      }
      const categoryId = categoryData.id;

      const { data: procedures, error: fetchProcsError } = await supabase
        .from('procedures')
        .select('id')
        .eq('category_id', categoryId);
  
      if (fetchProcsError) {
        console.error('Error fetching procedures for category:', fetchProcsError);
      }
  
      if (procedures && procedures.length > 0) {
        const procedureIdsToUpdate = procedures.map(p => p.id);
        const { error: updateError } = await supabase
          .from('procedures')
          .update({ category_id: null })
          .in('id', procedureIdsToUpdate);
        if (updateError) {
           return { success: false, error: updateError };
        }
      }
  
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('name', categoryName) // or .eq('id', categoryId)
        .select();
      if (error) {
        return { success: false, error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting category (catch):', error);
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
        return { success: false, error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error adding DDS type (catch):', error);
      return { success: false, error };
    }
  };
  
  // NEW Supabase helper for deleting a single DDS Type
  const deleteDdsTypeFromSupabase = async (ddsTypeName) => {
    try {
      const { data: dentistData, error: fetchDentistError } = await supabase
        .from('dentists')
        .select('id')
        .eq('name', ddsTypeName)
        .single();
  
      if (fetchDentistError || !dentistData) {
        return { success: false, error: fetchDentistError || 'DDS Type not found' };
      }
      const dentistId = dentistData.id;

      const { error: deleteRelationsError } = await supabase
          .from('procedure_dentists')
          .delete()
          .eq('dentist_id', dentistId);
      if (deleteRelationsError) {
          console.error('Error deleting procedure_dentists relations:', deleteRelationsError);
      }
  
      const { data, error } = await supabase
        .from('dentists')
        .delete()
        .eq('id', dentistId) // Delete by ID for safety
        .select();
      if (error) {
        return { success: false, error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting DDS type (catch):', error);
      return { success: false, error };
    }
  };
  
  
  // Supabase functions for product management
  const addProductToSupabase = async (productName) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{ name: productName }])
        .select();
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
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
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error updating product in Supabase:', error);
      return { success: false, error };
    }
  };
  
  const deleteProductFromSupabase = async (productName) => {
    try {

      // Step 0: Get the product ID first
      const { data: productData, error: productFetchError } = await supabase
        .from('products')
        .select('id')
        .eq('name', productName)
        .maybeSingle();

      if (productFetchError) {
        console.error('Error fetching product ID:', productFetchError);
        return { success: false, error: productFetchError };
      }

      if (!productData) {
        console.error('Product not found:', productName);
        return { success: false, error: { message: 'Product not found' } };
      }

      const productId = productData.id;

      // Step 1: Delete from procedure_phase_products (uses product_id, not product_name)
      const { error: pppError } = await supabase
        .from('procedure_phase_products')
        .delete()
        .eq('product_id', productId);

      if (pppError) {
        console.error('Error deleting from procedure_phase_products:', pppError);
        return { success: false, error: pppError };
      }

      // Step 2: Delete from competitive_advantage_competitors (uses product_name)
      const { error: compError } = await supabase
        .from('competitive_advantage_competitors')
        .delete()
        .eq('product_name', productName);

      if (compError) {
        console.error('Error deleting from competitive_advantage_competitors:', compError);
        return { success: false, error: compError };
      }

      // Step 3: Delete from competitive_advantage_active_ingredients (uses product_name)
      const { error: ingError } = await supabase
        .from('competitive_advantage_active_ingredients')
        .delete()
        .eq('product_name', productName);

      if (ingError) {
        console.error('Error deleting from competitive_advantage_active_ingredients:', ingError);
        return { success: false, error: ingError };
      }

      // Step 4: Finally delete the product itself
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select();

      if (error) {
        console.error('Error deleting product:', error);
        return { success: false, error };
      }

      await refreshProceduresView();
      invalidateConditionsCache();
      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error in deleteProductFromSupabase:', error);
      return { success: false, error };
    }
  };
  
  const loadProductsFromSupabase = async () => {
    try {
      // Use raw fetch to bypass broken Supabase client
      const productsUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/products?select=id,name,is_available&order=name.asc`;
      const response = await fetch(productsUrl, {
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      return { success: true, data: data.map(p => ({
        id: p.id,
        name: p.name,
        is_available: p.is_available !== null ? p.is_available : true
      })) };
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error loading products from Supabase:', error);
      return { success: false, error };
    }
  };
  
  const updateProductAvailabilityInSupabase = async (productId, isAvailable) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', productId);
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error updating product availability in Supabase:', error);
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
        return [];
      }
      return data.map(c => c.name);
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error loading categories from Supabase:', error);
      return [];
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
        return [];
      }
      return data.map(d => d.name);
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error loading DDS types from Supabase:', error);
      return [];
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
        console.error('🔴 buildPatientTypeMaps: Error:', error);
        return { nameToId: {}, idToName: {} };
      }

      const nameToId = {};
      const idToName = {};

      patientTypesData.forEach(pt => {
        nameToId[pt.name] = pt.id;
        idToName[pt.id] = pt.name;
      });

      return { nameToId, idToName };
    } catch (fetchError) {
      console.error('🔴 buildPatientTypeMaps: Exception:', fetchError);
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Exception fetching patient types:', fetchError);
      return { nameToId: {}, idToName: {} };
    }
  };
  
  // Simple cache for conditions data
  let conditionsCache = null;
  let cacheTimestamp = null;
  let loadingPromise = null; // Track the ongoing load promise
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // Cache invalidation helper
  const invalidateConditionsCache = () => {
    conditionsCache = null;
    cacheTimestamp = null;
  };
  
  const loadConditionsFromSupabase = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && conditionsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return conditionsCache;
    }

    // If already loading, return the existing promise
    if (loadingPromise && !forceRefresh) {
      return loadingPromise;
    }

    // Create and store the loading promise
    loadingPromise = (async () => {
      try {
        // Use new database service to load procedures
        // This replaces the old 7-query pattern with a cleaner implementation
        const conditions = await loadProcedures();

        // Cache the results
        conditionsCache = conditions;
        cacheTimestamp = Date.now();

        return conditions;

      } catch (error) {
        // TODO: Replace with proper error tracking (e.g., Sentry)
        console.error('Critical error loading conditions:', error);
        return [];
      } finally {
        loadingPromise = null; // Reset loading promise
      }
    })(); // Execute the async IIFE

    return loadingPromise;
  };
  
  // Placeholder for getting name-to-ID maps
  const getEntityIdMaps = async () => {
    let categoryNameToId = {};
    let productNameToId = {};
    let phaseNameToId = {}; // This might be static or fetched if dynamic
    let ddsTypeNameToId = {};
    // The new patient type map will be name -> ID.
    let patientTypeNameToIdMap = {};
  
    try {
      const { data: categoriesData, error: catError } = await supabase.from('categories').select('id, name');
      if (!catError) categoryNameToId = Object.fromEntries(categoriesData.map(c => [c.name, c.id]));

      const { data: productsData, error: prodError } = await supabase.from('products').select('id, name');
      if (!prodError) productNameToId = Object.fromEntries(productsData.map(p => [p.name, p.id]));

      const { data: phasesData, error: phaseError } = await supabase.from('phases').select('id, name');
      if (!phaseError) phaseNameToId = Object.fromEntries(phasesData.map(ph => [ph.name, ph.id]));

      const { data: ddsData, error: ddsError } = await supabase.from('dentists').select('id, name');
      if (!ddsError) ddsTypeNameToId = Object.fromEntries(ddsData.map(d => [d.name, d.id]));

      const patientTypeMaps = await buildPatientTypeMaps();
      patientTypeNameToIdMap = patientTypeMaps.nameToId;
  
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
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
    const { categoryNameToId, productNameToId, phaseNameToId, ddsTypeNameToId, patientTypeNameToIdMap } = entityIdMaps;

    // Check if condition name already exists
    const { data: existingCondition, error: checkError } = await supabase
      .from('procedures')
      .select('name')
      .eq('name', condition.name)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: checkError, data: null };
    }

    if (existingCondition) {
      const duplicateError = {
        code: 'DUPLICATE_NAME',
        message: `A condition named "${condition.name}" already exists. Please choose a different name.`,
        details: `Cannot create duplicate condition. Existing condition: "${existingCondition.name}"`
      };
      return { success: false, error: duplicateError, data: null };
    }

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
      
      // Provide better error message for constraint violations
      if (procedureError?.code === '23505') {
        const friendlyError = {
          code: 'DUPLICATE_NAME',
          message: `A condition named "${condition.name}" already exists. Please choose a different name.`,
          details: procedureError.message
        };
        return { success: false, error: friendlyError, data: null };
      }
      
      return { success: false, error: procedureError, data: null };
    }
    const newProcedureId = procedureData.id;
  
    // Helper function to batch inserts and log errors
    const batchInsert = async (tableName, records, context) => {
      if (records.length === 0) return true;
      const { error } = await supabase.from(tableName).insert(records);
      if (error) {
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
          continue;
      }
  
      const { error: pdError } = await supabase
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
    }

    // Insert condition-specific research articles from conditionSpecificResearch field
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

    // Refresh materialized view and cache
    await refreshProceduresView();
    invalidateConditionsCache();

    // Return the condition with its new db_id, potentially re-fetch or merge other generated fields if needed
    return { success: true, error: null, data: { ...condition, db_id: newProcedureId } };
  };
  
  const updateConditionInSupabase = async (condition, entityIdMaps) => {
    const { categoryNameToId, productNameToId, phaseNameToId, ddsTypeNameToId, patientTypeNameToIdMap } = entityIdMaps;
    const procedureId = condition.db_id;
  
    if (!procedureId) {
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
      return { success: false, error: procedureError, data: null };
    }
  
    // Helper for performing a diff-based sync on simple join tables
    const syncSimpleJoinTable = async (tableName, procedureId, localItemNames, idMap, fkColumn) => {
      
      // Get existing items from DB
      const { data: dbData, error: fetchError } = await supabase
        .from(tableName)
        .select(fkColumn)
        .eq('procedure_id', procedureId);
      
      if (fetchError) {
        return; // Or handle error more gracefully
      }
  
      const dbItemIds = dbData.map(row => row[fkColumn]);
      const localItemIds = localItemNames.map(name => idMap[name]).filter(id => id);
  
      const toAddIds = localItemIds.filter(id => !dbItemIds.includes(id));
      const toDeleteIds = dbItemIds.filter(id => !localItemIds.includes(id));
  
      if (toDeleteIds.length > 0) {
        await supabase.from(tableName).delete().eq('procedure_id', procedureId).in(fkColumn, toDeleteIds);
      }
      if (toAddIds.length > 0) {
        await supabase.from(tableName).insert(toAddIds.map(id => ({ procedure_id: procedureId, [fkColumn]: id })));
      }
    };
  
    // 2. Sync 'procedure_phases'
    await syncSimpleJoinTable('procedure_phases', procedureId, condition.phases, phaseNameToId, 'phase_id');
  
    // 3. Sync 'procedure_dentists'
    await syncSimpleJoinTable('procedure_dentists', procedureId, condition.dds, ddsTypeNameToId, 'dentist_id');
    
    // 4. Sync 'product_details' and their sub-tables.
    // This remains delete-then-insert due to its complexity, but the simpler joins above are now efficient.
    await supabase.from('phase_specific_usage').delete().eq('procedure_id', procedureId);
    await supabase.from('condition_product_research_articles').delete().eq('procedure_id', procedureId);
    await supabase.from('product_details').delete().eq('procedure_id', procedureId);
    
    for (const productName of Object.keys(condition.productDetails)) {
      const details = condition.productDetails[productName];
      const productId = productNameToId[productName];
      if (!productId) {
          continue;
      }
      const { error: pdError } = await supabase
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

      if (pdError) {
          console.error('Error inserting product detail:', pdError);
      }
  
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
          }
        }
      }
    }
  
    // 6. Sync 'procedure_phase_products'
    
    // First, get all existing recommendations for this procedure from the DB
    const { error: fetchPppError } = await supabase
      .from('procedure_phase_products')
      .select('id, phase_id, patient_type_id, product_id')
      .eq('procedure_id', procedureId);
  
    if (fetchPppError) {
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
      await supabase.from('procedure_phase_products').delete().eq('procedure_id', procedureId);
      
      if (pppRecordsToInsert.length > 0) {
          const { error: pppInsertError } = await supabase.from('procedure_phase_products').insert(pppRecordsToInsert);
          if (pppInsertError) {
    }
      }
    }

    // Refresh materialized view and cache
    await refreshProceduresView();
    invalidateConditionsCache();

    return { success: true, error: null, data: condition };
  };
  
    // Verification function to check for orphaned data (useful for debugging)
  const verifyDataIntegrity = async () => {
    const orphanedData = {};
    
    try {
      // First get all valid procedure IDs
      const { data: procedures, error: procError } = await supabase
        .from('procedures')
        .select('id');
      
      if (procError) {
        return { orphanedData: {}, isClean: false, error: procError };
      }

      const validProcedureIds = new Set(procedures.map(p => p.id));

      // Check for orphaned records in each related table
      const tables = [
        'phase_specific_usage',
        'condition_product_research_articles', 
        'procedure_phase_products',
        'product_details',
        'procedure_phases',
        'procedure_dentists'
      ];

      for (const table of tables) {
        try {
          // Get all procedure_ids from this table
          const { data: tableRecords, error } = await supabase
            .from(table)
            .select('procedure_id');

          if (error) {
            continue;
          }

          // Find orphaned procedure_ids
          const orphanedIds = [];
          const uniqueProcIds = [...new Set(tableRecords.map(r => r.procedure_id))];
          
          for (const procId of uniqueProcIds) {
            if (!validProcedureIds.has(procId)) {
              orphanedIds.push(procId);
            }
          }

          if (orphanedIds.length > 0) {
            orphanedData[table] = orphanedIds;
          } else {
          }
        } catch (error) {
          // TODO: Replace with proper error tracking (e.g., Sentry)
          console.error(`DATA_INTEGRITY: Exception checking ${table}:`, error);
        }
      }

      if (Object.keys(orphanedData).length === 0) {
      } else {
      }

      return { orphanedData, isClean: Object.keys(orphanedData).length === 0 };
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error during integrity check:', error);
      return { orphanedData: {}, isClean: false, error };
    }
  };

  const deleteConditionFromSupabase = async (conditionId) => {

    // Track deletion statistics for logging
    const deletionStats = {};
    let totalRecordsDeleted = 0;
    const errors = [];

    try {
      // First, get the condition name for logging
      const { data: procedureData } = await supabase
        .from('procedures')
        .select('name')
        .eq('id', conditionId)
        .single();

      const conditionName = procedureData?.name || `Unknown (ID: ${conditionId})`;

      // Order of deletion matters - start with tables that have foreign keys to 'procedures'
      // Delete in reverse dependency order to avoid foreign key constraint violations
      const tablesToDeleteFrom = [
        'phase_specific_usage',           // Usage instructions for products in phases
        'condition_product_research_articles', // Research articles
        'procedure_phase_products',       // Product recommendations per phase/patient type
        'product_details',               // Product details and rationales
        'procedure_phases',              // Phase associations
        'procedure_dentists',            // DDS type associations
      ];

      // Perform cascading deletion with detailed logging
      for (const table of tablesToDeleteFrom) {
        try {

          // Create timeout for each delete operation
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Delete from ${table} timed out after 5 seconds`)), 5000)
          );

          // Perform the deletion with timeout
          const deletePromise = supabase
            .from(table)
            .delete()
            .eq('procedure_id', conditionId)
            .select();

          const { data: deletedData, error: deleteError } = await Promise.race([deletePromise, timeoutPromise])
            .catch(err => {
              console.error(`[deleteConditionFromSupabase] ${table} operation failed or timed out:`, err);
              return { data: null, error: err };
            });

          if (deleteError) {
            console.error(`[deleteConditionFromSupabase] Error deleting from ${table}:`, deleteError);
            errors.push({ table, error: deleteError });

            // If timeout, return error immediately
            if (deleteError.message?.includes('timed out')) {
              return {
                success: false,
                error: {
                  message: `Delete operation timed out on table: ${table}. Check RLS policies.`,
                  table,
                  code: 'TIMEOUT'
                },
                deletionStats,
                totalRecordsDeleted,
                errors
              };
            }
          } else {
            const deletedCount = deletedData?.length || 0;
            deletionStats[table] = deletedCount;
            totalRecordsDeleted += deletedCount;
          }
        } catch (error) {
          console.error(`[deleteConditionFromSupabase] Exception during deletion from ${table}:`, error);
          errors.push({ table, error });
        }
      }

      // Finally, delete from 'procedures' table itself
      const { data: deletedProcedure, error: procError } = await supabase
        .from('procedures')
        .delete()
        .eq('id', conditionId)
        .select();

      if (procError) {
        console.error('[deleteConditionFromSupabase] Error deleting procedure:', procError);
        errors.push({ table: 'procedures', error: procError });
        return {
          success: false,
          error: procError,
          data: null,
          deletionStats,
          totalRecordsDeleted,
          errors
        };
      }

      // Log successful completion
      const procedureDeleted = deletedProcedure?.length > 0;
      if (procedureDeleted) {
        totalRecordsDeleted += 1;
        deletionStats.procedures = 1;
      }


      // Refresh materialized view and invalidate cache after successful deletion
      await refreshProceduresView();
      invalidateConditionsCache();

      if (errors.length > 0) {
        return {
          success: true,
          error: null,
          data: { id: conditionId, name: conditionName },
          deletionStats,
          totalRecordsDeleted,
          warnings: errors
        };
      }

      return { 
        success: true, 
        error: null, 
        data: { id: conditionId, name: conditionName },
        deletionStats,
        totalRecordsDeleted
      };

    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error(`SUPABASE_CUD: CRITICAL ERROR during condition deletion for ID ${conditionId}:`, error);
      return { 
        success: false, 
        error: error, 
        data: null,
        deletionStats,
        totalRecordsDeleted,
        errors: [...errors, { table: 'general', error }]
      };
    }
  };


// ============================================================================
// REAL-TIME GRANULAR UPDATE FUNCTIONS
// ============================================================================
// These functions provide atomic database operations for optimistic updates
// Each function performs a single, focused operation and returns a result

/**
 * Update a single field of a condition in real-time
 */
const updateConditionFieldRealtime = async (conditionId, field, value) => {
  try {
    // Special handling for category_id - need to convert category name to ID
    if (field === 'category_id') {
      // Get category ID from category name
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', value)
        .single();

      if (categoryError || !categoryData) {
        return { success: false, error: categoryError || new Error('Category not found') };
      }

      // Update with the category ID
      const { error } = await supabase
        .from('procedures')
        .update({ category_id: categoryData.id })
        .eq('id', conditionId);

      if (error) {
        return { success: false, error };
      }

      invalidateConditionsCache();
      return { success: true };
    }

    // Standard field update for other fields
    const { error } = await supabase
      .from('procedures')
      .update({ [field]: value })
      .eq('id', conditionId);

    if (error) {
      return { success: false, error };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Add a phase to a condition in real-time
 */
const addPhaseToConditionRealtime = async (conditionId, phaseName) => {
  try {
    // Get phase ID - don't use .single() to avoid 406 errors when phase doesn't exist
    const { data: phaseData, error: phaseError } = await supabase
      .from('phases')
      .select('id')
      .eq('name', phaseName)
      .maybeSingle();

    if (phaseError) {
      console.error('Error checking for existing phase:', phaseError);
      return { success: false, error: phaseError };
    }

    let phaseId;

    if (!phaseData) {
      // Phase doesn't exist, create it
      const { data: newPhase, error: createError } = await supabase
        .from('phases')
        .insert([{ name: phaseName }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating new phase:', createError);
        return { success: false, error: createError };
      }

      phaseId = newPhase.id;
    } else {
      // Phase exists, use its ID
      phaseId = phaseData.id;
    }

    // Link phase to procedure
    const { error: linkError } = await supabase
      .from('procedure_phases')
      .insert([{ procedure_id: conditionId, phase_id: phaseId }]);

    if (linkError) {
      console.error('Error linking phase to procedure:', linkError);
      return { success: false, error: linkError };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in addPhaseToConditionRealtime:', error);
    return { success: false, error };
  }
};

/**
 * Remove a phase from a condition in real-time
 */
const removePhaseFromConditionRealtime = async (conditionId, phaseName) => {
  try {
    // Get phase ID
    const { data: phaseData, error: phaseError } = await supabase
      .from('phases')
      .select('id')
      .eq('name', phaseName)
      .maybeSingle();

    if (phaseError) {
      console.error('Error fetching phase:', phaseError);
      return { success: false, error: phaseError };
    }

    if (!phaseData) {
      return { success: false, error: 'Phase not found' };
    }

    // Delete the link between procedure and phase
    const { error: deleteError } = await supabase
      .from('procedure_phases')
      .delete()
      .eq('procedure_id', conditionId)
      .eq('phase_id', phaseData.id);

    if (deleteError) {
      console.error('Error deleting procedure_phase link:', deleteError);
      return { success: false, error: deleteError };
    }

    // Also delete related procedure_phase_products entries
    const { error: deleteProductsError } = await supabase
      .from('procedure_phase_products')
      .delete()
      .eq('procedure_id', conditionId)
      .eq('phase_id', phaseData.id);

    if (deleteProductsError) {
      console.error('Error deleting procedure_phase_products:', deleteProductsError);
      return { success: false, error: deleteProductsError };
    }

    // Check if this phase is still used by any other procedures
    const { data: remainingLinks, error: checkError } = await supabase
      .from('procedure_phases')
      .select('id')
      .eq('phase_id', phaseData.id)
      .limit(1);

    if (checkError) {
      console.error('Error checking for remaining phase links:', checkError);
      // Don't fail the operation if we can't check, just log it
    } else if (!remainingLinks || remainingLinks.length === 0) {
      // Phase is orphaned, delete it from the phases table
      const { error: deletePhaseError } = await supabase
        .from('phases')
        .delete()
        .eq('id', phaseData.id);

      if (deletePhaseError) {
        console.error('Error deleting orphaned phase:', deletePhaseError);
        // Don't fail the operation, the main delete succeeded
      } else {
      }
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in removePhaseFromConditionRealtime:', error);
    return { success: false, error };
  }
};

/**
 * Add a product to a specific patient type/phase combination in real-time
 */
const addProductToPatientTypeRealtime = async (conditionId, phaseName, patientTypeName, productName) => {
  try {
    // Get all necessary IDs
    const { data: phaseData } = await supabase
      .from('phases')
      .select('id')
      .eq('name', phaseName)
      .single();

    const { data: productData } = await supabase
      .from('products')
      .select('id')
      .eq('name', productName)
      .single();

    const { data: patientTypeData } = await supabase
      .from('patient_types')
      .select('id')
      .eq('name', patientTypeName)
      .single();

    if (!phaseData || !productData || !patientTypeData) {
      return { success: false, error: 'Missing required entity' };
    }

    // Insert into procedure_phase_products
    const { error } = await supabase
      .from('procedure_phase_products')
      .insert([{
        procedure_id: conditionId,
        phase_id: phaseData.id,
        product_id: productData.id,
        patient_type_id: patientTypeData.id
      }]);

    if (error) {
      return { success: false, error };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Remove a product from a specific patient type/phase combination in real-time
 */
const removeProductFromPatientTypeRealtime = async (conditionId, phaseName, patientTypeName, productName) => {
  try {
    // Get all necessary IDs
    const { data: phaseData } = await supabase
      .from('phases')
      .select('id')
      .eq('name', phaseName)
      .single();

    const { data: productData } = await supabase
      .from('products')
      .select('id')
      .eq('name', productName)
      .single();

    const { data: patientTypeData } = await supabase
      .from('patient_types')
      .select('id')
      .eq('name', patientTypeName)
      .single();

    if (!phaseData || !productData || !patientTypeData) {
      return { success: false, error: 'Missing required entity' };
    }

    // Delete from procedure_phase_products
    const { error } = await supabase
      .from('procedure_phase_products')
      .delete()
      .eq('procedure_id', conditionId)
      .eq('phase_id', phaseData.id)
      .eq('product_id', productData.id)
      .eq('patient_type_id', patientTypeData.id);

    if (error) {
      return { success: false, error };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Update product details for a condition in real-time
 * Routes usage fields to phase_specific_usage table, other fields to product_details
 */
const updateProductDetailRealtime = async (conditionId, productName, field, value) => {
  try {
    // Get product ID
    const { data: productData } = await supabase
      .from('products')
      .select('id')
      .eq('name', productName)
      .single();

    if (!productData) {
      return { success: false, error: 'Product not found' };
    }

    // Check if this is a usage field (usage_PhaseName)
    if (field.startsWith('usage_')) {
      // Extract phase name from field (e.g., 'usage_Prep' -> 'Prep')
      const phaseName = field.replace('usage_', '');

      // Get phase ID
      const { data: phaseData } = await supabase
        .from('phases')
        .select('id')
        .eq('name', phaseName)
        .single();

      if (!phaseData) {
        return { success: false, error: `Phase ${phaseName} not found` };
      }

      // Check if phase_specific_usage entry exists
      const { data: existingUsage } = await supabase
        .from('phase_specific_usage')
        .select('id')
        .eq('procedure_id', conditionId)
        .eq('product_id', productData.id)
        .eq('phase_id', phaseData.id)
        .maybeSingle();

      if (existingUsage) {
        // Update existing
        const { error } = await supabase
          .from('phase_specific_usage')
          .update({ instructions: value })
          .eq('id', existingUsage.id);

        if (error) {
          return { success: false, error };
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('phase_specific_usage')
          .insert([{
            procedure_id: conditionId,
            product_id: productData.id,
            phase_id: phaseData.id,
            instructions: value
          }]);

        if (error) {
          return { success: false, error };
        }
      }
    } else {
      // Regular product_details field
      // Check if product_details entry exists
      const { data: existingDetail } = await supabase
        .from('product_details')
        .select('id')
        .eq('procedure_id', conditionId)
        .eq('product_id', productData.id)
        .maybeSingle();

      if (existingDetail) {
        // Update existing
        const { error } = await supabase
          .from('product_details')
          .update({ [field]: value })
          .eq('id', existingDetail.id);

        if (error) {
          return { success: false, error };
        }
      } else {
        // Create new with this field
        const { error } = await supabase
          .from('product_details')
          .insert([{
            procedure_id: conditionId,
            product_id: productData.id,
            [field]: value
          }]);

        if (error) {
          return { success: false, error };
        }
      }
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Add a category in real-time (already exists but ensuring consistency)
 */
const addCategoryRealtime = async (categoryName) => {
  return await addCategoryToSupabase(categoryName);
};

/**
 * Delete a category in real-time
 */
const deleteCategoryRealtime = async (categoryName) => {
  return await deleteCategoryFromSupabase(categoryName);
};

/**
 * Add a DDS type in real-time
 */
const addDdsTypeRealtime = async (ddsTypeName) => {
  return await addDdsTypeToSupabase(ddsTypeName);
};

/**
 * Delete a DDS type in real-time
 */
const deleteDdsTypeRealtime = async (ddsTypeName) => {
  return await deleteDdsTypeFromSupabase(ddsTypeName);
};

/**
 * Add a product in real-time
 */
const addProductRealtime = async (productName) => {
  try {
    // Insert new product directly - let the database unique constraint handle duplicates

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Insert operation timed out after 5 seconds. This usually indicates an RLS policy issue.')), 5000)
    );

    // Race between the insert and timeout
    const insertPromise = supabase
      .from('products')
      .insert([{ name: productName, is_available: true }])
      .select()
      .single();

    const { data, error } = await Promise.race([insertPromise, timeoutPromise])
      .catch(err => {
        console.error('[addProductRealtime] Operation failed or timed out:', err);
        return { data: null, error: err };
      });


    if (error) {
      console.error('Error inserting product:', error);

      // Check for timeout
      if (error.message?.includes('timed out')) {
        return {
          success: false,
          error: {
            message: 'Database operation timed out. Please check RLS policies on products table.',
            code: 'TIMEOUT'
          }
        };
      }

      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        return {
          success: false,
          error: { message: `Product "${productName}" already exists` }
        };
      }

      return { success: false, error };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in addProductRealtime:', error);
    return { success: false, error };
  }
};

/**
 * Rename a product in real-time
 */
const renameProductRealtime = async (oldName, newName) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ name: newName })
      .eq('name', oldName);

    if (error) {
      return { success: false, error };
    }

    await refreshProceduresView();
    invalidateConditionsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Delete a product in real-time
 */
const deleteProductRealtime = async (productName) => {
  return await deleteProductFromSupabase(productName);
};


// Export all functions
export {
  // Legacy batch operations
  addCategoryToSupabase,
  deleteCategoryFromSupabase,
  loadCategoriesFromSupabase,
  addDdsTypeToSupabase,
  deleteDdsTypeFromSupabase,
  loadDdsTypesFromSupabase,
  addProductToSupabase,
  updateProductInSupabase,
  deleteProductFromSupabase,
  updateProductAvailabilityInSupabase,
  loadProductsFromSupabase,
  loadConditionsFromSupabase,
  addConditionToSupabase,
  updateConditionInSupabase,
  deleteConditionFromSupabase,
  buildPatientTypeMaps,
  getEntityIdMaps,
  invalidateConditionsCache,
  verifyDataIntegrity,
  CACHE_DURATION,
  // Real-time granular operations
  updateConditionFieldRealtime,
  addPhaseToConditionRealtime,
  removePhaseFromConditionRealtime,
  addProductToPatientTypeRealtime,
  removeProductFromPatientTypeRealtime,
  updateProductDetailRealtime,
  addCategoryRealtime,
  deleteCategoryRealtime,
  addDdsTypeRealtime,
  deleteDdsTypeRealtime,
  addProductRealtime,
  renameProductRealtime,
  deleteProductRealtime
}; 