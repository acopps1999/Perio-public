import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check user approval status
 * Returns approval status and convenience booleans
 *
 * @returns {Object} Approval status object
 * @property {string|null} status - 'pending', 'approved', 'rejected', or null if not authenticated
 * @property {boolean} isApproved - True if user is approved
 * @property {boolean} isPending - True if user is pending approval
 * @property {boolean} isRejected - True if user is rejected
 * @property {string|null} rejectionReason - Reason for rejection (if rejected)
 */
export function useApprovalStatus() {
  const { user, isAuthenticated } = useAuth();

  return useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        status: null,
        isApproved: false,
        isPending: false,
        isRejected: false,
        rejectionReason: null,
      };
    }

    const status = user.approval_status || 'approved'; // Default to approved for legacy users

    return {
      status,
      isApproved: status === 'approved',
      isPending: status === 'pending',
      isRejected: status === 'rejected',
      rejectionReason: user.rejection_reason || null,
    };
  }, [user, isAuthenticated]);
}
