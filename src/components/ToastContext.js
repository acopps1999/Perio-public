import React, { createContext, useContext, useState } from 'react';

// Create a context for the toast notifications
const ToastContext = createContext();

// Toast styles/colors
const TOAST_TYPES = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-700',
  },
  error: {
    bg: 'bg-red-100',
    border: 'border-red-400',
    text: 'text-red-700',
  },
  info: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
  }
};

// Provider component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Function to add a toast
  const addToast = (message, type = 'info', options = {}) => {
    const id = Date.now();
    const toast = {
      id,
      message,
      type,
      duration: options.duration || 3000,
      position: options.position || 'bottom-right',
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration);

    return id;
  };

  // Function to remove a toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Convenience methods
  const success = (message, options) => addToast(message, 'success', options);
  const error = (message, options) => addToast(message, 'error', options);
  const info = (message, options) => addToast(message, 'info', options);

  return (
    <ToastContext.Provider value={{ success, error, info, removeToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed z-50 p-4 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${TOAST_TYPES[toast.type].bg} ${TOAST_TYPES[toast.type].border} ${TOAST_TYPES[toast.type].text} px-4 py-3 rounded border shadow-md flex justify-between items-center transition-all duration-300`}
            style={{
              position: 'fixed',
              ...(toast.position.includes('bottom') ? { bottom: '1rem' } : { top: '1rem' }),
              ...(toast.position.includes('right') ? { right: '1rem' } : { left: '1rem' }),
            }}
          >
            {toast.message}
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook for using the toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 