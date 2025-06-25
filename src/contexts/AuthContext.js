import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [onAutoLogoutCallback, setOnAutoLogoutCallback] = useState(null);

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

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimeout;

    // Function to perform logout
    const performLogout = () => {
      console.log('SECURITY: Auto-logout triggered - 10 minutes of inactivity');
      
      // Call the callback before logout (if set) to close admin panels
      if (onAutoLogoutCallback) {
        onAutoLogoutCallback();
      }
      
      setIsAuthenticated(false);
      setAdminUser(null);
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
    };

    // Reset the inactivity timer
    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      inactivityTimeout = setTimeout(() => {
        performLogout();
      }, 600000); // 10 minutes = 600,000 ms
    };

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup function
    return () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }, [isAuthenticated, onAutoLogoutCallback]);

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

  // Function to register auto-logout callback
  const registerAutoLogoutCallback = useCallback((callback) => {
    setOnAutoLogoutCallback(() => callback);
  }, []);

  const value = {
    isAuthenticated,
    adminUser,
    loading,
    login,
    logout,
    registerAutoLogoutCallback
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 