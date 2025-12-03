import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../utils/validationSchemas';

function AdminLoginModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate input before attempting login
      await loginSchema.validate({ email, password }, { abortEarly: false });

      const result = await login(email, password);

      if (result.success) {
        // Clear form and close modal
        setEmail('');
        setPassword('');
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      if (err.name === 'ValidationError') {
        // Display first validation error
        setError(err.errors[0] || 'Invalid input');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-[90vw] bg-prism-light-bg-primary dark:bg-prism-dark-bg-secondary rounded-lg shadow-xl p-6 z-50">
          <Dialog.Title className="text-lg font-semibold mb-2 flex items-center text-prism-light-text-primary dark:text-prism-dark-text-primary">
            <Lock size={20} className="mr-2 text-prism-light-text-secondary dark:text-prism-dark-text-secondary" />
            Admin Login
          </Dialog.Title>

          <Dialog.Description className="text-sm text-prism-light-text-secondary dark:text-prism-dark-text-secondary mb-4">
            Sign in with your administrator credentials to access the knowledge base management system.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-prism-light-text-primary dark:text-prism-dark-text-primary mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-prism-light-border-subtle dark:border-prism-dark-border-subtle rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-prism-primary focus:border-prism-primary bg-prism-light-bg-primary dark:bg-prism-dark-bg-tertiary text-prism-light-text-primary dark:text-prism-dark-text-primary placeholder-prism-light-text-secondary dark:placeholder-prism-dark-text-secondary"
                placeholder="Enter your admin email"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-prism-light-text-primary dark:text-prism-dark-text-primary mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-prism-light-border-subtle dark:border-prism-dark-border-subtle rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-prism-primary focus:border-prism-primary bg-prism-light-bg-primary dark:bg-prism-dark-bg-tertiary text-prism-light-text-primary dark:text-prism-dark-text-primary placeholder-prism-light-text-secondary dark:placeholder-prism-dark-text-secondary"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 border border-prism-light-border-subtle dark:border-prism-dark-border-subtle rounded-md text-prism-light-text-primary dark:text-prism-dark-text-primary hover:bg-prism-light-bg-secondary dark:hover:bg-prism-dark-bg-tertiary text-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </Dialog.Close>
              
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={`px-4 py-2 rounded-md text-white text-sm ${
                  isLoading || !email || !password
                    ? 'bg-prism-primary/50 cursor-not-allowed'
                    : 'bg-prism-primary hover:bg-indigo-700 dark:hover:bg-indigo-400'
                }`}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AdminLoginModal; 