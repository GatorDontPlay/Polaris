'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/supabase-auth-provider';
import { Notification, ApiResponse, PaginatedResponse } from '@/types';

// Fetch notifications with pagination and filters
async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  unread?: boolean;
}): Promise<PaginatedResponse<Notification>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params?.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params?.unread) {
    searchParams.set('unread', 'true');
  }

  const response = await fetch(`/api/notifications?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  const data = await response.json();
  return data;
}

// Mark notifications as read/unread
async function updateNotificationStatus(
  notificationIds: string[],
  markAsRead: boolean = true
): Promise<{ updatedCount: number; markAsRead: boolean }> {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notificationIds,
      markAsRead,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update notification status');
  }

  const data: ApiResponse<{ updatedCount: number; markAsRead: boolean }> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update notification status');
  }

  return data.data!;
}

// Hook for fetching notifications
export function useNotifications(params?: {
  page?: number;
  limit?: number;
  unread?: boolean;
}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', params, user?.id],
    queryFn: () => fetchNotifications(params),
    enabled: !!user?.id && !!user?.email, // Only run if user is fully loaded
    staleTime: 30 * 1000, // 30 seconds - notifications should be fresh
  });
}

// Hook for fetching unread notification count
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', { unread: true, limit: 1000 }, user?.id],
    queryFn: () => fetchNotifications({ unread: true, limit: 1000 }),
    select: (data) => data.pagination.total,
    enabled: !!user?.id && !!user?.email, // Only run if user is fully loaded
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for marking notifications as read
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) => 
      updateNotificationStatus(notificationIds, true),
    onSuccess: () => {
      // Invalidate all notification queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook for marking notifications as unread
export function useMarkNotificationsAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) => 
      updateNotificationStatus(notificationIds, false),
    onSuccess: () => {
      // Invalidate all notification queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook for marking a single notification as read
export function useMarkNotificationAsRead() {
  const markAsRead = useMarkNotificationsAsRead();

  return useMutation({
    mutationFn: (notificationId: string) => 
      markAsRead.mutateAsync([notificationId]),
    onSuccess: markAsRead.onSuccess,
  });
}
