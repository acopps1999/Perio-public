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
  patientTypes, // Now an array of {id, name, description}
  patientTypeFilter,
  setPatientTypeFilter,
  searchQuery,
  setSearchQuery,
}) {
  const { isMobile, getResponsiveValue, getColumns } = useResponsive();
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow rounded-lg ${getResponsiveValue('p-3', 'p-4', 'p-4')} ${getResponsiveValue('mb-4', 'mb-6', 'mb-6')}`}>
      <h2 className={`${getResponsiveValue('text-base', 'text-lg', 'text-lg')} font-medium ${getResponsiveValue('mb-3', 'mb-4', 'mb-4')} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Filters</h2>
      <div className={`grid grid-cols-1 ${getResponsiveValue('gap-3', 'gap-4', 'gap-4')} ${
        isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className={`block ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            {isMobile ? 'Category' : 'Condition & Procedure Category'}
          </label>
          <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
            <Select.Trigger id="category-filter" className={`w-full flex justify-between items-center ${getResponsiveValue('px-3 py-3', 'px-3 py-2', 'px-3 py-2')} ${getResponsiveValue('text-base', 'text-sm', 'text-sm')} ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}>
              <Select.Value />
              <Select.Icon><ChevronDown size={18} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                <Select.Viewport className="p-1">
                  {categoryOptions.map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
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
          <label htmlFor="dds-filter" className="block text-sm font-medium text-gray-700 mb-1">
            DDS Type
          </label>
          <Select.Root value={ddsTypeFilter} onValueChange={setDdsTypeFilter}>
            <Select.Trigger id="dds-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <Select.Value />
              <Select.Icon><ChevronDown size={18} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                <Select.Viewport className="p-1">
                  {ddsTypeOptions.map((dds) => (
                    <Select.Item
                      key={dds}
                      value={dds}
                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                    >
                      <Select.ItemText>{dds}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Treatment Modifier Filter */}
        <div>
          <label htmlFor="patient-filter" className={`block ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            Treatment Modifier
          </label>
          <Select.Root value={patientTypeFilter} onValueChange={setPatientTypeFilter}>
            <Select.Trigger id="patient-filter" className={`w-full flex justify-between items-center ${getResponsiveValue('px-3 py-3', 'px-3 py-2', 'px-3 py-2')} ${getResponsiveValue('text-base', 'text-sm', 'text-sm')} ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}>
              <Select.Value />
              <Select.Icon><ChevronDown size={18} /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
                <Select.Viewport className="p-1">
                  {[{ name: 'All' }, ...patientTypes].map((pt) => (
                    <Select.Item
                      key={pt.name}
                      value={pt.name}
                      className="flex items-center h-8 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer focus:outline-none focus:bg-gray-100"
                    >
                      <Select.ItemText>
                        {pt.name === 'All' ? 'All Treatment Modifiers' : `${pt.name}: ${pt.description}`}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Search */}
        <div>
          <label htmlFor="search" className={`block ${getResponsiveValue('text-sm', 'text-sm', 'text-sm')} font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
            {isMobile ? 'Search' : 'Search Conditions & Procedures'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={isMobile ? 20 : 18} className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} />
            </div>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full ${getResponsiveValue('pl-11 pr-10 py-3', 'pl-10 pr-3 py-2', 'pl-10 pr-3 py-2')} ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getResponsiveValue('text-base', 'text-sm', 'text-sm')}`}
              placeholder={isMobile ? 'Search...' : 'Search conditions & procedures...'}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <X size={18} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltersSection; 