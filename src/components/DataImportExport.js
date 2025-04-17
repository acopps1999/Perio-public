import React, { useState } from 'react';
import { Download, Upload, Check, AlertTriangle } from 'lucide-react';

function DataImportExport({ conditions, onImport }) {
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // Export data as JSON file
  const handleExport = () => {
    // Create JSON data
    const dataStr = JSON.stringify(conditions, null, 2);
    
    // Create download link
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical_chart_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Validate imported data structure
  const validateImportedData = (data) => {
    // Basic validation: must be an array
    if (!Array.isArray(data)) {
      return { valid: false, message: 'Imported data must be an array of conditions.' };
    }
    
    // Check if array is empty
    if (data.length === 0) {
      return { valid: false, message: 'Imported data contains no conditions.' };
    }
    
    // Check structure of each condition
    for (let i = 0; i < data.length; i++) {
      const condition = data[i];
      
      // Required fields
      if (!condition.name) {
        return { valid: false, message: `Condition at index ${i} is missing a name.` };
      }
      
      if (!condition.category) {
        return { valid: false, message: `Condition "${condition.name}" is missing a category.` };
      }
      
      if (!Array.isArray(condition.phases) || condition.phases.length === 0) {
        return { valid: false, message: `Condition "${condition.name}" is missing phases or phases is not an array.` };
      }
      
      if (!Array.isArray(condition.dds) || condition.dds.length === 0) {
        return { valid: false, message: `Condition "${condition.name}" is missing dds (dentist types) or dds is not an array.` };
      }
      
      if (!condition.products || typeof condition.products !== 'object') {
        return { valid: false, message: `Condition "${condition.name}" is missing products or products is not an object.` };
      }
      
      // Check that products are properly defined for each phase
      for (const phase of condition.phases) {
        if (!condition.products[phase] || !Array.isArray(condition.products[phase])) {
          return { valid: false, message: `Condition "${condition.name}" is missing products for phase "${phase}" or they are not in an array.` };
        }
      }
      
      // Check product details
      if (!condition.productDetails || typeof condition.productDetails !== 'object') {
        return { valid: false, message: `Condition "${condition.name}" is missing productDetails or productDetails is not an object.` };
      }
    }
    
    return { valid: true };
  };
  
  // Handle file import
  const handleImport = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Clear previous statuses
    setImportError(null);
    setImportSuccess(false);
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate data
        const validation = validateImportedData(importedData);
        
        if (!validation.valid) {
          setImportError(validation.message);
          return;
        }
        
        // Import data
        onImport(importedData);
        setImportSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setImportSuccess(false);
        }, 3000);
      } catch (error) {
        setImportError('Failed to parse JSON file. Please ensure it is a valid JSON file.');
      }
    };
    
    reader.onerror = () => {
      setImportError('Error reading file.');
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = null;
  };
  
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Data Import & Export</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Export Knowledge Base</h4>
          <p className="text-sm text-gray-500 mb-3">
            Export your current knowledge base to a JSON file. You can use this file for backup or to transfer settings to another instance.
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download size={16} className="mr-2" />
            Export Data
          </button>
        </div>
        
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-700 mb-2">Import Knowledge Base</h4>
          <p className="text-sm text-gray-500 mb-3">
            Import a previously exported knowledge base JSON file. This will replace your current data.
          </p>
          <div className="flex flex-col items-start">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
            >
              <Upload size={16} className="mr-2" />
              Import Data
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            {importError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
                <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}
            
            {importSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
                <Check size={16} className="mr-2 flex-shrink-0" />
                <span>Data imported successfully!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataImportExport;