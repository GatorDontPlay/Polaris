'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MidYearReview, EndYearReview, MidYearFormData, EndYearFormData, ApiResponse } from '@/types';

// Fetch mid-year review
async function fetchMidYearReview(pdrId: string): Promise<MidYearReview | null> {
  const response = await fetch(`/api/pdrs/${pdrId}/mid-year`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Review doesn't exist yet - this is expected on first load
      // The 404 console log is normal and can be ignored
      return null;
    }
    throw new Error('Failed to fetch mid-year review');
  }

  const data: ApiResponse<MidYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch mid-year review');
  }

  return data.data!;
}

// Fetch end-year review
async function fetchEndYearReview(pdrId: string): Promise<EndYearReview | null> {
  const response = await fetch(`/api/pdrs/${pdrId}/end-year`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Review doesn't exist yet
    }
    throw new Error('Failed to fetch end-year review');
  }

  const data: ApiResponse<EndYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch end-year review');
  }

  return data.data!;
}

// Create mid-year review
async function createMidYearReview(pdrId: string, reviewData: MidYearFormData): Promise<MidYearReview> {
  const response = await fetch(`/api/pdrs/${pdrId}/mid-year`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    throw new Error('Failed to create mid-year review');
  }

  const data: ApiResponse<MidYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create mid-year review');
  }

  return data.data!;
}

// Update mid-year review
async function updateMidYearReview(pdrId: string, reviewData: Partial<MidYearFormData>): Promise<MidYearReview> {
  const response = await fetch(`/api/pdrs/${pdrId}/mid-year`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    throw new Error('Failed to update mid-year review');
  }

  const data: ApiResponse<MidYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update mid-year review');
  }

  return data.data!;
}

// Create end-year review
async function createEndYearReview(pdrId: string, reviewData: EndYearFormData): Promise<EndYearReview> {
  const response = await fetch(`/api/pdrs/${pdrId}/end-year`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    throw new Error('Failed to create end-year review');
  }

  const data: ApiResponse<EndYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create end-year review');
  }

  return data.data!;
}

// Update end-year review
async function updateEndYearReview(pdrId: string, reviewData: Partial<EndYearFormData>): Promise<EndYearReview> {
  const response = await fetch(`/api/pdrs/${pdrId}/end-year`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    throw new Error('Failed to update end-year review');
  }

  const data: ApiResponse<EndYearReview> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update end-year review');
  }

  return data.data!;
}

// Hook for fetching mid-year review
export function useMidYearReview(pdrId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['mid-year-review', pdrId],
    queryFn: () => fetchMidYearReview(pdrId!),
    enabled: options?.enabled ?? !!pdrId, // Default to !!pdrId for backward compat
    staleTime: 0, // Always refetch to prevent stale cache
    gcTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry 404s - review might not exist yet
  });
}

// Hook for fetching end-year review
export function useEndYearReview(pdrId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['end-year-review', pdrId],
    queryFn: () => fetchEndYearReview(pdrId!),
    enabled: options?.enabled ?? !!pdrId, // Default to !!pdrId for backward compat
    staleTime: 0, // Always refetch to prevent stale cache
    gcTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry 404s - review might not exist yet
  });
}

// Hook for creating/updating mid-year review
export function useMidYearReviewMutation(pdrId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (reviewData: MidYearFormData) => createMidYearReview(pdrId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mid-year-review', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (reviewData: Partial<MidYearFormData>) => updateMidYearReview(pdrId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mid-year-review', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
  };
}

// Hook for creating/updating end-year review
export function useEndYearReviewMutation(pdrId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (reviewData: EndYearFormData) => createEndYearReview(pdrId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['end-year-review', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (reviewData: Partial<EndYearFormData>) => updateEndYearReview(pdrId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['end-year-review', pdrId] });
      queryClient.invalidateQueries({ queryKey: ['pdrs', pdrId] });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
  };
}
