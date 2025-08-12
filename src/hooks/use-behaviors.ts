'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Behavior, BehaviorFormData, ApiResponse } from '@/types';

// Fetch behaviors for a PDR
async function fetchBehaviors(pdrId: string): Promise<Behavior[]> {
  const response = await fetch(`/api/pdrs/${pdrId}/behaviors`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch behaviors');
  }

  const data: ApiResponse<Behavior[]> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch behaviors');
  }

  return data.data!;
}

// Create new behavior
async function createBehavior(pdrId: string, behaviorData: BehaviorFormData): Promise<Behavior> {
  const response = await fetch(`/api/pdrs/${pdrId}/behaviors`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(behaviorData),
  });

  if (!response.ok) {
    throw new Error('Failed to create behavior');
  }

  const data: ApiResponse<Behavior> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create behavior');
  }

  return data.data!;
}

// Update behavior
async function updateBehavior(behaviorId: string, behaviorData: Partial<BehaviorFormData>): Promise<Behavior> {
  const response = await fetch(`/api/behaviors/${behaviorId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(behaviorData),
  });

  if (!response.ok) {
    throw new Error('Failed to update behavior');
  }

  const data: ApiResponse<Behavior> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update behavior');
  }

  return data.data!;
}

// Delete behavior
async function deleteBehavior(behaviorId: string): Promise<void> {
  const response = await fetch(`/api/behaviors/${behaviorId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete behavior');
  }
}

// Hook for fetching behaviors
export function useBehaviors(pdrId: string | null) {
  return useQuery({
    queryKey: ['behaviors', pdrId],
    queryFn: () => fetchBehaviors(pdrId!),
    enabled: !!pdrId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook for creating behavior
export function useCreateBehavior(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (behaviorData: BehaviorFormData) => createBehavior(pdrId, behaviorData),
    onSuccess: () => {
      // Invalidate and refetch behaviors
      queryClient.invalidateQueries({ queryKey: ['behaviors', pdrId] });
      // Also invalidate the PDR data to update behavior count
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}

// Hook for updating behavior
export function useUpdateBehavior(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ behaviorId, data }: { behaviorId: string; data: Partial<BehaviorFormData> }) =>
      updateBehavior(behaviorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['behaviors', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}

// Hook for deleting behavior
export function useDeleteBehavior(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBehavior,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['behaviors', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}
