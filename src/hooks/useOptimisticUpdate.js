import { useState, useCallback, useRef } from 'react';

/**
 * useOptimisticUpdate - Hook for optimistic UI updates with auto-rollback
 *
 * Provides a pattern for immediately updating UI while saving to database,
 * with automatic rollback and toast notification on failure.
 *
 * @param {Function} onShowToast - Callback to show toast notifications (message, type)
 * @returns {Object} - { executeUpdate, saveStatus }
 */
export function useOptimisticUpdate(onShowToast) {
  const [saveStatus, setSaveStatus] = useState({});
  const rollbackRef = useRef({});

  /**
   * Execute an optimistic update
   *
   * @param {string} operationId - Unique identifier for this operation (e.g., 'condition-123-name')
   * @param {Function} optimisticUpdate - Function that performs the UI update, returns rollback function
   * @param {Function} databaseUpdate - Async function that performs the database save
   * @param {string} successMessage - Optional success message for toast
   * @param {string} errorMessage - Optional error message for toast
   */
  const executeUpdate = useCallback(async (
    operationId,
    optimisticUpdate,
    databaseUpdate,
    successMessage = null,
    errorMessage = 'Failed to save changes'
  ) => {
    // Set status to saving
    setSaveStatus(prev => ({ ...prev, [operationId]: 'saving' }));

    // Execute optimistic update and store rollback function
    const rollback = optimisticUpdate();
    rollbackRef.current[operationId] = rollback;

    try {
      // Attempt database save
      const result = await databaseUpdate();

      // Check if operation failed
      if (result && result.success === false) {
        throw new Error(result.error || 'Database operation failed');
      }

      // Success - mark as saved
      setSaveStatus(prev => ({ ...prev, [operationId]: 'saved' }));

      // Show success toast if message provided
      if (successMessage && onShowToast) {
        onShowToast(successMessage, 'success');
      }

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[operationId];
          return newStatus;
        });
      }, 2000);

      // Clean up rollback function
      delete rollbackRef.current[operationId];

      return { success: true };

    } catch (error) {
      console.error(`Optimistic update failed for ${operationId}:`, error);

      // Execute rollback to revert UI changes
      if (rollbackRef.current[operationId]) {
        rollbackRef.current[operationId]();
        delete rollbackRef.current[operationId];
      }

      // Mark as error
      setSaveStatus(prev => ({ ...prev, [operationId]: 'error' }));

      // Show error toast
      if (onShowToast) {
        onShowToast(errorMessage, 'error');
      }

      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[operationId];
          return newStatus;
        });
      }, 3000);

      return { success: false, error };
    }
  }, [onShowToast]);

  return {
    executeUpdate,
    saveStatus
  };
}
