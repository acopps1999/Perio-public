import React, { useState } from 'react';
import { MessageSquare, X, Send, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { feedbackConfig, isEmailConfigured } from '../config/feedbackConfig';

function FeedbackWidget() {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('bug');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-capture context when widget opens
  const captureContext = () => {
    // Check if we're in admin panel by looking for the admin modal
    const adminModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    const isInAdmin = adminModal && document.querySelector('h2.text-xl.font-bold')?.textContent === 'Knowledge Base Administrator';
    
    let selectedCondition = 'Not selected';
    let activeAdminTab = 'Unknown';
    
    if (isInAdmin) {
      // Admin panel - get the active tab
      const adminTabs = adminModal.querySelectorAll('[role="tab"]');
      let adminActiveTab = null;
      
      adminTabs.forEach(tab => {
        // Check if tab has the active styling (blue background)
        if (tab.style.backgroundColor || tab.classList.toString().includes('15396c') || 
            tab.getAttribute('data-state') === 'active') {
          adminActiveTab = tab;
        }
      });
      
      activeAdminTab = adminActiveTab?.textContent?.trim() || 'Unknown';
    } else {
      // Main app - get selected condition
      const selectedConditionElement = document.querySelector('h2.text-xl.font-semibold');
      selectedCondition = selectedConditionElement?.textContent || 'Not selected';
    }
    
    const context = {
      url: window.location.href,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      isInAdmin,
      selectedCondition,
      activeAdminTab
    };
    
    // Auto-fill location with current page context
    let autoLocation = '';
    
    if (isInAdmin) {
      if (activeAdminTab && activeAdminTab !== 'Unknown') {
        // Clean up tab names to be more user-friendly
        const cleanTabName = activeAdminTab
          .replace('Conditions & Surgical Procedures', 'Conditions')
          .replace('Import/Export', 'Import/Export')
          .replace('Products', 'Products')
          .replace('Categories', 'Categories');
        autoLocation = `Admin Panel - ${cleanTabName}`;
      } else {
        autoLocation = 'Admin Panel';
      }
    } else {
      // We're in the main application
      if (selectedCondition && selectedCondition !== 'Not selected') {
        autoLocation = `Main App - ${selectedCondition}`;
      } else {
        autoLocation = 'Main App';
      }
    }
    
    setLocation(autoLocation);
    return context;
  };

  const handleOpen = () => {
    setIsOpen(true);
    captureContext();
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSubmitted(false);
    setLocation('');
    setDescription('');
    setFeedbackType('bug');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('🚀 FEEDBACK: Starting feedback submission process...');
      
      const context = captureContext();
      
      const feedbackData = {
        type: feedbackType,
        location: location,
        description: description,
        context: context
      };

      console.log('🚀 FEEDBACK: Prepared feedback data:', feedbackData);

      // 1. Save to Supabase
      console.log('💾 SUPABASE: Saving feedback to database...');
      const { data, error } = await supabase
        .from('feedback')
        .insert([feedbackData])
        .select();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log('💾 SUPABASE: ✅ Feedback saved successfully!', data);
      const feedbackId = data[0]?.id;
      console.log('💾 SUPABASE: ✅ Feedback ID:', feedbackId);

      // 2. Send email notification
      console.log('📧 EMAIL: Attempting to send email notification...');
      await sendEmailNotification(feedbackData, feedbackId);

      console.log('🎉 FEEDBACK: ✅ Feedback submission completed successfully!');
      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('❌ FEEDBACK: Error submitting feedback:', error);
      console.error('❌ FEEDBACK: Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      alert(`Error submitting feedback: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendEmailNotification = async (feedbackData, feedbackId) => {
    try {
      // Check if email is configured
      if (!isEmailConfigured()) {
        console.log('📧 EmailJS not configured - skipping email notification');
        console.log('📧 Configure email settings in src/config/feedbackConfig.js');
        console.log('💾 Feedback data saved to database:', { feedbackId, ...feedbackData });
        return;
      }

      console.log('📧 EMAIL: Starting email notification process...');
      console.log('📧 EMAIL: EmailJS Config Check:', {
        serviceId: feedbackConfig.emailjs.serviceId,
        templateId: feedbackConfig.emailjs.templateId,
        publicKeyLength: feedbackConfig.emailjs.publicKey?.length,
        notificationEmail: feedbackConfig.notificationEmail
      });

      // Prepare email data
      const emailData = {
        feedback_id: feedbackId,
        feedback_type: feedbackData.type,
        location: feedbackData.location,
        description: feedbackData.description,
        submitted_at: new Date().toLocaleString(),
        url: feedbackData.context.url,
        user_agent: feedbackData.context.userAgent,
        screen_size: feedbackData.context.screenSize,
        to_email: feedbackConfig.notificationEmail
      };

      console.log('📧 EMAIL: Prepared email data:', emailData);

      // Load EmailJS dynamically with latest version
      if (typeof window !== 'undefined' && !window.emailjs) {
        console.log('📧 EMAIL: Loading EmailJS SDK...');
        await loadEmailJS();
      }

      // Send email using EmailJS (supports both v3 and v4)
      if (window.emailjs && window.emailjs.send) {
        console.log('📧 EMAIL: Sending email via EmailJS...');
        
        let response;
        try {
          // Try v4 syntax first (no public key parameter)
          response = await window.emailjs.send(
            feedbackConfig.emailjs.serviceId,
            feedbackConfig.emailjs.templateId,
            emailData
          );
          console.log('📧 EMAIL: ✅ Email sent with v4 syntax!', response);
        } catch (v4Error) {
          console.log('📧 EMAIL: v4 syntax failed, trying v3 syntax...', v4Error);
          try {
            // Fallback to v3 syntax (with public key parameter)
            response = await window.emailjs.send(
              feedbackConfig.emailjs.serviceId,
              feedbackConfig.emailjs.templateId,
              emailData,
              feedbackConfig.emailjs.publicKey
            );
            console.log('📧 EMAIL: ✅ Email sent with v3 syntax!', response);
          } catch (v3Error) {
            throw new Error(`Both v4 and v3 syntax failed. v4: ${v4Error.message}, v3: ${v3Error.message}`);
          }
        }
        
        console.log('📧 EMAIL: ✅ Notification sent to:', feedbackConfig.notificationEmail);
      } else {
        console.error('📧 EMAIL: ❌ EmailJS not available or send method not found');
        console.error('📧 EMAIL: ❌ window.emailjs:', window.emailjs);
      }

    } catch (error) {
      console.error('📧 EMAIL: ❌ Error sending email notification:', error);
      console.error('📧 EMAIL: ❌ Error details:', {
        message: error.message,
        status: error.status,
        text: error.text,
        response: error
      });
      
      // Check for specific EmailJS errors
      if (error.status === 418) {
        console.error('📧 EMAIL: ❌ HTTP 418 Error - This usually means:');
        console.error('📧 EMAIL: ❌ 1. Rate limiting (too many requests)');
        console.error('📧 EMAIL: ❌ 2. Invalid EmailJS credentials');
        console.error('📧 EMAIL: ❌ 3. EmailJS service configuration issue');
        console.error('📧 EMAIL: ❌ Check your EmailJS dashboard and credentials');
      }
      
      // Don't throw error - feedback was already saved to database
      console.log('💾 FEEDBACK: ✅ Feedback still saved to database successfully');
    }
  };

  const loadEmailJS = () => {
    return new Promise((resolve, reject) => {
      // Check if EmailJS is already loaded
      if (window.emailjs) {
        console.log('📧 EMAIL: EmailJS already loaded, initializing...');
        try {
          window.emailjs.init({
            publicKey: feedbackConfig.emailjs.publicKey,
          });
          console.log('📧 EMAIL: EmailJS initialized with existing SDK');
          resolve();
          return;
        } catch (error) {
          console.error('📧 EMAIL: ❌ Error initializing existing EmailJS:', error);
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
          console.error('📧 EMAIL: ❌ All CDN attempts failed');
          reject(error);
          return;
        }

        const script = document.createElement('script');
        const currentUrl = cdnUrls[currentUrlIndex];
        script.src = currentUrl;
        
        console.log(`📧 EMAIL: Attempting to load EmailJS from: ${currentUrl}`);

        script.onload = () => {
          console.log(`📧 EMAIL: ✅ EmailJS loaded successfully from: ${currentUrl}`);
          
          // Check if emailjs is now available
          if (window.emailjs) {
            try {
              // Initialize EmailJS with the public key
              window.emailjs.init({
                publicKey: feedbackConfig.emailjs.publicKey,
              });
              console.log('📧 EMAIL: ✅ EmailJS initialized successfully');
              resolve();
            } catch (initError) {
              console.error('📧 EMAIL: ❌ Error initializing EmailJS:', initError);
              // Try the old initialization method as fallback
              try {
                window.emailjs.init(feedbackConfig.emailjs.publicKey);
                console.log('📧 EMAIL: ✅ EmailJS initialized with fallback method');
                resolve();
              } catch (fallbackError) {
                console.error('📧 EMAIL: ❌ Fallback initialization failed:', fallbackError);
                reject(fallbackError);
              }
            }
          } else {
            console.error('📧 EMAIL: ❌ EmailJS not available after script load');
            currentUrlIndex++;
            tryLoadScript();
          }
        };

        script.onerror = (error) => {
          console.error(`📧 EMAIL: ❌ Failed to load from: ${currentUrl}`, error);
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

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-blue-600' },
    { value: 'question', label: 'Question/Help', icon: HelpCircle, color: 'text-green-600' }
  ];

  return (
    <>
      {/* Floating Feedback Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-6 right-6 rounded-full p-4 shadow-lg z-50 transition-all duration-200 hover:scale-105 ${
            isDarkMode 
              ? 'bg-white hover:bg-gray-50 text-[#15396c] border border-gray-200' 
              : 'bg-[#15396c] hover:bg-[#15396c]/90 text-white border border-[#15396c]'
          }`}
          title="Send Feedback"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 w-96 rounded-lg shadow-2xl z-50 ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`flex justify-between items-center p-4 bg-[#15396c] text-white rounded-t-lg ${
            isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
          }`}>
            <h3 className="font-semibold flex items-center">
              <MessageSquare size={20} className="mr-2" />
              Send Feedback
            </h3>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="text-green-600 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Thank you for your feedback!</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>We'll review it and get back to you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Feedback Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Type of Feedback
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {feedbackTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFeedbackType(type.value)}
                          className={`p-2 rounded-md border text-xs font-medium transition-all ${
                            feedbackType === type.value
                              ? 'border-[#15396c] bg-[#15396c]/5 text-[#15396c]'
                              : isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:border-gray-500' 
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent size={16} className={`mx-auto mb-1 ${
                            feedbackType === type.value ? 'text-[#15396c]' : 'text-gray-400'
                          }`} />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Where did this happen? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="e.g., Admin Panel - Products tab, Main App - Gingivitis condition"
                    required
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    We've pre-filled this based on your current location
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {feedbackType === 'bug' ? 'Describe the bug or error' : 
                     feedbackType === 'feature' ? 'Describe the feature request' : 
                     'What do you need help with?'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] text-sm resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder={
                      feedbackType === 'bug' ? 'What happened? What did you expect to happen? Steps to reproduce...' :
                      feedbackType === 'feature' ? 'What feature would you like to see? How would it help your workflow?' :
                      'What question do you have or what help do you need?'
                    }
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !location.trim() || !description.trim()}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium text-sm transition-all flex items-center justify-center ${
                    isSubmitting || !location.trim() || !description.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#15396c] hover:bg-[#15396c]/90'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget; 