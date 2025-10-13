'use client';

import { useQuery } from '@tanstack/react-query';
import { CompanyValue, ApiResponse } from '@/types';

async function fetchCompanyValues(): Promise<CompanyValue[]> {
  console.log('🔍 [HOOK] Fetching company values...');
  
  const response = await fetch('/api/company-values', {
    credentials: 'include',
  });

  console.log('🔍 [HOOK] Company values response:', { 
    ok: response.ok, 
    status: response.status, 
    statusText: response.statusText 
  });

  if (!response.ok) {
    console.error('🚨 [HOOK] Company values fetch failed:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('🚨 [HOOK] Error response body:', errorText);
    throw new Error('Failed to fetch company values');
  }

  const data: ApiResponse<CompanyValue[]> = await response.json();
  console.log('🔍 [HOOK] Company values API response:', data);
  
  if (!data.success) {
    console.error('🚨 [HOOK] Company values API error:', data.error);
    throw new Error(data.error || 'Failed to fetch company values');
  }

  console.log('🔍 [HOOK] Company values result:', {
    dataType: typeof data.data,
    isArray: Array.isArray(data.data),
    length: data.data?.length,
    firstItem: data.data?.[0],
    allData: data.data
  });
  
  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    console.warn('⚠️ [HOOK] No company values returned from API');
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
