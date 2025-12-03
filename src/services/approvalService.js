/**
 * Approval Service
 *
 * Handles user approval/rejection logic for the OAuth admin approval workflow.
 * Integrates with email notifications and database updates.
 */

import supabase from './database/client';
import {
  sendAdminNotificationEmail,
  sendUserApprovalEmail,
  sendUserRejectionEmail
} from './email/approvalEmailService';

/**
 * Approve a user
 * @param {string} userId - User profile ID
 * @param {string} adminId - ID of admin performing approval
 * @returns {Promise<Object>} Approval result
 */
export const approveUser = async (userId, adminId) => {
  try {
    // Get current admin user ID
    const { data: { user } } = await supabase.auth.getUser();
    const approvingAdminId = adminId || user?.id;

    if (!approvingAdminId) {
      throw new Error('Admin must be authenticated to approve users');
    }

    // Fetch user profile to get email and name
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, approval_status')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
    }

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    if (userProfile.approval_status === 'approved') {
      return {
        success: true,
        message: 'User is already approved',
        alreadyApproved: true
      };
    }

    // Update user profile to approved
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        approved_by: approvingAdminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to approve user: ${updateError.message}`);
    }

    // Create audit log entry
    try {
      await supabase.from('approval_audit_log').insert({
        user_profile_id: userId,
        admin_id: approvingAdminId,
        action: 'approved',
        previous_status: userProfile.approval_status,
        new_status: 'approved',
        metadata: {
          approved_at: new Date().toISOString(),
          approved_by_id: approvingAdminId
        }
      });
    } catch (auditError) {
      // Don't fail the approval if audit log fails
    }

    // Mark related notifications as read
    try {
      await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: approvingAdminId
        })
        .eq('user_profile_id', userId)
        .eq('type', 'user_approval_requested')
        .eq('is_read', false);
    } catch (notifError) {
      // Don't fail the approval if notification update fails
    }

    // Send approval email to user
    try {
      await sendUserApprovalEmail(
        userProfile.email,
        userProfile.email?.split('@')[0] // Use email username as name if no name field
      );
    } catch (emailError) {
      // Don't fail the approval if email fails
    }

    return {
      success: true,
      message: 'User approved successfully',
      user: updatedProfile
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Reject a user
 * @param {string} userId - User profile ID
 * @param {string} adminId - ID of admin performing rejection
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<Object>} Rejection result
 */
export const rejectUser = async (userId, adminId = null, reason = null) => {
  try {
    // Get current admin user ID
    const { data: { user } } = await supabase.auth.getUser();
    const rejectingAdminId = adminId || user?.id;

    if (!rejectingAdminId) {
      throw new Error('Admin must be authenticated to reject users');
    }

    // Fetch user profile to get email and name
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, approval_status')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
    }

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    if (userProfile.approval_status === 'rejected') {
      return {
        success: true,
        message: 'User is already rejected',
        alreadyRejected: true
      };
    }

    // Update user profile to rejected
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'rejected',
        approved_by: rejectingAdminId, // Track who rejected
        approved_at: new Date().toISOString(), // Track when rejected
        rejection_reason: reason
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to reject user: ${updateError.message}`);
    }

    // Create audit log entry
    try {
      await supabase.from('approval_audit_log').insert({
        user_profile_id: userId,
        admin_id: rejectingAdminId,
        action: 'rejected',
        previous_status: userProfile.approval_status,
        new_status: 'rejected',
        reason: reason,
        metadata: {
          rejected_at: new Date().toISOString(),
          rejected_by_id: rejectingAdminId,
          rejection_reason: reason
        }
      });
    } catch (auditError) {
      // Don't fail the rejection if audit log fails
    }

    // Mark related notifications as read
    try {
      await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: rejectingAdminId
        })
        .eq('user_profile_id', userId)
        .eq('type', 'user_approval_requested')
        .eq('is_read', false);
    } catch (notifError) {
      // Don't fail the rejection if notification update fails
    }

    // Send rejection email to user
    try {
      await sendUserRejectionEmail(
        userProfile.email,
        userProfile.email?.split('@')[0], // Use email username as name if no name field
        reason
      );
    } catch (emailError) {
      // Don't fail the rejection if email fails
    }

    return {
      success: true,
      message: 'User rejected successfully',
      user: updatedProfile
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all pending users awaiting approval
 * @returns {Promise<Array>} List of pending users
 */
export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending users: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    throw error;
  }
};

/**
 * Get approval statistics
 * @returns {Promise<Object>} Approval stats
 */
export const getApprovalStats = async () => {
  try {
    // Fetch counts for each status
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'rejected')
    ]);

    return {
      pending: pendingCount.count || 0,
      approved: approvedCount.count || 0,
      rejected: rejectedCount.count || 0,
      total: (pendingCount.count || 0) + (approvedCount.count || 0) + (rejectedCount.count || 0)
    };

  } catch (error) {
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
  }
};

/**
 * Notify admins about new user signup (called from signup flow)
 * This simulates the database trigger functionality
 * @param {Object} newUserData - New user data { id, email, created_at }
 * @returns {Promise<Object>} Notification result
 */
export const notifyAdminsOfNewUser = async (newUserData) => {
  try {
    // Create admin notification in database
    const notificationData = {
      type: 'user_approval_requested',
      title: 'New User Signup',
      message: `New user ${newUserData.email || 'Unknown'} has signed up and is awaiting approval.`,
      user_profile_id: newUserData.id,
      metadata: {
        user_email: newUserData.email,
        signup_method: 'google_oauth',
        signup_timestamp: newUserData.created_at
      },
      action_url: '/admin?tab=user-approvals',
      action_label: 'Review User'
    };

    const { data: notification, error: notifError } = await supabase
      .from('admin_notifications')
      .insert(notificationData)
      .select()
      .single();

    if (notifError) {
      // Don't fail if notification creation fails
    }

    // Send email to all admins
    try {
      await sendAdminNotificationEmail(null, newUserData);
    } catch (emailError) {
      // Don't fail if email sending fails
    }

    return {
      success: true,
      notification
    };

  } catch (error) {
    // Don't throw - we don't want signup to fail if notification fails
    return {
      success: false,
      error: error.message
    };
  }
};

// Export all functions
export default {
  approveUser,
  rejectUser,
  getPendingUsers,
  getApprovalStats,
  notifyAdminsOfNewUser
};
