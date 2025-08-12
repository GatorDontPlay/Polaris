'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Goal, GoalFormData, ApiResponse } from '@/types';

// Fetch goals for a PDR
async function fetchGoals(pdrId: string): Promise<Goal[]> {
  const response = await fetch(`/api/pdrs/${pdrId}/goals`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch goals');
  }

  const data: ApiResponse<Goal[]> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch goals');
  }

  return data.data!;
}

// Create new goal
async function createGoal(pdrId: string, goalData: GoalFormData): Promise<Goal> {
  const response = await fetch(`/api/pdrs/${pdrId}/goals`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goalData),
  });

  if (!response.ok) {
    throw new Error('Failed to create goal');
  }

  const data: ApiResponse<Goal> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create goal');
  }

  return data.data!;
}

// Update goal
async function updateGoal(goalId: string, goalData: Partial<GoalFormData>): Promise<Goal> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goalData),
  });

  if (!response.ok) {
    throw new Error('Failed to update goal');
  }

  const data: ApiResponse<Goal> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update goal');
  }

  return data.data!;
}

// Delete goal
async function deleteGoal(goalId: string): Promise<void> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete goal');
  }
}

// Hook for fetching goals
export function useGoals(pdrId: string | null) {
  return useQuery({
    queryKey: ['goals', pdrId],
    queryFn: () => fetchGoals(pdrId!),
    enabled: !!pdrId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook for creating goal
export function useCreateGoal(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalData: GoalFormData) => createGoal(pdrId, goalData),
    onSuccess: () => {
      // Invalidate and refetch goals
      queryClient.invalidateQueries({ queryKey: ['goals', pdrId] });
      // Also invalidate the PDR data to update goal count
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}

// Hook for updating goal
export function useUpdateGoal(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: Partial<GoalFormData> }) =>
      updateGoal(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}

// Hook for deleting goal
export function useDeleteGoal(pdrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });
}
