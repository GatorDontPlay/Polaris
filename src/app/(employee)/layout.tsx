'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { EmployeeSidebar } from '@/components/dashboard/employee-sidebar';

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useDemoAuth();
  
  // Debug logs (can be removed in production)
  console.log('EmployeeLayout:', { 
    isAuthenticated, 
    isLoading,
    userRole: user?.role
  });

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    console.log('EmployeeLayout useEffect triggered:', { isLoading, isAuthenticated, userRole: user?.role });
    
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to home');
        window.location.href = '/';
        return;
      } 
      if (user?.role === 'CEO') {
        console.log('CEO user detected, redirecting to admin');
        window.location.href = '/admin';
        return;
      }
      
      console.log('Employee layout: User authenticated as', user?.role);
    }
  }, [isLoading, isAuthenticated, user, router]);

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
  if (!isAuthenticated) {
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
  if (user?.role !== 'EMPLOYEE') {
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
        <SidebarInset className="flex-1 overflow-auto">
          <div className="flex min-h-full flex-col">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
