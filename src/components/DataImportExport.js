import React, { useState, useEffect } from 'react';
import { Download, Upload, Check, AlertTriangle, Database, Package, Tags, FileText, Target } from 'lucide-react';
import { supabase } from '../supabaseClient';

function DataImportExport({ onDataChange }) {
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    procedures: true,
    products: true,
    categories: true,
    research: true,
    competitive: true
  });

  // Load comprehensive data from Supabase for export
  const loadCompleteDataSet = async () => {
    setExportStatus('Loading data from database...');
    try {
      const dataSet = {};

      // Load procedures (conditions) with available relationships
      if (exportOptions.procedures) {
        setExportStatus('Loading procedures and conditions...');
        const { data: procedures, error: procError } = await supabase
          .from('procedures')
          .select(`
            *,
            categories(name),
            procedure_dentists(dentists(name)),
            procedure_patient_types(patient_types(name, description)),
            procedure_phases(phases(name)),
            procedure_phase_products(
              phases(name),
              products(name),
              patient_types(name)
            ),
            phase_specific_usage(
              phases(name),
              products(name),
              instructions
            )
          `);
        
        if (procError) throw procError;
        dataSet.procedures = procedures;

        // Load product details separately since there's no direct FK relationship
        setExportStatus('Loading product details...');
        const { data: productDetails, error: detailsError } = await supabase
          .from('product_details')
          .select('*');
        
        if (detailsError) throw detailsError;
        dataSet.product_details = productDetails;
      }

      // Load products
      if (exportOptions.products) {
        setExportStatus('Loading products...');
        const { data: products, error: prodError } = await supabase
          .from('products')
          .select('*');
        
        if (prodError) throw prodError;
        dataSet.products = products;
      }

      // Load categories
      if (exportOptions.categories) {
        setExportStatus('Loading categories...');
        const { data: categories, error: catError } = await supabase
          .from('categories')
          .select('*');
        
        if (catError) throw catError;
        dataSet.categories = categories;
      }

      // Load research articles
      if (exportOptions.research) {
        setExportStatus('Loading research articles...');
        const { data: research, error: resError } = await supabase
          .from('condition_product_research_articles')
          .select('*');
        
        if (resError) throw resError;
        dataSet.condition_product_research_articles = research;
      }

      // Load competitive advantage data
      if (exportOptions.competitive) {
        setExportStatus('Loading competitive advantage data...');
        const [competitorsResult, ingredientsResult] = await Promise.all([
          supabase.from('competitive_advantage_competitors').select('*'),
          supabase.from('competitive_advantage_active_ingredients').select('*')
        ]);
        
        if (competitorsResult.error) throw competitorsResult.error;
        if (ingredientsResult.error) throw ingredientsResult.error;
        
        dataSet.competitive_advantage = {
          competitors: competitorsResult.data,
          active_ingredients: ingredientsResult.data
        };
      }

      // Load supporting tables for reference
      const [phasesResult, patientTypesResult, dentistsResult] = await Promise.all([
        supabase.from('phases').select('*'),
        supabase.from('patient_types').select('*'), 
        supabase.from('dentists').select('*')
      ]);

      dataSet.phases = phasesResult.data;
      dataSet.patient_types = patientTypesResult.data;
      dataSet.dentists = dentistsResult.data;

      // Add export metadata
      dataSet.export_metadata = {
        exported_at: new Date().toISOString(),
        version: '2.0',
        application: 'PRISM Clinical Chart Tool',
        total_procedures: dataSet.procedures?.length || 0,
        total_products: dataSet.products?.length || 0,
        total_categories: dataSet.categories?.length || 0,
        exported_tables: Object.keys(dataSet).filter(key => key !== 'export_metadata')
      };

      return dataSet;
    } catch (error) {
      console.error('Error loading data for export:', error);
      throw error;
    }
  };

  // Export comprehensive data as JSON file
  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    
    try {
      const dataSet = await loadCompleteDataSet();
      setExportStatus('Preparing download...');
      
    // Create JSON data
      const dataStr = JSON.stringify(dataSet, null, 2);
    
    // Create download link
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `prism_clinical_data_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
      
      setExportStatus('Export completed successfully!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Validate imported data structure for new format
  const validateImportedData = (data) => {
    // Check if it's the new format with metadata
    if (data.export_metadata) {
      if (data.export_metadata.version !== '2.0') {
        return { 
          valid: false, 
          message: `Unsupported data version: ${data.export_metadata.version}. This tool supports version 2.0.` 
        };
      }
    }
    
    // Check for required tables
    const requiredTables = ['procedures', 'products', 'categories', 'phases', 'patient_types'];
    for (const table of requiredTables) {
      if (!data[table] || !Array.isArray(data[table])) {
        return { 
          valid: false, 
          message: `Missing or invalid '${table}' data. Expected an array.` 
        };
      }
    }
    
    // Validate procedures structure
    if (data.procedures.length > 0) {
      const sampleProcedure = data.procedures[0];
      const requiredFields = ['name', 'category'];
      for (const field of requiredFields) {
        if (!sampleProcedure[field]) {
          return { 
            valid: false, 
            message: `Procedures missing required field: '${field}'` 
          };
        }
      }
    }

    // Validate products structure
    if (data.products.length > 0) {
      const sampleProduct = data.products[0];
      if (!sampleProduct.name) {
        return { 
          valid: false, 
          message: `Products missing required field: 'name'` 
        };
      }
    }

    return { valid: true };
  };

  // Clear all data from Supabase (with confirmation)
  const clearAllData = async () => {
    // Delete in reverse dependency order
    const tables = [
      'phase_specific_usage',
      'procedure_phase_products', 
      'procedure_phases',
      'procedure_patient_types',
      'procedure_dentists',
      'product_details',
      'condition_product_research_articles',
      'competitive_advantage_competitors',
      'competitive_advantage_active_ingredients',
      'procedures'
      // Keep: products, categories, phases, patient_types, dentists (will be synced)
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', 0);
        if (error) {
          console.error(`Error clearing ${table}:`, error);
          throw error;
        }
        console.log(`Cleared table: ${table}`);
      } catch (error) {
        console.error(`Failed to clear ${table}:`, error);
        throw error;
      }
    }
  };

  // Import data to Supabase
  const importDataToSupabase = async (data) => {
    try {
      // Clear existing data first
      setExportStatus('Clearing existing data...');
      await clearAllData();

      // Import core lookup tables first
      if (data.categories) {
        setExportStatus('Importing categories...');
        const { error } = await supabase
          .from('categories')
          .upsert(data.categories.map(cat => ({ name: cat.name })), { onConflict: 'name' });
        if (error) throw error;
      }
      
      if (data.products) {
        setExportStatus('Importing products...');
        const { error } = await supabase
          .from('products')
          .upsert(data.products.map(prod => ({ name: prod.name })), { onConflict: 'name' });
        if (error) throw error;
      }

      if (data.phases) {
        setExportStatus('Importing phases...');
        const { error } = await supabase
          .from('phases')
          .upsert(data.phases.map(phase => ({ name: phase.name })), { onConflict: 'name' });
        if (error) throw error;
      }

      if (data.patient_types) {
        setExportStatus('Importing patient types...');
        const { error } = await supabase
          .from('patient_types')
          .upsert(data.patient_types.map(pt => ({ 
            name: pt.name, 
            description: pt.description 
          })), { onConflict: 'name' });
        if (error) throw error;
      }
      
      if (data.dentists) {
        setExportStatus('Importing dentist types...');
        const { error } = await supabase
          .from('dentists')
          .upsert(data.dentists.map(d => ({ name: d.name })), { onConflict: 'name' });
        if (error) throw error;
      }

      // Import procedures with basic info
      if (data.procedures) {
        setExportStatus('Importing procedures...');
        
        // Get category IDs for mapping
        const { data: categories } = await supabase.from('categories').select('id, name');
        const categoryMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

        const proceduresData = data.procedures.map(proc => ({
          name: proc.name,
          category_id: proc.categories?.name ? categoryMap[proc.categories.name] : null,
          pitch_points: proc.pitch_points || null
        }));

        const { error } = await supabase
          .from('procedures')
          .upsert(proceduresData, { onConflict: 'name' });
        if (error) throw error;
      }

      // Import research articles
      if (data.condition_product_research_articles) {
        setExportStatus('Importing research articles...');
        const { error } = await supabase
          .from('condition_product_research_articles')
          .upsert(data.condition_product_research_articles);
        if (error) throw error;
      }
      
      // Import product details
      if (data.product_details) {
        setExportStatus('Importing product details...');
        const { error } = await supabase
          .from('product_details')
          .upsert(data.product_details);
        if (error) throw error;
      }

      // Import competitive advantage data
      if (data.competitive_advantage) {
        if (data.competitive_advantage.competitors) {
          setExportStatus('Importing competitive data - competitors...');
          const { error } = await supabase
            .from('competitive_advantage_competitors')
            .upsert(data.competitive_advantage.competitors);
          if (error) throw error;
        }

        if (data.competitive_advantage.active_ingredients) {
          setExportStatus('Importing competitive data - active ingredients...');
          const { error } = await supabase
            .from('competitive_advantage_active_ingredients')
            .upsert(data.competitive_advantage.active_ingredients);
          if (error) throw error;
      }
    }
    
      setExportStatus('Import completed successfully!');
      
      // Notify parent component to refresh data
      if (onDataChange) {
        onDataChange();
      }
      
    } catch (error) {
      console.error('Import to Supabase failed:', error);
      throw error;
    }
  };
  
  // Handle file import
  const handleImport = async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);
    setExportStatus('Reading file...');
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        setExportStatus('Validating data structure...');
        
        // Validate data
        const validation = validateImportedData(importedData);
        
        if (!validation.valid) {
          setImportError(validation.message);
          setIsImporting(false);
          setExportStatus(null);
          return;
        }
        
        // Import data to Supabase
        await importDataToSupabase(importedData);
        
        setImportSuccess(true);
        setExportStatus(null);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setImportSuccess(false);
        }, 5000);
        
      } catch (error) {
        console.error('Import failed:', error);
        setImportError(`Import failed: ${error.message}`);
        setExportStatus(null);
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.onerror = () => {
      setImportError('Error reading file.');
      setIsImporting(false);
      setExportStatus(null);
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = null;
  };
  
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <Database size={20} className="mr-2 text-[#15396c]" />
        Data Import & Export
      </h3>
      
      <div className="space-y-6">
        {/* Export Section */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center">
            <Download size={16} className="mr-2" />
            Export Complete Database
          </h4>
          <p className="text-sm text-gray-500 mb-3">
            Export your complete PRISM database including procedures, products, categories, research articles, and competitive data. 
            This creates a comprehensive backup file that can be used to restore or transfer your entire knowledge base.
          </p>
          
          {/* Export Options */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-2">Select data to export:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { key: 'procedures', label: 'Procedures & Conditions', icon: FileText },
                { key: 'products', label: 'Products', icon: Package },
                { key: 'categories', label: 'Categories', icon: Tags },
                { key: 'research', label: 'Research Articles', icon: FileText },
                { key: 'competitive', label: 'Competitive Data', icon: Target }
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions[key]}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="mr-2 text-[#15396c] focus:ring-[#15396c]"
                  />
                  <Icon size={14} className="mr-1" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleExport}
            disabled={isExporting || Object.values(exportOptions).every(v => !v)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#15396c] hover:bg-[#15396c]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#15396c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" />
            {isExporting ? 'Exporting...' : 'Export Database'}
          </button>
          
          {exportStatus && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
              {exportStatus}
            </div>
          )}
        </div>
        
        {/* Import Section */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-700 mb-2 flex items-center">
            <Upload size={16} className="mr-2" />
            Import Complete Database
          </h4>
          <p className="text-sm text-gray-500 mb-3">
            Import a previously exported PRISM database file. This will <strong>replace all current data</strong> with the imported data.
            Make sure to export your current data first as a backup.
          </p>
          
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle size={16} className="mr-2 mt-0.5 text-amber-600 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <strong>Warning:</strong> This will permanently delete all current data and replace it with the imported data. 
                This action cannot be undone.
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start">
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer ${
                isImporting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload size={16} className="mr-2" />
              {isImporting ? 'Importing...' : 'Import Database'}
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            
            {importError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start max-w-full">
                <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <span className="break-words">{importError}</span>
              </div>
            )}
            
            {importSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
                <Check size={16} className="mr-2 flex-shrink-0" />
                <span>Database imported successfully! All data has been updated.</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Format Information */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-700 mb-2">Supported Formats</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Version 2.0:</strong> Complete Supabase database export (current format)</p>
            <p><strong>Legacy formats:</strong> Not supported - please contact support for migration assistance</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataImportExport;