import React, { useState, useEffect, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Save, Plus, Edit, Trash2, X, ChevronDown, Info, AlertTriangle, Lock, Check, User, Filter, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import DataImportExport from './DataImportExport';
import { supabase } from '../supabaseClient';

// Patient Types definition
const PATIENT_TYPES = {
  'all': 'All Patient Types',
  '1': 'Type 1: Healthy',
  '2': 'Type 2: Mild inflammation, moderate risk',
  '3': 'Type 3: Smoker, diabetic, immunocompromised',
  '4': 'Type 4: Periodontal disease, chronic illness, poor healing'
};

function AdminPanel({ initialConditions, onClose }) {
  const [activeTab, setActiveTab] = useState('conditions');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [editingConditionData, setEditingConditionData] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [allPhases, setAllPhases] = useState([]);
  const [allDentists, setAllDentists] = useState([]);
  const [allPatientTypes, setAllPatientTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ddsTypes, setDdsTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [activePatientTypeConfig, setActivePatientTypeConfig] = useState('all');
  const [patientSpecificProductsConfig, setPatientSpecificProductsConfig] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [newItemData, setNewItemData] = useState({});
  const [isEditingModalItem, setIsEditingModalItem] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log("AdminPanel: Fetching auxiliary data...");
    try {
      const [
        { data: productsData, error: productsError },
        { data: phasesData, error: phasesError },
        { data: dentistsData, error: dentistsError },
        { data: patientTypesData, error: ptError },
      ] = await Promise.all([
        supabase.from('products').select('id, name'),
        supabase.from('phases').select('id, name'),
        supabase.from('dentists').select('id, name'),
        supabase.from('patient_types').select('id, name'),
      ]);

      if (productsError || phasesError || dentistsError || ptError) {
        throw new Error('Failed to fetch auxiliary data.');
      }

      setAllProducts(productsData || []);
      setAllPhases(phasesData || []);
      setAllDentists(dentistsData || []);
      setAllPatientTypes(patientTypesData || []);
      
      if (initialConditions) {
          const uniqueCategories = ['All', ...new Set(initialConditions.map(c => c.category).filter(Boolean))];
          const uniqueDdsTypes = ['All', ...new Set(initialConditions.flatMap(c => Array.isArray(c.dds) ? c.dds : []).filter(Boolean))];
          setCategories(uniqueCategories.sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
          setDdsTypes(uniqueDdsTypes.sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));

          if (initialConditions.length > 0 && !selectedCondition) {
             handleConditionSelect(initialConditions[0]);
          }
      }
      
      console.log("AdminPanel: Data fetched successfully.");

    } catch (err) {
      console.error("AdminPanel Error fetching data:", err);
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, [initialConditions, selectedCondition]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (selectedCondition) {
      const initialConfig = {};
      selectedCondition.phases.forEach(phaseName => {
          initialConfig[phaseName] = { all: [], 1: [], 2: [], 3: [], 4: [] };
          const productsForPhase = selectedCondition.products?.[phaseName] || [];
          
          productsForPhase.forEach(productFullName => {
              const isType34 = productFullName.includes('(Type 3/4 Only)');
              const productName = productFullName.replace(' (Type 3/4 Only)', '');
              
              if (isType34) {
                  if (!initialConfig[phaseName][3].includes(productName)) initialConfig[phaseName][3].push(productName);
                  if (!initialConfig[phaseName][4].includes(productName)) initialConfig[phaseName][4].push(productName);
              } else {
                  if (!initialConfig[phaseName][1].includes(productName)) initialConfig[phaseName][1].push(productName);
                  if (!initialConfig[phaseName][2].includes(productName)) initialConfig[phaseName][2].push(productName);
                  if (!initialConfig[phaseName][3].includes(productName)) initialConfig[phaseName][3].push(productName);
                  if (!initialConfig[phaseName][4].includes(productName)) initialConfig[phaseName][4].push(productName);
              }
          });
          const allIndividualProducts = new Set([...initialConfig[phaseName][1], ...initialConfig[phaseName][2], ...initialConfig[phaseName][3], ...initialConfig[phaseName][4]]);
          initialConfig[phaseName].all = [...allIndividualProducts].filter(p => 
              initialConfig[phaseName][1].includes(p) &&
              initialConfig[phaseName][2].includes(p) &&
              initialConfig[phaseName][3].includes(p) &&
              initialConfig[phaseName][4].includes(p)
          );
      });
      setPatientSpecificProductsConfig(initialConfig);
      setEditingConditionData(JSON.parse(JSON.stringify(selectedCondition)));
    } else {
      setPatientSpecificProductsConfig({});
      setEditingConditionData(null);
    }
  }, [selectedCondition]);

  const getOrCreateId = async (tableName, nameField, value) => {
    if (!value) return null;
    let { data, error } = await supabase.from(tableName).select('id').eq(nameField, value).maybeSingle();
    if (error) throw error;
    if (data) return data.id;
    let { data: newData, error: insertError } = await supabase.from(tableName).insert({ [nameField]: value }).select('id').single();
    if (insertError) throw insertError;
    return newData.id;
  };

  const handleSaveChanges = async () => {
    if (!editingConditionData) return;
    setIsSaving(true);
    setError(null);
    console.log("AdminPanel: Saving changes for condition:", editingConditionData.name);

    try {
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .upsert({
          id: editingConditionData.id,
          name: editingConditionData.name,
          category: editingConditionData.category,
          pitch_points: editingConditionData.pitchPoints,
        })
        .select()
        .single();

      if (procedureError) throw procedureError;
      const procedureId = procedureData.id;
      console.log("Saved procedure ID:", procedureId);

      const phaseIds = await Promise.all(editingConditionData.phases.map(phaseName => getOrCreateId('phases', 'name', phaseName)));
      await supabase.from('procedure_phases').delete().eq('procedure_id', procedureId);
      if (phaseIds.length > 0) {
          const phaseLinks = phaseIds.map(phaseId => ({ procedure_id: procedureId, phase_id: phaseId }));
          const { error: phaseLinkError } = await supabase.from('procedure_phases').insert(phaseLinks);
          if (phaseLinkError) throw phaseLinkError;
          console.log("Linked phases:", phaseIds);
      }
      
      const dentistIds = await Promise.all(editingConditionData.dds.map(ddsName => getOrCreateId('dentists', 'name', ddsName)));
      await supabase.from('procedure_dentists').delete().eq('procedure_id', procedureId);
      if (dentistIds.length > 0) {
          const dentistLinks = dentistIds.map(dentistId => ({ procedure_id: procedureId, dentist_id: dentistId }));
          const { error: ddsLinkError } = await supabase.from('procedure_dentists').insert(dentistLinks);
          if (ddsLinkError) throw ddsLinkError;
          console.log("Linked dentists:", dentistIds);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onClose(); 

    } catch (err) {
      console.error('Error saving changes:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConditionSelect = (condition) => {
    console.log("Selected condition:", condition);
    setSelectedCondition(condition); 
    setActivePatientTypeConfig('all');
  };

  const handleConditionFieldChange = (field, value) => {
    setEditingConditionData(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleProductDetailChange = (productName, field, value) => {
     setEditingConditionData(prev => {
        if (!prev) return null;
        const updatedDetails = { ...(prev.productDetails || {}) };
        if (!updatedDetails[productName]) {
            updatedDetails[productName] = {};
        }
        updatedDetails[productName] = { ...updatedDetails[productName], [field]: value };
        return { ...prev, productDetails: updatedDetails };
     });
  };

  const updatePatientSpecificConfig = (phase, patientType, action, productName) => {
     setPatientSpecificProductsConfig(prev => {
         const updated = JSON.parse(JSON.stringify(prev));
         if (!updated[phase]) return prev;
         
         const targetList = patientType === 'all' ? updated[phase].all : updated[phase][patientType];
         if (!targetList) return prev;

         if (action === 'add') {
             if (!targetList.includes(productName)) {
                 targetList.push(productName);
                 if (patientType === 'all') {
                    if (!updated[phase][1].includes(productName)) updated[phase][1].push(productName);
                    if (!updated[phase][2].includes(productName)) updated[phase][2].push(productName);
                    if (!updated[phase][3].includes(productName)) updated[phase][3].push(productName);
                    if (!updated[phase][4].includes(productName)) updated[phase][4].push(productName);
                 }
             }
         } else if (action === 'remove') {
             const index = targetList.indexOf(productName);
             if (index > -1) {
                 targetList.splice(index, 1);
                 if (patientType === 'all') {
                     updated[phase][1] = updated[phase][1].filter(p => p !== productName);
                     updated[phase][2] = updated[phase][2].filter(p => p !== productName);
                     updated[phase][3] = updated[phase][3].filter(p => p !== productName);
                     updated[phase][4] = updated[phase][4].filter(p => p !== productName);
                 }
                 else {
                      updated[phase].all = updated[phase].all.filter(p => p !== productName);
                 }
             }
         }
         
         if (patientType !== 'all') {
            const allIndividualProducts = new Set([...updated[phase][1], ...updated[phase][2], ...updated[phase][3], ...updated[phase][4]]);
            updated[phase].all = [...allIndividualProducts].filter(p => 
                updated[phase][1].includes(p) &&
                updated[phase][2].includes(p) &&
                updated[phase][3].includes(p) &&
                updated[phase][4].includes(p)
            );
         }

         return updated;
     });
  };

  const handleAddCondition = () => {
    setModalType('condition');
    setIsEditingModalItem(false);
    setNewItemData({
      name: '',
      category: categories.find(c => c !== 'All') || '',
      pitch_points: '',
    });
    setShowAddModal(true);
  };
  
  const handleAddCategory = () => {
    setModalType('category');
    setIsEditingModalItem(false);
    setNewItemData({ name: '' });
    setShowAddModal(true);
  };
  
  const handleAddDdsType = () => {
    setModalType('ddsType');
    setIsEditingModalItem(false);
    setNewItemData({ name: '' });
    setShowAddModal(true);
  };
  
  const handleAddProduct = () => {
    setModalType('product');
    setIsEditingModalItem(false);
    setNewItemData({
      name: '',
      usage: '',
      rationale: '',
      competitive: '',
      objection: '',
      factSheet: '#',
      researchArticles: []
    });
    setShowAddModal(true);
  };
  
  const handleEditProduct = (product) => {
    setModalType('product');
    setIsEditingModalItem(true);
    const productData = allProducts.find(p => p.name === product.name);
    let details = initialConditions
        .flatMap(c => c.productDetails ? Object.entries(c.productDetails) : [])
        .find(([name, _]) => name === product.name)?.[1];
        
    setNewItemData({
      id: productData?.id,
      name: product.name,
      usage: details?.usage || '',
      rationale: details?.rationale || '',
      competitive: details?.competitive || '',
      objection: details?.objection || '',
      factSheet: details?.factSheet || '#',
      researchArticles: details?.researchArticles || []
    });
    setShowAddModal(true);
  };

  const handleSubmitNewItem = async () => {
    setIsSaving(true);
    setError(null);
    const isEditing = isEditingModalItem;
    
    try {
        if (modalType === 'product') {
            const { data: productData, error: productError } = await supabase
                .from('products')
                .upsert({ id: isEditing ? newItemData.id : undefined, name: newItemData.name })
                .select()
                .single();
            if (productError) throw productError;
            const productId = productData.id;

            const { error: detailsError } = await supabase
                .from('product_details')
                .upsert({
                    product_id: productId,
                    usage: newItemData.usage,
                    rationale: newItemData.rationale,
                    competitive: newItemData.competitive,
                    objection: newItemData.objection,
                    fact_sheet: newItemData.factSheet,
                });
            if (detailsError) throw detailsError;

        } else if (modalType === 'condition') {
            const { error } = await supabase.from('procedures').insert({
                name: newItemData.name,
                category: newItemData.category,
                pitch_points: newItemData.pitch_points,
            });
            if (error) throw error;

        } else if (modalType === 'ddsType') {
            const { error } = await supabase.from('dentists').insert({ name: newItemData.name });
            if (error && error.code !== '23505') throw error;
        } 
        
        setShowAddModal(false);
        setNewItemData({});
        setIsEditingModalItem(false);
        await fetchAdminData();
        onClose();

    } catch (err) {
        console.error(`Error ${isEditing ? 'updating' : 'adding'} ${modalType}:`, err);
        setError(err.message || `Failed to ${isEditing ? 'update' : 'add'} ${modalType}.`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const confirmDelete = (type, item) => {
    setItemToDelete({ type, item });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    setError(null);
    const { type, item } = itemToDelete;

    try {
      if (type === 'condition') {
        const { error } = await supabase.from('procedures').delete().eq('id', item.id);
        if (error) throw error;
        setSelectedCondition(null);
      } else if (type === 'product') {
        const { error } = await supabase.from('products').delete().eq('id', item.id); 
        if (error) throw error;
      } else if (type === 'category') {
        console.warn("Cannot delete category directly, it's a field.");
      } else if (type === 'ddsType') {
        const { error } = await supabase.from('dentists').delete().eq('id', item.id);
        if (error) throw error;
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
      await fetchAdminData();
      onClose();

    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      setError(err.message || `Failed to delete ${type}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPatientTypeProductConfig = (phase) => {
    const currentPhaseConfig = patientSpecificProductsConfig[phase] || { all: [], 1: [], 2: [], 3: [], 4: [] };
    const currentProductsForType = currentPhaseConfig[activePatientTypeConfig] || [];

    return (
      <div className="mt-4 border rounded-lg p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Configure Products for this Phase</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show/Edit for:</span>
            <Select.Root value={activePatientTypeConfig} onValueChange={setActivePatientTypeConfig}>
              <Select.Trigger className="px-3 py-1 text-sm border border-gray-300 rounded-md flex items-center bg-white">
                <User size={15} className="mr-1 text-gray-500" />
                <Select.Value />
                <Select.Icon><ChevronDown size={15} /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white rounded-md shadow-lg border min-w-[220px] z-[9999]">
                  <Select.Viewport className="p-1">
                    {Object.entries(PATIENT_TYPES).map(([type, label]) => (
                      <Select.Item key={type} value={type}>{label}</Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Available Products</span>
             <select
                onChange={(e) => {
                    if (e.target.value) {
                        updatePatientSpecificConfig(phase, activePatientTypeConfig, 'add', e.target.value);
                        e.target.value = '';
                    }
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white"
             >
                 <option value="">Add product...</option>
                 {allProducts
                    .filter(p => !currentProductsForType.includes(p.name))
                    .map((product) => (
                        <option key={product.id} value={product.name}>{product.name}</option>
                 ))}
             </select>
        </div>
        {currentProductsForType.length > 0 ? (
             <ul className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded bg-white">
                {currentProductsForType.map((productName) => (
                    <li key={productName} className="border-b last:border-b-0 py-1 flex justify-between items-center">
                         <span>{productName}</span>
                         <button
                             onClick={() => updatePatientSpecificConfig(phase, activePatientTypeConfig, 'remove', productName)}
                             className="text-red-500 hover:text-red-700 p-1"
                         >
                             <Trash2 size={15} />
                         </button>
                    </li>
                 ))}
             </ul>
         ) : (
          <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md">
            No products configured for this patient type.
          </div>
        )}

      </div>
    );
  };

  if (isLoading) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                Loading Admin Panel...
            </div>
        </div>
    );
  }
  
  if (error && !isLoading) {
     return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded relative max-w-lg text-center shadow-md">
                 <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                 <strong className="font-bold">Error!</strong>
                 <span className="block sm:inline mt-1"> {error}</span>
                 <button onClick={fetchAdminData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
                 <button onClick={onClose} className="mt-4 ml-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
            </div>
         </div>
     );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Knowledge Base Administrator</h2>
          <div className="flex items-center space-x-2">
            {editingConditionData && (
                <button
                  onClick={handleSaveChanges}
                  className={`px-3 py-1.5 rounded-md text-white text-sm flex items-center ${ isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700' }`}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="mr-1 animate-spin"/> : <Save size={16} className="mr-1" />}
                  Save Condition Changes
                </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-md">
            <Check size={20} className="mr-2" />
            Changes saved successfully!
          </div>
        )}
        {error && <div className="p-3 bg-red-100 text-red-700 text-sm">Error: {error}</div>}

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <Tabs.List className="flex border-b flex-shrink-0">
            <Tabs.Trigger value="importExport" className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeTab === "importExport" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}>
              Import/Export
            </Tabs.Trigger>
            <Tabs.Trigger value="conditions" className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeTab === "conditions" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}>
              Conditions
            </Tabs.Trigger>
            <Tabs.Trigger value="products" className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeTab === "products" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}>
              Products
            </Tabs.Trigger>
            <Tabs.Trigger value="categories" className={clsx(
                "px-6 py-3 text-sm font-medium",
                activeTab === "categories" 
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}>
              Categories & DDS Types
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="importExport" className="p-6 flex-grow overflow-y-auto">
             <DataImportExport 
                conditions={initialConditions} 
                onImport={(importedData) => {
                    console.warn("Import functionality needs reimplementation with Supabase.");
                }} 
             />
          </Tabs.Content>

          <Tabs.Content value="conditions" className="flex-grow flex overflow-hidden">
            <div className="w-1/3 border-r p-4 overflow-y-auto flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-medium">All Conditions ({initialConditions.length})</h3>
                 <button onClick={handleAddCondition} className="p-1 text-blue-600 hover:text-blue-800 inline-flex items-center text-sm">
                    <Plus size={16} className="mr-1" />
                    Add New
                 </button>
              </div>
              <ul className="space-y-1">
                  {initialConditions.map((condition) => (
                    <li 
                      key={condition.id}
                      className={clsx(
                        "px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group",
                        selectedCondition?.id === condition.id
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

            <div className="w-2/3 p-4 overflow-y-auto flex-grow">
              {editingConditionData ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition Name
                        </label>
                        <input
                          type="text"
                          value={editingConditionData.name || ''}
                          onChange={(e) => handleConditionFieldChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={editingConditionData.category || ''}
                          onChange={(e) => handleConditionFieldChange('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          {categories.filter(c => c !== 'All').map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Type
                      </label>
                      <input
                        type="text"
                        value={editingConditionData.patientType || ''}
                        onChange={(e) => handleConditionFieldChange('patientType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Format: "Types 1 to 4" or "Types 3 to 4"</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DDS Types
                      </label>
                      <div className="border border-gray-300 rounded-md p-2 mb-2">
                        <div className="flex flex-wrap gap-2">
                          {(editingConditionData.dds || []).map((dds) => (
                            <span 
                              key={dds} 
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                            >
                              {dds}
                              <button
                                onClick={() => handleConditionFieldChange('dds', editingConditionData.dds.filter(d => d !== dds))}
                                className="ml-1 text-blue-700 hover:text-blue-900"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <select
                        onChange={(e) => { if (e.target.value && !(editingConditionData.dds || []).includes(e.target.value)) handleConditionFieldChange('dds', [...(editingConditionData.dds || []), e.target.value]); e.target.value=''; }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Add DDS Type...</option>
                        {ddsTypes.filter(d => d !== 'All' && !(editingConditionData.dds || []).includes(d)).map(dds => <option key={dds} value={dds}>{dds}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pitch Points
                      </label>
                      <textarea
                        value={editingConditionData.pitchPoints || ''}
                        onChange={(e) => handleConditionFieldChange('pitchPoints', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competitive Advantage
                      </label>
                      <textarea
                        value={editingConditionData.competitiveAdvantage || ''}
                        onChange={(e) => handleConditionFieldChange('competitiveAdvantage', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Handling Objections
                      </label>
                      <textarea
                        value={editingConditionData.handlingObjections || ''}
                        onChange={(e) => handleConditionFieldChange('handlingObjections', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scientific Rationale
                      </label>
                      <textarea
                        value={editingConditionData.scientificRationale || ''}
                        onChange={(e) => handleConditionFieldChange('scientificRationale', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinical Evidence
                      </label>
                      <textarea
                        value={editingConditionData.clinicalEvidence || ''}
                        onChange={(e) => handleConditionFieldChange('clinicalEvidence', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Treatment Phases
                      </label>
                      <div className="border border-gray-300 rounded-md p-2 mb-2">
                        <div className="flex flex-wrap gap-2">
                          {(editingConditionData.phases || []).map((phase) => (
                            <span 
                              key={phase} 
                              className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center"
                            >
                              {phase}
                              <button
                                onClick={() => handleConditionFieldChange('phases', editingConditionData.phases.filter(p => p !== phase))}
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
                            if (e.key === 'Enter' && e.target.value && !editingConditionData.phases.includes(e.target.value)) {
                              const updatedPhases = [...editingConditionData.phases, e.target.value];
                              handleConditionFieldChange('phases', updatedPhases);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.previousElementSibling;
                            if (input.value && !editingConditionData.phases.includes(input.value)) {
                              const updatedPhases = [...editingConditionData.phases, input.value];
                              handleConditionFieldChange('phases', updatedPhases);
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Products by Phase Configuration</h3>
                      <Tabs.Root defaultValue={editingConditionData.phases?.[0]} className="border rounded-md">
                         <Tabs.List className="flex border-b bg-gray-50 overflow-x-auto">
                            {(editingConditionData.phases || []).map((phase) => (
                               <Tabs.Trigger key={phase} value={phase} className={clsx(
                                 "flex-1 px-4 py-2 text-sm font-medium",
                                 "data-[state=active]:text-blue-600 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500",
                                 "data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                               )}>
                                 {phase} Phase
                               </Tabs.Trigger>
                            ))}
                         </Tabs.List>
                         {(editingConditionData.phases || []).map((phase) => (
                            <Tabs.Content key={phase} value={phase} className="p-4">
                               {renderPatientTypeProductConfig(phase)}
                            </Tabs.Content>
                         ))}
                      </Tabs.Root>
                   </div>

                   <div className="mt-6">
                      <h3 className="font-medium text-lg mb-3">Product Details</h3>
                      
                      {Object.keys(editingConditionData.productDetails || {}).length > 0 ? (
                        <div className="space-y-6">
                          {Object.keys(editingConditionData.productDetails).map((productName) => (
                            <div key={productName} className="border rounded-md p-4 bg-gray-50">
                              <h4 className="font-medium text-md mb-3">{productName}</h4>
                              
                              <div className="space-y-3">
                                {/* ...existing fields... */}
                                
                                {/* Research Articles Section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supporting Research Articles
                                  </label>
                                  
                                  {editingConditionData.productDetails[productName].researchArticles && 
                                    editingConditionData.productDetails[productName].researchArticles.map((article, index) => (
                                    <div key={index} className="flex space-x-2 mb-2">
                                      <div className="flex-grow space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Article title"
                                          value={article.title || ''}
                                          onChange={(e) => {
                                            const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                            const currentArticles = currentProductDetails.researchArticles || [];
                                            const updatedArticles = currentArticles.map((art, i) => 
                                              i === index ? { ...art, title: e.target.value } : art
                                            );
                                            handleProductDetailChange(productName, 'researchArticles', updatedArticles);
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <input
                                          type="text"
                                          placeholder="Author/Source"
                                          value={article.author || ''}
                                          onChange={(e) => {
                                            const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                            const currentArticles = currentProductDetails.researchArticles || [];
                                            const updatedArticles = currentArticles.map((art, i) => 
                                              i === index ? { ...art, author: e.target.value } : art
                                            );
                                            handleProductDetailChange(productName, 'researchArticles', updatedArticles);
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <textarea
                                          placeholder="Abstract (optional)"
                                          value={article.abstract || ''}
                                          onChange={(e) => {
                                            const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                            const currentArticles = currentProductDetails.researchArticles || [];
                                            const updatedArticles = currentArticles.map((art, i) => 
                                              i === index ? { ...art, abstract: e.target.value } : art
                                            );
                                            handleProductDetailChange(productName, 'researchArticles', updatedArticles);
                                          }}
                                          rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                        
                                        <input
                                          type="text"
                                          placeholder="URL (optional)"
                                          value={article.url || ''}
                                          onChange={(e) => {
                                            const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                            const currentArticles = currentProductDetails.researchArticles || [];
                                            const updatedArticles = currentArticles.map((art, i) => 
                                              i === index ? { ...art, url: e.target.value } : art
                                            );
                                            handleProductDetailChange(productName, 'researchArticles', updatedArticles);
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        />
                                      </div>
                                      
                                      <button
                                        onClick={() => {
                                          const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                          const currentArticles = currentProductDetails.researchArticles || [];
                                          const updatedArticles = currentArticles.filter((_, i) => i !== index);
                                          handleProductDetailChange(productName, 'researchArticles', updatedArticles);
                                        }}
                                        className="p-2 border border-red-300 rounded-md text-red-500 hover:bg-red-50 self-start"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                  
                                  <button
                                    onClick={() => {
                                      const currentProductDetails = editingConditionData.productDetails?.[productName] || {};
                                      const currentArticles = currentProductDetails.researchArticles || [];
                                      const updatedArticles = [...currentArticles, { title: '', author: '', abstract: '', url: '' }];
                                      handleProductDetailChange(productName, 'researchArticles', updatedArticles);
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
                    Select a condition to edit.
                  </div>
                )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="products" className="p-6 flex-grow overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-medium">Product Library ({allProducts.length})</h3>
                 <button onClick={handleAddProduct} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center">
                    <Plus size={16} className="mr-1" />
                    Add New Product
                 </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {allProducts.map((product) => (
                     <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 group">
                         <div className="flex justify-between items-start">
                             <h4 className="font-medium text-md">{product.name}</h4>
                             <div className="flex space-x-2">
                                 <button onClick={() => handleEditProduct(product)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1" title="Edit product details">
                                     <Edit size={16} />
                                 </button>
                                 <button onClick={() => confirmDelete('product', product)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1" title="Delete product">
                                     <Trash2 size={16} />
                                 </button>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          </Tabs.Content>
          
          <Tabs.Content value="categories" className="p-6 flex-grow overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-medium">Categories</h3>
                     </div>
                 </div>
                 <div>
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-medium">DDS Types</h3>
                         <button onClick={handleAddDdsType} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center">
                            <Plus size={16} className="mr-1" />
                            Add DDS Type
                         </button>
                     </div>
                     <ul className="space-y-2">
                         {allDentists.map((dentist) => (
                             <li key={dentist.id} className="border rounded-md p-3 flex justify-between items-center bg-gray-50 group">
                                 <span>{dentist.name}</span>
                                 <button onClick={() => confirmDelete('ddsType', dentist)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1" title="Delete DDS type">
                                     <Trash2 size={16} />
                                 </button>
                             </li>
                         ))}
                     </ul>
                 </div>
             </div>
          </Tabs.Content>
        </Tabs.Root>

        <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-white rounded-lg shadow-xl p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {modalType === 'condition' && 'Add New Condition'}
              {modalType === 'category' && 'Add New Category'}
              {modalType === 'ddsType' && 'Add New DDS Type'}
              {modalType === 'product' && (isEditingModalItem ? `Edit Product: ${newItemData.name}` : 'Add New Product')}
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
                        Key Pitch Points
                      </label>
                      <textarea
                        value={newItemData.pitchPoints || ''}
                        onChange={(e) => setNewItemData({...newItemData, pitchPoints: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competitive Advantage
                      </label>
                      <textarea
                        value={newItemData.competitiveAdvantage || ''}
                        onChange={(e) => setNewItemData({...newItemData, competitiveAdvantage: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Handling Objections
                      </label>
                      <textarea
                        value={newItemData.handlingObjections || ''}
                        onChange={(e) => setNewItemData({...newItemData, handlingObjections: e.target.value})}
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
                        value={newItemData.usage || ''}
                        onChange={(e) => setNewItemData({...newItemData, usage: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  disabled={isSaving || !newItemData.name}
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${
                    newItemData.name ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? 'Saving...' : (isEditingModalItem ? 'Save Changes' : 'Add')}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        
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
                      `Are you sure you want to delete the product "${itemToDelete.item.name}"? This will remove it from all conditions where it's used. This action cannot be undone.`}
                 </Dialog.Description>
                 <div className="mt-6 flex justify-end space-x-3">
                    <Dialog.Close asChild>
                      <button className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                        Cancel
                      </button>
                    </Dialog.Close>
                    
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      {isSaving ? 'Deleting...' : 'Delete'}
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