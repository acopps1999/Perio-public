import React from 'react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

function ConditionsList({
  filteredConditions,
  selectedCondition,
  handleConditionSelect,
}) {
  const { isDarkMode } = useTheme();

  // Determine if a condition is selected
  const isSelected = (condition) => selectedCondition?.db_id === condition.db_id;

  return (
    <div className={clsx(
      "lg:col-span-1 rounded-lg border",
      isDarkMode
        ? "bg-prism-dark-bg-secondary border-prism-dark-border-subtle"
        : "bg-prism-light-bg-primary border-prism-light-border-subtle"
    )}>
      <h2 className={clsx(
        "text-lg font-medium p-4 border-b",
        isDarkMode
          ? "text-prism-dark-text-primary border-prism-dark-border-subtle"
          : "text-prism-light-text-primary border-prism-light-border-subtle"
      )}>
        Conditions & Surgical Procedures
      </h2>
      {filteredConditions.length === 0 ? (
        <div className={clsx(
          "p-4",
          isDarkMode ? "text-prism-dark-text-tertiary" : "text-prism-light-text-tertiary"
        )}>
          No conditions or surgical procedures match the selected filters.
        </div>
      ) : (
        <ul className={clsx(
          "divide-y max-h-[70vh] overflow-y-auto rounded-b-lg",
          isDarkMode ? "divide-prism-dark-border-subtle" : "divide-prism-light-border-subtle"
        )}>
          {filteredConditions.map((condition) => (
            <li
              key={condition.db_id || condition.name}
              className={clsx(
                "px-4 py-3 cursor-pointer transition-all duration-250",
                isSelected(condition)
                  ? isDarkMode
                    ? "bg-prism-primary"
                    : "bg-violet-600"
                  : isDarkMode
                    ? "hover:bg-prism-dark-bg-tertiary"
                    : "hover:bg-prism-light-bg-tertiary"
              )}
              style={{
                borderLeft: isSelected(condition)
                  ? '4px solid transparent'
                  : isDarkMode
                    ? '4px solid #4b5563'
                    : '4px solid #d1d5db'
              }}
              onClick={() => handleConditionSelect(condition)}
            >
              <div className={clsx(
                "font-medium",
                isSelected(condition)
                  ? "text-white"
                  : isDarkMode
                    ? "text-prism-dark-text-primary"
                    : "text-prism-light-text-primary"
              )}>
                {condition.name}
              </div>
              <div className={clsx(
                "text-sm",
                isSelected(condition)
                  ? "text-white/80"
                  : isDarkMode
                    ? "text-prism-dark-text-secondary"
                    : "text-prism-light-text-secondary"
              )}>
                {condition.category}
              </div>
              <div className={clsx(
                "text-xs mt-1",
                isSelected(condition)
                  ? "text-white/70"
                  : isDarkMode
                    ? "text-prism-dark-text-tertiary"
                    : "text-prism-light-text-tertiary"
              )}>
                <span className="hidden">{condition.dds?.join(', ') || ''} | </span>{condition.patientType}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConditionsList; 