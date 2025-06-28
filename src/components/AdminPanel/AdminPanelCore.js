import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  loadConditionsFromSupabase,
  loadCategoriesFromSupabase,
  loadDdsTypesFromSupabase,
  loadProductsFromSupabase,
  syncCategoriesWithSupabase,
  syncDdsTypesWithSupabase,
  syncProductsWithSupabase,
  syncPhasesWithSupabase,
  addConditionToSupabase,
  updateConditionInSupabase,
  deleteConditionFromSupabase,
  getEntityIdMaps,
  invalidateConditionsCache
} from './AdminPanelSupabase';

function AdminPanelCore({ onSaveChangesSuccess, onClose, children }) {
  const [activeTab, setActiveTab] = useState('conditions');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false); // Prevent duplicate loading
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
    // Prevent duplicate loading unless explicitly forced
    if (hasLoadedInitialData && !forceRefresh) {
      console.log("PERFORMANCE_ADMIN: AdminPanel data already loaded, skipping duplicate load.");
      return;
    }
    
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
    setHasLoadedInitialData(true); // Mark as loaded to prevent duplicates
    console.log("PERFORMANCE_ADMIN: AdminPanel data fetch completed.");
  }, [hasLoadedInitialData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Initialize patient-specific products when a condition is selected
  useEffect(() => {
    if (selectedCondition) {
      initializePatientSpecificProducts(selectedCondition);
    }
  }, [selectedCondition]);

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
        
        // Invalidate cache and notify parent to reload
        invalidateConditionsCache();
        
        // Only notify parent to reload - AdminPanel will get fresh data when parent refreshes
        console.log('PERFORMANCE_SAVE: Notifying parent to reload data...');
        await Promise.resolve(onSaveChangesSuccess());
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        console.error('PERFORMANCE_SAVE: One or more operations failed.', finalError);
        // Reload AdminPanel data to reflect current DB state on partial failure
        await loadInitialData(true);
      }

    } catch (error) {
      console.error('PERFORMANCE_SAVE: Critical error during save process:', error);
      overallSuccess = false;
      // Reload AdminPanel data to reflect current DB state on error
      await loadInitialData(true);
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
      dds: ['General Dentist'], // Default DDS to prevent validation errors
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
  


  // Return the render prop with all the state and handlers
  return children({
    // State
    activeTab,
    setActiveTab,
    initialConditions,
    editedConditions,
    setEditedConditions,
    selectedCondition,
    setSelectedCondition,
    editingProductId,
    setEditingProductId,
    selectedResearchProduct,
    setSelectedResearchProduct,
    categories,
    setCategories,
    ddsTypes,
    setDdsTypes,
    allProducts,
    setAllProducts,
    productRenames,
    setProductRenames,
    isEditing,
    setIsEditing,
    isSaving,
    setIsSaving,
    isDeleting,
    setIsDeleting,
    conditionsToDelete,
    setConditionsToDelete,
    showSuccess,
    setShowSuccess,
    
    // Patient-specific products
    patientTypes,
    setPatientTypes,
    activePatientType,
    setActivePatientType,
    patientSpecificProducts,
    setPatientSpecificProducts,
    
    // Modal states
    showDeleteModal,
    setShowDeleteModal,
    itemToDelete,
    setItemToDelete,
    showAddModal,
    setShowAddModal,
    modalType,
    setModalType,
    newItemData,
    setNewItemData,
    
    // Competitive advantage modal state
    competitiveAdvantageModalOpen,
    setCompetitiveAdvantageModalOpen,
    selectedProductForAdvantage,
    setSelectedProductForAdvantage,
    competitiveAdvantageData,
    setCompetitiveAdvantageData,
    
    // Handlers
    loadInitialData,
    handleEditProduct,
    handleSaveChanges,
    applyPatientSpecificProductsToCondition,
    getAllProductsForCondition,
    handleResetChanges,
    handleConditionSelect,
    updateConditionField,
    updateProductDetail,
    handlePatientTypeSelect,
    updatePatientSpecificConfigForSelectedCondition,
    addProductToPatientType,
    removeProductFromPatientType,
    handleAddCondition,
    handleAddCategory,
    handleAddDdsType,
    handleAddProduct,
    handleSubmitNewItem,
    confirmDelete,
    handleDelete,
    
    // Props from parent
    onSaveChangesSuccess,
    onClose
  });
}

export default AdminPanelCore;