/**
 * AdminUsers Component (formerly AdminNotifications)
 *
 * Comprehensive user management interface.
 * Shows active users, pending approvals, rejected users, and activity log.
 *
 * Features:
 * - View all approved users with role management
 * - Approve/Reject pending users
 * - View and re-approve rejected users
 * - Activity log with full audit trail
 * - Role assignment with dropdown selection
 *
 * @module AdminUsers
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  History,
  CheckCircle,
  XCircle,
  Shield,
  Briefcase,
  Stethoscope,
  ChevronDown
} from 'lucide-react';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { useTheme } from '../../contexts/ThemeContext';
import {
  approvePendingUser,
  rejectPendingUser,
  getRejectedUsers,
  approveRejectedUser,
  getApprovedUsers,
  getApprovalAuditLog,
  updateUserRole,
  revokeUserAccess
} from '../../services/approvals/approvalService';
import { useToast } from './Toast';

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
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
 * Get role icon component
 */
function RoleIcon({ role, size = 16 }) {
  switch (role) {
    case 'admin':
      return <Shield size={size} className="text-purple-500" />;
    case 'sales':
      return <Briefcase size={size} className="text-blue-500" />;
    case 'clinician':
      return <Stethoscope size={size} className="text-green-500" />;
    default:
      return <Users size={size} className="text-gray-500" />;
  }
}

/**
 * Role badge component
 */
function RoleBadge({ role, isDarkMode }) {
  const roleStyles = {
    admin: isDarkMode
      ? 'bg-purple-900/30 text-purple-400 border-purple-700'
      : 'bg-purple-100 text-purple-700 border-purple-200',
    sales: isDarkMode
      ? 'bg-blue-900/30 text-blue-400 border-blue-700'
      : 'bg-blue-100 text-blue-700 border-blue-200',
    clinician: isDarkMode
      ? 'bg-green-900/30 text-green-400 border-green-700'
      : 'bg-green-100 text-green-700 border-green-200'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleStyles[role] || roleStyles.sales}`}>
      <RoleIcon role={role} size={12} />
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
    </span>
  );
}

/**
 * Role selector dropdown
 */
function RoleSelector({ currentRole, userId, onRoleChange, disabled, isDarkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = React.useRef(null);
  const roles = ['admin', 'sales', 'clinician'];

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = async (role) => {
    if (role !== currentRole) {
      await onRoleChange(userId, role);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isDarkMode
            ? 'bg-prism-dark-bg-tertiary border-prism-dark-border-subtle hover:bg-prism-dark-bg-hover'
            : 'bg-white border-prism-light-border-subtle hover:bg-prism-light-bg-hover'
        }`}
      >
        <RoleIcon role={currentRole} size={14} />
        {currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Select Role'}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`fixed w-40 rounded-lg shadow-lg z-50 border overflow-hidden ${
              isDarkMode
                ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
                : 'bg-white border-prism-light-border-elevated'
            }`}
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  role === currentRole
                    ? isDarkMode
                      ? 'bg-prism-dark-bg-hover'
                      : 'bg-prism-light-bg-hover'
                    : ''
                } ${
                  isDarkMode
                    ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-primary'
                    : 'hover:bg-prism-light-bg-hover text-prism-light-text-primary'
                }`}
              >
                <RoleIcon role={role} size={14} />
                {role.charAt(0).toUpperCase() + role.slice(1)}
                {role === currentRole && <CheckCircle size={14} className="ml-auto text-green-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Sub-tab navigation
 */
function SubTabs({ activeTab, onTabChange, counts, isDarkMode }) {
  const tabs = [
    { id: 'active', label: 'Active Users', icon: UserCheck, count: counts.active },
    { id: 'pending', label: 'Pending', icon: Clock, count: counts.pending },
    { id: 'rejected', label: 'Rejected', icon: UserX, count: counts.rejected },
    { id: 'history', label: 'Activity Log', icon: History, count: null }
  ];

  return (
    <div className={`flex gap-1 p-1 rounded-lg ${
      isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-prism-light-bg-tertiary'
    }`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isActive
                ? isDarkMode
                  ? 'bg-prism-primary text-white'
                  : 'bg-prism-primary-light text-white'
                : isDarkMode
                  ? 'text-prism-dark-text-secondary hover:text-prism-dark-text-primary hover:bg-prism-dark-bg-hover'
                  : 'text-prism-light-text-secondary hover:text-prism-light-text-primary hover:bg-prism-light-bg-hover'
            }`}
          >
            <Icon size={16} />
            {tab.label}
            {tab.count !== null && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                isActive
                  ? 'bg-white/20 text-white'
                  : tab.count > 0 && tab.id === 'pending'
                    ? isDarkMode
                      ? 'bg-yellow-900/50 text-yellow-400'
                      : 'bg-yellow-100 text-yellow-700'
                    : isDarkMode
                      ? 'bg-prism-dark-bg-secondary text-prism-dark-text-tertiary'
                      : 'bg-prism-light-bg-secondary text-prism-light-text-tertiary'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * AdminUsers Component (formerly AdminNotifications)
 */
export function AdminNotifications({ onNavigate }) {
  const { notifications, isLoading: notificationsLoading, markAsRead } = useAdminNotifications();
  const { isDarkMode } = useTheme();
  const { showToast, ToastContainer } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('active');
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState(null);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revokingUser, setRevokingUser] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Filter pending approvals from notifications
  const pendingApprovals = notifications.filter(
    notification => notification.type === 'user_approval_requested' && !notification.is_read
  );

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [approvedResult, rejectedResult, auditResult] = await Promise.all([
          getApprovedUsers(),
          getRejectedUsers(),
          getApprovalAuditLog()
        ]);

        if (approvedResult.success) setApprovedUsers(approvedResult.data);
        if (rejectedResult.success) setRejectedUsers(rejectedResult.data);
        if (auditResult.success) setAuditLog(auditResult.data);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handlers
  const handleApprove = async (notification, role = 'sales') => {
    setProcessingUser(notification.id || notification.user_profile_id);
    try {
      const userId = notification.user_profile_id || notification.id;
      const result = await approvePendingUser(userId, role);

      if (result.success) {
        showToast('User approved successfully', 'success');
        if (notification.id) await markAsRead(notification.id);

        // Refresh data
        const [approvedResult, auditResult] = await Promise.all([
          getApprovedUsers(),
          getApprovalAuditLog()
        ]);
        if (approvedResult.success) setApprovedUsers(approvedResult.data);
        if (auditResult.success) setAuditLog(auditResult.data);
      } else {
        throw new Error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      showToast(error.message || 'Failed to approve user', 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingUser) return;
    setProcessingUser(rejectingUser.id || rejectingUser.user_profile_id);

    try {
      const userId = rejectingUser.user_profile_id || rejectingUser.id;
      const result = await rejectPendingUser(userId, rejectionReason);

      if (result.success) {
        showToast('User rejected', 'success');
        if (rejectingUser.id) await markAsRead(rejectingUser.id);

        // Refresh data
        const [rejectedResult, auditResult] = await Promise.all([
          getRejectedUsers(),
          getApprovalAuditLog()
        ]);
        if (rejectedResult.success) setRejectedUsers(rejectedResult.data);
        if (auditResult.success) setAuditLog(auditResult.data);

        setRejectingUser(null);
        setRejectionReason('');
      } else {
        throw new Error(result.error || 'Failed to reject user');
      }
    } catch (error) {
      showToast(error.message || 'Failed to reject user', 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleApproveRejected = async (user, role = 'sales') => {
    setProcessingUser(user.id);
    try {
      const result = await approveRejectedUser(user.id, role);

      if (result.success) {
        showToast('User approved successfully', 'success');

        // Refresh data
        const [approvedResult, rejectedResult, auditResult] = await Promise.all([
          getApprovedUsers(),
          getRejectedUsers(),
          getApprovalAuditLog()
        ]);
        if (approvedResult.success) setApprovedUsers(approvedResult.data);
        if (rejectedResult.success) setRejectedUsers(rejectedResult.data);
        if (auditResult.success) setAuditLog(auditResult.data);
      } else {
        throw new Error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      showToast(error.message || 'Failed to approve user', 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setProcessingUser(userId);
    try {
      const result = await updateUserRole(userId, newRole);

      if (result.success) {
        showToast(`Role updated to ${newRole}`, 'success');

        // Update local state
        setApprovedUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        ));

        // Refresh audit log
        const auditResult = await getApprovalAuditLog();
        if (auditResult.success) setAuditLog(auditResult.data);
      } else {
        throw new Error(result.error || 'Failed to update role');
      }
    } catch (error) {
      showToast(error.message || 'Failed to update role', 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRevokeAccess = async () => {
    if (!revokingUser) return;
    setProcessingUser(revokingUser.id);

    try {
      const result = await revokeUserAccess(revokingUser.id, revokeReason);

      if (result.success) {
        showToast('User access revoked', 'success');

        // Refresh data
        const [approvedResult, rejectedResult, auditResult] = await Promise.all([
          getApprovedUsers(),
          getRejectedUsers(),
          getApprovalAuditLog()
        ]);
        if (approvedResult.success) setApprovedUsers(approvedResult.data);
        if (rejectedResult.success) setRejectedUsers(rejectedResult.data);
        if (auditResult.success) setAuditLog(auditResult.data);

        setRevokingUser(null);
        setRevokeReason('');
      } else {
        throw new Error(result.error || 'Failed to revoke access');
      }
    } catch (error) {
      showToast(error.message || 'Failed to revoke access', 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  // Get action description for audit log
  const getActionDescription = (entry) => {
    switch (entry.action) {
      case 'approved':
        return entry.previous_status === 'rejected'
          ? 'Re-approved user'
          : 'Approved user';
      case 'rejected':
        return 'Rejected user';
      case 'revoked':
        return 'Revoked access';
      case 'role_changed':
        const meta = entry.metadata || {};
        return `Changed role: ${meta.previous_role || '?'} → ${meta.new_role || '?'}`;
      default:
        return entry.action;
    }
  };

  const isLoading = loading || notificationsLoading;

  return (
    <>
      <ToastContainer />
      <div className={`p-6 space-y-6 ${
        isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'
      }`}>
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={28} />
            Users
          </h2>
          <p className={`mt-1 ${
            isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'
          }`}>
            Manage user accounts, approvals, and roles
          </p>
        </div>

        {/* Sub-tabs */}
        <SubTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            active: approvedUsers.length,
            pending: pendingApprovals.length,
            rejected: rejectedUsers.length
          }}
          isDarkMode={isDarkMode}
        />

        {/* Content */}
        <div className={`rounded-lg border overflow-hidden ${
          isDarkMode
            ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated'
            : 'bg-white border-prism-light-border-elevated'
        }`}>
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: isDarkMode ? '#6366f1' : '#4f46e5' }} />
              <div className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                Loading users...
              </div>
            </div>
          ) : (
            <>
              {/* Active Users Tab */}
              {activeTab === 'active' && (
                <div>
                  {approvedUsers.length === 0 ? (
                    <div className="p-12 text-center">
                      <UserCheck size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} />
                      <div className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        No active users
                      </div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className={isDarkMode ? 'bg-prism-dark-bg-tertiary' : 'bg-prism-light-bg-tertiary'}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Approved</th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {approvedUsers.map((user) => (
                          <tr key={user.id} className={isDarkMode ? 'hover:bg-prism-dark-bg-hover' : 'hover:bg-prism-light-bg-hover'}>
                            <td className="px-4 py-4">
                              <div className="font-medium">{user.email}</div>
                              <div className={`text-xs ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                                ID: {user.id?.slice(0, 8)}...
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <RoleSelector
                                currentRole={user.role}
                                userId={user.id}
                                onRoleChange={handleRoleChange}
                                disabled={processingUser === user.id}
                                isDarkMode={isDarkMode}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                                {formatDate(user.approved_at)}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => setRevokingUser(user)}
                                disabled={processingUser === user.id}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  processingUser === user.id ? 'opacity-50 cursor-not-allowed' : ''
                                } ${
                                  isDarkMode
                                    ? 'text-red-400 hover:bg-red-900/20'
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <XCircle size={14} />
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div>
                  {pendingApprovals.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} />
                      <div className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        No pending approvals
                      </div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                        All users have been reviewed
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {pendingApprovals.map((notification) => (
                        <div key={notification.id} className={`p-4 ${isDarkMode ? 'hover:bg-prism-dark-bg-hover' : 'hover:bg-prism-light-bg-hover'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <p className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                                {notification.message}
                              </p>
                              <span className={`text-xs ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                                {formatDate(notification.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(notification)}
                                disabled={processingUser === notification.id}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                  processingUser === notification.id ? 'opacity-50 cursor-not-allowed' : ''
                                } bg-green-600 hover:bg-green-700 text-white`}
                              >
                                {processingUser === notification.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle size={18} />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingUser(notification)}
                                disabled={processingUser === notification.id}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                                  processingUser === notification.id ? 'opacity-50 cursor-not-allowed' : ''
                                } ${
                                  isDarkMode
                                    ? 'border-red-400 text-red-400 hover:bg-red-900/20'
                                    : 'border-red-600 text-red-600 hover:bg-red-50'
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
              )}

              {/* Rejected Tab */}
              {activeTab === 'rejected' && (
                <div>
                  {rejectedUsers.length === 0 ? (
                    <div className="p-12 text-center">
                      <UserX size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} />
                      <div className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        No rejected users
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {rejectedUsers.map((user) => (
                        <div key={user.id} className={`p-4 ${isDarkMode ? 'hover:bg-prism-dark-bg-hover' : 'hover:bg-prism-light-bg-hover'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{user.email}</h4>
                              {user.rejection_reason && (
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                                  <span className="font-medium">Reason:</span> {user.rejection_reason}
                                </p>
                              )}
                              <span className={`text-xs ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                                Rejected: {formatDate(user.approved_at)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApproveRejected(user)}
                              disabled={processingUser === user.id}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                processingUser === user.id ? 'opacity-50 cursor-not-allowed' : ''
                              } bg-green-600 hover:bg-green-700 text-white`}
                            >
                              {processingUser === user.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === 'history' && (
                <div>
                  {auditLog.length === 0 ? (
                    <div className="p-12 text-center">
                      <History size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`} />
                      <div className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                        No activity recorded
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {auditLog.map((entry) => (
                        <div key={entry.id} className={`p-4 ${isDarkMode ? 'hover:bg-prism-dark-bg-hover' : 'hover:bg-prism-light-bg-hover'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              entry.action === 'approved' || entry.action === 'role_changed'
                                ? isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
                                : isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                            }`}>
                              {entry.action === 'approved' || entry.action === 'role_changed' ? (
                                <CheckCircle size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                              ) : (
                                <XCircle size={16} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {getActionDescription(entry)}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                                User: {entry.user_profile?.email || 'Unknown'}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                                By: {entry.admin?.email || 'System'}
                              </p>
                              {entry.reason && (
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                                  Reason: {entry.reason}
                                </p>
                              )}
                              <span className={`text-xs ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                                {formatDate(entry.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-md w-full ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4">Reject User</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
              Are you sure you want to reject this user?
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
                disabled={processingUser !== null}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  processingUser !== null ? 'opacity-50 cursor-not-allowed' : ''
                } bg-red-600 hover:bg-red-700 text-white`}
              >
                {processingUser !== null ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => { setRejectingUser(null); setRejectionReason(''); }}
                disabled={processingUser !== null}
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

      {/* Revoke Access Modal */}
      {revokingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-md w-full ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4">Revoke Access</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
              Are you sure you want to revoke access for <strong>{revokingUser.email}</strong>?
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Optional: Reason for revocation"
              className={`w-full px-3 py-2 border rounded-lg mb-4 ${
                isDarkMode
                  ? 'bg-prism-dark-bg-primary border-prism-dark-border-subtle text-prism-dark-text-primary'
                  : 'bg-white border-prism-light-border-subtle text-prism-light-text-primary'
              }`}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleRevokeAccess}
                disabled={processingUser !== null}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  processingUser !== null ? 'opacity-50 cursor-not-allowed' : ''
                } bg-red-600 hover:bg-red-700 text-white`}
              >
                {processingUser !== null ? 'Revoking...' : 'Revoke Access'}
              </button>
              <button
                onClick={() => { setRevokingUser(null); setRevokeReason(''); }}
                disabled={processingUser !== null}
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
