'use client';

import { usePDR } from '@/hooks/use-pdrs';
import { useAuth } from '@/hooks/use-auth';
import { StepperIndicator } from '@/components/pdr/stepper-indicator';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRErrorBoundary } from '@/components/ui/error-boundary';
import { ArrowLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PDR_STEPS = [
  { number: 1, title: 'Goals', description: 'Set your objectives' },
  { number: 2, title: 'Behaviors', description: 'Assess company values' },
  { number: 3, title: 'Review', description: 'Submit for review' },
  { number: 4, title: 'Mid-Year', description: 'Check-in assessment' },
  { number: 5, title: 'End-Year', description: 'Final evaluation' },
];

interface PDRLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default function PDRLayout({ children, params }: PDRLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: pdr, isLoading: pdrLoading, error } = usePDR(params.id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state
  if (authLoading || pdrLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PDR...</p>
        </div>
      </div>
    );
  }

  // Handle error or not found
  if (error || !pdr) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">PDR Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              The PDR you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user can access this PDR
  if (user?.role !== 'CEO' && pdr.userId !== user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You don't have permission to access this PDR.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStepClick = (step: number) => {
    // Only allow navigation to completed steps or current step
    if (step <= pdr.currentStep && !pdr.isLocked) {
      const stepPaths = {
        1: `/pdr/${pdr.id}/goals`,
        2: `/pdr/${pdr.id}/behaviors`,
        3: `/pdr/${pdr.id}/review`,
        4: `/pdr/${pdr.id}/mid-year`,
        5: `/pdr/${pdr.id}/end-year`,
      };
      
      const path = stepPaths[step as keyof typeof stepPaths];
      if (path) {
        router.push(path);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {pdr.period?.name || 'PDR Review'}
                </h1>
                <p className="text-sm text-gray-600">
                  {pdr.user?.firstName} {pdr.user?.lastName} - Performance & Development Review
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {pdr.isLocked && (
                <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  <Lock className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Locked</span>
                </div>
              )}
              <PDRStatusBadge status={pdr.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <StepperIndicator
            currentStep={pdr.currentStep}
            totalSteps={PDR_STEPS.length}
            steps={PDR_STEPS}
            {...(!pdr.isLocked && { onStepClick: handleStepClick })}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PDRErrorBoundary>
          {children}
        </PDRErrorBoundary>
      </div>
    </div>
  );
}
