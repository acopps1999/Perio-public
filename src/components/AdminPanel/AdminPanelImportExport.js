import React from 'react';
import DataImportExport from '../DataImportExport';

// AdminPanelImportExport Component
function AdminPanelImportExport({
  // Props from AdminPanelCore
  editedConditions,
  setIsEditing
}) {

  return (
    <div className="p-6" style={{ maxHeight: "calc(90vh - 160px)", overflowY: "auto" }}>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Knowledge Base Management</h3>
        <p className="text-gray-600">
          Import and export your knowledge base data for backup purposes or to transfer between environments.
        </p>
      </div>
      
      <DataImportExport 
        conditions={editedConditions} 
        onImport={(importedData) => {
          // This will be handled by the parent component
          // We need to pass this up to AdminPanelCore
          setIsEditing(true);
          // Note: The actual setEditedConditions will be handled by the parent
          // This is just a placeholder - the real implementation will be in AdminPanelCore
        }} 
      />
    </div>
  );
}

export default AdminPanelImportExport; 