/**
 * AdminNotifications Component (User Approvals)
 *
 * User approval management interface.
 * Shows pending user signup approvals with approve/reject actions.
 *
 * Features:
 * - List of pending user approvals
 * - Approve/Reject buttons on each notification
 * - Real-time updates via Supabase subscriptions
 * - Toast notifications for success/error
 *
 * @module AdminNotifications
 */

import React, { useState } from 'react';
import { UserCheck, CheckCircle, XCircle, Inbox } from 'lucide-react';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { useTheme } from '../../contexts/ThemeContext';
import { approvePendingUser, rejectPendingUser } from '../../services/approvals/approvalService';
import { useToast } from './Toast';

/**
 * Format timestamp to readable date
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}


/**
 * AdminNotifications Component (User Approvals)
 *
 * @param {Object} props
 * @param {Function} props.onNavigate - Optional callback to navigate to another tab
 * @returns {React.ReactElement} AdminNotifications component
 *
 * @example
 * // In AdminPanel
 * <AdminNotifications onNavigate={(tab) => setActiveTab(tab)} />
 */
export function AdminNotifications({ onNavigate }) {
  const { notifications, isLoading, markAsRead } = useAdminNotifications();
  const { isDarkMode } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [processingNotification, setProcessingNotification] = useState(null);
  const [rejectingNotification, setRejectingNotification] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter to only show pending approval requests
  const pendingApprovals = notifications.filter(
    notification => notification.type === 'user_approval_requested' && !notification.is_read
  );

  /**
   * Handle user approval
   */
  const handleApprove = async (notification) => {
    setProcessingNotification(notification.id);
    try {
      const result = await approvePendingUser(notification.user_profile_id);

      if (result.success) {
        showToast('User approved successfully', 'success');
        // Mark notification as read
        await markAsRead(notification.id);
      } else {
        throw new Error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approval error:', error);
      showToast(error.message || 'Failed to approve user', 'error');
    } finally {
      setProcessingNotification(null);
    }
  };

  /**
   * Handle user rejection
   */
  const handleReject = async () => {
    if (!rejectingNotification) return;

    setProcessingNotification(rejectingNotification.id);
    try {
      const result = await rejectPendingUser(
        rejectingNotification.user_profile_id,
        rejectionReason
      );

      if (result.success) {
        showToast('User rejected successfully', 'success');
        // Mark notification as read
        await markAsRead(rejectingNotification.id);
        setRejectingNotification(null);
        setRejectionReason('');
      } else {
        throw new Error(result.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      showToast(error.message || 'Failed to reject user', 'error');
    } finally {
      setProcessingNotification(null);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className={`p-6 space-y-6 ${
        isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
      }`}>
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck size={28} />
            User Approvals
          </h2>
          <p className={`mt-1 ${
            isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
          }`}>
            Review and approve new user signups
          </p>
        </div>

        {/* Pending Count */}
        <div className={`rounded-lg border p-4 ${
          isDarkMode
            ? 'bg-yellow-900/20 border-yellow-800'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className={`text-sm font-medium ${
            isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
          }`}>
            Pending Approvals
          </div>
          <div className="text-2xl font-bold mt-1 text-yellow-600">{pendingApprovals.length}</div>
        </div>

        {/* Approval Requests List */}
        <div className={`rounded-lg border overflow-hidden ${
          isDarkMode
            ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
            : 'bg-white border-prism-light-border-elevated'
        }`}>
          {isLoading ? (
            <div className="p-12 text-center">
              <div className={`text-sm ${
                isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
              }`}>
                Loading approval requests...
              </div>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox
                size={48}
                className={`mx-auto mb-3 ${
                  isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'
                }`}
              />
              <div className={`font-medium ${
                isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
              }`}>
                No pending approvals
              </div>
              <div className={`text-sm mt-1 ${
                isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
              }`}>
                All users have been reviewed
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingApprovals.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    isDarkMode
                      ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle'
                      : 'bg-blue-50 border-prism-light-border-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold mb-1 ${
                        isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className={`mb-2 ${
                        isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
                      }`}>
                        {notification.message}
                      </p>
                      <span className={`text-xs ${
                        isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'
                      }`}>
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(notification)}
                        disabled={processingNotification === notification.id}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          processingNotification === notification.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        } ${
                          isDarkMode
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {processingNotification === notification.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingNotification(notification)}
                        disabled={processingNotification === notification.id}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          processingNotification === notification.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        } ${
                          isDarkMode
                            ? 'border border-red-400 text-red-400 hover:bg-red-900/20'
                            : 'border border-red-600 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectingNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-md w-full ${
            isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-white'
          }`}>
            <h3 className="text-xl font-bold mb-4">Reject User</h3>
            <p className={`mb-4 ${
              isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
            }`}>
              Are you sure you want to reject this user signup?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Reason for rejection"
              className={`w-full px-3 py-2 border rounded-lg mb-4 ${
                isDarkMode
                  ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                  : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
              }`}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={processingNotification !== null}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  processingNotification !== null
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                } bg-red-600 hover:bg-red-700 text-white`}
              >
                {processingNotification !== null ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setRejectingNotification(null);
                  setRejectionReason('');
                }}
                disabled={processingNotification !== null}
                className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'border-prism-dark-border-elevated hover:bg-prism-dark-bg-hover'
                    : 'border-prism-light-border-elevated hover:bg-prism-light-bg-hover'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
