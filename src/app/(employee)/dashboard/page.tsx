'use client';

import { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import { usePDRs, useCreatePDR } from '@/hooks/use-pdrs';
import { useAuth } from '@/hooks/use-auth';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { CurrentPDRCard } from '@/components/dashboard/current-pdr-card';
import { PDRHistoryTable } from '@/components/dashboard/pdr-history-table';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo } from 'react';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: pdrsResponse, isLoading: pdrsLoading } = usePDRs();
  const createPDRMutation = useCreatePDR();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!pdrsResponse?.data) {
      return {
        completedPDRs: 0,
        currentGoals: 0,
        averageRating: 0,
        pendingActions: 0,
      };
    }

    const pdrs = pdrsResponse.data;
    const completedPDRs = pdrs.filter(pdr => pdr.status === 'COMPLETED').length;
    
    // Calculate current goals from active PDR
    const activePDR = pdrs.find(pdr => 
      pdr.status !== 'COMPLETED' && pdr.status !== 'LOCKED'
    );
    const currentGoals = activePDR?.goals?.length || 0;

    // Calculate average rating from completed PDRs
    const completedPDRsWithRatings = pdrs.filter(pdr => 
      pdr.status === 'COMPLETED' && pdr.endYearReview?.ceoOverallRating
    );
    const averageRating = completedPDRsWithRatings.length > 0
      ? completedPDRsWithRatings.reduce((sum, pdr) => 
          sum + (pdr.endYearReview?.ceoOverallRating || 0), 0
        ) / completedPDRsWithRatings.length
      : 0;

    // Calculate pending actions
    const pendingActions = pdrs.filter(pdr => 
      pdr.status === 'DRAFT' || pdr.status === 'SUBMITTED'
    ).length;

    return {
      completedPDRs,
      currentGoals,
      averageRating: Math.round(averageRating * 10) / 10,
      pendingActions,
    };
  }, [pdrsResponse]);

  // Find current active PDR
  const currentPDR = useMemo(() => {
    if (!pdrsResponse?.data) return null;
    return pdrsResponse.data.find(pdr => 
      pdr.status !== 'COMPLETED' && pdr.status !== 'LOCKED'
    ) || null;
  }, [pdrsResponse]);

  // Get PDR history (all PDRs sorted by most recent)
  const pdrHistory = useMemo(() => {
    if (!pdrsResponse?.data) return [];
    return pdrsResponse.data.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [pdrsResponse]);

  const handleCreatePDR = async () => {
    try {
      const newPDR = await createPDRMutation.mutateAsync();
      router.push(`/pdr/${newPDR.id}`);
    } catch (error) {
      console.error('Failed to create PDR:', error);
      // TODO: Show error toast
    }
  };

  const handleContinuePDR = (pdrId: string) => {
    router.push(`/pdr/${pdrId}`);
  };

  const handleViewPDR = (pdrId: string) => {
    router.push(`/pdr/${pdrId}/view`);
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your performance and development reviews
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="mb-8">
          <DashboardStats 
            stats={dashboardStats} 
            isLoading={pdrsLoading}
          />
        </div>

        {/* Current PDR */}
        <div className="mb-8">
          <CurrentPDRCard
            pdr={currentPDR}
            onContinue={handleContinuePDR}
            onCreate={handleCreatePDR}
            isLoading={pdrsLoading || createPDRMutation.isPending}
          />
        </div>

        {/* PDR History */}
        <PDRHistoryTable
          pdrs={pdrHistory}
          onView={handleViewPDR}
          onContinue={handleContinuePDR}
          isLoading={pdrsLoading}
        />
      </div>
    </div>
  );
}
