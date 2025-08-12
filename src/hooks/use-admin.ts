'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, PDR, ApiResponse, PaginatedResponse } from '@/types';

// CEO Dashboard data interface
export interface CEODashboardData {
  stats: {
    totalEmployees: number;
    pendingReviews: number;
    completedPDRs: number;
    overduePDRs: number;
    averageRating: number;
    averageGoalRating: number;
    averageBehaviorRating: number;
  };
  recentActivity: ActivityItem[];
  pendingReviews: PDR[];
  statusDistribution: StatusDistribution[];
}

export interface ActivityItem {
  id: string;
  type: 'pdr_submitted' | 'review_completed' | 'deadline_approaching' | 'goal_added' | 'behavior_assessed';
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  pdr?: Pick<PDR, 'id' | 'status'>;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface StatusDistribution {
  status: PDR['status'];
  count: number;
  percentage: number;
}

export interface EmployeeOverview extends User {
  pdrs: (PDR & {
    period: { name: string; startDate: Date; endDate: Date };
    _count: {
      goals: number;
      behaviors: number;
    };
    averageGoalRating?: number;
    averageBehaviorRating?: number;
  })[];
  latestPDR?: PDR;
  totalPDRs: number;
  completedPDRs: number;
  averageRating: number;
}

// Fetch CEO dashboard data
async function fetchCEODashboard(): Promise<CEODashboardData> {
  const response = await fetch('/api/admin/dashboard', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CEO dashboard data');
  }

  const data: ApiResponse<CEODashboardData> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch CEO dashboard data');
  }

  return data.data!;
}

// Fetch all employees with PDR overview
async function fetchEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}): Promise<PaginatedResponse<EmployeeOverview>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) {searchParams.set('page', params.page.toString());}
  if (params?.limit) {searchParams.set('limit', params.limit.toString());}
  if (params?.search) {searchParams.set('search', params.search);}
  if (params?.role) {searchParams.set('role', params.role);}
  if (params?.status) {searchParams.set('status', params.status);}

  const response = await fetch(`/api/admin/employees?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }

  const data = await response.json();
  return data;
}

// Fetch all PDRs for admin view
async function fetchAllPDRs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  period?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PaginatedResponse<PDR>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) {searchParams.set('page', params.page.toString());}
  if (params?.limit) {searchParams.set('limit', params.limit.toString());}
  if (params?.status) {searchParams.set('status', params.status);}
  if (params?.period) {searchParams.set('period', params.period);}
  if (params?.search) {searchParams.set('search', params.search);}
  if (params?.sortBy) {searchParams.set('sortBy', params.sortBy);}
  if (params?.sortOrder) {searchParams.set('sortOrder', params.sortOrder);}

  const response = await fetch(`/api/admin/pdrs?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch PDRs');
  }

  const data = await response.json();
  return data;
}

// Update PDR (CEO actions like lock/unlock, status changes)
async function updatePDR(pdrId: string, updates: {
  status?: PDR['status'];
  isLocked?: boolean;
  currentStep?: number;
}): Promise<PDR> {
  const response = await fetch(`/api/admin/pdrs/${pdrId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update PDR');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update PDR');
  }

  return data.data!;
}

// Bulk update PDRs
async function bulkUpdatePDRs(pdrIds: string[], updates: {
  status?: PDR['status'];
  isLocked?: boolean;
}): Promise<{ updated: number; errors: string[] }> {
  const response = await fetch('/api/admin/pdrs/bulk', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdrIds,
      updates,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to bulk update PDRs');
  }

  const data = await response.json();
  return data;
}

// Hook for CEO dashboard
export function useCEODashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchCEODashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Hook for employees list
export function useEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'employees', params],
    queryFn: () => fetchEmployees(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

// Hook for all PDRs (admin view)
export function useAllPDRs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  period?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['admin', 'pdrs', params],
    queryFn: () => fetchAllPDRs(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

// Hook for updating PDR
export function useUpdatePDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pdrId, updates }: { pdrId: string; updates: any }) =>
      updatePDR(pdrId, updates),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdrs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', data.id] });
    },
  });
}

// Hook for bulk PDR operations
export function useBulkUpdatePDRs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pdrIds, updates }: { pdrIds: string[]; updates: any }) =>
      bulkUpdatePDRs(pdrIds, updates),
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });
}
