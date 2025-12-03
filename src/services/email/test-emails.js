/**
 * Email Testing Utility
 *
 * Run this in the browser console to test email delivery.
 * This helps verify that EmailJS is configured correctly and emails are being sent.
 *
 * USAGE:
 * 1. Open your app in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste the test functions below
 * 4. Call the test functions:
 *    - testAdminNotification()
 *    - testUserApproval()
 *    - testUserRejection()
 *    - testAllEmails()
 */

import {
  sendAdminNotificationEmail,
  sendUserApprovalEmail,
  sendUserRejectionEmail,
  getAdminEmails
} from './approvalEmailService';

/**
 * Test admin notification email
 */
export const testAdminNotification = async () => {
  try {
    const result = await sendAdminNotificationEmail(
      null, // Will fetch from database
      {
        id: 'test-user-id',
        email: 'testuser@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    );

    return result;
  } catch (error) {
    console.error('Admin notification test failed:', error);
    throw error;
  }
};

/**
 * Test user approval email
 */
export const testUserApproval = async () => {
  try {
    // Replace with your test email
    const testEmail = 'your-test-email@example.com';
    const result = await sendUserApprovalEmail(testEmail, 'Test User');

    return result;
  } catch (error) {
    console.error('User approval test failed:', error);
    throw error;
  }
};

/**
 * Test user rejection email
 */
export const testUserRejection = async () => {
  try {
    // Replace with your test email
    const testEmail = 'your-test-email@example.com';
    const result = await sendUserRejectionEmail(
      testEmail,
      'Test User',
      'This is a test rejection reason'
    );

    return result;
  } catch (error) {
    console.error('User rejection test failed:', error);
    throw error;
  }
};

/**
 * Test fetching admin emails
 */
export const testGetAdminEmails = async () => {
  try {
    const emails = await getAdminEmails();
    return emails;
  } catch (error) {
    console.error('Get admin emails failed:', error);
    throw error;
  }
};

/**
 * Test all email types
 */
export const testAllEmails = async () => {
  const results = {
    adminEmails: null,
    adminNotification: null,
    userApproval: null,
    userRejection: null
  };

  try {
    // Test fetching admin emails
    results.adminEmails = await testGetAdminEmails();

    // Test admin notification
    results.adminNotification = await testAdminNotification();

    // Test user approval
    results.userApproval = await testUserApproval();

    // Test user rejection
    results.userRejection = await testUserRejection();

    return results;
  } catch (error) {
    console.error('Email test suite failed:', error);
    throw error;
  }
};

/**
 * Quick test with custom email address
 */
export const quickTest = async (yourEmail) => {
  if (!yourEmail) {
    console.error('Please provide your email address: quickTest("your@email.com")');
    return;
  }

  try {
    // Test admin notification (send to your email)
    await sendAdminNotificationEmail(
      [yourEmail],
      {
        id: 'test-id',
        email: 'testuser@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    );

    // Test user approval
    await sendUserApprovalEmail(yourEmail, 'Test User');

    // Test user rejection
    await sendUserRejectionEmail(yourEmail, 'Test User', 'This is a test');
  } catch (error) {
    console.error('Quick test failed:', error);
  }
};

/**
 * Browser console instructions
 */
export const showInstructions = () => {
  // Instructions removed - use JSDoc documentation instead
};

// Show instructions when imported
if (typeof window !== 'undefined') {
  showInstructions();
}

// Export for use in console
if (typeof window !== 'undefined') {
  window.emailTests = {
    testAdminNotification,
    testUserApproval,
    testUserRejection,
    testGetAdminEmails,
    testAllEmails,
    quickTest,
    showInstructions
  };
}

export default {
  testAdminNotification,
  testUserApproval,
  testUserRejection,
  testGetAdminEmails,
  testAllEmails,
  quickTest,
  showInstructions
};
