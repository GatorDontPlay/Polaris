'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/types';

interface DemoAuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useDemoAuth() {
  const router = useRouter();
  const [state, setState] = useState<DemoAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for demo user in localStorage
    const demoUser = localStorage.getItem('demo_user');
    if (demoUser) {
      try {
        const user = JSON.parse(demoUser);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('demo_user');
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('demo_user');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/login');
  };

  const login = (email: string, role: 'EMPLOYEE' | 'CEO') => {
    const user = {
      id: `demo-${role.toLowerCase()}-1`,
      email,
      firstName: role === 'CEO' ? 'CEO' : 'Employee',
      lastName: 'Demo',
      role,
    };

    localStorage.setItem('demo_user', JSON.stringify(user));
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  return {
    ...state,
    login,
    logout,
  };
}
