import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function PendingApprovalScreen() {
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Account Pending Approval</h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your account has been created successfully, but requires admin approval before you can access PRISM.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You'll receive an email notification once your account has been reviewed. This typically takes 1-2 business days.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
