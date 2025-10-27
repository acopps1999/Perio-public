import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { useToast } from './Toast';
import {
  loadConditionsFromSupabase,
  loadCategoriesFromSupabase,
  loadDdsTypesFromSupabase,
  loadProductsFromSupabase,
  updateProductAvailabilityInSupabase,
  invalidateConditionsCache,
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
  deleteProductRealtime,
  addConditionToSupabase,
  deleteConditionFromSupabase,
  getEntityIdMaps
} from './AdminPanelSupabase';

function AdminPanelCore({ onSaveChangesSuccess, onClose, children }) {
  const [activeTab, setActiveTab] = useState('conditions');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false); // Prevent duplicate loading
  const [isLoading, setIsLoading] = useState(true); // Track loading state for UI
  const hasInitialized = useRef(false); // Prevent duplicate initialization on the same component instance
  const [conditions, setConditions] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null); // Stores the *original* name of the product being edited
  const [selectedResearchProduct, setSelectedResearchProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [ddsTypes, setDdsTypes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast and optimistic update hooks
  const { showToast, ToastContainer } = useToast();
  const { executeUpdate, saveStatus } = useOptimisticUpdate(showToast);
  
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
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Load conditions from Supabase (use cache when possible)
      const supabaseConditions = await loadConditionsFromSupabase(forceRefresh);
      setConditions(JSON.parse(JSON.stringify(supabaseConditions || [])));
      
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
        setAllProducts(productsResult.data.sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      // Load dynamic patient types
      const { data: ptData, error: ptError } = await supabase.from('patient_types').select('id, name').order('name');
      if (ptError) {
        // TODO: Replace with proper error tracking (e.g., Sentry)
        console.error("Failed to load patient types", ptError);
        setPatientTypes([]);
      } else {
        setPatientTypes(ptData);
      }

      setHasLoadedInitialData(true); // Mark as loaded to prevent duplicates
      setIsLoading(false); // Data loaded successfully
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error("Error loading data:", error);
      setHasLoadedInitialData(true); // Still mark as loaded to prevent infinite retries
      setIsLoading(false); // Stop loading even on error
    }
  }, [hasLoadedInitialData]); // Include hasLoadedInitialData dependency

  useEffect(() => {
    // Only load if this component instance hasn't initialized yet
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadInitialData();
    }
  }, [loadInitialData]); // Include loadInitialData dependency

  // Initialize patient-specific products for a condition
  const initializePatientSpecificProducts = useCallback((condition) => {
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
  }, [patientTypes, setPatientSpecificProducts]);

  // Initialize patient-specific products when a condition is selected
  useEffect(() => {
    if (selectedCondition) {
      initializePatientSpecificProducts(selectedCondition);
    }
  }, [selectedCondition, initializePatientSpecificProducts]);

  // Edit existing product
  const handleEditProduct = (product) => {
    setModalType('product');
    setEditingProductId(product);
    
    setNewItemData({
      name: product
    });
    
    setShowAddModal(true);
  };

  // Handle product availability toggle
  const handleProductAvailabilityToggle = async (productId, isAvailable) => {
    const operationId = `product-availability-${productId}`;

    await executeUpdate(
      operationId,
      // Optimistic update
      () => {
        const oldProducts = [...allProducts];

        setAllProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? { ...p, is_available: isAvailable }
              : p
          ).sort((a, b) => a.name.localeCompare(b.name))
        );

        // Rollback function
        return () => {
          setAllProducts(oldProducts);
        };
      },
      // Database update
      async () => {
        return await updateProductAvailabilityInSupabase(productId, isAvailable);
      },
      null, // No success message
      'Failed to update product availability'
    );
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
  
  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setActivePatientType('All');
    initializePatientSpecificProducts(condition);
  };
  
  // Update condition field with real-time save (debounced for text fields)
  const updateConditionFieldDebounced = useDebouncedCallback(async (db_id, field, value) => {
    const operationId = `condition-${db_id}-${field}`;

    await executeUpdate(
      operationId,
      // Optimistic update
      () => {
        const oldConditions = [...conditions];
        setConditions(prev => prev.map(c =>
          c.db_id === db_id ? { ...c, [field]: value } : c
        ));
        if (selectedCondition?.db_id === db_id) {
          setSelectedCondition(prev => ({ ...prev, [field]: value }));
        }
        // Rollback function
        return () => {
          setConditions(oldConditions);
          if (selectedCondition?.db_id === db_id) {
            const original = oldConditions.find(c => c.db_id === db_id);
            if (original) setSelectedCondition(original);
          }
        };
      },
      // Database update
      () => updateConditionFieldRealtime(db_id, field, value),
      null,
      `Failed to update ${field}`
    );
  }, 500); // 500ms debounce

  // Wrapper for immediate updates (non-text fields)
  const updateConditionField = (db_id, field, value) => {
    if (field === 'name' || field === 'description') {
      // Debounced for text inputs
      updateConditionFieldDebounced(db_id, field, value);
    } else {
      // Immediate for dropdowns/selects
      const operationId = `condition-${db_id}-${field}`;

      // Map database field names to local state field names
      const localField = field === 'category_id' ? 'category' : field;

      executeUpdate(
        operationId,
        () => {
          const oldConditions = [...conditions];
          setConditions(prev => prev.map(c =>
            c.db_id === db_id ? { ...c, [localField]: value } : c
          ));
          if (selectedCondition?.db_id === db_id) {
            setSelectedCondition(prev => ({ ...prev, [localField]: value }));
          }
          return () => {
            setConditions(oldConditions);
            if (selectedCondition?.db_id === db_id) {
              const original = oldConditions.find(c => c.db_id === db_id);
              if (original) setSelectedCondition(original);
            }
          };
        },
        () => updateConditionFieldRealtime(db_id, field, value),
        null,
        `Failed to update ${field}`
      );
    }
  };
  
  // Update product details
  const updateProductDetail = (conditionId, productName, field, value, phase = null) => {
    setConditions(prev =>
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

    // This helper updates the `conditions` array, which is the single source of truth.
    setConditions(prevConditions =>
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

        // Immediately update conditions to ensure proper change detection
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

          setConditions(prevConditions =>
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

        // Immediately update conditions to ensure proper change detection
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

          setConditions(prevConditions =>
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
    console.log('handleSubmitNewItem called, modalType:', modalType, 'newItemData:', newItemData);
    const itemName = newItemData.name ? newItemData.name.trim() : '';

    if (!itemName) {
      console.log('No item name provided, closing modal');
      setShowAddModal(false);
      setNewItemData({});
      setEditingProductId(null);
      return;
    }

    let success = false;

    if (modalType === 'product') {
      console.log('Product modalType detected, editingProductId:', editingProductId);
      const productName = itemName;
      if (editingProductId) { // Editing existing product (rename)
        if (editingProductId !== productName) {
          // Call real-time rename function
          await renameProductRealtime(editingProductId, productName);
          // Update allProducts list locally for immediate UI feedback
          setAllProducts(prev => prev.map(p => p.name === editingProductId ? { ...p, name: productName } : p).sort((a, b) => a.name.localeCompare(b.name)));
          // Update conditions to reflect the rename
          setConditions(prevConditions =>
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
        // Add product to database
        console.log('Calling addProductRealtime with productName:', productName);
        const result = await addProductRealtime(productName);
        console.log('addProductRealtime result:', result);
        if (result.success && result.data) {
          // Add to local state with id from database
          if (!allProducts.some(p => p.name === productName)) {
            setAllProducts(prev => [...prev, { id: result.data.id, name: productName, is_available: true }].sort((a, b) => a.name.localeCompare(b.name)));
          }
          showToast('Product added successfully', 'success');
          success = true;
        } else {
          const errorMsg = result.error?.message || 'Failed to add product';
          console.log('Product add failed, error:', errorMsg);
          showToast(errorMsg, 'error');
          success = false;
        }
      }

  } else if (modalType === 'condition') {
    // Add new condition to database
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
      };

    // Get entity ID mappings and save to database
    const entityIdMaps = await getEntityIdMaps();
    const result = await addConditionToSupabase(newConditionObject, entityIdMaps);
    if (result.success && result.data) {
      // Add to local state with db_id from database
      const savedCondition = { ...newConditionObject, db_id: result.data.db_id };
      setConditions(prev => [...prev, savedCondition]);
      invalidateConditionsCache();
      showToast('Condition added successfully', 'success');
      success = true;
    } else {
      const errorMsg = result.error?.message || 'Failed to add condition';
      showToast(errorMsg, 'error');
      success = false;
    }

  } else if (modalType === 'category') {
    if (!categories.includes(itemName)) {
      setCategories(prev => [...prev, itemName].sort());
    }
    success = true;
  } else if (modalType === 'ddsType') {
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
        setAllProducts(prev => prev.map(p => p.name === editingProductId ? { ...p, name: itemName } : p).sort((a, b) => a.name.localeCompare(b.name)));
        // Also update conditions to reflect the rename in product lists and details
        setConditions(prevConditions =>
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
  } else {
    // Handle failure (e.g., show error message to user)
    // Modal remains open for correction or explicit close
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
      setIsDeleting(true);
      const { type, item } = itemToDelete;
      let success = false;

      if (type === 'condition') {
        // Delete condition from database
        const conditionId = item.db_id;
        if (!conditionId) {
          showToast('Cannot delete condition without ID', 'error');
          success = false;
        } else {
          const result = await deleteConditionFromSupabase(conditionId);
          if (result.success) {
            // Remove from local state
            setConditions(prev => prev.filter(c => c.db_id !== conditionId));
            if (selectedCondition && selectedCondition.db_id === conditionId) {
              const remainingConditions = conditions.filter(c => c.db_id !== conditionId);
              setSelectedCondition(remainingConditions.length > 0 ? remainingConditions[0] : null);
            }
            invalidateConditionsCache();
            showToast('Condition deleted successfully', 'success');
            success = true;
          } else {
            const errorMsg = result.error?.message || 'Failed to delete condition';
            showToast(errorMsg, 'error');
            success = false;
          }
        }
      } else if (type === 'product') {
        // Remove from local lists
        setAllProducts(prev => prev.filter(p => p.name !== item));
        success = true;
      } else if (type === 'category') {
        if (item === 'All') { // 'All' category should not be deleted
          setShowDeleteModal(false);
          setItemToDelete(null);
          setIsDeleting(false);
          return;
        }
        setCategories(prev => prev.filter(c => c !== item));
        // When a category is deleted, conditions using it should be updated to have no category.
        setConditions(prev => prev.map(cond => {
          if (cond.category === item) {
            return { ...cond, category: null };
          }
          return cond;
        }));
        success = true;
      } else if (type === 'ddsType') {
        if (item === 'All') { // 'All' DDS type should not be deleted
          setShowDeleteModal(false);
          setItemToDelete(null);
          setIsDeleting(false);
          return;
        }
        setDdsTypes(prev => prev.filter(d => d !== item));
        // When a DDS Type is deleted, remove it from any conditions that use it.
        setConditions(prev => prev.map(cond => {
          if (cond.dds.includes(item)) {
            return { ...cond, dds: cond.dds.filter(d => d !== item) };
          }
          return cond;
        }));
        success = true;
      }
    } catch (error) {
      showToast(`Error deleting: ${error.message}`, 'error');
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
    isLoading,
    setIsLoading,
    conditions,
    setConditions,
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
    isDeleting,
    setIsDeleting,

    // Real-time save status
    saveStatus,
    executeUpdate,
    ToastContainer,

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
    handleProductAvailabilityToggle,
    getAllProductsForCondition,
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