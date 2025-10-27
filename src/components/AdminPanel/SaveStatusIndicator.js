import { Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * SaveStatusIndicator - Visual indicator for save status
 *
 * Shows checkmark (saved), spinner (saving), or error icon based on status
 *
 * @param {string} status - One of: 'saving', 'saved', 'error', or null/undefined
 * @param {string} className - Optional additional CSS classes
 */
export function SaveStatusIndicator({ status, className = '' }) {
  if (!status) return null;

  const baseClasses = 'inline-flex items-center justify-center w-4 h-4 ml-2';

  if (status === 'saving') {
    return (
      <Loader2
        className={`${baseClasses} animate-spin text-blue-500 ${className}`}
        aria-label="Saving..."
      />
    );
  }

  if (status === 'saved') {
    return (
      <Check
        className={`${baseClasses} text-green-500 ${className}`}
        aria-label="Saved"
      />
    );
  }

  if (status === 'error') {
    return (
      <AlertCircle
        className={`${baseClasses} text-red-500 ${className}`}
        aria-label="Error saving"
      />
    );
  }

  return null;
}
