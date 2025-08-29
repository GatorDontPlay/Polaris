'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRole } from '@/providers/supabase-auth-provider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { EmployeeSidebar } from '@/components/dashboard/employee-sidebar';
import { NotificationIcon } from '@/components/ui/notification-icon';

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isEmployee, isCEO } = useRole();
  
  // Debug logs (can be removed in production)
  console.log('EmployeeLayout:', { 
    isAuthenticated: !!user, 
    isLoading,
    userRole: user?.role,
    isEmployee,
    isCEO
  });

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    console.log('EmployeeLayout useEffect triggered:', { isLoading, isAuthenticated: !!user, userRole: user?.role });
    
    if (!isLoading) {
      if (!user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
        return;
      } 
      if (isCEO) {
        console.log('CEO user detected, redirecting to admin');
        router.push('/admin');
        return;
      }
      
      console.log('Employee layout: User authenticated as', user?.role);
    }
  }, [isLoading, user, router, isCEO]);

  // Show loading state
  if (isLoading) {
    console.log('EmployeeLayout: Showing loading state');
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded shadow">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          <p className="text-xs text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or redirecting
  if (!user) {
    console.log('EmployeeLayout: Not authenticated, showing redirect message');
    return (
      <div className="flex h-screen items-center justify-center bg-red-50">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded shadow">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          <p className="text-xs text-gray-400">Not authenticated</p>
        </div>
      </div>
    );
  }

  // Don't render if wrong role
  if (!isEmployee) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <EmployeeSidebar />
        <SidebarInset className="flex-1 overflow-auto relative">
          <div className="absolute top-4 right-4 z-50">
            <NotificationIcon />
          </div>
          <div className="flex min-h-full flex-col">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
