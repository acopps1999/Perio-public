import React from 'react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

function ConditionsList({
  filteredConditions,
  selectedCondition,
  handleConditionSelect,
}) {
  const { isDarkMode } = useTheme();

  return (
    <div className={`lg:col-span-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg overflow-hidden`}>
      <h2 className={`text-lg font-medium p-4 border-b ${isDarkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
        Conditions & Surgical Procedures
      </h2>
      {filteredConditions.length === 0 ? (
        <div className={`p-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No conditions or surgical procedures match the selected filters.
        </div>
      ) : (
        <ul className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} max-h-[70vh] overflow-y-auto`}>
          {filteredConditions.map((condition) => (
            <li
              key={condition.name}
              className={clsx(
                "px-4 py-3 cursor-pointer transition-colors border-l-4",
                selectedCondition && selectedCondition.name === condition.name
                  ? "bg-[#15396c] border-[#15396c]"
                  : isDarkMode
                    ? "hover:bg-gray-700 border-transparent"
                    : "hover:bg-gray-50 border-transparent"
              )}
              onClick={() => handleConditionSelect(condition)}
            >
              <div className={clsx(
                "font-medium",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-white"
                  : isDarkMode
                    ? "text-white"
                    : "text-black"
              )}>
                {condition.name}
              </div>
              <div className={clsx(
                "text-sm",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-gray-200"
                  : isDarkMode
                    ? "text-gray-400"
                    : "text-gray-500"
              )}>
                {condition.category}
              </div>
              <div className={clsx(
                "text-xs mt-1",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-gray-300"
                  : isDarkMode
                    ? "text-gray-500"
                    : "text-gray-400"
              )}>
                <span className="hidden">{condition.dds.join(', ')} | </span>{condition.patientType}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConditionsList; 