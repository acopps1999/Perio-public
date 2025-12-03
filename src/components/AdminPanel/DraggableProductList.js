import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Individual sortable product item
 */
function SortableProductItem({ id, product, onRemove, rank }) {
  const { isDarkMode } = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg p-3 flex justify-between items-center transition-colors ${
        isDarkMode
          ? 'bg-[#2a2a2a] border border-[#3f3f46] hover:bg-[#2f3240]'
          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing p-1 rounded transition-colors ${
            isDarkMode
              ? 'text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#3f3f46]'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
          }`}
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {/* Rank badge */}
        <span
          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
            isDarkMode
              ? 'bg-[#9b9cfa]/20 text-[#9b9cfa]'
              : 'bg-[#9b9cfa]/10 text-[#9b9cfa]'
          }`}
        >
          {rank}
        </span>

        {/* Product name */}
        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
          {product}
        </span>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(product)}
        className="text-red-500 hover:text-red-400 p-1 transition-colors"
        title="Remove product"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

/**
 * Draggable product list with rank-based ordering
 *
 * @param {Object} props
 * @param {string[]} props.products - Array of product names in order
 * @param {function} props.onReorder - Callback when products are reordered: (newProducts) => void
 * @param {function} props.onRemove - Callback when a product is removed: (productName) => void
 * @param {function} props.onAdd - Callback when a product is added: (productName) => void
 * @param {Object[]} props.availableProducts - All products that can be added
 * @param {string} props.phaseName - Name of the phase (for display)
 */
function DraggableProductList({
  products = [],
  onReorder,
  onRemove,
  onAdd,
  availableProducts = [],
  phaseName,
}) {
  const { isDarkMode } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = products.indexOf(active.id);
      const newIndex = products.indexOf(over.id);
      const newProducts = arrayMove(products, oldIndex, newIndex);
      onReorder(newProducts);
    }
  };

  // Filter out products that are already in the list
  const addableProducts = availableProducts.filter(
    (p) => !products.includes(p.name)
  );

  return (
    <div className="space-y-4">
      {/* Add product dropdown */}
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${isDarkMode ? 'text-[#e5e7eb]' : 'text-gray-700'}`}>
          {phaseName} Products
        </span>
        <select
          onChange={(e) => {
            if (e.target.value) {
              onAdd(e.target.value);
              e.target.value = '';
            }
          }}
          className={`px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9b9cfa] ${
            isDarkMode
              ? 'border border-[#3f3f46] bg-[#2a2a2a] text-white'
              : 'border border-gray-300 bg-white text-gray-900'
          }`}
        >
          <option value="">Add product...</option>
          {addableProducts.map((product) => (
            <option key={product.name} value={product.name}>
              {product.name}
              {!product.is_available ? ' (Not Available)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Draggable product list */}
      {products.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={products} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {products.map((product, index) => (
                <SortableProductItem
                  key={product}
                  id={product}
                  product={product}
                  rank={index + 1}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className={`p-4 text-center rounded-lg ${
            isDarkMode
              ? 'text-[#9ca3af] bg-[#2a2a2a] border border-[#3f3f46]'
              : 'text-gray-600 bg-gray-50 border border-gray-200'
          }`}
        >
          No products configured. Add products using the dropdown above.
        </div>
      )}
    </div>
  );
}

export default DraggableProductList;
