'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PDR, PDRWithRelations, ApiResponse, PaginatedResponse } from '@/types';

// Fetch PDRs with pagination and filters
async function fetchPDRs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  period?: string;
}): Promise<PaginatedResponse<PDR>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);
  if (params?.period) searchParams.set('period', params.period);

  const response = await fetch(`/api/pdrs?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch PDRs');
  }

  const data = await response.json();
  return data;
}

// Fetch single PDR with full details
async function fetchPDR(pdrId: string): Promise<PDRWithRelations> {
  const response = await fetch(`/api/pdrs/${pdrId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch PDR');
  }

  const data: ApiResponse<PDRWithRelations> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch PDR');
  }

  return data.data!;
}

// Create new PDR
async function createPDR(): Promise<PDR> {
  const response = await fetch('/api/pdrs', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to create PDR');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create PDR');
  }

  return data.data!;
}

// Hook for fetching PDRs list
export function usePDRs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  period?: string;
}) {
  return useQuery({
    queryKey: ['pdrs', params],
    queryFn: () => fetchPDRs(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for fetching single PDR
export function usePDR(pdrId: string | null) {
  return useQuery({
    queryKey: ['pdrs', pdrId],
    queryFn: () => fetchPDR(pdrId!),
    enabled: !!pdrId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook for creating PDR
export function useCreatePDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPDR,
    onSuccess: (newPDR) => {
      // Update the PDRs list cache
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
      
      // Add the new PDR to the cache
      queryClient.setQueryData(['pdrs', newPDR.id], newPDR);
    },
  });
}
