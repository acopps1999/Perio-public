/**
 * Approval Email Service
 *
 * Handles sending emails for the OAuth admin approval workflow:
 * - Admin notifications when new users sign up
 * - User approval notifications
 * - User rejection notifications
 *
 * Uses EmailJS (already configured in feedbackConfig.js)
 */

import { feedbackConfig, isEmailConfigured } from '../../config/feedbackConfig';
import supabase from '../database/client';

/**
 * Load EmailJS library dynamically
 * @returns {Promise<void>}
 */
const loadEmailJS = () => {
  return new Promise((resolve, reject) => {
    // Check if EmailJS is already loaded
    if (window.emailjs) {
      try {
        window.emailjs.init({
          publicKey: feedbackConfig.emailjs.publicKey,
        });
        resolve();
        return;
      } catch (error) {
        // Continue to load from CDN if initialization fails
      }
    }

    // Try multiple CDN URLs for EmailJS v4
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
      'https://unpkg.com/@emailjs/browser@4/dist/email.min.js',
      'https://cdn.emailjs.com/dist/email.min.js' // Fallback to older stable version
    ];

    let currentUrlIndex = 0;

    const tryLoadScript = () => {
      if (currentUrlIndex >= cdnUrls.length) {
        const error = new Error('All EmailJS CDN URLs failed to load');
        reject(error);
        return;
      }

      const script = document.createElement('script');
      const currentUrl = cdnUrls[currentUrlIndex];
      script.src = currentUrl;

      script.onload = () => {
        // Check if emailjs is now available
        if (window.emailjs) {
          try {
            // Initialize EmailJS with the public key
            window.emailjs.init({
              publicKey: feedbackConfig.emailjs.publicKey,
            });
            resolve();
          } catch (initError) {
            // Try the old initialization method as fallback
            try {
              window.emailjs.init(feedbackConfig.emailjs.publicKey);
              resolve();
            } catch (fallbackError) {
              reject(fallbackError);
            }
          }
        } else {
          currentUrlIndex++;
          tryLoadScript();
        }
      };

      script.onerror = (error) => {
        currentUrlIndex++;
        tryLoadScript();
      };

      // Remove any existing EmailJS scripts first
      const existingScripts = document.querySelectorAll('script[src*="emailjs"], script[src*="email.min.js"]');
      existingScripts.forEach(s => s.remove());

      document.head.appendChild(script);
    };

    tryLoadScript();
  });
};

/**
 * Send email using EmailJS
 * @param {Object} templateParams - Email template parameters
 * @param {string} templateId - Optional custom template ID (defaults to configured template)
 * @returns {Promise<Object>} EmailJS response
 */
const sendEmail = async (templateParams, templateId = null) => {
  // Check if email is configured
  if (!isEmailConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  try {
    // Load EmailJS dynamically
    if (typeof window !== 'undefined' && !window.emailjs) {
      await loadEmailJS();
    }

    // Send email using EmailJS (supports both v3 and v4)
    if (window.emailjs && window.emailjs.send) {
      let response;
      const emailTemplateId = templateId || feedbackConfig.emailjs.templateId;

      try {
        // Try v4 syntax first (no public key parameter)
        response = await window.emailjs.send(
          feedbackConfig.emailjs.serviceId,
          emailTemplateId,
          templateParams
        );
      } catch (v4Error) {
        try {
          // Fallback to v3 syntax (with public key parameter)
          response = await window.emailjs.send(
            feedbackConfig.emailjs.serviceId,
            emailTemplateId,
            templateParams,
            feedbackConfig.emailjs.publicKey
          );
        } catch (v3Error) {
          throw new Error(`Both v4 and v3 syntax failed. v4: ${v4Error.message}, v3: ${v3Error.message}`);
        }
      }

      return response;
    } else {
      throw new Error('EmailJS not available or send method not found');
    }

  } catch (error) {
    throw error;
  }
};

/**
 * Fetch all admin emails from the database
 * @returns {Promise<string[]>} Array of admin email addresses
 */
const getAdminEmails = async () => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch admin emails: ${error.message}`);
    }

    return data.map(admin => admin.email).filter(email => email && email.trim());
  } catch (error) {
    // Fallback to notification email from config
    return [feedbackConfig.notificationEmail];
  }
};

/**
 * Email template for admin notification
 * @param {Object} newUserData - New user data { email, name, id, created_at }
 * @returns {Object} Email template parameters
 */
const getAdminNotificationTemplate = (newUserData) => {
  const appUrl = window.location.origin;
  const adminPanelUrl = `${appUrl}/admin?tab=user-approvals`;

  return {
    to_name: 'Admin',
    subject: 'New User Signup Requires Approval - PRISM',
    user_email: newUserData.email || 'Unknown',
    user_name: newUserData.name || 'Not provided',
    signup_date: new Date(newUserData.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    signup_method: 'Google OAuth',
    admin_panel_url: adminPanelUrl,
    message: `A new user has signed up for PRISM and requires approval:\n\n` +
             `Email: ${newUserData.email || 'Unknown'}\n` +
             `Name: ${newUserData.name || 'Not provided'}\n` +
             `Signup Date: ${new Date(newUserData.created_at).toLocaleString()}\n` +
             `Method: Google OAuth\n\n` +
             `Please review and approve/reject this user in the admin panel:\n` +
             `${adminPanelUrl}`,
    app_name: 'PRISM'
  };
};

/**
 * Email template for user approval
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @returns {Object} Email template parameters
 */
const getUserApprovalTemplate = (userEmail, userName) => {
  const appUrl = window.location.origin;

  return {
    to_email: userEmail,
    to_name: userName || 'User',
    subject: 'Your PRISM Account Has Been Approved',
    user_name: userName || 'there',
    signin_url: appUrl,
    message: `Hi ${userName || 'there'},\n\n` +
             `Great news! Your PRISM account has been approved.\n\n` +
             `You can now sign in and start using PRISM:\n` +
             `${appUrl}\n\n` +
             `Welcome to PRISM!`,
    app_name: 'PRISM'
  };
};

/**
 * Email template for user rejection
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} reason - Optional rejection reason
 * @returns {Object} Email template parameters
 */
const getUserRejectionTemplate = (userEmail, userName, reason = null) => {
  const supportEmail = feedbackConfig.notificationEmail;

  return {
    to_email: userEmail,
    to_name: userName || 'User',
    subject: 'PRISM Account Request Update',
    user_name: userName || 'there',
    rejection_reason: reason || 'Not provided',
    support_email: supportEmail,
    message: `Hi ${userName || 'there'},\n\n` +
             `We're unable to approve your PRISM account request at this time.\n\n` +
             (reason ? `Reason: ${reason}\n\n` : '') +
             `If you believe this is an error, please contact support at ${supportEmail}.\n\n` +
             `Thank you,\n` +
             `PRISM Team`,
    app_name: 'PRISM'
  };
};

/**
 * Send admin notification email when a new user signs up
 * @param {string[]} adminEmails - Array of admin email addresses (optional, will fetch if not provided)
 * @param {Object} newUserData - New user data { email, name, id, created_at }
 * @returns {Promise<Object>} Email send result
 */
export const sendAdminNotificationEmail = async (adminEmails = null, newUserData) => {
  try {
    // Fetch admin emails if not provided
    const emails = adminEmails || await getAdminEmails();

    if (!emails || emails.length === 0) {
      return { status: 'skipped', reason: 'no_admin_emails' };
    }

    // Get email template
    const templateParams = getAdminNotificationTemplate(newUserData);

    // Send email to each admin (EmailJS limitation - one recipient per email)
    const emailPromises = emails.map(email => {
      return sendEmail({
        ...templateParams,
        to_email: email
      });
    });

    const results = await Promise.allSettled(emailPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      status: 'sent',
      successful,
      failed,
      total: emails.length,
      results
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Send approval email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Email send result
 */
export const sendUserApprovalEmail = async (userEmail, userName) => {
  try {
    if (!userEmail) {
      throw new Error('User email is required');
    }

    const templateParams = getUserApprovalTemplate(userEmail, userName);
    const result = await sendEmail(templateParams);

    return {
      status: 'sent',
      result
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Send rejection email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<Object>} Email send result
 */
export const sendUserRejectionEmail = async (userEmail, userName, reason = null) => {
  try {
    if (!userEmail) {
      throw new Error('User email is required');
    }

    const templateParams = getUserRejectionTemplate(userEmail, userName, reason);
    const result = await sendEmail(templateParams);

    return {
      status: 'sent',
      result
    };

  } catch (error) {
    throw error;
  }
};

// Export all functions
export default {
  sendAdminNotificationEmail,
  sendUserApprovalEmail,
  sendUserRejectionEmail,
  getAdminEmails
};
