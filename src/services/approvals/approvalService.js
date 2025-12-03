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
