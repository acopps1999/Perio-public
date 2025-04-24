import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Save, Plus, Edit, Trash2, X, ChevronDown, Info, AlertTriangle, Lock, Check, User, Filter, AlertCircle, Settings } from 'lucide-react';
import clsx from 'clsx';
import DataImportExport from './DataImportExport';
import { useToast } from './ToastContext';

// Patient Types definition
const PATIENT_TYPES = {
  'all': 'All Patient Types',
  '1': 'Type 1: Healthy',
  '2': 'Type 2: Mild inflammation, moderate risk',
  '3': 'Type 3: Smoker, diabetic, immunocompromised',
  '4': 'Type 4: Periodontal disease, chronic illness, poor healing'
};

// Mock function for saving data - in a real app, this would connect to backend
const saveToBackend = async (data, categoriesList, ddsTypesList, productsList) => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Data saved:', data);
      console.log('Categories saved:', categoriesList);
      console.log('DDS Types saved:', ddsTypesList);
      console.log('Products saved:', productsList);
      
      // Save everything to localStorage
      localStorage.setItem('conditions_data', JSON.stringify(data));
      localStorage.setItem('categories_data', JSON.stringify(categoriesList));
      localStorage.setItem('dds_types_data', JSON.stringify(ddsTypesList));
      localStorage.setItem('products_data', JSON.stringify(productsList));
      
      resolve({ success: true });
    }, 1500);
  });
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
  const toast = useToast(); // Add this line to get the toast functions
  
  // Patient-specific products configuration
  const [patientSpecificProducts, setPatientSpecificProducts] = useState({});
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  
  // Initialize data
  useEffect(() => {
    if (conditions) {
      setEditedConditions([...conditions]);
      
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
      const migratedConditions = conditions.map(condition => {
        if (condition.productDetails) {
          const updatedProductDetails = { ...condition.productDetails };
          
          Object.keys(updatedProductDetails).forEach(productName => {
            // Check if usage is a string and convert it to an object with phase entries
            if (updatedProductDetails[productName].usage && 
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
            ...condition,
            productDetails: updatedProductDetails
          };
        }
        
        return condition;
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
      initializePatientSpecificProducts(selectedCondition);
    }
  }, [selectedCondition]);

  // Initialize patient-specific products for a condition
  const initializePatientSpecificProducts = (condition) => {
    if (!condition) return;
    
    // If the condition already has a patient-specific configuration, use it
    if (condition.patientSpecificConfig) {
      setPatientSpecificProducts(JSON.parse(JSON.stringify(condition.patientSpecificConfig)));
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
      const allProducts = condition.products[phase] || [];
      
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
    setNewItemData({
      name: product,
      usage: patientSpecificProducts[selectedCondition.phases[0]][activePatientType]?.includes(product) ? 
        patientSpecificProducts[selectedCondition.phases[0]][activePatientType][product] : 
        patientSpecificProducts[selectedCondition.phases[0]]['all'].includes(product) ? 
        patientSpecificProducts[selectedCondition.phases[0]]['all'][product] : 
        patientSpecificProducts[selectedCondition.phases[0]]['4'].includes(product) ? 
        patientSpecificProducts[selectedCondition.phases[0]]['4'][product] : 
        patientSpecificProducts[selectedCondition.phases[0]]['3'].includes(product) ? 
        patientSpecificProducts[selectedCondition.phases[0]]['3'][product] : '',
      rationale: selectedCondition.productDetails[product]?.rationale || '',
      clinicalEvidence: selectedCondition.productDetails[product]?.clinicalEvidence || '',
      competitive: selectedCondition.productDetails[product]?.competitive || '',
      objection: selectedCondition.productDetails[product]?.objection || '',
      factSheet: selectedCondition.productDetails[product]?.factSheet || '#',
      researchArticles: selectedCondition.productDetails[product]?.researchArticles || [],
      pitchPoints: selectedCondition.productDetails[product]?.pitchPoints || ''
    });
    setNewItemType('product');
    setShowAddModal(true);
  };

  // Save all changes to local storage or backend
  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    
    // Update conditions with patient-specific product configurations
    const updatedConditions = editedConditions.map(condition => {
      if (condition.id === selectedCondition?.id && patientSpecificProducts) {
        return {
          ...condition,
          patientSpecificConfig: JSON.parse(JSON.stringify(patientSpecificProducts))
        };
      }
      return condition;
    });
    
    try {
      const result = await saveToBackend(updatedConditions, categories, ddsTypes, products);
      if (result.success) {
        setHasChanges(false);
        setIsSaving(false);
        
        // Update conditions with the saved data that includes patientSpecificConfig
        setEditedConditions(updatedConditions);
        
        // Notify parent component of the updates
        if (onConditionsUpdate) {
          onConditionsUpdate(updatedConditions);
        }
        
        // Show success message with toast instead of using the state
        toast.success('All changes saved successfully!', {
          position: 'bottom-right',
          duration: 3000
        });
        
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
    
    // Reset patient-specific products
    if (selectedCondition) {
      initializePatientSpecificProducts(selectedCondition);
    }
  };
  
  // Handle condition selection
  const handleConditionSelect = (condition) => {
    setSelectedCondition(condition);
    setActivePatientType('all');
    initializePatientSpecificProducts(condition);
  };
  
  // Update condition field
  const updateConditionField = (conditionId, field, value) => {
    setIsEditing(true);
    setHasChanges(true);
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
    setHasChanges(true);
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
              objection: '',
              factSheet: '#',
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
          objection: '',
          factSheet: '#',
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
  
  // Add product to specific patient type and phase
  const addProductToPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    setHasChanges(true);
    
    // Update patient-specific products
    setPatientSpecificProducts(prev => {
      const updated = { ...prev };
      
      // Initialize phase if not exists
      if (!updated[phase]) {
        updated[phase] = {
          'all': [],
          '1': [],
          '2': [],
          '3': [],
          '4': []
        };
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
      
      return updated;
    });
  };
  
  // Remove product from specific patient type and phase
  const removeProductFromPatientType = (phase, patientType, productName) => {
    setIsEditing(true);
    setHasChanges(true);
    
    // Update patient-specific products
    setPatientSpecificProducts(prev => {
      const updated = { ...prev };
      
      // If patientType is 'all', remove from all patient types
      if (patientType === 'all') {
        updated[phase]['all'] = updated[phase]['all'].filter(p => p !== productName);
        updated[phase]['1'] = updated[phase]['1'].filter(p => p !== productName);
        updated[phase]['2'] = updated[phase]['2'].filter(p => p !== productName);
        updated[phase]['3'] = updated[phase]['3'].filter(p => p !== productName);
        updated[phase]['4'] = updated[phase]['4'].filter(p => p !== productName);
      } else {
        // Remove from specific patient type
        updated[phase][patientType] = updated[phase][patientType].filter(p => p !== productName);
        
        // Remove from 'all' as well since it's no longer in all patient types
        updated[phase]['all'] = updated[phase]['all'].filter(p => p !== productName);
      }
      
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
      products: {
        'Initial': [],
        'Maintenance': []
      },
      productDetails: {},
    };
    
    setEditedConditions(prev => [...prev, newCondition]);
    setSelectedCondition(newCondition);
    setHasChanges(true);
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
      usage: {}, // Initialize usage as an object for phase-specific instructions
      rationale: '',
      clinicalEvidence: '',
      competitive: '',
      objection: '',
      factSheet: '#',
      researchArticles: [], // Initialize with empty array
      pitchPoints: ''
    });
    setShowAddModal(true);
  };
  
  // Submit new item from modal
  const handleSubmitNewItem = () => {
    setIsEditing(true);
    setHasChanges(true);
    
    if (modalType === 'product') {
      const productName = newItemData.name;
      
      if (newItemType && newItemType !== 'product') {
        // Product name was changed - need to update all references
        setEditedConditions(prev => 
          prev.map(condition => {
            // Update product references in all phases
            const updatedProducts = { ...condition.products };
            Object.keys(updatedProducts).forEach(phase => {
              updatedProducts[phase] = updatedProducts[phase].map(p => 
                p === newItemType ? productName : 
                p === `${newItemType} (Type 3/4 Only)` ? `${productName} (Type 3/4 Only)` : p
              );
            });
            
            // Update product details
            const updatedProductDetails = { ...condition.productDetails };
            if (updatedProductDetails[newItemType]) {
              updatedProductDetails[productName] = {
                usage: newItemData.usage || {}, // Handle usage as an object
                rationale: newItemData.rationale,
                clinicalEvidence: newItemData.clinicalEvidence || '',
                competitive: newItemData.competitive,
                objection: newItemData.objection,
                factSheet: newItemData.factSheet || '#',
                researchArticles: newItemData.researchArticles || [], // Preserve research articles
                pitchPoints: newItemData.pitchPoints || '' // Add pitch points field
              };
              delete updatedProductDetails[newItemType];
            }
            
            return { 
              ...condition, 
              products: updatedProducts,
              productDetails: updatedProductDetails
            };
          })
        );
        
        // Update allProducts list
        setProducts(prev => {
          const index = prev.indexOf(newItemType);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = productName;
            return updated;
          }
          return [...prev, productName];
        });
        
        // Update patient-specific products if currently editing
        if (selectedCondition) {
          setPatientSpecificProducts(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(phase => {
              Object.keys(updated[phase]).forEach(type => {
                updated[phase][type] = updated[phase][type].map(p => 
                  p === newItemType ? productName : p
                );
              });
            });
            return updated;
          });
        }
      } else if (newItemType) {
        // Only details changed, not the name
        setEditedConditions(prev => 
          prev.map(condition => {
            if (condition.productDetails && condition.productDetails[productName]) {
              const updatedProductDetails = { ...condition.productDetails };
              updatedProductDetails[productName] = {
                ...updatedProductDetails[productName], // Keep any existing fields
                usage: newItemData.usage || {}, // Handle usage as an object
                rationale: newItemData.rationale,
                competitive: newItemData.competitive,
                objection: newItemData.objection,
                factSheet: newItemData.factSheet || '#',
                researchArticles: newItemData.researchArticles || [], // Add research articles
                pitchPoints: newItemData.pitchPoints || '' // Add pitch points field
              };
              return { ...condition, productDetails: updatedProductDetails };
            }
            return condition;
          })
        );
      } else {
        // This is a new product
        if (!products.includes(productName)) {
          setProducts(prev => [...prev, productName]);
          
          // Add product details to all conditions that use it
          setEditedConditions(prev => 
            prev.map(condition => {
              const updatedProductDetails = { ...condition.productDetails };
              updatedProductDetails[productName] = {
                usage: newItemData.usage || {}, // Handle usage as an object
                rationale: newItemData.rationale,
                competitive: newItemData.competitive,
                objection: newItemData.objection,
                factSheet: newItemData.factSheet || '#',
                researchArticles: newItemData.researchArticles || [], // Add research articles for new products
                pitchPoints: newItemData.pitchPoints || '' // Add pitch points field
              };
              return { ...condition, productDetails: updatedProductDetails };
            })
          );
        }
      }
  } else if (modalType === 'condition') {
    // Add new condition
    if (newItemData.name && !editedConditions.find(c => c.name === newItemData.name)) {
      const newCondition = {
        name: newItemData.name,
        category: newItemData.category || categories[0] || '',
        phases: newItemData.phases || ['Prep', 'Acute', 'Maintenance'],
        dds: newItemData.dds || [],
        patientType: newItemData.patientType || 'Types 1 to 4',
        products: newItemData.products || {
          Prep: [],
          Acute: [],
          Maintenance: []
        },
        productDetails: {}
      };
      
      setEditedConditions(prev => [...prev, newCondition]);
      setSelectedCondition(newCondition);
    }
  } else if (modalType === 'category') {
    // Add new category
    if (newItemData.name && !categories.includes(newItemData.name)) {
      // Update categories list
      setCategories(prev => [...prev, newItemData.name]);
      
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
    // Add new DDS type
    if (newItemData.name && !ddsTypes.includes(newItemData.name)) {
      setDdsTypes(prev => [...prev, newItemData.name]);
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
  const handleDelete = () => {
    setIsEditing(true);
    setHasChanges(true);
    const { type, item } = itemToDelete;
    
    if (type === 'condition') {
      setEditedConditions(prev => prev.filter(c => c.name !== item.name));
      
      // Select a new condition if the deleted one was selected
      if (selectedCondition && selectedCondition.name === item.name) {
        const remainingConditions = editedConditions.filter(c => c.name !== item.name);
        setSelectedCondition(remainingConditions.length > 0 ? remainingConditions[0] : null);
      }
    } else if (type === 'product') {
      // Remove product from all conditions
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
    } else if (type === 'category') {
      // Don't allow deleting the 'All' category
      if (item === 'All') {
        setConfirmDeleteOpen(false);
        setItemToDelete({ type: '', item: '' });
        return;
      }
      
      // Remove the category from the list
      setCategories(prev => prev.filter(c => c !== item));
      
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
      
      // Remove the DDS type from the list
      setDdsTypes(prev => prev.filter(d => d !== item));
      
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
                setEditedConditions(importedData);
                setIsEditing(true);
                setHasChanges(true);
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
                        <div className="space-y-6">
                          {Object.keys(selectedCondition.productDetails).map((productName) => (
                            <div key={productName} className="border rounded-md p-4 bg-gray-50">
                              <h4 className="font-medium text-md mb-3">{productName}</h4>
                              
                              <div className="space-y-3">
                                {/* Usage Instructions with Phase Tabs */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usage Instructions
                                  </label>
                                  
                                  {selectedCondition.phases && selectedCondition.phases.length > 0 ? (
                                    <div className="border border-gray-300 rounded-md">
                                      <Tabs.Root defaultValue={selectedCondition.phases[0]} className="w-full">
                                        <Tabs.List className="flex border-b bg-gray-50">
                                          {selectedCondition.phases.map((phase) => (
                                            <Tabs.Trigger
                                              key={phase}
                                              value={phase}
                                              className={clsx(
                                                "flex-1 px-3 py-1.5 text-sm font-medium",
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
                                                selectedCondition.productDetails[productName].usage && 
                                                typeof selectedCondition.productDetails[productName].usage === 'object' ?
                                                selectedCondition.productDetails[productName].usage[phase] || '' :
                                                selectedCondition.productDetails[productName].usage || ''
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
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </Tabs.Content>
                                        ))}
                                      </Tabs.Root>
                                    </div>
                                  ) : (
                                    <textarea
                                      value={selectedCondition.productDetails[productName].usage || ''}
                                      onChange={(e) => updateProductDetail(
                                        selectedCondition.name,
                                        productName,
                                        'usage',
                                        e.target.value
                                      )}
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  )}
                                </div>
                                
                                {/* Scientific Rationale */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Scientific Rationale
                                  </label>
                                  <textarea
                                    value={selectedCondition.productDetails[productName].rationale || ''}
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
                                    value={selectedCondition.productDetails[productName].clinicalEvidence || ''}
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
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter competitive advantage information. Line breaks will be preserved in the display."
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
                                    value={selectedCondition.productDetails[productName].pitchPoints || ''}
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
                                  
                                  {selectedCondition.productDetails[productName].researchArticles && 
                                    selectedCondition.productDetails[productName].researchArticles.map((article, index) => (
                                    <div key={index} className="flex space-x-2 mb-2">
                                      <div className="flex-grow space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Article title"
                                          value={article.title || ''}
                                          onChange={(e) => {
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
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
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
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
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
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
                                            const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
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
                                          const updatedArticles = [...selectedCondition.productDetails[productName].researchArticles];
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
                                      const currentArticles = selectedCondition.productDetails[productName].researchArticles || [];
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
                          ))}
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
                      title="Edit product details"
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
                  
                {editedConditions[0]?.productDetails?.[product] && (
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div className="truncate">
                      <span className="font-medium">Usage: </span>
                      {typeof editedConditions[0].productDetails[product].usage === 'object' 
                        ? 'Phase-specific instructions available'
                        : editedConditions[0].productDetails[product].usage || 'Not specified'}
                    </div>
                    <div className="truncate">
                      <span className="font-medium">Conditions: </span>
                      {editedConditions.filter(c => 
                        Object.values(c.products || {}).some(products => 
                          products.includes(product) || products.includes(`${product} (Type 3/4 Only)`)
                        )
                      ).length} conditions
                    </div>
                  </div>
                )}
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
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Usage Instructions
                      </label>
                      <textarea
                        value={newItemData.usage && typeof newItemData.usage === 'string' ? 
                          newItemData.usage : 
                          JSON.stringify(newItemData.usage, null, 2)}
                        onChange={(e) => {
                          try {
                            // Try to parse as JSON if it looks like a JSON object
                            if (e.target.value.trim().startsWith('{')) {
                              const parsedValue = JSON.parse(e.target.value);
                              setNewItemData({...newItemData, usage: parsedValue});
                            } else {
                              setNewItemData({...newItemData, usage: e.target.value});
                            }
                          } catch (err) {
                            // If not valid JSON, just store as is
                            setNewItemData({...newItemData, usage: e.target.value});
                          }
                        }}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="For phase-specific usage, format as JSON: {'Prep': 'Instructions for Prep', 'Acute': 'Instructions for Acute'}"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scientific Rationale
                      </label>
                      <textarea
                        value={newItemData.rationale || ''}
                        onChange={(e) => setNewItemData({...newItemData, rationale: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinical Evidence
                      </label>
                      <textarea
                        value={newItemData.clinicalEvidence || newItemData.rationale || ''}
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
                        Objection Handling
                      </label>
                      <textarea
                        value={newItemData.objection || ''}
                        onChange={(e) => setNewItemData({...newItemData, objection: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    {/* New Research Articles Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supporting Research Articles
                      </label>
                      
                      {newItemData.researchArticles && newItemData.researchArticles.map((article, index) => (
                        <div key={index} className="flex space-x-2 mb-2">
                          <div className="flex-grow space-y-2">
                            <input
                              type="text"
                              placeholder="Article title"
                              value={article.title || ''}
                              onChange={(e) => {
                                const updatedArticles = [...newItemData.researchArticles];
                                updatedArticles[index].title = e.target.value;
                                setNewItemData({...newItemData, researchArticles: updatedArticles});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            
                            <input
                              type="text"
                              placeholder="Author/Source"
                              value={article.author || ''}
                              onChange={(e) => {
                                const updatedArticles = [...newItemData.researchArticles];
                                updatedArticles[index].author = e.target.value;
                                setNewItemData({...newItemData, researchArticles: updatedArticles});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            
                            <textarea
                              placeholder="Abstract (optional)"
                              value={article.abstract || ''}
                              onChange={(e) => {
                                const updatedArticles = [...newItemData.researchArticles];
                                updatedArticles[index].abstract = e.target.value;
                                setNewItemData({...newItemData, researchArticles: updatedArticles});
                              }}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            
                            <input
                              type="text"
                              placeholder="URL (optional)"
                              value={article.url || ''}
                              onChange={(e) => {
                                const updatedArticles = [...newItemData.researchArticles];
                                updatedArticles[index].url = e.target.value;
                                setNewItemData({...newItemData, researchArticles: updatedArticles});
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <button
                            onClick={() => {
                              const updatedArticles = [...newItemData.researchArticles];
                              updatedArticles.splice(index, 1);
                              setNewItemData({...newItemData, researchArticles: updatedArticles});
                            }}
                            className="p-2 border border-red-300 rounded-md text-red-500 hover:bg-red-50 self-start"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const updatedArticles = [...(newItemData.researchArticles || []), { title: '', author: '', url: '' }];
                          setNewItemData({...newItemData, researchArticles: updatedArticles});
                        }}
                        className="mt-2 px-3 py-2 border border-indigo-300 rounded-md text-indigo-600 hover:bg-indigo-50 text-sm flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Research Article
                      </button>
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