import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Search, X, ChevronDown } from 'lucide-react';

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
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <h2 className="text-lg font-medium mb-4">Filters</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Condition Category
          </label>
          <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
            <Select.Trigger id="category-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
        {/* DDS Type Filter */}
        <div>
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

        {/* Patient Type Filter */}
        <div>
          <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Patient Type
          </label>
          <Select.Root value={patientTypeFilter} onValueChange={setPatientTypeFilter}>
            <Select.Trigger id="patient-filter" className="w-full flex justify-between items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                        {pt.name === 'All' ? 'All Patient Types' : `${pt.name}: ${pt.description}`}
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
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Condition
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search conditions..."
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FiltersSection; 