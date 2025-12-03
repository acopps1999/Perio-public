# Email Notification System - Phase 5

This directory contains the email notification system for the OAuth admin approval workflow.

## Files

### `approvalEmailService.js`
Main email service that handles sending emails using EmailJS.

**Exports:**
- `sendAdminNotificationEmail(adminEmails, newUserData)` - Send notification to admins when new user signs up
- `sendUserApprovalEmail(userEmail, userName)` - Send approval notification to user
- `sendUserRejectionEmail(userEmail, userName, reason)` - Send rejection notification to user
- `getAdminEmails()` - Fetch all admin emails from database

**Email Templates:**

All templates are built into the service and use variables that can be customized in EmailJS dashboard:

1. **Admin Notification Template** - Sent when new user signs up
   - Variables: `to_email`, `user_email`, `user_name`, `signup_date`, `signup_method`, `admin_panel_url`, `message`, `subject`, `app_name`

2. **User Approval Template** - Sent when admin approves user
   - Variables: `to_email`, `to_name`, `user_name`, `signin_url`, `message`, `subject`, `app_name`

3. **User Rejection Template** - Sent when admin rejects user
   - Variables: `to_email`, `to_name`, `user_name`, `rejection_reason`, `support_email`, `message`, `subject`, `app_name`

### `signupEmailTrigger.js`
Helper module for triggering email notifications during OAuth signup flow.

**Exports:**
- `triggerNewUserNotifications(user, profile)` - Call this after new user signs up
- `isNewlyCreatedProfile(profile)` - Check if profile was just created

## Setup Instructions

### 1. EmailJS Configuration

The email system uses the existing EmailJS configuration from `src/config/feedbackConfig.js`.

If not already configured:

1. Create account at https://www.emailjs.com/
2. Create an email service (Gmail, Outlook, etc.)
3. Create email templates (or use the default template)
4. Update `src/config/feedbackConfig.js` with your credentials

### 2. Create Email Templates in EmailJS Dashboard

You can create separate templates for each email type, or use a single generic template.

**Option A: Single Generic Template (Recommended)**
Use the existing template from `feedbackConfig.js` and let the service populate all variables.

**Option B: Separate Templates**
Create 3 templates:
- `template_admin_notification` - For admin notifications
- `template_user_approval` - For approval emails
- `template_user_rejection` - For rejection emails

Then update `approvalEmailService.js` to use the correct template ID for each email type.

### 3. Database Setup (Required for Phase 1)

The approval service requires these tables:
- `user_profiles` - Must have `approval_status`, `approved_by`, `approved_at`, `rejection_reason` columns
- `admin_notifications` - For storing admin notifications
- `approval_audit_log` - For tracking approval/rejection actions
- `admins` - For fetching admin email addresses

See `OAUTH_ADMIN_APPROVAL_PLAN.md` Phase 1 for database migration.

### 4. Integration with Signup Flow

#### Option A: Using AuthContext (Recommended)

Modify `src/contexts/AuthContext.js`:

```javascript
import { triggerNewUserNotifications, isNewlyCreatedProfile } from '../services/email/signupEmailTrigger';

// Inside onAuthStateChange handler:
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    const profile = await fetchUserProfile(session.user);

    if (profile) {
      // Check if this is a new user signup
      if (isNewlyCreatedProfile(profile)) {
        await triggerNewUserNotifications(session.user, profile);
      }

      setIsAuthenticated(true);
      setUser({ ...session.user, ...profile });
      setUserRole(profile.role);
    }
  }
});
```

#### Option B: Using Database Trigger (Preferred for Production)

Create a PostgreSQL trigger (see `OAUTH_ADMIN_APPROVAL_PLAN.md` Phase 1):

```sql
CREATE OR REPLACE FUNCTION notify_admins_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'pending' AND TG_OP = 'INSERT' THEN
    -- Create admin notification
    INSERT INTO public.admin_notifications (...)
    VALUES (...);

    -- Call edge function to send emails
    PERFORM net.http_post(...);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_insert
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_user();
```

### 5. Integration with Admin Panel

Import the approval service in your admin panel component:

```javascript
import { approveUser, rejectUser, getPendingUsers } from '../services/approvalService';

// In your component:
const handleApprove = async (userId) => {
  try {
    const result = await approveUser(userId);
    // Success! User approved and email sent
  } catch (error) {
    // Handle error
  }
};

const handleReject = async (userId, reason) => {
  try {
    const result = await rejectUser(userId, null, reason);
    // Success! User rejected and email sent
  } catch (error) {
    // Handle error
  }
};
```

## Usage Examples

### Send Admin Notification (New User Signup)

```javascript
import { sendAdminNotificationEmail } from './services/email/approvalEmailService';

const newUserData = {
  id: 'user-uuid',
  email: 'newuser@example.com',
  name: 'John Doe',
  created_at: new Date().toISOString()
};

await sendAdminNotificationEmail(null, newUserData);
// Emails sent to all admins in the database
```

### Approve User

```javascript
import { approveUser } from './services/approvalService';

await approveUser('user-uuid', 'admin-uuid');
// User status updated, audit log created, approval email sent
```

### Reject User

```javascript
import { rejectUser } from './services/approvalService';

await rejectUser('user-uuid', 'admin-uuid', 'Not authorized for this organization');
// User status updated, audit log created, rejection email sent with reason
```

## Email Template Variables

### Admin Notification
```javascript
{
  to_email: 'admin@example.com',
  to_name: 'Admin',
  subject: 'New User Signup Requires Approval - PRISM',
  user_email: 'newuser@example.com',
  user_name: 'John Doe',
  signup_date: 'Jan 9, 2025 10:30 AM',
  signup_method: 'Google OAuth',
  admin_panel_url: 'https://yourapp.com/admin?tab=user-approvals',
  message: 'Full message text...',
  app_name: 'PRISM'
}
```

### User Approval
```javascript
{
  to_email: 'user@example.com',
  to_name: 'John Doe',
  subject: 'Your PRISM Account Has Been Approved',
  user_name: 'John Doe',
  signin_url: 'https://yourapp.com',
  message: 'Full message text...',
  app_name: 'PRISM'
}
```

### User Rejection
```javascript
{
  to_email: 'user@example.com',
  to_name: 'John Doe',
  subject: 'PRISM Account Request Update',
  user_name: 'John Doe',
  rejection_reason: 'Not authorized for this organization',
  support_email: 'support@example.com',
  message: 'Full message text...',
  app_name: 'PRISM'
}
```

## Testing

### Test Email Delivery

Create a test script:

```javascript
// test-approval-emails.js
import {
  sendAdminNotificationEmail,
  sendUserApprovalEmail,
  sendUserRejectionEmail
} from './src/services/email/approvalEmailService';

// Test admin notification
await sendAdminNotificationEmail(
  ['admin@example.com'],
  {
    id: 'test-id',
    email: 'testuser@example.com',
    name: 'Test User',
    created_at: new Date().toISOString()
  }
);

// Test user approval
await sendUserApprovalEmail('testuser@example.com', 'Test User');

// Test user rejection
await sendUserRejectionEmail('testuser@example.com', 'Test User', 'Test reason');
```

Run in browser console or create a test page.

### Test Approval Flow

1. Sign up with a new Google account
2. Check admin email for notification
3. Admin approves user
4. Check user email for approval notification
5. User can now log in

## Error Handling

All email functions include error handling:
- Failed emails are logged but don't throw errors
- Approval/rejection continues even if email fails
- EmailJS configuration is checked before sending
- Fallback to notification email if admin emails not found

## Troubleshooting

### Emails not sending

1. Check EmailJS configuration in `feedbackConfig.js`
2. Verify `isEmailConfigured()` returns `true`
3. Check browser console for errors
4. Verify EmailJS service is active in dashboard
5. Check EmailJS rate limits (free tier has limits)

### Admin emails not found

- Verify `admins` table exists and has email column
- Check that admin emails are not null/empty
- Falls back to `feedbackConfig.notificationEmail` if no admins found

### Email template errors

- Verify template variables match EmailJS template
- Check EmailJS dashboard for template errors
- Test with EmailJS template tester

## Production Considerations

1. **Rate Limiting**: EmailJS free tier has rate limits. Consider upgrading for production.
2. **Email Deliverability**: Use a proper email service (SMTP) for production instead of EmailJS.
3. **Error Monitoring**: Add error tracking (Sentry, etc.) for email failures.
4. **Database Trigger**: Use database trigger instead of application-level trigger for reliability.
5. **Queue System**: For high volume, use a queue (Bull, etc.) to send emails asynchronously.

## Migration to Production Email Service

To switch from EmailJS to a production email service (SendGrid, AWS SES, etc.):

1. Create new email service in `src/services/email/productionEmailService.js`
2. Implement same interface as `approvalEmailService.js`
3. Update imports in `approvalService.js`
4. Test thoroughly before deploying

## Status

- ✅ Email service created
- ✅ Email templates implemented
- ✅ Approval service integrated
- ✅ Documentation complete
- ⚠️ Database tables not yet created (Phase 1 pending)
- ⚠️ Not yet integrated with AuthContext (manual integration needed)
- ⚠️ Email delivery not tested (requires EmailJS configuration)

## Next Steps

1. Complete Phase 1 (Database Foundation) - Create required tables
2. Integrate `signupEmailTrigger` into `AuthContext.js`
3. Test email delivery with real EmailJS account
4. Create admin panel UI for approvals (Phase 3)
5. Add notification bell UI (Phase 4)
6. Test end-to-end approval workflow

---

**Last Updated**: 2025-01-09
**Phase**: 5 (Email Notification System)
**Status**: Implementation Complete, Pending Integration
