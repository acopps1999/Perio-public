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
    console.log('🔄 AuthContext initializing...');
    
    // ONE-TIME CLEANUP: Remove old custom session format if it exists
    const cleanupFlag = 'auth_cleanup_done_v2';
    if (!localStorage.getItem(cleanupFlag)) {
      const oldKeys = ['supabase.auth.token', 'admin_authenticated', 'admin_user'];
      let cleaned = false;
      
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`🧹 One-time cleanup: removing ${key}`);
          localStorage.removeItem(key);
          cleaned = true;
        }
      });
      
      if (cleaned) {
        console.log('✅ Old session data cleaned up');
      }
      
      localStorage.setItem(cleanupFlag, 'true');
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - setting loading to false');
      setLoading(false);
    }, 3000); // 3 second timeout

    // Listen for auth state changes - this includes initial session restoration
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session ? 'with session' : 'no session');
      
      // Clear the timeout since we got an auth event
      clearTimeout(loadingTimeout);
      
      // Handle session restoration on page load
      if (event === 'INITIAL_SESSION') {
        if (!session) {
          console.log('ℹ️ No initial session found');
          setIsAuthenticated(false);
          setAdminUser(null);
          setLoading(false);
          return;
        }
        
        console.log('✅ Restoring session for user:', session.user?.email);
        
        // Verify admin status
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (adminData && !adminError) {
          console.log('✅ Admin verified:', adminData.email);
          setIsAuthenticated(true);
          setAdminUser({
            ...adminData,
            auth_user: session.user
          });
        } else {
          console.warn('⚠️ User is not an admin');
          setIsAuthenticated(false);
          setAdminUser(null);
        }
        
        setLoading(false);
      }
      // Handle logout
      else if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 User signed out');
        setIsAuthenticated(false);
        setAdminUser(null);
        setLoading(false);
      }
      // Handle login and token refresh
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('✅ Session active for user:', session.user?.email);
        
        // Verify admin status
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (adminData && !adminError) {
          console.log('✅ Admin verified:', adminData.email);
          setIsAuthenticated(true);
          setAdminUser({
            ...adminData,
            auth_user: session.user
          });
        }
      }
    });

    return () => {
      console.log('🧹 AuthContext cleanup');
      clearTimeout(loadingTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  // Auto-logout disabled - no inactivity timeout
  // (Previously set to 10 minutes, disabled per user request)
  // useEffect(() => {
  //   if (!isAuthenticated) return;

  //   let inactivityTimeout;

  //   // Function to perform logout
  //   const performLogout = async () => {
  //     // Call the callback before logout (if set) to close admin panels
  //     if (onAutoLogoutCallback) {
  //       onAutoLogoutCallback();
  //     }

  //     // Sign out from Supabase (clears session automatically)
  //     await supabase.auth.signOut();

  //     setIsAuthenticated(false);
  //     setAdminUser(null);
  //   };

  //   // Reset the inactivity timer
  //   const resetInactivityTimer = () => {
  //     if (inactivityTimeout) {
  //       clearTimeout(inactivityTimeout);
  //     }
  //     inactivityTimeout = setTimeout(() => {
  //       performLogout();
  //     }, 600000); // 10 minutes = 600,000 ms
  //   };

  //   // Events that indicate user activity
  //   const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  //   // Add event listeners for user activity
  //   activityEvents.forEach(event => {
  //     document.addEventListener(event, resetInactivityTimer, true);
  //   });

  //   // Start the initial timer
  //   resetInactivityTimer();

  //   // Cleanup function
  //   return () => {
  //     if (inactivityTimeout) {
  //       clearTimeout(inactivityTimeout);
  //     }
  //     activityEvents.forEach(event => {
  //       document.removeEventListener(event, resetInactivityTimer, true);
  //     });
  //   };
  // }, [isAuthenticated, onAutoLogoutCallback]);

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with Supabase client...');

      // Use Supabase client for proper session management
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid credentials');
      }

      console.log('✅ Auth successful, checking admin status...');
      console.log('User ID:', authData.user.id);

      // Verify the user is in the admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      console.log('✅ Admin check response:', adminData);

      if (adminError) {
        console.error('❌ Admin check error:', adminError);
        await supabase.auth.signOut();
        throw new Error('Failed to verify admin status');
      }

      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error('Access denied - admin privileges required');
      }

      // Set authentication state
      // Session is automatically stored by Supabase client
      setIsAuthenticated(true);
      setAdminUser({
        ...adminData,
        auth_user: authData.user
      });

      console.log('✅ Login successful!');
      console.log('Session token:', authData.session?.access_token?.substring(0, 20) + '...');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    console.log('🔓 Logging out...');

    // Sign out from Supabase (clears session automatically)
    await supabase.auth.signOut();

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