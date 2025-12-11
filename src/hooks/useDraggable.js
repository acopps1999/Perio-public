/**
 * useDraggable Hook
 * Makes a modal/panel draggable by its header
 *
 * Usage:
 *   const { position, handleMouseDown, resetPosition } = useDraggable(defaultPosition);
 *
 *   <div style={{ left: position.x, top: position.y }}>
 *     <div onMouseDown={handleMouseDown} style={{ cursor: 'move' }}>
 *       Drag me!
 *     </div>
 *   </div>
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export function useDraggable(defaultPosition = { x: null, y: null }) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Store element ref for size calculations
  const elementRef = useRef(null);

  // Handle mouse down on draggable element (start drag)
  const handleMouseDown = useCallback((e) => {
    // Only start drag if clicking on the header (not on buttons)
    if (e.target.closest('button')) {
      return;
    }

    const container = e.currentTarget.closest('[data-draggable-container]');
    elementRef.current = container;

    // Get the current position of the element
    const rect = container.getBoundingClientRect();

    // Calculate offset between mouse position and element's top-left corner
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // If position is null (using CSS positioning), initialize to current pixel position
    // This prevents the "jump" on first drag
    setPosition({
      x: rect.left,
      y: rect.top,
    });

    setIsDragging(true);

    e.preventDefault(); // Prevent text selection while dragging
  }, []);

  // Handle mouse move (during drag)
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    // Calculate new position
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // Get actual element dimensions for proper boundary constraints
    const elementWidth = elementRef.current?.offsetWidth || 384;
    const elementHeight = elementRef.current?.offsetHeight || 400;

    // Constrain to viewport bounds (allow dragging to edges minus element size)
    const maxX = window.innerWidth - elementWidth;
    const maxY = window.innerHeight - elementHeight;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging]);

  // Handle mouse up (end drag)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Change cursor to grabbing
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset to default position
  const resetPosition = useCallback(() => {
    setPosition(defaultPosition);
  }, [defaultPosition]);

  return {
    position,
    isDragging,
    handleMouseDown,
    resetPosition,
  };
}
