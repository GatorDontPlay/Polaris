'use client';

import { useCallback, useEffect } from 'react';
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
      const response = await fetch('/api/pdrs?limit=10', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Dashboard PDR fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch PDRs');
      }
      
      const result: PaginatedResponse<PDR> = await response.json();
      console.log('Dashboard API response:', result);
      console.log('Dashboard - Raw response data:', result.data);
      console.log('Dashboard - Data type:', typeof result.data);
      console.log('Dashboard - Is array:', Array.isArray(result.data));
      console.log('Dashboard - Data length:', result.data?.length);
      
      // Fix: Handle nested data structure - API returns {data: {data: Array, pagination: {}}}
      const pdrs = Array.isArray(result.data) ? result.data : (result.data as any)?.data || [];
      
      // Debug: Log what PDRs are returned
      console.log('Dashboard PDRs received:', pdrs?.map((p: any) => ({ 
        id: p.id, 
        fyLabel: p.fyLabel || p.fy_label, 
        status: p.status,
        currentStep: p.currentStep || p.current_step
      })));
      
      // Find active PDR (any non-closed PDR, regardless of FY)
      // This allows users to work on future FY PDRs or complete past FY PDRs
      const activePDR = pdrs.find((pdr: any) => pdr.status !== 'CLOSED');
      
      // Also log current FY for debugging
      const currentFY = computeAustralianFY();
      const currentFYPDR = pdrs.find((pdr: any) => (pdr.fyLabel || pdr.fy_label) === currentFY.label);
      
      console.log('PDR Search Results:', { 
        currentFY: currentFY.label,
        totalPDRs: pdrs.length,
        activePDR: activePDR ? { 
          id: activePDR.id, 
          fyLabel: activePDR.fyLabel || activePDR.fy_label, 
          status: activePDR.status,
          currentStep: activePDR.currentStep || activePDR.current_step
        } : null,
        currentFYPDR: currentFYPDR ? { 
          id: currentFYPDR.id, 
          fyLabel: currentFYPDR.fyLabel || currentFYPDR.fy_label, 
          status: currentFYPDR.status,
          currentStep: currentFYPDR.currentStep || currentFYPDR.current_step
        } : null,
        allPDRStatuses: pdrs.map((p: any) => ({ 
          fyLabel: p.fyLabel || p.fy_label, 
          status: p.status,
          currentStep: p.currentStep || p.current_step
        }))
      });
      
      // Ensure field consistency for the returned PDR
      if (activePDR) {
        console.log('Dashboard - Processing active PDR:', {
          id: activePDR.id,
          goals: activePDR.goals?.length || 0,
          behaviors: activePDR.behaviors?.length || 0,
          currentStep: activePDR.currentStep || activePDR.current_step
        });
        
        return {
          ...activePDR,
          currentStep: activePDR.currentStep || activePDR.current_step || 1,
          fyLabel: activePDR.fyLabel || activePDR.fy_label,
          isLocked: activePDR.isLocked !== undefined ? activePDR.isLocked : activePDR.is_locked,
          meetingBooked: activePDR.meetingBooked !== undefined ? activePDR.meetingBooked : activePDR.meeting_booked,
          // Ensure goals and behaviors are properly accessible
          goals: activePDR.goals || [],
          behaviors: activePDR.behaviors || [],
          midYearReview: activePDR.midYearReview || activePDR.mid_year_review,
          endYearReview: activePDR.endYearReview || activePDR.end_year_review,
        };
      }
      
      return null;
    },
    enabled: !!user?.id, // Only run if user is loaded
    staleTime: 30 * 1000, // 30 seconds
  });

  // Listen for PDR updates to invalidate cache
  useEffect(() => {
    const handlePDRUpdate = (event: CustomEvent) => {
      console.log('PDR updated, invalidating cache:', event.detail);
      queryClient.invalidateQueries({ queryKey: ['user-current-pdr', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pdr', event.detail?.pdrId] });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pdr-updated', handlePDRUpdate as EventListener);
      
      return () => {
        window.removeEventListener('pdr-updated', handlePDRUpdate as EventListener);
      };
    }
    
    // Return undefined explicitly for the other path
    return undefined;
  }, [queryClient, user?.id]);

  // Create PDR mutation
  const createPDRMutation = useMutation({
    mutationFn: async (financialYear?: { label: string; startDate: Date; endDate: Date }): Promise<PDR> => {
      const response = await fetch('/api/pdrs', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(financialYear ? {
          fyLabel: financialYear.label,
          fyStartDate: financialYear.startDate.toISOString().split('T')[0],
          fyEndDate: financialYear.endDate.toISOString().split('T')[0],
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
  const queryClient = useQueryClient();
  
  const { data: pdr, isLoading, error } = useQuery({
    queryKey: ['pdr', pdrId],
    queryFn: async (): Promise<PDR> => {
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch PDR');
      }
      const result: ApiResponse<PDR> = await response.json();
      return result.data;
    },
    enabled: !!pdrId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Delete PDR mutation
  const deletePDRMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete PDR: ${response.status}`);
      }

      // Return void as we don't need the response data
      return;
    },
    onSuccess: () => {
      // Invalidate all PDR-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['user-current-pdr'] });
      queryClient.invalidateQueries({ queryKey: ['user-pdr-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      
      // Remove the specific PDR from cache as it no longer exists
      queryClient.removeQueries({ queryKey: ['pdr', pdrId] });
    },
    onError: (error) => {
      console.error('Failed to delete PDR:', error);
    },
  });

  return {
    data: pdr,
    isLoading,
    error: error?.message,
    deletePDR: deletePDRMutation.mutateAsync,
    isDeleting: deletePDRMutation.isPending,
    deleteError: deletePDRMutation.error?.message,
  };
}

// Hook for PDR goals
export function useSupabasePDRGoals(pdrId: string) {
  const queryClient = useQueryClient();

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['pdr-goals', pdrId],
    queryFn: async (): Promise<Goal[]> => {
      const response = await fetch(`/api/pdrs/${pdrId}/goals`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
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
        credentials: 'include',
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
        credentials: 'include',
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
        credentials: 'include',
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
      const response = await fetch(`/api/pdrs/${pdrId}/behaviors`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
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
        credentials: 'include',
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
        credentials: 'include',
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
      
      const response = await fetch('/api/pdrs?limit=10', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('PDR History fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch PDR history: ${response.status}`);
      }
      
      const result: PaginatedResponse<PDR> = await response.json();
      console.log('PDR History API response:', result);
      console.log('PDR History - Raw response data:', result.data);
      console.log('PDR History - Data type:', typeof result.data);
      console.log('PDR History - Is array:', Array.isArray(result.data));
      console.log('PDR History - Data length:', result.data?.length);
      
      // Fix: Handle nested data structure - API returns {data: {data: Array, pagination: {}}}
      const pdrs = Array.isArray(result.data) ? result.data : (result.data as any)?.data || [];
      console.log('PDR History - Extracted PDRs:', pdrs?.length, pdrs?.map((p: any) => ({ id: p.id, status: p.status })));
      
      // Ensure we always return an array
      return pdrs;
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
      const response = await fetch('/api/pdrs?limit=100', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
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

/**
 * Hook to update PDR properties like currentStep
 */
export function useSupabasePDRUpdate(pdrId: string) {
  const queryClient = useQueryClient();

  const updatePDRMutation = useMutation({
    mutationFn: async (updates: { currentStep?: number; status?: string }) => {
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update PDR');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate and refetch PDR data
      queryClient.invalidateQueries({ queryKey: ['pdr', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['user-current-pdr'] });
      queryClient.invalidateQueries({ queryKey: ['user-pdr-history'] });
    },
  });

  return {
    updatePDR: updatePDRMutation.mutateAsync,
    isUpdating: updatePDRMutation.isPending,
    error: updatePDRMutation.error?.message,
  };
}
