/**
 * NotificationDropdown Component
 *
 * Dropdown menu displaying recent admin notifications.
 * Shown when the NotificationBell is clicked.
 *
 * Features:
 * - List of recent notifications (max 10)
 * - Each notification is clickable (navigates to action_url)
 * - "Mark as Read" button for each notification
 * - "Mark All as Read" button
 * - "View All Notifications" link to full page
 * - Real-time updates via Supabase subscriptions
 * - Matches application theme
 *
 * @module NotificationDropdown
 */

import React from 'react';
import { CheckCheck, Inbox } from 'lucide-react';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Relative time string
 */
function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * NotificationDropdown Component
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the dropdown
 * @param {Function} props.onNavigate - Callback to navigate to a tab (receives tab name)
 * @returns {React.ReactElement} NotificationDropdown component
 *
 * @example
 * <NotificationDropdown onClose={() => setIsOpen(false)} onNavigate={(tab) => setActiveTab(tab)} />
 */
export function NotificationDropdown({ onClose, onNavigate }) {
  const { notifications, isLoading, markAsRead, markAllAsRead } = useAdminNotifications();
  const { isDarkMode } = useTheme();

  // Show only the 10 most recent notifications in dropdown
  const recentNotifications = notifications.slice(0, 10);
  const hasUnread = notifications.some(n => !n.is_read);

  /**
   * Handle notification click - mark as read
   * Note: action_url navigation is handled by the parent component opening admin panel
   */
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // For now, we'll just navigate to the user approvals tab when clicked
    // since that's where the notification action typically leads
    if (onNavigate) {
      onNavigate('userApprovals');
    }
    onClose();
  };

  /**
   * Handle mark as read for individual notification
   */
  const handleMarkAsRead = (e, notificationId) => {
    e.stopPropagation(); // Prevent notification click
    markAsRead(notificationId);
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  /**
   * Handle view all notifications
   */
  const handleViewAll = () => {
    if (onNavigate) {
      onNavigate('notifications');
    }
    onClose();
  };

  return (
    <div
      className={`absolute top-full right-0 mt-2 w-96 rounded-lg shadow-lg border z-50 ${
        isDarkMode
          ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
          : 'bg-white border-prism-light-border-elevated'
      }`}
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isDarkMode
            ? 'border-prism-dark-border-subtle'
            : 'border-prism-light-border-subtle'
        }`}
      >
        <h3 className={`font-semibold ${
          isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
        }`}>
          Notifications
        </h3>
        {hasUnread && (
          <button
            onClick={handleMarkAllAsRead}
            className={`text-xs flex items-center gap-1 ${
              isDarkMode
                ? 'text-prism-primary hover:text-prism-primary-hover'
                : 'text-prism-primary-light hover:text-prism-primary-light-hover'
            } transition-colors`}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className={`text-sm ${
              isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
            }`}>
              Loading notifications...
            </div>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Inbox
              size={32}
              className={`mx-auto mb-2 ${
                isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'
              }`}
            />
            <div className={`text-sm ${
              isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
            }`}>
              No notifications
            </div>
          </div>
        ) : (
          <div>
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-4 py-3 border-b cursor-pointer transition-colors ${
                  isDarkMode
                    ? 'border-prism-dark-border-subtle hover:bg-prism-dark-bg-hover'
                    : 'border-prism-light-border-subtle hover:bg-prism-light-bg-hover'
                } ${!notification.is_read
                    ? isDarkMode
                      ? 'bg-prism-dark-bg-tertiary'
                      : 'bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-prism-primary rounded-full flex-shrink-0" />
                      )}
                      <h4 className={`text-sm font-medium truncate ${
                        isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
                      }`}>
                        {notification.title}
                      </h4>
                    </div>
                    <p className={`text-xs mb-1 line-clamp-2 ${
                      isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
                    }`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'
                    }`}>
                      {getRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, notification.id)}
                      className={`flex-shrink-0 p-1 rounded hover:bg-opacity-10 ${
                        isDarkMode
                          ? 'hover:bg-white text-prism-dark-text-tertiary hover:text-prism-dark-text-primary'
                          : 'hover:bg-black text-prism-light-text-tertiary hover:text-prism-light-text-primary'
                      } transition-colors`}
                      aria-label="Mark as read"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div
          className={`px-4 py-3 border-t text-center ${
            isDarkMode
              ? 'border-prism-dark-border-subtle'
              : 'border-prism-light-border-subtle'
          }`}
        >
          <button
            onClick={handleViewAll}
            className={`text-sm font-medium ${
              isDarkMode
                ? 'text-prism-primary hover:text-prism-primary-hover'
                : 'text-prism-primary-light hover:text-prism-primary-light-hover'
            } transition-colors`}
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
