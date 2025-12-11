import { supabase } from '../../supabaseClient';

/**
 * Approve a pending user with role assignment
 *
 * @param {string} userId - The user profile ID to approve
 * @param {string} role - The role to assign ('admin', 'sales', 'clinician'). Defaults to 'sales'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function approvePendingUser(userId, role = 'sales') {
  try {
    // Validate role
    const validRoles = ['admin', 'sales', 'clinician'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    // Get current admin user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw authError;
    }
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Update user profile approval status and assign role
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        role: role,
        role_assigned_by: currentUser.id,
        role_assigned_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      throw updateError;
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('approval_audit_log')
      .insert({
        user_profile_id: userId,
        admin_id: currentUser.id,
        action: 'approved',
        previous_status: 'pending',
        new_status: 'approved',
        metadata: { assigned_role: role }
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the whole operation if audit log fails
    }

    // Mark related admin notifications as read
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: currentUser.id
      })
      .eq('user_profile_id', userId)
      .eq('type', 'user_approval_requested');

    if (notificationError) {
      console.error('Failed to mark notifications as read:', notificationError);
      // Don't fail the whole operation
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a pending user
 *
 * @param {string} userId - The user profile ID to reject
 * @param {string} reason - Optional reason for rejection
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectPendingUser(userId, reason = '') {
  try {
    // Get current admin user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!currentUser) throw new Error('Not authenticated');

    // Update user profile approval status
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason || null,
        approved_by: currentUser.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('approval_audit_log')
      .insert({
        user_profile_id: userId,
        admin_id: currentUser.id,
        action: 'rejected',
        previous_status: 'pending',
        new_status: 'rejected',
        reason: reason || null
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the whole operation if audit log fails
    }

    // Mark related admin notifications as read
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: currentUser.id
      })
      .eq('user_profile_id', userId)
      .eq('type', 'user_approval_requested');

    if (notificationError) {
      console.error('Failed to mark notifications as read:', notificationError);
      // Don't fail the whole operation
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all pending users
 *
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getPendingUsers() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get all rejected users
 *
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getRejectedUsers() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('approval_status', 'rejected')
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching rejected users:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Approve a previously rejected user
 *
 * @param {string} userId - The user profile ID to approve
 * @param {string} role - The role to assign ('admin', 'sales', 'clinician'). Defaults to 'sales'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function approveRejectedUser(userId, role = 'sales') {
  try {
    // Validate role
    const validRoles = ['admin', 'sales', 'clinician'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    // Get current admin user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!currentUser) throw new Error('Not authenticated');

    // Update user profile approval status and assign role
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        role: role,
        role_assigned_by: currentUser.id,
        role_assigned_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('approval_audit_log')
      .insert({
        user_profile_id: userId,
        admin_id: currentUser.id,
        action: 'approved',
        previous_status: 'rejected',
        new_status: 'approved',
        metadata: { assigned_role: role }
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving rejected user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all approved users
 *
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getApprovedUsers() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('approval_status', 'approved')
      .order('approved_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching approved users:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get approval audit log
 *
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getApprovalAuditLog(limit = 50) {
  try {
    // First get the audit log entries
    const { data: auditData, error: auditError } = await supabase
      .from('approval_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auditError) {
      throw auditError;
    }

    if (!auditData || auditData.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique user IDs to fetch emails
    const userIds = [...new Set(auditData.map(a => a.user_profile_id).filter(Boolean))];
    const adminIds = [...new Set(auditData.map(a => a.admin_id).filter(Boolean))];
    const allIds = [...new Set([...userIds, ...adminIds])];

    // Fetch user emails
    let emailMap = {};
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', allIds);

      if (profiles) {
        emailMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.email;
          return acc;
        }, {});
      }
    }

    // Enrich audit data with emails
    const enrichedData = auditData.map(entry => ({
      ...entry,
      user_profile: entry.user_profile_id ? { email: emailMap[entry.user_profile_id] || 'Unknown' } : null,
      admin: entry.admin_id ? { email: emailMap[entry.admin_id] || 'System' } : null
    }));

    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('Error fetching approval audit log:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Update a user's role
 *
 * @param {string} userId - The user profile ID
 * @param {string} newRole - The new role to assign
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserRole(userId, newRole) {
  try {
    const validRoles = ['admin', 'sales', 'clinician'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
    }

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!currentUser) throw new Error('Not authenticated');

    // Get current user data for audit log
    const { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const previousRole = userData?.role;

    // Update user role
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role: newRole,
        role_assigned_by: currentUser.id,
        role_assigned_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Create audit log entry
    await supabase
      .from('approval_audit_log')
      .insert({
        user_profile_id: userId,
        admin_id: currentUser.id,
        action: 'role_changed',
        previous_status: 'approved',
        new_status: 'approved',
        metadata: { previous_role: previousRole, new_role: newRole }
      });

    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke a user's access (set them to rejected)
 *
 * @param {string} userId - The user profile ID
 * @param {string} reason - Reason for revocation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeUserAccess(userId, reason = '') {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!currentUser) throw new Error('Not authenticated');

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason || 'Access revoked',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Create audit log entry
    await supabase
      .from('approval_audit_log')
      .insert({
        user_profile_id: userId,
        admin_id: currentUser.id,
        action: 'revoked',
        previous_status: 'approved',
        new_status: 'rejected',
        reason: reason || 'Access revoked'
      });

    return { success: true };
  } catch (error) {
    console.error('Error revoking user access:', error);
    return { success: false, error: error.message };
  }
}
