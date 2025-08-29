'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRole } from '@/providers/supabase-auth-provider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { NotificationIcon } from '@/components/ui/notification-icon';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isEmployee, isCEO } = useRole();
  
  console.log('AdminLayout Debug:', { 
    user, 
    isAuthenticated: !!user, 
    isLoading,
    userRole: user?.role,
    isEmployee,
    isCEO,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'server'
  });

  // Redirect if not authenticated or not CEO
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (isEmployee) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, user, router, isEmployee]);

  // Show loading state
  if (isLoading) {
    console.log('AdminLayout: Rendering loading state');
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded shadow">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          <p className="text-xs text-gray-400">Auth check in progress</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    console.log('AdminLayout: Not authenticated, redirecting...');
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded shadow">
          <p className="text-red-600 mb-2">Not authenticated</p>
          <p className="text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!isCEO) {
    console.log('AdminLayout: Not CEO role, user role:', user?.role);
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded shadow">
          <p className="text-yellow-600 mb-2">Access denied</p>
          <p className="text-sm">CEO role required. Your role: {user?.role}</p>
        </div>
      </div>
    );
  }

  console.log('AdminLayout: Rendering main layout for CEO');
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 relative">
          <div className="absolute top-4 right-4 z-50">
            <NotificationIcon />
          </div>
          <div className="flex h-full flex-col overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
