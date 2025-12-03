import React, { useState } from 'react';
import { useUserApprovals } from '../../hooks/useUserApprovals';
import { useToast } from './Toast';
import { useTheme } from '../../contexts/ThemeContext';
import { USER_ROLES } from '../../contexts/AuthContext';
import RoleBadge from './RoleBadge';

/**
 * AdminPanelUserApprovals - UI for managing user approval requests
 *
 * Uses QRRENT Design System (pure black backgrounds with periwinkle accents)
 * Shows list of pending users with approve/reject actions
 * Supports role assignment during approval (admin, sales, clinician)
 */
export default function AdminPanelUserApprovals() {
  const { isDarkMode } = useTheme();
  const {
    pendingUsers,
    approveUser,
    rejectUser,
    isLoading,
    isApproving,
    isRejecting
  } = useUserApprovals();
  const { showToast } = useToast();
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingUserId, setApprovingUserId] = useState(null);
  // Track selected role for each pending user (default to 'sales')
  const [selectedRoles, setSelectedRoles] = useState({});

  // Get the selected role for a user, defaulting to 'sales'
  const getSelectedRole = (userId) => selectedRoles[userId] || USER_ROLES.SALES;

  // Handle role selection change
  const handleRoleChange = (userId, role) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleApprove = async (user) => {
    try {
      setApprovingUserId(user.id);
      const role = getSelectedRole(user.id);
      await approveUser(user.id, role);
      showToast(`User approved as ${role}`, 'success');
    } catch (error) {
      showToast(`Approval failed: ${error.message}`, 'error');
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingUser) return;

    try {
      await rejectUser({ userId: rejectingUser.id, reason: rejectionReason });
      showToast('User rejected successfully', 'success');
      setRejectingUser(null);
      setRejectionReason('');
    } catch (error) {
      showToast(`Rejection failed: ${error.message}`, 'error');
    }
  };

  const handleCancelReject = () => {
    setRejectingUser(null);
    setRejectionReason('');
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qrrent-primary mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}>Loading pending users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-qrrent-dark-text-primary' : 'text-qrrent-light-text-primary'}`}>User Approvals</h2>
        <p className={`mt-1 ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}`}>Review and approve new user signups</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${isDarkMode ? 'bg-qrrent-pending-bg-dark border-qrrent-pending' : 'bg-qrrent-pending-bg-light border-qrrent-pending'} border rounded-lg p-4`}>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-pending'}`}>Pending Approvals</p>
          <p className={`text-3xl font-bold mt-1 text-qrrent-pending`}>{pendingUsers.length}</p>
        </div>
      </div>

      {/* Pending Users List */}
      <div className={`${isDarkMode ? 'bg-qrrent-dark-bg-secondary' : 'bg-qrrent-light-bg-primary'} rounded-lg ${isDarkMode ? 'border border-qrrent-dark-border-subtle' : 'border border-qrrent-light-border-subtle'} shadow-md`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-qrrent-dark-border-subtle bg-qrrent-dark-bg-tertiary' : 'border-qrrent-light-border-subtle bg-qrrent-light-bg-secondary'}`}>
          <h3 className={`font-semibold ${isDarkMode ? 'text-qrrent-dark-text-primary' : 'text-qrrent-light-text-primary'}`}>Pending Approvals</h3>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-qrrent-dark-bg-tertiary' : 'bg-qrrent-light-bg-secondary'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-qrrent-dark-text-tertiary' : 'text-qrrent-light-text-tertiary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`font-medium ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}`}>No pending approvals</p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-qrrent-dark-text-tertiary' : 'text-qrrent-light-text-tertiary'}`}>All users have been reviewed</p>
          </div>
        ) : (
          <div className={`divide-y ${isDarkMode ? 'divide-qrrent-dark-border-subtle' : 'divide-qrrent-light-border-subtle'}`}>
            {pendingUsers.map((user) => (
              <div key={user.id} className={`p-4 transition-all duration-250 ${isDarkMode ? 'hover:bg-qrrent-dark-bg-hover' : 'hover:bg-qrrent-light-bg-hover'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* User avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-qrrent-primary to-qrrent-primary-hover`}>
                        <span className="text-white font-semibold text-sm">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isDarkMode ? 'text-qrrent-dark-text-primary' : 'text-qrrent-light-text-primary'}`}>{user.email}</p>
                        {user.full_name && (
                          <p className={`text-sm truncate ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}`}>{user.full_name}</p>
                        )}
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-qrrent-dark-text-tertiary' : 'text-qrrent-light-text-tertiary'}`}>
                          Signed up: {new Date(user.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className={`text-sm font-medium ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}`}>
                      Role:
                    </label>
                    <select
                      value={getSelectedRole(user.id)}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-qrrent-primary ${
                        isDarkMode
                          ? 'bg-qrrent-dark-bg-tertiary border-qrrent-dark-border-elevated text-qrrent-dark-text-primary'
                          : 'bg-qrrent-light-bg-primary border-qrrent-light-border-elevated text-qrrent-light-text-primary'
                      }`}
                    >
                      <option value={USER_ROLES.SALES}>Sales Representative</option>
                      <option value={USER_ROLES.CLINICIAN}>Clinician</option>
                      <option value={USER_ROLES.ADMIN}>Administrator</option>
                    </select>
                    <RoleBadge role={getSelectedRole(user.id)} />
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(user)}
                      disabled={isApproving || isRejecting || approvingUserId === user.id}
                      className="px-4 py-2 bg-qrrent-success text-white text-sm font-semibold rounded-lg hover:bg-qrrent-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250 flex items-center gap-2"
                    >
                      {approvingUserId === user.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setRejectingUser(user)}
                      disabled={isApproving || isRejecting}
                      className={`px-4 py-2 border-2 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250 flex items-center gap-2 ${isDarkMode ? 'border-qrrent-error text-qrrent-error hover:bg-qrrent-error-bg-dark' : 'border-qrrent-error text-qrrent-error hover:bg-qrrent-error-bg-light'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-qrrent-dark-bg-secondary' : 'bg-qrrent-light-bg-primary'} rounded-xl shadow-xl max-w-md w-full`}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${isDarkMode ? 'bg-qrrent-error-bg-dark' : 'bg-qrrent-error-bg-light'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <svg className="w-6 h-6 text-qrrent-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-qrrent-dark-text-primary' : 'text-qrrent-light-text-primary'}`}>Reject User</h3>
                  <p className={`mb-4 ${isDarkMode ? 'text-qrrent-dark-text-secondary' : 'text-qrrent-light-text-secondary'}`}>
                    Are you sure you want to reject <span className="font-semibold">{rejectingUser.email}</span>?
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-qrrent-dark-text-primary' : 'text-qrrent-light-text-primary'}`}>
                  Reason for rejection (optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="This will be sent to the user..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-qrrent-primary focus:border-transparent resize-none transition-all duration-250 ${isDarkMode ? 'bg-qrrent-dark-bg-tertiary border-qrrent-dark-border-elevated text-qrrent-dark-text-primary placeholder-qrrent-dark-text-tertiary' : 'bg-qrrent-light-bg-primary border-qrrent-light-border-elevated text-qrrent-light-text-primary placeholder-qrrent-light-text-tertiary'}`}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="flex-1 py-2.5 bg-qrrent-error text-white font-semibold rounded-lg hover:bg-qrrent-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={handleCancelReject}
                  disabled={isRejecting}
                  className={`px-6 py-2.5 border font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250 ${isDarkMode ? 'border-qrrent-dark-border-elevated text-qrrent-dark-text-primary hover:bg-qrrent-dark-bg-hover' : 'border-qrrent-light-border-elevated text-qrrent-light-text-primary hover:bg-qrrent-light-bg-hover'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
