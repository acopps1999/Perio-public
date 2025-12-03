import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

// Valid user roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  CLINICIAN: 'clinician',
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // General user info
  const [userRole, setUserRole] = useState(null); // 'user' or 'admin'
  const [loading, setLoading] = useState(true);
  const [onAutoLogoutCallback, setOnAutoLogoutCallback] = useState(null);

  // Fetch user profile and role from user_profiles table
  const fetchUserProfile = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id, email, role, approval_status, approved_by, approved_at, rejection_reason, created_at, updated_at')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      // Ensure approval_status exists (default to 'approved' for legacy users)
      if (!profile.approval_status) {
        profile.approval_status = 'approved';
      }

      return profile;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  };

  // Check if user is already logged in on app start using Supabase session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session from Supabase
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setLoading(false);
          return;
        }

        // Check if session is expired or about to expire
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        // If session is expired or about to expire (within 1 minute), try to refresh
        if (expiresAt && expiresAt - now < 60) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          // Get the refreshed session
          const refreshResult = await supabase.auth.getSession();
          if (!refreshResult.data.session) {
            setLoading(false);
            return;
          }
          // Update local reference
          session = refreshResult.data.session;
        }

        // Fetch user profile with role
        const profile = await fetchUserProfile(session.user);

        if (profile) {
          setIsAuthenticated(true);
          setUser({
            ...session.user,
            ...profile
          });
          setUserRole(profile.role);
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
        setUser(null);
        setUserRole(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // For TOKEN_REFRESHED, we can safely assume the user is already authenticated
        // and skip the database query to prevent unnecessary re-renders
        if (event === 'TOKEN_REFRESHED') {
          // Update isAuthenticated state to keep it consistent
          setIsAuthenticated(true);
          // Update user with new session data (keeping profile if it exists)
          setUser(prevUser => ({
            ...session.user,
            ...prevUser // Keep existing profile data if available
          }));
          return;
        }

        // For SIGNED_IN events, check if this is just a re-auth of an existing session
        // If user is already authenticated, skip the profile fetch to prevent unmounting
        if (event === 'SIGNED_IN') {
          // Use functional update to check current state
          setIsAuthenticated(currentAuth => {
            if (currentAuth) {
              // Just update session, don't fetch profile
              setUser(prevUser => ({
                ...session.user,
                ...prevUser
              }));
              return true; // Keep current auth state
            } else {
              // New login - need to fetch profile
              fetchUserProfile(session.user).then(profile => {
                if (profile) {
                  setUser({
                    ...session.user,
                    ...profile
                  });
                  setUserRole(profile.role);
                }
              });
              return true; // Set authenticated immediately
            }
          });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Auto-logout after 30 minutes of inactivity (production setting)
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimeout;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    // Function to perform logout
    const performLogout = async () => {
      // Call the callback before logout (if set) to close admin panels
      if (onAutoLogoutCallback) {
        onAutoLogoutCallback();
      }

      try {
        await supabase.auth.signOut();
      } catch (err) {
        // Silently handle sign out errors
      }

      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    };

    // Reset the inactivity timer
    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      inactivityTimeout = setTimeout(() => {
        performLogout();
      }, INACTIVITY_TIMEOUT);
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

  // Email/password login (for backward compatibility with admin login)
  const login = async (email, password) => {
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Invalid credentials');
      }

      // Fetch user profile with role
      const profile = await fetchUserProfile(authData.user);

      if (!profile) {
        throw new Error('User profile not found');
      }

      // For admin login modal, verify admin role
      if (profile.role !== 'admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        throw new Error('Access denied - admin privileges required');
      }

      // Set authentication state
      setIsAuthenticated(true);
      setUser({
        ...authData.user,
        ...profile
      });
      setUserRole(profile.role);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Social login handler (called after OAuth success)
  const handleSocialLogin = async (authData) => {
    try {
      if (!authData.user) {
        throw new Error('Authentication failed');
      }

      // Fetch user profile with role
      const profile = await fetchUserProfile(authData.user);

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Set authentication state
      setIsAuthenticated(true);
      setUser({
        ...authData.user,
        ...profile
      });
      setUserRole(profile.role);

      return { success: true, role: profile.role };
    } catch (error) {
      console.error('Social login handler error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();

      // Clean up any app-specific localStorage (but keep theme preference)
      const theme = localStorage.getItem('prism-theme');

      // Clear everything except theme
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== 'prism-theme') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Restore theme
      if (theme) {
        localStorage.setItem('prism-theme', theme);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }

    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
  };

  // Function to register auto-logout callback
  const registerAutoLogoutCallback = useCallback((callback) => {
    setOnAutoLogoutCallback(() => callback);
  }, []);

  // Check if current user is admin
  const isAdmin = () => {
    return userRole === 'admin';
  };

  // Check if current user is sales
  const isSales = () => {
    return userRole === 'sales';
  };

  // Check if current user is clinician
  const isClinician = () => {
    return userRole === 'clinician';
  };

  // Check if current user is general user (legacy - maps to sales)
  const isGeneralUser = () => {
    return userRole === 'user' || userRole === 'sales';
  };

  // Check if user has any of the specified roles
  const hasRole = (roles) => {
    if (!userRole) return false;
    if (typeof roles === 'string') return userRole === roles;
    return roles.includes(userRole);
  };

  // Get approval status
  const getApprovalStatus = () => {
    if (!user) return null;
    return user.approval_status || 'approved'; // Default to approved for legacy users
  };

  const value = {
    isAuthenticated,
    user, // Full user object with profile data
    userRole, // 'admin', 'sales', or 'clinician'
    loading,
    login, // Email/password login (admin only)
    handleSocialLogin, // Social login handler
    logout,
    signOut: logout, // Alias for compatibility
    registerAutoLogoutCallback,
    // Role check helpers
    isAdmin,
    isSales,
    isClinician,
    isGeneralUser, // Legacy - maps to sales
    hasRole, // Check if user has any of the specified roles
    getApprovalStatus,
    // Legacy support for existing code
    adminUser: userRole === 'admin' ? user : null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
