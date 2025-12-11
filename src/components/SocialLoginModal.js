import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock, AlertCircle, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Social provider icons as SVG components
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00A4EF"/>
  </svg>
);

function SocialLoginModal({ isOpen, onClose, onSuccess }) {
  const { handleSocialLogin: authHandleSocialLogin } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    setCurrentProvider(provider);
    setError('');

    try {
      // Import supabase client
      const { supabase } = await import('../supabaseClient');

      // Use Supabase's native OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'google' ? 'google' : 'azure',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // OAuth redirect will happen automatically
      // The auth state change listener in AuthContext will handle the rest
    } catch (err) {
      console.error(`${provider} login error:`, err);
      setError(err.message || `Failed to sign in with ${provider}. Please try again.`);
      setIsLoading(false);
      setCurrentProvider(null);
    }
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setCurrentProvider('email');
    setError('');

    try {
      const { supabase } = await import('../supabaseClient');

      if (isSignUp) {
        // Sign up flow
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const { data: authResult, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        // Update auth context
        const result = await authHandleSocialLogin(authResult);

        if (!result.success) {
          throw new Error(result.error);
        }

        setIsLoading(false);
        setCurrentProvider(null);
        onClose();
        if (onSuccess) {
          onSuccess(authResult, result.role);
        }
      } else {
        // Sign in flow
        const { data: authResult, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          throw new Error(signInError.message);
        }

        // Update auth context
        const result = await authHandleSocialLogin(authResult);

        if (!result.success) {
          throw new Error(result.error);
        }

        setIsLoading(false);
        setCurrentProvider(null);
        onClose();
        if (onSuccess) {
          onSuccess(authResult, result.role);
        }
      }
    } catch (err) {
      console.error('Email/Password auth error:', err);
      setError(err.message || `Failed to ${isSignUp ? 'create account' : 'sign in'}. Please try again.`);
      setIsLoading(false);
      setCurrentProvider(null);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setCurrentProvider(null);
      setFormData({ email: '', password: '', confirmPassword: '' });
      setIsSignUp(false);
      setShowPassword(false);
      onClose();
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-prism-light-bg-primary rounded-lg shadow-xl p-8 z-50">
          <Dialog.Title className="text-lg font-semibold mb-2 flex items-center justify-center text-prism-light-text-primary">
            <Lock size={20} className="mr-2 text-prism-light-text-secondary" />
            <span>
              {isSignUp ? 'Create Your Account for ' : 'Sign in to '}
              <span style={{
                fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif',
                fontWeight: 300,
                letterSpacing: '0.1em',
                fontSize: '1.25rem'
              }}>
                PRISM
              </span>
            </span>
          </Dialog.Title>

          <Dialog.Description className="text-sm text-center text-prism-light-text-secondary mb-6">
            {isSignUp
              ? 'Create an account to access clinical decision support tools and product recommendations.'
              : 'Access clinical decision support tools and product recommendations.'}
          </Dialog.Description>

          {error && (
            <div className="flex items-center p-3 mb-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email/Password Form - Center Section */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2 text-prism-light-text-primary"
              >
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-prism-light-text-tertiary" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 border border-prism-light-border-subtle rounded-md bg-prism-light-bg-primary text-prism-light-text-primary placeholder-prism-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-prism-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2 text-prism-light-text-primary"
              >
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-prism-light-text-tertiary" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 border border-prism-light-border-subtle rounded-md bg-prism-light-bg-primary text-prism-light-text-primary placeholder-prism-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-prism-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-prism-light-text-tertiary hover:text-prism-light-text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-2 text-prism-light-text-primary"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-prism-light-text-tertiary" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 border border-prism-light-border-subtle rounded-md bg-prism-light-bg-primary text-prism-light-text-primary placeholder-prism-light-text-tertiary focus:outline-none focus:ring-2 focus:ring-prism-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-prism-primary hover:bg-prism-primary-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && currentProvider === 'email' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>

            {/* Toggle between Sign In and Sign Up */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setFormData({ email: '', password: '', confirmPassword: '' });
                }}
                disabled={isLoading}
                className="text-sm text-prism-primary hover:text-prism-primary-dark disabled:opacity-50"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>

          {/* OAuth Providers - Bottom Section */}
          <>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-prism-light-border-subtle"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-prism-light-bg-primary text-prism-light-text-tertiary">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {/* Google Sign In */}
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-prism-light-border-subtle rounded-md text-prism-light-text-primary hover:bg-prism-light-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && currentProvider === 'google' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="font-medium">Google</span>
              </button>

              {/* Microsoft Sign In */}
              <button
                onClick={() => handleSocialLogin('microsoft')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-prism-light-border-subtle rounded-md text-prism-light-text-primary hover:bg-prism-light-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && currentProvider === 'microsoft' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <MicrosoftIcon />
                )}
                <span className="font-medium">Microsoft</span>
              </button>
            </div>
          </>

          <div className="mt-6 pt-6 border-t border-prism-light-border-subtle">
            <p className="text-xs text-center text-prism-light-text-secondary">
              By {isSignUp ? 'creating an account' : 'signing in'}, you agree to our Terms of Service and Privacy Policy.
              Your data is protected and never shared without permission.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default SocialLoginModal;
