import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTheme } from '../contexts/ThemeContext';
import AdminPanel from './AdminPanel';

/**
 * AdminDrawer - Slide-out panel for admin functionality
 * Wraps the existing AdminPanel in a drawer interface with:
 * - Slide-in animation from right
 * - Resizable width with grab handle
 * - Consistent UX with ProductDrawer
 */
const AdminDrawer = ({ isOpen, onClose, onSaveChangesSuccess }) => {
  const { isDarkMode } = useTheme();
  const [drawerWidth, setDrawerWidth] = useState(1200); // Wider default for admin panel
  const [isResizing, setIsResizing] = useState(false);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate new width based on distance from right edge
      const newWidth = window.innerWidth - e.clientX;

      // Constrain width between 800px and 95% of window width
      const minWidth = 800;
      const maxWidth = window.innerWidth * 0.95;
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      setDrawerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        />

        {/* Drawer - Resizable width */}
        <Dialog.Content
          className={`fixed top-0 right-0 h-full z-50
            ${isDarkMode ? 'bg-prism-dark-bg-primary' : 'bg-prism-light-bg-primary'}
            shadow-2xl flex flex-col overflow-hidden`}
          style={{
            width: typeof window !== 'undefined' && window.innerWidth <= 768 ? '100%' : `${drawerWidth}px`,
            transition: isResizing ? 'none' : 'width 200ms ease-out',
            animation: 'slideInFromRight 210ms ease-out'
          }}
        >
          {/* Resize Handle - Left edge */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group hover:w-2 transition-all
              ${isResizing
                ? isDarkMode ? 'bg-prism-primary' : 'bg-prism-primary-light'
                : isDarkMode ? 'bg-prism-dark-border-elevated hover:bg-prism-primary/70' : 'bg-prism-light-border-elevated hover:bg-prism-primary-light/70'
              }`}
            style={{ zIndex: 100 }}
          >
            {/* Visual grab indicator - Three vertical dots */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-200 flex flex-col gap-1.5 pointer-events-none`}
            >
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white' : 'bg-white'}`} />
            </div>
          </div>

          {/* Header - Compact */}
          <div className={`flex-shrink-0 px-6 py-4 border-b ${isDarkMode ? 'border-prism-dark-border-elevated' : 'border-prism-light-border-elevated'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <Dialog.Title className={`text-lg font-semibold ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                  Admin Panel
                </Dialog.Title>
                <Dialog.Description className={`text-xs mt-0.5 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                  Manage conditions, products, categories, and user approvals
                </Dialog.Description>
              </div>
              <Dialog.Close
                className={`p-2 rounded-lg transition-all duration-250
                  ${isDarkMode
                    ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-secondary hover:text-prism-dark-text-primary'
                    : 'hover:bg-prism-light-bg-hover text-prism-light-text-secondary hover:text-prism-light-text-primary'
                  }`}
                aria-label="Close"
              >
                <X size={24} />
              </Dialog.Close>
            </div>
          </div>

          {/* Admin Panel Content */}
          <div className="flex-1 overflow-hidden relative">
            <AdminPanel
              onSaveChangesSuccess={onSaveChangesSuccess}
              onClose={onClose}
              drawerWidth={drawerWidth}
            />
            {/* Gradient fade at bottom */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none ${
                isDarkMode
                  ? 'bg-gradient-to-t from-prism-dark-bg-primary to-transparent'
                  : 'bg-gradient-to-t from-prism-light-bg-primary to-transparent'
              }`}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AdminDrawer;
