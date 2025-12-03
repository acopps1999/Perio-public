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
    <div className={clsx(
      "lg:col-span-1 rounded-lg overflow-hidden border",
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
          "divide-y max-h-[70vh] overflow-y-auto",
          isDarkMode ? "divide-prism-dark-border-subtle" : "divide-prism-light-border-subtle"
        )}>
          {filteredConditions.map((condition) => (
            <li
              key={condition.name}
              className={clsx(
                "px-4 py-3 cursor-pointer transition-all duration-250 border-l-4",
                selectedCondition && selectedCondition.name === condition.name
                  ? isDarkMode
                    ? "bg-prism-primary border-prism-primary"
                    : "bg-prism-primary-light border-prism-primary-light"
                  : isDarkMode
                    ? "hover:bg-prism-dark-bg-tertiary border-transparent"
                    : "hover:bg-prism-light-bg-tertiary border-transparent"
              )}
              onClick={() => handleConditionSelect(condition)}
            >
              <div className={clsx(
                "font-medium",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-white"
                  : isDarkMode
                    ? "text-prism-dark-text-primary"
                    : "text-prism-light-text-primary"
              )}>
                {condition.name}
              </div>
              <div className={clsx(
                "text-sm",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-white/80"
                  : isDarkMode
                    ? "text-prism-dark-text-secondary"
                    : "text-prism-light-text-secondary"
              )}>
                {condition.category}
              </div>
              <div className={clsx(
                "text-xs mt-1",
                selectedCondition && selectedCondition.name === condition.name
                  ? "text-white/70"
                  : isDarkMode
                    ? "text-prism-dark-text-tertiary"
                    : "text-prism-light-text-tertiary"
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