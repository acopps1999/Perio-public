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
    const performLogout = async () => {
      console.log('SECURITY: Auto-logout triggered - 10 minutes of inactivity');
      
      // Call the callback before logout (if set) to close admin panels
      if (onAutoLogoutCallback) {
        onAutoLogoutCallback();
      }
      
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      
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
      
      // Use Supabase Auth for authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      console.log('Supabase auth response:', { authData, authError });

      if (authError || !authData.user) {
        console.error('Auth login failed:', authError);
        throw new Error('Invalid credentials');
      }

      // Now verify the user is in the admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      console.log('Admin verification response:', { adminData, adminError });

      if (adminError || !adminData) {
        console.error('Admin verification failed:', adminError);
        // Sign out the user since they're not an admin
        await supabase.auth.signOut();
        throw new Error('Access denied - admin privileges required');
      }

      // Set authentication state
      setIsAuthenticated(true);
      setAdminUser({
        ...adminData,
        auth_user: authData.user
      });
      
      // Save to localStorage for persistence
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('admin_user', JSON.stringify({
        ...adminData,
        auth_user: authData.user
      }));

      console.log('SECURITY: Admin logged in - auto-logout listeners activated');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    console.log('SECURITY: Manual logout triggered');
    
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
    
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