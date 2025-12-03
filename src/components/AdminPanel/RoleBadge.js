import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * RoleBadge - Displays a color-coded badge for user roles
 *
 * Roles:
 * - admin: Purple badge (full access)
 * - sales: Blue badge (sales features + clinical)
 * - clinician: Green badge (clinical only)
 */
export default function RoleBadge({ role, size = 'sm' }) {
  const { isDarkMode } = useTheme();

  const getRoleStyles = () => {
    const baseStyles = 'font-medium rounded-full inline-flex items-center justify-center';
    const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

    switch (role) {
      case 'admin':
        return isDarkMode
          ? `${baseStyles} ${sizeStyles} bg-purple-900/40 text-purple-300 border border-purple-700`
          : `${baseStyles} ${sizeStyles} bg-purple-100 text-purple-800 border border-purple-200`;
      case 'sales':
        return isDarkMode
          ? `${baseStyles} ${sizeStyles} bg-blue-900/40 text-blue-300 border border-blue-700`
          : `${baseStyles} ${sizeStyles} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'clinician':
        return isDarkMode
          ? `${baseStyles} ${sizeStyles} bg-green-900/40 text-green-300 border border-green-700`
          : `${baseStyles} ${sizeStyles} bg-green-100 text-green-800 border border-green-200`;
      default:
        return isDarkMode
          ? `${baseStyles} ${sizeStyles} bg-gray-800 text-gray-300 border border-gray-700`
          : `${baseStyles} ${sizeStyles} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'sales':
        return 'Sales';
      case 'clinician':
        return 'Clinician';
      default:
        return role || 'Unknown';
    }
  };

  return (
    <span className={getRoleStyles()}>
      {getRoleLabel()}
    </span>
  );
}
