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
    // Add a small delay to ensure client-side hydration is complete
    const checkAuth = () => {
      try {
        // Check for demo user in localStorage
        const demoUser = localStorage.getItem('demo_user');
        console.log('Demo auth check:', { demoUser: !!demoUser });
        
        if (demoUser) {
          try {
            const user = JSON.parse(demoUser);
            console.log('Demo user found:', user);
            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            console.log('Error parsing demo user:', error);
            localStorage.removeItem('demo_user');
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          console.log('No demo user found');
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.log('localStorage error:', error);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    // Small delay to ensure we're on the client
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
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
