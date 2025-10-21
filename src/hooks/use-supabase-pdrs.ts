'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/supabase-auth-provider';
import { computeAustralianFY } from '@/lib/financial-year';
import { emergencyCleanup } from '@/lib/storage-cleanup';
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
      
      // Find active PDR - includes both editable and submitted PDRs
      // Editable statuses: Created, PLAN_LOCKED, MID_YEAR_APPROVED (employee can edit)
      // Submitted statuses: SUBMITTED, MID_YEAR_SUBMITTED, END_YEAR_SUBMITTED (read-only, under CEO review)
      // Excluded: COMPLETED (goes to history only)
      const activePDR = pdrs.find((pdr: any) => 
        pdr.status === 'Created' || 
        pdr.status === 'PLAN_LOCKED' || 
        pdr.status === 'MID_YEAR_APPROVED' ||
        pdr.status === 'SUBMITTED' ||
        pdr.status === 'MID_YEAR_SUBMITTED' ||
        pdr.status === 'END_YEAR_SUBMITTED'
      );
      
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

// Hook options for data selection
export interface UseSupabasePDROptions {
  includeGoals?: boolean;
  includeBehaviors?: boolean;
  includeReviews?: boolean;
  minimal?: boolean; // Fetch only core fields, no nested data
}

// Hook for fetching single PDR
export function useSupabasePDR(
  pdrId: string, 
  options: UseSupabasePDROptions = {}
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Default options: include everything (backward compatible)
  const {
    includeGoals = true,
    includeBehaviors = true,
    includeReviews = true,
    minimal = false,
  } = options;
  
  const { data: pdr, isLoading, error } = useQuery({
    queryKey: ['pdr', pdrId, { includeGoals, includeBehaviors, includeReviews, minimal }],
    queryFn: async (): Promise<PDR> => {
      console.log('🔍 Fetching PDR:', { 
        pdrId, 
        userId: user?.id, 
        userRole: user?.role,
        options: { includeGoals, includeBehaviors, includeReviews, minimal }
      });
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (!includeGoals) params.set('goals', 'false');
        if (!includeBehaviors) params.set('behaviors', 'false');
        if (!includeReviews) params.set('reviews', 'false');
        if (minimal) params.set('minimal', 'true');
        
        const queryString = params.toString();
        const url = `/api/pdrs/${pdrId}${queryString ? `?${queryString}` : ''}`;
        
        console.log('🔍 PDR fetch URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          // Enhanced error logging for diagnostics
          const errorBody = await response.json().catch(() => ({}));
          console.error('❌ PDR Fetch Error:', {
            status: response.status,
            statusText: response.statusText,
            pdrId,
            userId: user?.id,
            userRole: user?.role,
            errorBody,
            timestamp: new Date().toISOString()
          });
          
          // Provide more specific error messages
          if (response.status === 403) {
            throw new Error('Access denied. You do not have permission to view this PDR.');
          } else if (response.status === 404) {
            throw new Error('PDR not found. It may have been deleted or you may not have access to it.');
          } else {
            throw new Error(errorBody.error || `Failed to fetch PDR (${response.status})`);
          }
        }
        
        const result: ApiResponse<PDR> = await response.json();
        console.log('✅ PDR Fetched Successfully:', { 
          pdrId: result.data.id, 
          status: result.data.status,
          userId: result.data.userId || result.data.user_id,
          dataSize: JSON.stringify(result.data).length
        });
        
        return result.data;
      } catch (error) {
        // Check for storage quota errors
        if (error instanceof Error && 
            (error.message.includes('quota') || 
             error.message.includes('QuotaExceeded') ||
             error.message.includes('kQuotaBytes'))) {
          console.warn('🚨 Storage quota exceeded during PDR fetch - performing emergency cleanup');
          emergencyCleanup();
          
          // Retry once after cleanup with minimal data
          console.log('🔄 Retrying PDR fetch with minimal mode after cleanup...');
          const retryParams = new URLSearchParams({ minimal: 'true' });
          const retryResponse = await fetch(`/api/pdrs/${pdrId}?${retryParams}`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (retryResponse.ok) {
            const result: ApiResponse<PDR> = await retryResponse.json();
            console.log('✅ PDR fetch successful after cleanup retry (minimal mode)');
            return result.data;
          } else {
            const errorBody = await retryResponse.json().catch(() => ({}));
            throw new Error(errorBody.error || `Failed to fetch PDR after cleanup (${retryResponse.status})`);
          }
        }
        
        // Re-throw non-quota errors
        throw error;
      }
    },
    enabled: !!pdrId,
    staleTime: 0, // Always refetch to prevent stale cache buildup
    retry: false, // Don't retry - we handle it manually for quota errors
    // ULTRA-SHORT cache time to prevent storage quota issues
    gcTime: minimal ? 30 * 1000 : 60 * 1000, // 30 seconds minimal, 1 min full
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
      console.log('🎯 Creating goal with data:', goalData);
      
      const response = await fetch(`/api/pdrs/${pdrId}/goals`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        // Log the actual error response for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Goal creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || 'Failed to create goal');
      }

      const result: ApiResponse<Goal> = await response.json();
      console.log('✅ Goal created successfully:', result.data);
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
        method: 'PUT',
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

  // Create behavior mutation with deduplication
  const createBehaviorMutation = useMutation({
    mutationKey: ['create-behavior', pdrId],
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

  // Update behavior mutation with deduplication
  const updateBehaviorMutation = useMutation({
    mutationKey: ['update-behavior', pdrId],
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
      console.log('PDR History - Extracted PDRs:', pdrs?.length, pdrs?.map((p: any) => ({ 
        id: p.id, 
        status: p.status, 
        fyLabel: p.fyLabel || p.fy_label,
        createdAt: p.createdAt || p.created_at
      })));
      
      // Ensure we always return an array, sorted by creation date (newest first)
      const sortedPdrs = pdrs.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      return sortedPdrs;
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
      // Call the admin dashboard API endpoint
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin dashboard API error:', response.status, errorText);
        throw new Error(`Failed to fetch admin dashboard data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Admin dashboard API returned error:', result.error);
        throw new Error(result.error || 'Failed to fetch admin dashboard data');
      }
      
      return result.data;
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
