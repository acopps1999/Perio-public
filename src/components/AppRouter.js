import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApprovalStatus } from '../hooks/useApprovalStatus';
import { PendingApprovalScreen } from './Auth/PendingApprovalScreen';
import { RejectedAccountScreen } from './Auth/RejectedAccountScreen';
import ClinicalChartMockup from './ClinicalChartMockup';

/**
 * AppRouter - Routes users to appropriate screens based on auth and approval status
 *
 * Flow:
 * 1. If loading → Show loading spinner
 * 2. If not authenticated → Show main app (which has its own login modals)
 * 3. If authenticated but pending → Show pending approval screen
 * 4. If authenticated but rejected → Show rejection screen
 * 5. If authenticated and approved → Show main app
 */
export function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const { isPending, isRejected, isApproved } = useApprovalStatus();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show main app (which handles showing login modals)
  if (!isAuthenticated) {
    return <ClinicalChartMockup />;
  }

  // If authenticated, check approval status
  if (isPending) {
    return <PendingApprovalScreen />;
  }

  if (isRejected) {
    return <RejectedAccountScreen />;
  }

  // If approved (or approval_status not set for legacy users), show main app
  if (isApproved) {
    return <ClinicalChartMockup />;
  }

  // Fallback: show main app
  return <ClinicalChartMockup />;
}
