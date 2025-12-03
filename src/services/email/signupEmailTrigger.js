/**
 * Signup Email Trigger
 *
 * This module provides a way to trigger admin notification emails when new users sign up.
 * It's designed to be called from the OAuth callback flow or AuthContext.
 *
 * NOTE: This is a temporary solution until the database trigger (Phase 1) is implemented.
 * Once the database trigger is in place, this file can be removed.
 */

import { notifyAdminsOfNewUser } from '../approvalService';

/**
 * Trigger admin notifications for new user signup
 * This should be called after a new user successfully signs up via OAuth
 *
 * @param {Object} user - The authenticated user object from Supabase
 * @param {Object} profile - The user profile object from user_profiles table
 * @returns {Promise<void>}
 */
export const triggerNewUserNotifications = async (user, profile) => {
  try {
    // Only trigger notifications for new pending users
    if (!profile || profile.approval_status !== 'pending') {
      return;
    }

    // Prepare user data for notification
    const newUserData = {
      id: profile.id,
      email: profile.email || user.email,
      name: profile.full_name || user.user_metadata?.full_name || null,
      created_at: profile.created_at || new Date().toISOString()
    };

    // Notify admins (creates database notification + sends emails)
    await notifyAdminsOfNewUser(newUserData);

  } catch (error) {
    console.error('[SignupEmailTrigger] Error triggering notifications:', error);
    // Don't throw - we don't want signup to fail if notifications fail
  }
};

/**
 * Check if this is a brand new user (just created during OAuth)
 * This helps determine if we should trigger the new user notifications
 *
 * @param {Object} profile - User profile from database
 * @returns {boolean} True if this is a newly created profile
 */
export const isNewlyCreatedProfile = (profile) => {
  if (!profile || !profile.created_at) {
    return false;
  }

  // Consider a profile "new" if created within the last 5 seconds
  const createdAt = new Date(profile.created_at);
  const now = new Date();
  const diffInSeconds = (now - createdAt) / 1000;

  return diffInSeconds < 5;
};

/**
 * Hook this into the AuthContext's onAuthStateChange handler
 *
 * Example usage in AuthContext.js:
 *
 * ```javascript
 * import { triggerNewUserNotifications, isNewlyCreatedProfile } from '../services/email/signupEmailTrigger';
 *
 * // Inside onAuthStateChange handler:
 * supabase.auth.onAuthStateChange(async (event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     const profile = await fetchUserProfile(session.user);
 *
 *     if (profile) {
 *       // Check if this is a new user signup
 *       if (isNewlyCreatedProfile(profile)) {
 *         await triggerNewUserNotifications(session.user, profile);
 *       }
 *
 *       setIsAuthenticated(true);
 *       setUser({ ...session.user, ...profile });
 *       setUserRole(profile.role);
 *     }
 *   }
 * });
 * ```
 */

export default {
  triggerNewUserNotifications,
  isNewlyCreatedProfile
};
