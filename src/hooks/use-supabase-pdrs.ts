'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/supabase-auth-provider';
import { computeAustralianFY } from '@/lib/financial-year';
import type { PDR, Goal, Behavior, BehaviorFormData, GoalFormData } from '@/types';

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Hook for fetching current user's PDR (dashboard)
export function useSupabasePDRDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current PDR
  const { data: currentPDR, isLoading, error } = useQuery({
    queryKey: ['user-current-pdr', user?.id],
    queryFn: async (): Promise<PDR | null> => {
      console.log('Dashboard Hook - User check:', { 
        userId: user?.id, 
        userEmail: user?.email, 
        hasUser: !!user 
      });
      
      if (!user?.id) return null;
      
      // Always fetch all PDRs and find current one client-side for reliability
      const response = await fetch('/api/pdrs?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch PDRs');
      }
      
      const result: PaginatedResponse<PDR> = await response.json();
      const pdrs = result.data;
      
      // Debug: Log what PDRs are returned
      console.log('Dashboard PDRs received:', pdrs?.map(p => ({ 
        id: p.id, 
        fyLabel: p.fyLabel || p.fy_label, 
        status: p.status 
      })));
      
      // Find PDR for current financial year
      const currentFY = computeAustralianFY();
      const currentPDR = pdrs.find(pdr => (pdr.fyLabel || pdr.fy_label) === currentFY.label);
      
      console.log('Current FY search:', { 
        currentFY: currentFY.label, 
        found: !!currentPDR, 
        totalPDRs: pdrs.length 
      });
      
      return currentPDR || null;
    },
    enabled: !!user?.id, // Only run if user is loaded
    staleTime: 30 * 1000, // 30 seconds
  });

  // Create PDR mutation
  const createPDRMutation = useMutation({
    mutationFn: async (financialYear?: { label: string; startDate: Date; endDate: Date }): Promise<PDR> => {
      const response = await fetch('/api/pdrs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(financialYear ? {
          fyLabel: financialYear.label,
          fyStartDate: financialYear.startDate,
          fyEndDate: financialYear.endDate,
        } : {}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'PDR_EXISTS') {
          throw new Error(`A PDR already exists for Financial Year ${errorData.details || 'this year'}. Please use the existing PDR instead.`);
        }
        throw new Error(errorData.error || 'Failed to create PDR');
      }

      const result: ApiResponse<PDR> = await response.json();
      console.log('PDR Creation response:', result);
      console.log('PDR data:', result.data);
      return result.data;
    },
    onSuccess: (newPDR) => {
      // Update the current PDR query cache
      queryClient.setQueryData(['user-current-pdr', user?.id], newPDR);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-current-pdr'] });
      queryClient.invalidateQueries({ queryKey: ['user-pdr-history'] });
    },
    onError: (error) => {
      // If PDR creation fails due to existing PDR, invalidate queries to refresh
      if (error.message.includes('already exists')) {
        console.log('PDR creation failed - refreshing queries to find existing PDR');
        queryClient.invalidateQueries({ queryKey: ['user-current-pdr'] });
        queryClient.invalidateQueries({ queryKey: ['user-pdr-history'] });
      }
    },
  });

  const createPDR = useCallback((financialYear?: { label: string; startDate: Date; endDate: Date }) => {
    return createPDRMutation.mutateAsync(financialYear);
  }, [createPDRMutation]);

  return {
    data: currentPDR,
    createPDR,
    isLoading: isLoading || createPDRMutation.isPending,
    error: error?.message || createPDRMutation.error?.message,
  };
}

// Hook for fetching single PDR
export function useSupabasePDR(pdrId: string) {
  const { data: pdr, isLoading, error } = useQuery({
    queryKey: ['pdr', pdrId],
    queryFn: async (): Promise<PDR> => {
      const response = await fetch(`/api/pdrs/${pdrId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch PDR');
      }
      const result: ApiResponse<PDR> = await response.json();
      return result.data;
    },
    enabled: !!pdrId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data: pdr,
    isLoading,
    error: error?.message,
  };
}

// Hook for PDR goals
export function useSupabasePDRGoals(pdrId: string) {
  const queryClient = useQueryClient();

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['pdr-goals', pdrId],
    queryFn: async (): Promise<Goal[]> => {
      const response = await fetch(`/api/pdrs/${pdrId}/goals`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const result: ApiResponse<Goal[]> = await response.json();
      return result.data;
    },
    enabled: !!pdrId,
    staleTime: 30 * 1000,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: GoalFormData): Promise<Goal> => {
      const response = await fetch(`/api/pdrs/${pdrId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      const result: ApiResponse<Goal> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdr-goals', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: Partial<Goal> }): Promise<Goal> => {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Goal update failed:', response.status, errorText);
        throw new Error(`Failed to update goal: ${response.status} - ${errorText}`);
      }

      const result: ApiResponse<Goal> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdr-goals', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string): Promise<void> => {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdr-goals', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
    },
  });

  return {
    data: goals || [],
    isLoading,
    error: error?.message,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
  };
}

// Hook for PDR behaviors
export function useSupabasePDRBehaviors(pdrId: string) {
  const queryClient = useQueryClient();

  const { data: behaviors, isLoading, error } = useQuery({
    queryKey: ['pdr-behaviors', pdrId],
    queryFn: async (): Promise<Behavior[]> => {
      const response = await fetch(`/api/pdrs/${pdrId}/behaviors`);
      if (!response.ok) {
        throw new Error('Failed to fetch behaviors');
      }
      const result: ApiResponse<Behavior[]> = await response.json();
      return result.data;
    },
    enabled: !!pdrId,
    staleTime: 30 * 1000,
  });

  // Create behavior mutation
  const createBehaviorMutation = useMutation({
    mutationFn: async (behaviorData: BehaviorFormData): Promise<Behavior> => {
      const response = await fetch(`/api/pdrs/${pdrId}/behaviors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(behaviorData),
      });

      if (!response.ok) {
        throw new Error('Failed to create behavior');
      }

      const result: ApiResponse<Behavior> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdr-behaviors', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
    },
  });

  // Update behavior mutation
  const updateBehaviorMutation = useMutation({
    mutationFn: async ({ behaviorId, updates }: { behaviorId: string; updates: Partial<Behavior> }): Promise<Behavior> => {
      const response = await fetch(`/api/behaviors/${behaviorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update behavior');
      }

      const result: ApiResponse<Behavior> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdr-behaviors', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
    },
  });

  return {
    data: behaviors || [],
    isLoading,
    error: error?.message,
    createBehavior: createBehaviorMutation.mutateAsync,
    updateBehavior: updateBehaviorMutation.mutateAsync,
    isCreating: createBehaviorMutation.isPending,
    isUpdating: updateBehaviorMutation.isPending,
  };
}

// Hook for PDR history
export function useSupabasePDRHistory() {
  const { user } = useAuth();

  const { data: pdrHistory, isLoading, error } = useQuery({
    queryKey: ['user-pdr-history', user?.id],
    queryFn: async (): Promise<PDR[]> => {
      if (!user?.id) return [];
      
      const response = await fetch('/api/pdrs?limit=10');
      if (!response.ok) {
        console.error('PDR History fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch PDR history: ${response.status}`);
      }
      
      const result: PaginatedResponse<PDR> = await response.json();
      console.log('PDR History API response:', result);
      
      // Ensure we always return an array
      return Array.isArray(result.data) ? result.data : [];
    },
    enabled: !!user?.id, // Only run if user is loaded
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry failed requests to avoid caching bad responses
  });

  return {
    data: pdrHistory || [],
    isLoading,
    error: error?.message,
  };
}

// Hook for admin dashboard (CEO)
export function useSupabaseAdminDashboard() {
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      // Fetch all PDRs for admin view
      const response = await fetch('/api/pdrs?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch admin dashboard data');
      }
      
      const result: PaginatedResponse<PDR> = await response.json();
      const pdrs = result.data;

      // Process PDRs into dashboard stats
      const stats = {
        totalEmployees: new Set(pdrs.map(pdr => pdr.userId)).size,
        completedPDRs: pdrs.filter(pdr => pdr.status === 'COMPLETED').length,
        pendingReviews: pdrs.filter(pdr => ['SUBMITTED', 'UNDER_REVIEW'].includes(pdr.status)).length,
        inProgress: pdrs.filter(pdr => ['Created', 'DRAFT'].includes(pdr.status)).length,
      };

      // Get pending reviews with more details
      const pendingReviews = pdrs
        .filter(pdr => ['SUBMITTED', 'UNDER_REVIEW', 'PLAN_LOCKED'].includes(pdr.status))
        .map(pdr => ({
          id: pdr.id,
          employeeName: `${pdr.user?.firstName || ''} ${pdr.user?.lastName || ''}`.trim(),
          employeeEmail: pdr.user?.email || '',
          status: pdr.status,
          submittedAt: pdr.submittedAt || pdr.updatedAt,
          daysSinceSubmission: pdr.submittedAt 
            ? Math.floor((Date.now() - new Date(pdr.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        }));

      return {
        stats,
        pendingReviews,
        allPDRs: pdrs,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }, [queryClient]);

  return {
    data: dashboardData,
    isLoading,
    error: error?.message,
    refreshDashboard,
  };
}
