import { useState, useEffect, useCallback, useRef } from 'react';
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
  hasCachedConditions,
  updateConditionFieldRealtime,
  // Phase 3: Removed addProductToPatientTypeRealtime, removeProductFromPatientTypeRealtime
  deleteCategoryFromSupabase,
  addProductRealtime,
  renameProductRealtime,
  addConditionToSupabase,
  deleteConditionFromSupabase,
  getEntityIdMaps,
  addCategoryRealtime,
  addDdsTypeRealtime
} from './AdminPanelSupabase';

function AdminPanelCore({ onSaveChangesSuccess, onClose, children }) {
  const [activeTab, setActiveTab] = useState('conditions');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false); // Prevent duplicate loading
  const [isLoading, setIsLoading] = useState(true); // Track loading state for UI
  const hasInitialized = useRef(false); // Prevent duplicate initialization on the same component instance
  const loadingTimeoutRef = useRef(null); // Track loading timeout
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

  // Phase 3: Removed patient-specific products configuration (patientTypes, activePatientType, patientSpecificProducts)

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

    // Only show loading state if cache doesn't exist
    // If cache exists, data will load instantly (< 1ms)
    const hasCache = hasCachedConditions();
    if (!hasCache || forceRefresh) {
      setIsLoading(true);
    }

    try {
      // Load conditions from Supabase (use cache when possible)
      // This will be instant if cache exists (< 1ms)
      const supabaseConditions = await loadConditionsFromSupabase(forceRefresh);
      setConditions(JSON.parse(JSON.stringify(supabaseConditions || [])));

      // Auto-select the first condition
      if (supabaseConditions.length > 0) {
          setSelectedCondition(supabaseConditions[0]);
      } else {
          setSelectedCondition(null);
      }

      // Load remaining data in parallel for faster initial load
      // Phase 3: Removed patient types fetch
      const [supabaseCategories, supabaseDdsTypes, productsResult] = await Promise.all([
        loadCategoriesFromSupabase(),
        loadDdsTypesFromSupabase(),
        loadProductsFromSupabase()
      ]);

      setCategories(supabaseCategories.sort());
      setDdsTypes(supabaseDdsTypes.sort());
      if (productsResult.success) {
        setAllProducts(productsResult.data.sort((a, b) => a.name.localeCompare(b.name)));
      }

      setHasLoadedInitialData(true); // Mark as loaded to prevent duplicates
      setIsLoading(false); // Data loaded successfully

      // Clear safety timeout on successful load
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    } catch (error) {
      // TODO: Replace with proper error tracking (e.g., Sentry)
      console.error('Error loading AdminPanel data:', error);
      setHasLoadedInitialData(true); // Still mark as loaded to prevent infinite retries
      setIsLoading(false); // Stop loading even on error

      // Clear safety timeout on error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [hasLoadedInitialData]); // Include hasLoadedInitialData dependency

  useEffect(() => {
    // Only load if this component instance hasn't initialized yet
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadInitialData();

      // Safety timeout: if still loading after 15 seconds, force stop loading state
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setHasLoadedInitialData(true);
      }, 15000); // Increased to 15 seconds to allow for fallback query

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Phase 3: Removed initializePatientSpecificProducts - no longer needed with simplified products structure

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


  // Phase 3: Get all products configured for a condition (using simplified products structure)
  const getAllProductsForCondition = (condition) => {
    if (!condition) return {};

    // Start with saved product details
    const allProductDetails = { ...(condition.productDetails || {}) };

    // Add products from the new simplified products structure { phaseName: [productNames] }
    const productsMap = condition.products || {};
    Object.keys(productsMap).forEach(phase => {
      const products = productsMap[phase] || [];
      products.forEach(productName => {
        if (!allProductDetails[productName]) {
          // Create a basic product detail entry for newly added products
          allProductDetails[productName] = {
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
    });

    return allProductDetails;
  };

  // Handle condition selection
  // Phase 3: Simplified - no longer initializes patient-specific products
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
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
  
  // Phase 3: Removed handlePatientTypeSelect, updatePatientSpecificConfigForSelectedCondition,
  // addProductToPatientType, removeProductFromPatientType - no longer needed with simplified products structure
  // Add new condition
  const handleAddCondition = () => {
    setModalType('condition');
    // Every new condition starts with a "General" modifier
    const defaultPhases = ['General'];
    const defaultProducts = { 'General': [] };

    setNewItemData({
      name: '',
      category: categories[0] || '',
      phases: defaultPhases,
      dds: ['General Dentist'], // Default DDS to prevent validation errors
      products: defaultProducts,
      productDetails: {},
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
  // Handle submit - optimistic approach: close modal immediately, save in background
  const handleSubmitNewItem = async () => {
    const itemName = newItemData.name ? newItemData.name.trim() : '';

    if (!itemName) {
      setShowAddModal(false);
      setNewItemData({});
      setEditingProductId(null);
      return;
    }

    // Close modal immediately for better UX
    setShowAddModal(false);
    const savedModalType = modalType;
    const savedEditingProductId = editingProductId;
    const savedNewItemData = { ...newItemData };
    setNewItemData({});
    setEditingProductId(null);

    if (savedModalType === 'product') {
      const productName = itemName;
      if (savedEditingProductId) { // Editing existing product (rename)
        if (savedEditingProductId !== productName) {
          // Update local state immediately
          setAllProducts(prev => prev.map(p => p.name === savedEditingProductId ? { ...p, name: productName } : p).sort((a, b) => a.name.localeCompare(b.name)));
          setConditions(prevConditions =>
            prevConditions.map(condition => {
                const updatedProductsInPhases = { ...condition.products };
                Object.keys(updatedProductsInPhases).forEach(phase => {
                    updatedProductsInPhases[phase] = updatedProductsInPhases[phase].map(p =>
                        p === savedEditingProductId ? productName :
                        p === `${savedEditingProductId} (Type 3/4 Only)` ? `${productName} (Type 3/4 Only)` : p
                    );
                });
                const updatedProductDetails = { ...condition.productDetails };
                if (updatedProductDetails[savedEditingProductId]) {
                    updatedProductDetails[productName] = updatedProductDetails[savedEditingProductId];
                    delete updatedProductDetails[savedEditingProductId];
                }
                const updatedPatientSpecificConfig = JSON.parse(JSON.stringify(condition.patientSpecificConfig || {}));
                Object.keys(updatedPatientSpecificConfig).forEach(phase => {
                    Object.keys(updatedPatientSpecificConfig[phase]).forEach(type => {
                        updatedPatientSpecificConfig[phase][type] = (updatedPatientSpecificConfig[phase][type] || []).map(p => p === savedEditingProductId ? productName : p);
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
          showToast('Product renamed', 'success');

          // Rename in database in background
          renameProductRealtime(savedEditingProductId, productName).then(result => {
            if (!result.success) {
              showToast('Failed to save rename - refresh to see current state', 'error');
            }
          });
        }
      } else { // Adding new product
        // Add to local state immediately with temporary id
        const tempId = `temp-${Date.now()}`;
        if (!allProducts.some(p => p.name === productName)) {
          setAllProducts(prev => [...prev, { id: tempId, name: productName, is_available: true }].sort((a, b) => a.name.localeCompare(b.name)));
        }
        showToast('Product added', 'success');

        // Add to database in background
        addProductRealtime(productName).then(result => {
          if (result.success && result.data) {
            // Update with real ID from database
            setAllProducts(prev => prev.map(p =>
              p.id === tempId ? { ...p, id: result.data.id } : p
            ));
          } else {
            showToast('Failed to save product - refresh to see current state', 'error');
          }
        });
      }

  } else if (savedModalType === 'condition') {
    // Every new condition starts with a "General" modifier
    const defaultPhase = 'General';
    const newConditionObject = {
        name: itemName,
        category: savedNewItemData.category || (categories.length > 0 ? categories[0] : ''),
        phases: savedNewItemData.phases || [defaultPhase],
        dds: savedNewItemData.dds || [],
        patientType: savedNewItemData.patientType || 'Types 1 to 4',
        products: savedNewItemData.products || { [defaultPhase]: [] },
        productDetails: savedNewItemData.productDetails || {},
        patientSpecificConfig: savedNewItemData.patientSpecificConfig || {},
        conditionSpecificResearch: savedNewItemData.conditionSpecificResearch || {},
        pitchPoints: savedNewItemData.pitchPoints || '',
        scientificRationale: savedNewItemData.scientificRationale || '',
        clinicalEvidence: savedNewItemData.clinicalEvidence || '',
        handlingObjections: savedNewItemData.handlingObjections || '',
      };

    // Add to local state immediately with temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempCondition = { ...newConditionObject, db_id: tempId };
    setConditions(prev => [...prev, tempCondition]);
    showToast('Condition added', 'success');

    // Save to database in background
    getEntityIdMaps().then(entityIdMaps => {
      addConditionToSupabase(newConditionObject, entityIdMaps).then(result => {
        if (result.success && result.data) {
          // Update with real db_id from database
          setConditions(prev => prev.map(c =>
            c.db_id === tempId ? { ...c, db_id: result.data.db_id } : c
          ));
          invalidateConditionsCache();
        } else {
          showToast('Failed to save condition - refresh to see current state', 'error');
        }
      });
    });

  } else if (savedModalType === 'category') {
    if (!categories.includes(itemName)) {
      setCategories(prev => [...prev, itemName].sort());
      showToast('Category added', 'success');

      // Save to database in background
      addCategoryRealtime(itemName).then(result => {
        if (!result.success) {
          showToast('Failed to save category - refresh to see current state', 'error');
        }
      });
    }
  } else if (savedModalType === 'ddsType') {
    if (!ddsTypes.includes(itemName)) {
      setDdsTypes(prev => [...prev, itemName].sort());
      showToast('DDS Type added', 'success');

      // Save to database in background
      addDdsTypeRealtime(itemName).then(result => {
        if (!result.success) {
          showToast('Failed to save DDS type - refresh to see current state', 'error');
        }
      });
    }
  }
};
  
  // Delete confirmation
  const confirmDelete = (type, item) => {
    setItemToDelete({ type, item });
    setShowDeleteModal(true);
  };
  
  // Handle delete - optimistic approach: close modal immediately, delete in background
  const handleDelete = async () => {
    if (isDeleting) return;

    const { type, item } = itemToDelete;

    // Close modal immediately for better UX
    setShowDeleteModal(false);
    setItemToDelete(null);

    // Handle special cases that shouldn't be deleted
    if ((type === 'category' || type === 'ddsType') && item === 'All') {
      return;
    }

    // Optimistically update local state immediately
    if (type === 'condition') {
      const conditionId = item.db_id;
      if (!conditionId) {
        showToast('Cannot delete condition without ID', 'error');
        return;
      }
      // Remove from local state immediately
      setConditions(prev => prev.filter(c => c.db_id !== conditionId));
      // If deleting the currently viewed condition, go back to the list view
      if (selectedCondition && selectedCondition.db_id === conditionId) {
        setSelectedCondition(null);
      }
      showToast('Condition deleted', 'success');

      // Delete from database in background
      deleteConditionFromSupabase(conditionId).then(result => {
        if (!result.success) {
          showToast('Failed to delete from database - refresh to see current state', 'error');
        }
        invalidateConditionsCache();
      });

    } else if (type === 'product') {
      setAllProducts(prev => prev.filter(p => p.name !== item));
      showToast('Product deleted', 'success');

    } else if (type === 'category') {
      // Update local state immediately
      setCategories(prev => prev.filter(c => c !== item));
      setConditions(prev => prev.map(cond => {
        if (cond.category === item) {
          return { ...cond, category: null };
        }
        return cond;
      }));
      showToast('Category deleted', 'success');

      // Delete from database in background
      deleteCategoryFromSupabase(item).then(result => {
        if (!result.success) {
          showToast('Failed to delete from database - refresh to see current state', 'error');
        }
        invalidateConditionsCache();
      });

    } else if (type === 'ddsType') {
      setDdsTypes(prev => prev.filter(d => d !== item));
      setConditions(prev => prev.map(cond => {
        if (cond.dds.includes(item)) {
          return { ...cond, dds: cond.dds.filter(d => d !== item) };
        }
        return cond;
      }));
      showToast('DDS Type deleted', 'success');
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
    showToast,

    // Phase 3: Removed patient-specific products props

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
    // Phase 3: Removed handlePatientTypeSelect, updatePatientSpecificConfigForSelectedCondition,
    // addProductToPatientType, removeProductFromPatientType
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