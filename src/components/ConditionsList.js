import React from 'react';
import clsx from 'clsx';

function ConditionsList({
  filteredConditions,
  selectedCondition,
  handleConditionSelect,
}) {
  return (
    <div className="lg:col-span-1 bg-white shadow rounded-lg overflow-hidden">
      <h2 className="text-lg font-medium p-4 border-b">Conditions</h2>
      {filteredConditions.length === 0 ? (
        <div className="p-4 text-gray-500">No conditions match the selected filters.</div>
      ) : (
        <ul className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
          {filteredConditions.map((condition) => (
            <li 
              key={condition.name}
              className={clsx(
                "px-4 py-3 hover:bg-gray-50 cursor-pointer",
                selectedCondition && selectedCondition.name === condition.name ? "bg-blue-50" : ""
              )}
              onClick={() => handleConditionSelect(condition)}
            >
              <div className="font-medium">{condition.name}</div>
              <div className="text-sm text-gray-500">{condition.category}</div>
              <div className="text-xs text-gray-400 mt-1">
                {condition.dds.join(', ')} | {condition.patientType}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConditionsList; 