/**
 * useAdminNotifications Hook
 *
 * React Query hook for fetching and managing admin notifications with real-time updates.
 * Provides notification data, unread count, and mark-as-read functionality.
 *
 * Features:
 * - Real-time notifications via Supabase subscriptions
 * - Automatic cache invalidation on new notifications
 * - Mark as read mutation with optimistic updates
 * - Unread count calculation
 *
 * @module useAdminNotifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Fetch admin notifications from Supabase
 * @returns {Promise<Array>} Array of notification objects
 */
async function fetchAdminNotifications() {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50); // Get latest 50 notifications

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return data || [];
}

/**
 * Mark a notification as read
 * @param {string} notificationId - UUID of notification to mark as read
 * @returns {Promise<Object>} Updated notification object
 */
async function markNotificationAsRead(notificationId) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('admin_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: user?.id
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  return data;
}

/**
 * Mark all notifications as read
 * @returns {Promise<Array>} Array of updated notification objects
 */
async function markAllNotificationsAsRead() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('admin_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: user?.id
    })
    .eq('is_read', false)
    .select();

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }

  return data || [];
}

/**
 * useAdminNotifications Hook
 *
 * Provides admin notifications with real-time updates via Supabase subscriptions.
 * Only fetches notifications if the user is an admin.
 *
 * @returns {Object} Hook return object
 * @returns {Array} return.notifications - Array of notification objects
 * @returns {number} return.unreadCount - Count of unread notifications
 * @returns {boolean} return.isLoading - Loading state
 * @returns {Error} return.error - Error object if query failed
 * @returns {Function} return.markAsRead - Function to mark a notification as read
 * @returns {Function} return.markAllAsRead - Function to mark all notifications as read
 * @returns {Function} return.refetch - Function to manually refetch notifications
 *
 * @example
 * function NotificationBell() {
 *   const { notifications, unreadCount, markAsRead } = useAdminNotifications();
 *
 *   return (
 *     <button>
 *       <BellIcon />
 *       {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
 *     </button>
 *   );
 * }
 */
export function useAdminNotifications() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: fetchAdminNotifications,
    // Only fetch if user is admin
    enabled: isAdmin(),
    // Keep notifications fresh (1 minute stale time)
    staleTime: 60 * 1000,
    // Refetch on window focus for notifications
    refetchOnWindowFocus: true,
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mutation for marking notification as read
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    // Optimistic update
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-notifications'] });

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData(['admin-notifications']);

      // Optimistically update notification
      queryClient.setQueryData(['admin-notifications'], (old) =>
        old?.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      return { previousNotifications };
    },
    // On error, rollback
    onError: (err, notificationId, context) => {
      queryClient.setQueryData(['admin-notifications'], context.previousNotifications);
      console.error('Failed to mark notification as read:', err);
    },
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  // Mutation for marking all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin-notifications'] });

      const previousNotifications = queryClient.getQueryData(['admin-notifications']);

      queryClient.setQueryData(['admin-notifications'], (old) =>
        old?.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );

      return { previousNotifications };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['admin-notifications'], context.previousNotifications);
      console.error('Failed to mark all notifications as read:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  // Real-time subscription to admin_notifications table
  useEffect(() => {
    if (!isAdmin()) return;

    // Subscribe to INSERT events on admin_notifications
    const channel = supabase
      .channel('admin-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          // Invalidate and refetch notifications when changes occur
          queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: (notificationId) => markAsReadMutation.mutate(notificationId),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    refetch,
  };
}
