import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingUsers, approvePendingUser, rejectPendingUser } from '../services/approvals/approvalService';

/**
 * React Query hook for managing user approvals
 *
 * @returns {{
 *   pendingUsers: Array,
 *   isLoading: boolean,
 *   error: Error,
 *   approveUser: Function,
 *   rejectUser: Function,
 *   isApproving: boolean,
 *   isRejecting: boolean
 * }}
 */
export function useUserApprovals() {
  const queryClient = useQueryClient();

  // Query for pending users
  const {
    data: pendingUsers = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const result = await getPendingUsers();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true
  });

  // Mutation for approving a user with role assignment
  const approveMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const result = await approvePendingUser(userId, role);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async ({ userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pendingUsers'] });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['pendingUsers']);

      // Optimistically remove the user from the pending list
      queryClient.setQueryData(['pendingUsers'], (old) =>
        (old || []).filter(user => user.id !== userId)
      );

      // Return context with the snapshot
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value on error
      queryClient.setQueryData(['pendingUsers'], context.previousUsers);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    }
  });

  // Mutation for rejecting a user
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      const result = await rejectPendingUser(userId, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async ({ userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pendingUsers'] });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['pendingUsers']);

      // Optimistically remove the user from the pending list
      queryClient.setQueryData(['pendingUsers'], (old) =>
        (old || []).filter(user => user.id !== userId)
      );

      // Return context with the snapshot
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value on error
      queryClient.setQueryData(['pendingUsers'], context.previousUsers);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    }
  });

  return {
    pendingUsers,
    isLoading,
    error,
    approveUser: (userId, role = 'sales') => approveMutation.mutateAsync({ userId, role }),
    rejectUser: ({ userId, reason }) => rejectMutation.mutateAsync({ userId, reason }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending
  };
}
