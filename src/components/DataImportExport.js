import React, { useState } from 'react';
import { Download, Upload, Check, AlertTriangle } from 'lucide-react';

function DataImportExport({ conditions, onImport }) {
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // Export data as JSON file
  const handleExport = () => {
    // Deep clone conditions and fix any issues before export
    const conditionsToExport = JSON.parse(JSON.stringify(conditions)).map(condition => {
      // Special handling for Dry Mouth before export
      if (condition.name === 'Dry Mouth') {
        // Ensure it has the correct patientSpecificConfig
        const dryMouthConfig = {
          'Mild': {
            'all': [],
            '1': ['AO ProRinse Hydrating'],
            '2': ['Moisyn'],
            '3': ['Moisyn'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          },
          'Moderate': {
            'all': ['Moisyn'],
            '1': ['Moisyn'],
            '2': ['Moisyn'],
            '3': ['Moisyn', 'AO ProVantage Gel'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          },
          'Severe': {
            'all': ['Moisyn'],
            '1': ['Moisyn'],
            '2': ['Moisyn', 'AO ProVantage Gel'],
            '3': ['Moisyn', 'AO ProVantage Gel'],
            '4': ['Moisyn', 'AO ProVantage Gel']
          }
        };
        
        // Ensure productDetails contain the correct usage instructions
        if (condition.productDetails) {
          // For each product in Dry Mouth
          ['AO ProRinse Hydrating', 'Moisyn', 'AO ProVantage Gel', 'XeroMoist Gel', 'SalivaCheck Kit'].forEach(productName => {
            if (condition.productDetails[productName]) {
              // Initialize usage as an object if it's not
              if (typeof condition.productDetails[productName].usage !== 'object') {
                condition.productDetails[productName].usage = {};
              }
              
              // Use existing phase-specific usage if available
              const usage = condition.productDetails[productName].usage;
              
              // For AO ProRinse Hydrating 
              if (productName === 'AO ProRinse Hydrating') {
                if (!usage['Mild']) {
                  usage['Mild'] = "How to Use:\n\nMeasure 15 mL and swish for 30 seconds\nUse 3-4 times daily, ideally after meals and before bed\nDo not eat, drink, or rinse for 15 minutes after use\n\nSpecial Instructions:\n\nMay be refrigerated for enhanced soothing effect\nSafe with prescription dry mouth medications\nFor severe nighttime dryness, pair with AO ProVantage gel";
                }
                if (!usage['Moderate']) {
                  usage['Moderate'] = usage['Mild'];
                }
                if (!usage['Severe']) {
                  usage['Severe'] = usage['Mild'];
                }
              }
              
              // For Moisyn
              else if (productName === 'Moisyn') {
                if (!usage['Mild']) {
                  usage['Mild'] = "Dispense 5 mL, swish thoroughly for 30 seconds, 1-2 times daily or as needed.";
                }
                if (!usage['Moderate']) {
                  usage['Moderate'] = "Dispense 5-10 mL, swish thoroughly for 30-60 seconds, 2-3 times daily or as needed.";
                }
                if (!usage['Severe']) {
                  usage['Severe'] = "Dispense 10 mL, swish thoroughly for 60 seconds, 3-4 times daily or as needed.";
                }
              }
              
              // For AO ProVantage Gel
              else if (productName === 'AO ProVantage Gel') {
                if (!usage['Mild']) {
                  usage['Mild'] = "Apply a pea-sized amount to dry or irritated areas 1-2 times daily, especially after brushing.";
                }
                if (!usage['Moderate']) {
                  usage['Moderate'] = "Apply a pea-sized amount to dry or irritated areas 2-3 times daily, especially after brushing and before bed.";
                }
                if (!usage['Severe']) {
                  usage['Severe'] = "Apply a pea-sized amount to dry or irritated areas 3-4 times daily, including after each meal and before bed.";
                }
              }
              
              // For XeroMoist Gel
              else if (productName === 'XeroMoist Gel') {
                if (!usage['Mild']) {
                  usage['Mild'] = "Apply pea-sized amount to affected areas 2x/day and before bedtime";
                }
                if (!usage['Moderate']) {
                  usage['Moderate'] = "Apply pea-sized amount to affected areas 3x/day and before bedtime";
                }
                if (!usage['Severe']) {
                  usage['Severe'] = "Apply pea-sized amount to affected areas 4-5x/day and before bedtime";
                }
              }
              
              // For SalivaCheck Kit
              else if (productName === 'SalivaCheck Kit') {
                if (!usage['Mild']) {
                  usage['Mild'] = "Use once for baseline assessment and periodically to monitor progress";
                }
                if (!usage['Moderate']) {
                  usage['Moderate'] = "Use monthly to track treatment effectiveness";
                }
                if (!usage['Severe']) {
                  usage['Severe'] = "Use bi-weekly to monitor condition and adjust treatment as needed";
                }
              }
            }
          });
        }
        
        // Apply the fixed configuration
        return {
          ...condition,
          patientSpecificConfig: dryMouthConfig
        };
      }
      
      // For all other conditions, return as is
      return condition;
    });
    
    // Create JSON data
    const dataStr = JSON.stringify(conditionsToExport, null, 2);
    
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
        let importedData = JSON.parse(e.target.result);
        
        // Fix phase mismatches before validation
        importedData = importedData.map(condition => {
          // Deep clone the condition to avoid reference issues
          const fixedCondition = JSON.parse(JSON.stringify(condition));
          
          // Check for specific conditions that might have phase mismatches
          if (condition.name === "Dry Mouth" && 
              Array.isArray(condition.phases) && 
              condition.phases.includes("Mild") &&
              condition.products && 
              (condition.products["Diagnosis"] || condition.products["Active Treatment"] || condition.products["Long-term Management"])) {
            
            // Fix Dry Mouth phase mismatch
            const newProducts = {};
            
            // Map old phases to new ones: Diagnosis → Mild, Active Treatment → Moderate, Long-term Management → Severe
            if (Array.isArray(condition.products["Diagnosis"])) {
              newProducts["Mild"] = condition.products["Diagnosis"];
            }
            
            if (Array.isArray(condition.products["Active Treatment"])) {
              newProducts["Moderate"] = condition.products["Active Treatment"];
            }
            
            if (Array.isArray(condition.products["Long-term Management"])) {
              newProducts["Severe"] = condition.products["Long-term Management"];
            }
            
            // Apply any existing correctly named phases
            if (condition.products["Mild"]) newProducts["Mild"] = condition.products["Mild"];
            if (condition.products["Moderate"]) newProducts["Moderate"] = condition.products["Moderate"];
            if (condition.products["Severe"]) newProducts["Severe"] = condition.products["Severe"];
            
            fixedCondition.products = newProducts;
            
            // If there's usage in productDetails, also update phase names there
            if (fixedCondition.productDetails) {
              Object.keys(fixedCondition.productDetails).forEach(productName => {
                const productDetail = fixedCondition.productDetails[productName];
                if (productDetail && productDetail.usage && typeof productDetail.usage === 'object') {
                  const newUsage = {};
                  if (productDetail.usage["Diagnosis"]) newUsage["Mild"] = productDetail.usage["Diagnosis"];
                  if (productDetail.usage["Active Treatment"]) newUsage["Moderate"] = productDetail.usage["Active Treatment"];
                  if (productDetail.usage["Long-term Management"]) newUsage["Severe"] = productDetail.usage["Long-term Management"];
                  
                  // Keep any correct phase names
                  if (productDetail.usage["Mild"]) newUsage["Mild"] = productDetail.usage["Mild"];
                  if (productDetail.usage["Moderate"]) newUsage["Moderate"] = productDetail.usage["Moderate"];
                  if (productDetail.usage["Severe"]) newUsage["Severe"] = productDetail.usage["Severe"];
                  
                  fixedCondition.productDetails[productName].usage = newUsage;
                }
              });
            }
            
            // Also, set the correct patientSpecificConfig for Dry Mouth according to excel chart
            fixedCondition.patientSpecificConfig = {
              'Mild': {
                'all': [],
                '1': ['AO ProRinse Hydrating'],
                '2': ['Moisyn'],
                '3': ['Moisyn'],
                '4': ['Moisyn', 'AO ProVantage Gel']
              },
              'Moderate': {
                'all': ['Moisyn'],
                '1': ['Moisyn'],
                '2': ['Moisyn'],
                '3': ['Moisyn', 'AO ProVantage Gel'],
                '4': ['Moisyn', 'AO ProVantage Gel']
              },
              'Severe': {
                'all': ['Moisyn'],
                '1': ['Moisyn'],
                '2': ['Moisyn', 'AO ProVantage Gel'],
                '3': ['Moisyn', 'AO ProVantage Gel'],
                '4': ['Moisyn', 'AO ProVantage Gel']
              }
            };
          } else {
            // For all conditions, ensure products object contains entries for all phases
            if (condition.phases && condition.products) {
              const newProducts = { ...condition.products };
              
              // Make sure each phase has a corresponding entry in products
              condition.phases.forEach(phase => {
                if (!newProducts[phase]) {
                  newProducts[phase] = [];
                }
              });
              
              fixedCondition.products = newProducts;
            }
          }
          
          // Ensure patientSpecificConfig exists and aligns with phases
          if (condition.phases && !fixedCondition.patientSpecificConfig) {
            const patientConfig = {};
            
            condition.phases.forEach(phase => {
              patientConfig[phase] = {
                'all': [],
                '1': [],
                '2': [],
                '3': [],
                '4': []
              };
              
              // If products exist for this phase, add them to patientSpecificConfig
              if (fixedCondition.products && fixedCondition.products[phase]) {
                const phaseProducts = fixedCondition.products[phase];
                
                phaseProducts.forEach(product => {
                  // Check for type-specific markers
                  if (product.includes('(Type 3/4 Only)')) {
                    const baseProduct = product.replace(' (Type 3/4 Only)', '');
                    patientConfig[phase]['3'].push(baseProduct);
                    patientConfig[phase]['4'].push(baseProduct);
                  } else {
                    // Regular product for all patient types
                    patientConfig[phase]['all'].push(product);
                    patientConfig[phase]['1'].push(product);
                    patientConfig[phase]['2'].push(product);
                    patientConfig[phase]['3'].push(product);
                    patientConfig[phase]['4'].push(product);
                  }
                });
              }
            });
            
            // Special cases for certain conditions
            if (condition.name === 'Gingival Recession Surgery' && patientConfig['Prep']) {
              patientConfig['Prep']['1'] = []; // Type 1 gets nothing
              patientConfig['Prep']['2'] = []; // Type 2 also gets nothing
            }
            
            fixedCondition.patientSpecificConfig = patientConfig;
          } else if (condition.patientSpecificConfig && condition.phases) {
            // Make sure patientSpecificConfig has entries for all phases
            const updatedConfig = { ...condition.patientSpecificConfig };
            
            condition.phases.forEach(phase => {
              if (!updatedConfig[phase]) {
                updatedConfig[phase] = {
                  'all': [],
                  '1': [],
                  '2': [],
                  '3': [],
                  '4': []
                };
              }
            });
            
            fixedCondition.patientSpecificConfig = updatedConfig;
          }
          
          return fixedCondition;
        });
        
        // Validate fixed data
        const validation = validateImportedData(importedData);
        
        if (!validation.valid) {
          setImportError(validation.message);
          return;
        }
        
        // Import fixed data
        onImport(importedData);
        setImportSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setImportSuccess(false);
        }, 3000);
      } catch (error) {
        console.error("Import error:", error);
        setImportError('Failed to parse or process JSON file. Please ensure it is a valid JSON file.');
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