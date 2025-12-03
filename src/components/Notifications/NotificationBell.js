/**
 * NotificationBell Component
 *
 * Displays a bell icon with an unread notification badge in the header.
 * Only visible to admin users. Toggles the NotificationDropdown on click.
 *
 * Features:
 * - Bell icon with hover effect
 * - Unread count badge (shows "9+" if more than 9)
 * - Click to toggle dropdown
 * - Matches application theme (light/dark mode)
 *
 * @module NotificationBell
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * NotificationBell Component
 *
 * @param {Object} props
 * @param {Function} props.onNavigate - Optional callback for navigation (receives tab name)
 * @returns {React.ReactElement} NotificationBell component
 *
 * @example
 * // In header
 * <NotificationBell onNavigate={(tab) => handleNavigate(tab)} />
 */
export function NotificationBell({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useAdminNotifications();
  const { isDarkMode } = useTheme();
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${
          isDarkMode
            ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-primary'
            : 'hover:bg-prism-light-bg-hover text-prism-light-text-primary'
        } focus:outline-none focus:ring-2 focus:ring-prism-primary focus:ring-offset-2`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={20} />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div ref={dropdownRef}>
          <NotificationDropdown onClose={() => setIsOpen(false)} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}
