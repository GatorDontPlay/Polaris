'use client';

import { useQuery } from '@tanstack/react-query';
import { ActivityItem, ApiResponse } from '@/types';

// Fetch user's recent activity
async function fetchUserActivity(limit: number = 10): Promise<ActivityItem[]> {
  const response = await fetch(`/api/activity?limit=${limit}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user activity');
  }

  const data: ApiResponse<ActivityItem[]> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch user activity');
  }

  return data.data!;
}

// Hook for user's recent activity
export function useUserActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['user', 'activity', limit],
    queryFn: () => fetchUserActivity(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
