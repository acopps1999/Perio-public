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

  // Check if user is already logged in on app start using Supabase session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session from Supabase (stored in httpOnly cookies)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setLoading(false);
          return;
        }

        // Verify user is an admin
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (adminData && !adminError) {
          setIsAuthenticated(true);
          setAdminUser({
            ...adminData,
            auth_user: session.user
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setAdminUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Verify admin status
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (adminData) {
          setIsAuthenticated(true);
          setAdminUser({
            ...adminData,
            auth_user: session.user
          });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimeout;

    // Function to perform logout
    const performLogout = async () => {
      // Call the callback before logout (if set) to close admin panels
      if (onAutoLogoutCallback) {
        onAutoLogoutCallback();
      }

      // Sign out from Supabase Auth (automatically clears session)
      await supabase.auth.signOut();

      setIsAuthenticated(false);
      setAdminUser(null);
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
      // Use Supabase Auth for authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError || !authData.user) {
        throw new Error('Invalid credentials');
      }

      // Now verify the user is in the admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError || !adminData) {
        // Sign out the user since they're not an admin
        await supabase.auth.signOut();
        throw new Error('Access denied - admin privileges required');
      }

      // Set authentication state (session is automatically stored by Supabase)
      setIsAuthenticated(true);
      setAdminUser({
        ...adminData,
        auth_user: authData.user
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // Sign out from Supabase Auth (automatically clears session)
    await supabase.auth.signOut();

    setIsAuthenticated(false);
    setAdminUser(null);
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