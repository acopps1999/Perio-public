import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';

export function RejectedAccountScreen() {
  const { logout } = useAuth();
  const { rejectionReason } = useApprovalStatus();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Account Access Denied</h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We're unable to approve your PRISM account request at this time.
        </p>

        {rejectionReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Reason:</p>
            <p className="text-sm text-red-700 dark:text-red-300">{rejectionReason}</p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            If you believe this is an error, please contact support:
          </p>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            coppsaustin@gmail.com
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
