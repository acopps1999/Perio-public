// Feedback Configuration
// Set up your EmailJS account at https://www.emailjs.com/ and replace these values

export const feedbackConfig = {
  // EmailJS Configuration
  // 1. Create account at https://www.emailjs.com/
  // 2. Create an email service (Gmail, Outlook, etc.)
  // 3. Create an email template
  // 4. Get your credentials from EmailJS dashboard
  emailjs: {
    serviceId: 'service_y157tum',     // From EmailJS dashboard
    templateId: 'template_r35cwoc',   // From EmailJS dashboard  
    publicKey: 'vHIgktS6atSZWw5Sn'      // From EmailJS dashboard
  },
  
  // Your email address where feedback notifications will be sent
  notificationEmail: 'coppsaustin@gmail.com',
  
  // Email template variables (these will be passed to your EmailJS template)
  // You can customize the template in EmailJS dashboard to use these variables:
  // {{feedback_id}}, {{feedback_type}}, {{location}}, {{description}}, etc.
  emailTemplate: {
    subject: 'New Feedback Received - {{feedback_type}}',
    // The template should include variables like:
    // - {{feedback_id}}
    // - {{feedback_type}} 
    // - {{location}}
    // - {{description}}
    // - {{submitted_at}}
    // - {{url}}
    // - {{user_agent}}
    // - {{screen_size}}
    // - {{to_email}}
  }
};

// Helper function to check if EmailJS is configured
export const isEmailConfigured = () => {
  return feedbackConfig.emailjs.serviceId !== 'YOUR_EMAILJS_SERVICE_ID' &&
         feedbackConfig.emailjs.templateId !== 'YOUR_EMAILJS_TEMPLATE_ID' &&
         feedbackConfig.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' &&
         feedbackConfig.notificationEmail !== 'YOUR_EMAIL@example.com';
}; 