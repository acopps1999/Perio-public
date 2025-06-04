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
                "px-4 py-3 cursor-pointer transition-colors border-l-4",
                selectedCondition && selectedCondition.name === condition.name 
                  ? "bg-[#15396c] border-[#15396c]" 
                  : "hover:bg-gray-50 border-transparent"
              )}
              onClick={() => handleConditionSelect(condition)}
            >
              <div className={clsx(
                "font-medium",
                selectedCondition && selectedCondition.name === condition.name ? "text-white" : "text-black"
              )}>
                {condition.name}
              </div>
              <div className={clsx(
                "text-sm",
                selectedCondition && selectedCondition.name === condition.name ? "text-gray-200" : "text-gray-500"
              )}>
                {condition.category}
              </div>
              <div className={clsx(
                "text-xs mt-1",
                selectedCondition && selectedCondition.name === condition.name ? "text-gray-300" : "text-gray-400"
              )}>
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