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
  
  if (params?.page) {searchParams.set('page', params.page.toString());}
  if (params?.limit) {searchParams.set('limit', params.limit.toString());}
  if (params?.status) {searchParams.set('status', params.status);}
  if (params?.period) {searchParams.set('period', params.period);}

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

// Submit PDR for review
async function submitPDRForReview(pdrId: string): Promise<PDR> {
  const response = await fetch(`/api/pdrs/${pdrId}/submit-for-review`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit PDR for review');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to submit PDR for review');
  }

  return data.data!;
}

// Submit CEO review
async function submitCEOReview(pdrId: string): Promise<PDR> {
  const response = await fetch(`/api/pdrs/${pdrId}/submit-ceo-review`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit CEO review');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to submit CEO review');
  }

  return data.data!;
}

// Mark PDR meeting as booked
async function markPDRAsBooked(pdrId: string): Promise<PDR> {
  const response = await fetch(`/api/pdrs/${pdrId}/mark-booked`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to mark PDR as booked');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to mark PDR as booked');
  }

  return data.data!;
}

// Update PDR (draft saves)
async function updatePDR(pdrId: string, updateData: Partial<PDR>): Promise<PDR> {
  const response = await fetch(`/api/pdrs/${pdrId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update PDR');
  }

  const data: ApiResponse<PDR> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update PDR');
  }

  return data.data!;
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

// Hook for updating PDR (draft saves)
export function useUpdatePDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pdrId, updateData }: { pdrId: string; updateData: Partial<PDR> }) =>
      updatePDR(pdrId, updateData),
    onSuccess: (updatedPDR) => {
      // Update the specific PDR cache
      queryClient.setQueryData(['pdrs', updatedPDR.id], updatedPDR);
      
      // Invalidate PDRs list to refresh
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });
}

// Hook for submitting PDR for review
export function useSubmitPDRForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPDRForReview,
    onSuccess: (updatedPDR) => {
      // Update the specific PDR cache
      queryClient.setQueryData(['pdrs', updatedPDR.id], updatedPDR);
      
      // Invalidate PDRs list to refresh status
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });
}

// Hook for submitting CEO review
export function useSubmitCEOReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitCEOReview,
    onSuccess: (updatedPDR) => {
      // Update the specific PDR cache
      queryClient.setQueryData(['pdrs', updatedPDR.id], updatedPDR);
      
      // Invalidate PDRs list and notifications to refresh
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook for marking PDR as booked
export function useMarkPDRAsBooked() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markPDRAsBooked,
    onSuccess: (updatedPDR) => {
      // Update the specific PDR cache
      queryClient.setQueryData(['pdrs', updatedPDR.id], updatedPDR);
      
      // Invalidate PDRs list to refresh status
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });
}
