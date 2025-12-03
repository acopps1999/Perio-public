import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Toast - Notification toast component
 *
 * @param {string} message - Toast message
 * @param {string} type - One of: 'success', 'error', 'info'
 * @param {number} duration - Duration in ms before auto-dismiss (default: 3000)
 * @param {Function} onClose - Callback when toast closes
 */
export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const { isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade-out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const getStyles = () => {
    if (isDarkMode) {
      return {
        success: 'bg-green-900/30 text-green-300 border-green-700',
        error: 'bg-red-900/30 text-red-300 border-red-700',
        info: 'bg-blue-900/30 text-blue-300 border-blue-700'
      };
    }
    return {
      success: 'bg-green-50 text-green-800 border-green-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-blue-50 text-blue-800 border-blue-200'
    };
  };

  const styles = getStyles();

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${styles[type]}
        max-w-md
      `}
      role="alert"
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * ToastContainer - Container for managing multiple toasts
 *
 * Provides a hook for showing toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}
