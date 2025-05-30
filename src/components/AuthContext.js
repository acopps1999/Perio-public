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
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (token && user) {
      setIsAuthenticated(true);
      setUser(JSON.parse(user));
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      // Query the admin table to verify credentials
      const { data, error } = await supabase
        .from('admin')
        .select('*')
        .eq('email', email)
        .eq('password', password) // Note: In production, use proper password hashing
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      // Create a simple token (in production, use proper JWT)
      const token = btoa(`${email}:${Date.now()}`);
      
      // Store authentication state
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(data));
      
      setIsAuthenticated(true);
      setUser(data);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 