import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode
          ? 'bg-prism-dark-bg-tertiary text-prism-primary hover:bg-prism-dark-bg-hover focus:ring-prism-primary border border-prism-dark-border-elevated'
          : 'bg-white text-prism-primary-light hover:bg-prism-light-bg-secondary focus:ring-prism-primary-light border border-prism-light-border-elevated'
      } ${className}`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {isDarkMode ? (
        <Sun size={20} className="transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon size={20} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle; 