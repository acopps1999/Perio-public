/**
 * Signup Email Trigger
 *
 * This module provides a way to trigger admin notification emails when new users sign up.
 * It's designed to be called from the OAuth callback flow or AuthContext.
 *
 * NOTE: Database notifications are now handled by the `handle_new_user` trigger
 * on auth.users table. This module only handles email notifications (if needed).
 * The trigger approach is more reliable and doesn't create duplicates.
 */

import { sendAdminNotificationEmail } from './approvalEmailService';

/**
 * Trigger admin notifications for new user signup
 * This should be called after a new user successfully signs up via OAuth
 *
 * NOTE: Database notification is created by trigger - this only sends emails
 *
 * @param {Object} user - The authenticated user object from Supabase
 * @param {Object} profile - The user profile object from user_profiles table
 * @returns {Promise<void>}
 */
export const triggerNewUserNotifications = async (user, profile) => {
  try {
    // Only trigger for new pending users
    if (!profile || profile.approval_status !== 'pending') {
      return;
    }

    // Database notification is handled by trigger on auth.users
    // This function now only sends email notifications (optional)

    // Uncomment below if you want email notifications in addition to database notifications
    // const newUserData = {
    //   id: profile.id,
    //   email: profile.email || user.email,
    //   name: profile.full_name || user.user_metadata?.full_name || null,
    //   created_at: profile.created_at || new Date().toISOString()
    // };
    // await sendAdminNotificationEmail(null, newUserData);

  } catch (error) {
    console.error('[SignupEmailTrigger] Error:', error);
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
