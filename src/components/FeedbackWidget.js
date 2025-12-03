import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { feedbackConfig, isEmailConfigured } from '../config/feedbackConfig';
import { useDraggable } from '../hooks/useDraggable';
import { isFeedbackWidgetEnabled } from '../services/featureFlagsService';

function FeedbackWidget() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('bug');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [widgetEnabled, setWidgetEnabled] = useState(true); // Default to true

  // Draggable functionality
  const { position, isDragging, handleMouseDown, resetPosition } = useDraggable({
    x: null, // null = use CSS positioning (bottom-6 right-6)
    y: null,
  });

  // Check if feedback widget feature is enabled
  useEffect(() => {
    const checkFeatureFlag = async () => {
      const enabled = await isFeedbackWidgetEnabled();
      setWidgetEnabled(enabled);
    };
    checkFeatureFlag();
  }, []);

  // Hide widget if feature is disabled
  if (!widgetEnabled) {
    return null;
  }

  // Only show the widget if user is authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

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
    resetPosition(); // Reset to original position
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      
      const context = captureContext();
      
      const feedbackData = {
        type: feedbackType,
        location: location,
        description: description,
        context: context
      };


      // 1. Save to Supabase
      const { data, error } = await supabase
        .from('feedback')
        .insert([feedbackData])
        .select();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      const feedbackId = data[0]?.id;

      // 2. Send email notification
      await sendEmailNotification(feedbackData, feedbackId);

      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(`Error submitting feedback: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendEmailNotification = async (feedbackData, feedbackId) => {
    try {
      // Check if email is configured
      if (!isEmailConfigured()) {
        return;
      }

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


      // Load EmailJS dynamically with latest version
      if (typeof window !== 'undefined' && !window.emailjs) {
        await loadEmailJS();
      }

      // Send email using EmailJS (supports both v3 and v4)
      if (window.emailjs && window.emailjs.send) {
        
        let response;
        try {
          // Try v4 syntax first (no public key parameter)
          response = await window.emailjs.send(
            feedbackConfig.emailjs.serviceId,
            feedbackConfig.emailjs.templateId,
            emailData
          );
        } catch (v4Error) {
          try {
            // Fallback to v3 syntax (with public key parameter)
            await window.emailjs.send(
              feedbackConfig.emailjs.serviceId,
              feedbackConfig.emailjs.templateId,
              emailData,
              feedbackConfig.emailjs.publicKey
            );
          } catch (v3Error) {
            throw new Error(`Both v4 and v3 syntax failed. v4: ${v4Error.message}, v3: ${v3Error.message}`);
          }
        }
        
      } else {
        console.error('EmailJS not available or send method not found');
      }

    } catch (error) {
      console.error('Error sending email notification:', error);

      // Check for specific EmailJS errors
      if (error.status === 418) {
        console.error('HTTP 418 Error - Rate limiting or invalid EmailJS credentials');
      }

      // Don't throw error - feedback was already saved to database
    }
  };

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
          console.error('Error initializing existing EmailJS:', error);
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
          console.error('All CDN attempts failed');
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
              console.error('Error initializing EmailJS:', initError);
              // Try the old initialization method as fallback
              try {
                window.emailjs.init(feedbackConfig.emailjs.publicKey);
                resolve();
              } catch (fallbackError) {
                console.error('Fallback initialization failed:', fallbackError);
                reject(fallbackError);
              }
            }
          } else {
            console.error('EmailJS not available after script load');
            currentUrlIndex++;
            tryLoadScript();
          }
        };

        script.onerror = (error) => {
          console.error(`Failed to load from: ${currentUrl}`, error);
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
          className={`fixed bottom-6 right-6 rounded-full p-4 ${isDarkMode ? 'shadow-lg' : 'shadow-light-lg'} z-50 transition-all duration-250 hover:scale-105 ${
            isDarkMode
              ? 'bg-prism-light-bg-primary hover:bg-prism-light-bg-secondary text-prism-primary border border-prism-light-border-subtle'
              : 'bg-prism-primary-light hover:bg-prism-primary-light-hover text-white border border-prism-primary-light'
          }`}
          title="Send Feedback"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div
          data-draggable-container
          className={`fixed w-96 rounded-lg ${isDarkMode ? 'shadow-2xl' : 'shadow-light-xl'} z-50 ${
            isDarkMode
              ? 'bg-prism-dark-bg-primary border border-prism-dark-border-subtle'
              : 'bg-prism-light-bg-primary border border-prism-light-border-subtle'
          }`}
          style={{
            right: position.x === null ? '1.5rem' : undefined,
            left: position.x !== null ? `${position.x}px` : undefined,
            top: position.y !== null ? `${position.y}px` : undefined,
            bottom: position.y === null ? '1.5rem' : undefined,
            transition: isDragging ? 'none' : 'all 0.3s ease',
          }}
        >
          {/* Header - Draggable */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex justify-between items-center p-4 ${isDarkMode ? 'bg-prism-primary' : 'bg-prism-primary-light'} text-white rounded-t-lg ${
              isDarkMode ? 'border-b border-prism-dark-border-subtle' : 'border-b border-prism-light-border-subtle'
            } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <h3 className="font-semibold flex items-center select-none">
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
                <div className="text-prism-success mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className={`font-medium ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>Thank you for your feedback!</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>We'll review it and get back to you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Feedback Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
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
                          className={`p-2 rounded-md border text-xs font-medium transition-all duration-250 ${
                            feedbackType === type.value
                              ? isDarkMode
                                ? 'border-prism-primary bg-prism-primary/20 text-prism-primary'
                                : 'border-prism-primary-light bg-prism-primary-light/10 text-prism-primary-light'
                              : isDarkMode
                                ? 'border-prism-dark-border-elevated text-prism-dark-text-primary hover:border-prism-dark-border-elevated hover:bg-prism-dark-bg-hover'
                                : 'border-prism-light-border-elevated text-prism-light-text-primary hover:border-prism-light-border-elevated hover:bg-prism-light-bg-hover'
                          }`}
                        >
                          <IconComponent size={16} className={`mx-auto mb-1 ${
                            feedbackType === type.value
                              ? isDarkMode ? 'text-prism-primary' : 'text-prism-primary-light'
                              : isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'
                          }`} />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                    Where did this happen? <span className="text-prism-error">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-prism-primary focus:border-prism-primary' : 'focus:ring-prism-primary-light focus:border-prism-primary-light'} text-sm transition-all duration-250 ${
                      isDarkMode
                        ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated text-prism-dark-text-primary placeholder-prism-dark-text-tertiary'
                        : 'bg-prism-light-bg-primary border-prism-light-border-elevated text-prism-light-text-primary placeholder-prism-light-text-tertiary'
                    }`}
                    placeholder="e.g., Admin Panel - Products tab, Main App - Gingivitis condition"
                    required
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-prism-dark-text-tertiary' : 'text-prism-light-text-tertiary'}`}>
                    We've pre-filled this based on your current location
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                    {feedbackType === 'bug' ? 'Describe the bug or error' :
                     feedbackType === 'feature' ? 'Describe the feature request' :
                     'What do you need help with?'} <span className="text-prism-error">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-prism-primary focus:border-prism-primary' : 'focus:ring-prism-primary-light focus:border-prism-primary-light'} text-sm resize-none transition-all duration-250 ${
                      isDarkMode
                        ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated text-prism-dark-text-primary placeholder-prism-dark-text-tertiary'
                        : 'bg-prism-light-bg-primary border-prism-light-border-elevated text-prism-light-text-primary placeholder-prism-light-text-tertiary'
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
                  className={`w-full py-2 px-4 rounded-md text-white font-medium text-sm transition-all duration-250 flex items-center justify-center ${
                    isSubmitting || !location.trim() || !description.trim()
                      ? isDarkMode ? 'bg-prism-dark-text-disabled cursor-not-allowed' : 'bg-prism-light-text-disabled cursor-not-allowed'
                      : isDarkMode ? 'bg-prism-primary hover:bg-prism-primary-hover' : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'
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