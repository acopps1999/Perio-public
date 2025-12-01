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

    // Clear any stale sessions if they cause issues
    const clearStaleSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Verify session is valid by checking if user exists
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // If profile doesn't exist or query fails, clear session
          if (error || !profile) {
            console.warn('⚠️ Stale session detected, clearing...');
            await supabase.auth.signOut();
            return false;
          }
        }
        return true;
      } catch (err) {
        console.error('❌ Session validation error:', err);
        await supabase.auth.signOut();
        return false;
      }
    };

    // Run session validation
    clearStaleSession();

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
        
        // Verify admin status using user_profiles.role
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userProfile && !profileError && userProfile.role === 'admin') {
          console.log('✅ Admin verified:', userProfile.email);
          setIsAuthenticated(true);
          setAdminUser({
            ...userProfile,
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
        
        // Verify admin status using user_profiles.role
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userProfile && !profileError && userProfile.role === 'admin') {
          console.log('✅ Admin verified:', userProfile.email);
          setIsAuthenticated(true);
          setAdminUser({
            ...userProfile,
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

      // Verify the user has admin role in user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      console.log('✅ User profile check response:', userProfile);

      if (profileError) {
        console.error('❌ User profile check error:', profileError);
        await supabase.auth.signOut();
        throw new Error('Failed to verify user profile');
      }

      if (!userProfile || userProfile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access denied - admin privileges required');
      }

      // Set authentication state
      // Session is automatically stored by Supabase client
      setIsAuthenticated(true);
      setAdminUser({
        ...userProfile,
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