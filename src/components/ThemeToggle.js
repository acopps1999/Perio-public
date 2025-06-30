import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode 
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 focus:ring-yellow-400' 
          : 'bg-white text-gray-600 hover:bg-gray-50 focus:ring-gray-500 border border-gray-300'
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