import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Search, X, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

function FiltersSection({
  categoryOptions,
  categoryFilter,
  setCategoryFilter,
  ddsTypeOptions,
  ddsTypeFilter,
  setDdsTypeFilter,
  searchQuery,
  setSearchQuery,
}) {
  const { isMobile, getResponsiveValue } = useResponsive();
  const { isDarkMode } = useTheme();

  return (
    <div className={`${isDarkMode ? 'bg-prism-dark-bg-secondary border border-prism-dark-border-subtle text-prism-dark-text-primary' : 'bg-prism-light-bg-primary border border-prism-light-border-subtle text-prism-light-text-primary'} shadow-sm rounded-lg ${getResponsiveValue('p-3', 'p-4', 'p-4')} ${getResponsiveValue('mb-4', 'mb-6', 'mb-6')} transition-all duration-250`}>
      <h2 className={`${getResponsiveValue('text-base', 'text-lg', 'text-lg')} font-medium ${getResponsiveValue('mb-3', 'mb-4', 'mb-4')} ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>Filters</h2>
      <div className={`grid grid-cols-1 ${getResponsiveValue('gap-3', 'gap-4', 'gap-4')} ${
        isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'
      }`}>
        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className={`block ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} font-medium ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} mb-1`}>
            {isMobile ? 'Category' : 'Condition & Procedure Category'}
          </label>
          <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
            <Select.Trigger id="category-filter" className={`w-full flex justify-between items-center ${getResponsiveValue('px-3 py-3', 'px-3 py-2', 'px-3 py-2')} ${getResponsiveValue('text-base', 'text-sm', 'text-sm')} ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle text-prism-dark-text-primary' : 'bg-prism-light-bg-secondary border-prism-light-border-subtle text-prism-light-text-primary'} border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-prism-primary transition-all duration-250`}>
              <Select.Value />
              <Select.Icon><ChevronDown size={18} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className={`overflow-hidden ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-elevated' : 'bg-prism-light-bg-primary border-prism-light-border-elevated'} rounded-lg shadow-lg border`}>
                <Select.Viewport className="p-1">
                  {categoryOptions.map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className={`flex items-center h-8 px-3 py-2 text-sm ${isDarkMode ? 'text-prism-dark-text-primary hover:bg-prism-dark-bg-primary' : 'text-prism-light-text-primary hover:bg-prism-light-bg-secondary'} cursor-pointer focus:outline-none transition-colors duration-200`}
                    >
                      <Select.ItemText>{category}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        {/* DDS Type Filter - Hidden */}
        <div className="hidden">
          <label htmlFor="dds-filter" className="block text-sm font-medium text-prism-light-text-secondary mb-1">
            DDS Type
          </label>
          <Select.Root value={ddsTypeFilter} onValueChange={setDdsTypeFilter}>
            <Select.Trigger id="dds-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-prism-light-bg-secondary border border-prism-light-border-subtle rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-prism-primary transition-all duration-250">
              <Select.Value />
              <Select.Icon><ChevronDown size={18} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-prism-light-bg-primary rounded-lg shadow-lg border border-prism-light-border-elevated">
                <Select.Viewport className="p-1">
                  {ddsTypeOptions.map((dds) => (
                    <Select.Item
                      key={dds}
                      value={dds}
                      className="flex items-center h-8 px-3 py-2 text-sm text-prism-light-text-primary hover:bg-prism-light-bg-secondary cursor-pointer focus:outline-none transition-colors duration-200"
                    >
                      <Select.ItemText>{dds}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Search */}
        <div>
          <label htmlFor="search" className={`block ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} font-medium ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} mb-1`}>
            {isMobile ? 'Search' : 'Search Conditions & Procedures'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={isMobile ? 20 : 18} className={isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'} />
            </div>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full ${getResponsiveValue('pl-11 pr-10 py-3', 'pl-10 pr-3 py-2', 'pl-10 pr-3 py-2')} ${isDarkMode ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle text-prism-dark-text-primary placeholder-prism-dark-text-secondary' : 'bg-prism-light-bg-secondary border-prism-light-border-subtle text-prism-light-text-primary placeholder-prism-light-text-secondary'} border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-prism-primary transition-all duration-250 ${getResponsiveValue('text-base', 'text-sm', 'text-sm')}`}
              placeholder={isMobile ? 'Search...' : 'Search conditions & procedures...'}
            />
            {searchQuery && (
              <button
                className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 ${isDarkMode ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary' : 'text-prism-light-text-secondary hover:text-prism-light-text-primary'}`}
                onClick={() => setSearchQuery('')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltersSection; 