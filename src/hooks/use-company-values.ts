'use client';

import { useQuery } from '@tanstack/react-query';
import { CompanyValue, ApiResponse } from '@/types';

async function fetchCompanyValues(): Promise<CompanyValue[]> {
  const response = await fetch('/api/company-values', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch company values');
  }

  const data: ApiResponse<CompanyValue[]> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch company values');
  }

  return data.data!;
}

export function useCompanyValues() {
  return useQuery({
    queryKey: ['company-values'],
    queryFn: fetchCompanyValues,
    staleTime: 10 * 60 * 1000, // 10 minutes (company values change rarely)
  });
}
