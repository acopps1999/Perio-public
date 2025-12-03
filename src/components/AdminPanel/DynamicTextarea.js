import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, List, ArrowRightToLine, ArrowLeftToLine, GripVertical } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * DynamicTextarea with expandable overlay view and formatting toolbar
 *
 * Supports markdown-style formatting:
 * - Bold: **text**
 * - Italic: *text*
 * - Bullet points: - item
 * - Indentation: spaces at line start
 */
const DynamicTextarea = ({
  initialRows = 2,
  maxRows = 8,
  value = '',
  onChange,
  placeholder,
  className = '',
}) => {
  const { isDarkMode } = useTheme();
  const inlineRef = useRef(null);
  const expandedRef = useRef(null);
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0 });
  const [expandedHeight, setExpandedHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null); // 'top' or 'bottom'
  const [expandedTop, setExpandedTop] = useState(null);
  const [expandedLeft, setExpandedLeft] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Open expanded view
  const openExpanded = () => {
    if (inlineRef.current) {
      const r = inlineRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width });
      // Calculate initial top position
      let initialTop = r.top;
      const toolbarHeight = 44;
      const resizeHandleHeight = 24; // top + bottom handles
      const totalHeight = 300 + toolbarHeight + resizeHandleHeight;
      if (initialTop + totalHeight > window.innerHeight - 20) {
        initialTop = window.innerHeight - totalHeight - 20;
      }
      if (initialTop < 20) initialTop = 20;
      setExpandedTop(initialTop);
      setExpandedLeft(r.left);
      setExpandedHeight(300);
    }
    setIsExpanded(true);
  };

  // Close expanded view
  const closeExpanded = () => {
    setIsExpanded(false);
  };

  // Focus when opened
  useEffect(() => {
    if (isExpanded && expandedRef.current) {
      setTimeout(() => {
        expandedRef.current?.focus();
      }, 10);
    }
  }, [isExpanded]);

  // Escape key to close
  useEffect(() => {
    if (!isExpanded) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeExpanded();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isExpanded]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing || !resizeEdge) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const toolbarHeight = 44;
      const topHandleHeight = 12;
      const minHeight = 150;
      const maxHeight = window.innerHeight - 100;

      if (resizeEdge === 'bottom') {
        // Dragging bottom edge - only change height
        const newHeight = e.clientY - containerRect.top - toolbarHeight - topHandleHeight;
        const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
        setExpandedHeight(clampedHeight);
      } else if (resizeEdge === 'top') {
        // Dragging top edge - change both top position and height
        const currentBottom = expandedTop + toolbarHeight + topHandleHeight + expandedHeight + 12; // 12 for bottom handle
        const newTop = Math.max(20, Math.min(e.clientY, currentBottom - minHeight - toolbarHeight - 24));
        const newHeight = currentBottom - newTop - toolbarHeight - 24; // 24 for both handles

        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setExpandedTop(newTop);
          setExpandedHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeEdge, expandedTop, expandedHeight]);

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Clamp to keep within viewport
      const clampedLeft = Math.max(20, Math.min(newLeft, window.innerWidth - rect.width - 20));
      const clampedTop = Math.max(20, Math.min(newTop, window.innerHeight - 100));

      setExpandedLeft(clampedLeft);
      setExpandedTop(clampedTop);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, rect.width]);

  // Handle typing in expanded textarea
  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  // Update value helper
  const updateValue = (newVal) => {
    setLocalValue(newVal);
    if (onChange) {
      onChange({ target: { value: newVal } });
    }
  };

  // === Formatting Functions ===

  // Wrap selected text with markers (e.g., **bold**)
  const wrapSelection = (before, after) => {
    const textarea = expandedRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localValue;
    const selectedText = text.substring(start, end);

    // If no selection, just insert markers and place cursor between
    if (start === end) {
      const newText = text.substring(0, start) + before + after + text.substring(end);
      updateValue(newText);
      // Place cursor between markers
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length);
      }, 0);
    } else {
      // Wrap selected text
      const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
      updateValue(newText);
      // Select the wrapped text (including markers)
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end + before.length + after.length);
      }, 0);
    }
  };

  // Apply formatting to start of lines
  const applyLinePrefix = (prefix, toggle = false) => {
    const textarea = expandedRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localValue;

    // Find the start of the first selected line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    // Find the end of the last selected line
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }

    // Get all lines in selection
    const selectedLines = text.substring(lineStart, lineEnd);
    const lines = selectedLines.split('\n');

    // Track how much we're adding/removing for cursor adjustment
    let lengthChange = 0;
    let firstLineChanged = false;

    // Apply/toggle prefix to each line
    const newLines = lines.map((line, index) => {
      if (toggle && line.startsWith(prefix)) {
        if (index === 0) firstLineChanged = true;
        lengthChange -= prefix.length;
        return line.substring(prefix.length);
      }
      if (index === 0) firstLineChanged = true;
      lengthChange += prefix.length;
      return prefix + line;
    });

    const newText = text.substring(0, lineStart) + newLines.join('\n') + text.substring(lineEnd);
    updateValue(newText);

    // Restore cursor position, adjusted for the prefix change
    setTimeout(() => {
      textarea.focus();
      const newStart = Math.max(lineStart, start + (firstLineChanged ? (toggle && lines[0].startsWith(prefix) ? -prefix.length : prefix.length) : 0));
      const newEnd = end + lengthChange;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // Remove prefix from lines (for outdent)
  const removeLinePrefix = (prefixPattern) => {
    const textarea = expandedRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localValue;

    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }

    const selectedLines = text.substring(lineStart, lineEnd);
    const lines = selectedLines.split('\n');

    let lengthChange = 0;
    let firstLineRemoved = false;

    const newLines = lines.map((line, index) => {
      if (line.startsWith(prefixPattern)) {
        if (index === 0) firstLineRemoved = true;
        lengthChange -= prefixPattern.length;
        return line.substring(prefixPattern.length);
      }
      return line;
    });

    const newText = text.substring(0, lineStart) + newLines.join('\n') + text.substring(lineEnd);
    updateValue(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const adjustment = firstLineRemoved ? -prefixPattern.length : 0;
      const newStart = Math.max(lineStart, start + adjustment);
      const newEnd = Math.max(newStart, end + lengthChange);
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // Toolbar button component
  const ToolbarButton = ({ onClick, title, children, active = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`p-2 rounded transition-colors ${
        active
          ? isDarkMode
            ? 'bg-[#9b9cfa] text-white'
            : 'bg-[#9b9cfa] text-white'
          : isDarkMode
            ? 'hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white'
            : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );

  // Calculate heights
  const lineHeight = 24;
  const padding = 24;
  const minH = lineHeight * initialRows + padding;
  const maxH = lineHeight * maxRows + padding;
  const lines = (value || '').split('\n').length;
  const inlineHeight = Math.min(Math.max(lines * lineHeight + padding, minH), maxH);

  // Use state-managed expandedTop (set in openExpanded)

  return (
    <>
      {/* Inline textarea */}
      <textarea
        ref={inlineRef}
        value={value}
        onClick={openExpanded}
        onFocus={openExpanded}
        placeholder={placeholder}
        readOnly
        className={`${className} cursor-pointer`}
        style={{
          height: inlineHeight,
          overflow: 'hidden',
          resize: 'none',
          opacity: isExpanded ? 0.3 : 1,
        }}
      />

      {/* Expanded overlay */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeExpanded}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(2px)',
              zIndex: 1000,
              cursor: 'pointer',
            }}
          />

          {/* Expanded editor container */}
          <div
            ref={containerRef}
            style={{
              position: 'fixed',
              top: expandedTop,
              left: expandedLeft,
              width: rect.width,
              zIndex: 1001,
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: isDarkMode ? '1px solid #3f3f46' : '1px solid #d1d5db',
            }}
          >
            {/* Top Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                setResizeEdge('top');
              }}
              style={{
                height: '12px',
                backgroundColor: isDarkMode ? '#0a0a0a' : '#f3f4f6',
                borderBottom: isDarkMode ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                cursor: 'ns-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Grip indicator */}
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: isDarkMode ? '#3f3f46' : '#d1d5db',
                }}
              />
            </div>

            {/* Formatting Toolbar - Draggable */}
            <div
              onMouseDown={(e) => {
                // Only start drag if not clicking on a button
                const isButton = e.target.closest('button');
                if (!isButton) {
                  e.preventDefault();
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  if (containerRect) {
                    setDragOffset({
                      x: e.clientX - containerRect.left,
                      y: e.clientY - containerRect.top,
                    });
                    setIsDragging(true);
                  }
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 8px',
                backgroundColor: isDarkMode ? '#0a0a0a' : '#f3f4f6',
                borderBottom: isDarkMode ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
            >
              {/* Drag handle indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: '4px',
                  color: isDarkMode ? '#6b7280' : '#9ca3af',
                }}
                title="Drag to move"
              >
                <GripVertical size={16} />
              </div>

              <ToolbarButton
                onClick={() => wrapSelection('**', '**')}
                title="Bold (wrap with **)"
              >
                <Bold size={16} />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => wrapSelection('*', '*')}
                title="Italic (wrap with *)"
              >
                <Italic size={16} />
              </ToolbarButton>

              <div
                style={{
                  width: '1px',
                  height: '20px',
                  backgroundColor: isDarkMode ? '#3f3f46' : '#d1d5db',
                  margin: '0 4px',
                }}
              />

              <ToolbarButton
                onClick={() => applyLinePrefix('• ', true)}
                title="Bullet point"
              >
                <List size={16} />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => applyLinePrefix('  ')}
                title="Indent"
              >
                <ArrowRightToLine size={16} />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => removeLinePrefix('  ')}
                title="Outdent"
              >
                <ArrowLeftToLine size={16} />
              </ToolbarButton>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Hint */}
              <span
                style={{
                  fontSize: '11px',
                  color: isDarkMode ? '#6b7280' : '#9ca3af',
                }}
              >
                Esc to close
              </span>
            </div>

            {/* Textarea */}
            <textarea
              ref={expandedRef}
              value={localValue}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  closeExpanded();
                }
                // Tab for indentation
                if (e.key === 'Tab') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    removeLinePrefix('  ');
                  } else {
                    applyLinePrefix('  ');
                  }
                }
              }}
              placeholder={placeholder}
              autoFocus
              style={{
                width: '100%',
                height: expandedHeight,
                padding: '12px 16px',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'none',
                border: 'none',
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#111827',
                outline: 'none',
              }}
            />

            {/* Bottom Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                setResizeEdge('bottom');
              }}
              style={{
                height: '12px',
                backgroundColor: isDarkMode ? '#0a0a0a' : '#f3f4f6',
                borderTop: isDarkMode ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                cursor: 'ns-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Grip indicator */}
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: isDarkMode ? '#3f3f46' : '#d1d5db',
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DynamicTextarea;
