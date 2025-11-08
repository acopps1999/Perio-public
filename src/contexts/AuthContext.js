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

      // Clear localStorage session
      localStorage.removeItem('supabase.auth.token');

      // Try to sign out from Supabase (may hang, so don't await)
      supabase.auth.signOut().catch(err => console.warn('Sign out warning:', err));

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
      console.log('🔐 Attempting login with raw fetch...');

      // Use raw fetch to bypass broken Supabase client
      const authUrl = `${process.env.REACT_APP_SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error_description || 'Invalid credentials');
      }

      const authData = await authResponse.json();
      console.log('✅ Auth successful, checking admin status...');

      if (!authData.user) {
        throw new Error('Invalid credentials');
      }

      // Now verify the user is in the admins table using raw fetch
      const adminUrl = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/admins?select=*&user_id=eq.${authData.user.id}`;
      const adminResponse = await fetch(adminUrl, {
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authData.access_token}`
        }
      });

      const adminData = await adminResponse.json();
      console.log('✅ Admin check response:', adminData);

      if (!adminData || adminData.length === 0) {
        throw new Error('Access denied - admin privileges required');
      }

      // Store the session manually in localStorage for persistence
      const session = {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        user: authData.user,
        expires_at: authData.expires_at
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));

      // Set authentication state
      setIsAuthenticated(true);
      setAdminUser({
        ...adminData[0],
        auth_user: authData.user
      });

      console.log('✅ Login successful!');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    console.log('🔓 Logging out...');

    // Clear localStorage session
    localStorage.removeItem('supabase.auth.token');

    // Try to sign out from Supabase (may hang, so don't await)
    supabase.auth.signOut().catch(err => console.warn('Sign out warning:', err));

    setIsAuthenticated(false);
    setAdminUser(null);

    console.log('✅ Logged out');
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