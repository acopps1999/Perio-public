import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = () => {
      const savedAuth = localStorage.getItem('admin_authenticated');
      const savedUser = localStorage.getItem('admin_user');
      
      if (savedAuth === 'true' && savedUser) {
        setIsAuthenticated(true);
        setAdminUser(JSON.parse(savedUser));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Auto-logout security features
  useEffect(() => {
    if (!isAuthenticated) return;

    let visibilityTimeout;

    // Function to perform logout
    const performLogout = () => {
      console.log('SECURITY: Auto-logout triggered - user left the application');
      setIsAuthenticated(false);
      setAdminUser(null);
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
    };

    // 1. Logout when page visibility changes (user switches tabs/apps)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('SECURITY: Page hidden - starting logout timer');
        // Give user 60 seconds grace period when they switch tabs
        visibilityTimeout = setTimeout(() => {
          performLogout();
        }, 60000);
      } else {
        console.log('SECURITY: Page visible - clearing logout timer');
        // Cancel logout if they come back quickly
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
      }
    };

    // 2. Logout when window loses focus (user clicks outside browser)
    const handleWindowBlur = () => {
      console.log('SECURITY: Window lost focus - immediate logout');
      performLogout();
    };

    // 3. Logout when user navigates away or closes tab
    const handleBeforeUnload = (e) => {
      console.log('SECURITY: User attempting to leave page - clearing session');
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
      // Don't prevent the user from leaving, just clean up
    };

    // 4. Logout when user navigates away (pagehide is more reliable than beforeunload)
    const handlePageHide = () => {
      console.log('SECURITY: Page being hidden/unloaded - clearing session');
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup function
    return () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isAuthenticated]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password });
      console.log('Supabase client:', supabase);
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('admins')
        .select('email')
        .limit(1);
      
      console.log('Test connection to admins table:', { testData, testError });
      
      // Query the admins table to verify credentials
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .eq('Password', password) // Note: In production, passwords should be hashed
        .single();

      console.log('Supabase response:', { data, error });

      if (error || !data) {
        console.error('Login failed:', error);
        throw new Error('Invalid credentials');
      }

      // Set authentication state
      setIsAuthenticated(true);
      setAdminUser(data);
      
      // Save to localStorage for persistence
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('admin_user', JSON.stringify(data));

      console.log('SECURITY: Admin logged in - auto-logout listeners activated');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log('SECURITY: Manual logout triggered');
    setIsAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_user');
  };

  const value = {
    isAuthenticated,
    adminUser,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 