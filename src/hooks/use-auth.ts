'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { AuthUser } from '@/types';

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null; // User not authenticated
      }
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();
    return data.success ? data.data.user : null;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

export function useAuth() {
  const { user, isAuthenticated, setUser, setLoading, login, logout } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update user state when data changes
  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (error) {
      setUser(null);
    }
  }, [data, error, setUser]);

  return {
    user: (data || user) as AuthUser | null,
    isAuthenticated: !!data || isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refresh: () => {
      // This will be handled by React Query refetch
    },
  };
}
