'use client';

import { useSupabasePDR } from '@/hooks/use-supabase-pdrs';
import { useAuth } from '@/providers/supabase-auth-provider';
import { StepperIndicator } from '@/components/pdr/stepper-indicator';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRErrorBoundary } from '@/components/ui/error-boundary';
import { ArrowLeft, Lock, Trash2, MoreVertical } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPDRDisplayName } from '@/lib/financial-year';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

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
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    data: pdr, 
    isLoading: pdrLoading, 
    error,
    deletePDR,
    isDeleting,
    deleteError 
  } = useSupabasePDR(params.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper function to determine effective current step based on current page
  const getEffectiveCurrentStep = (actualCurrentStep: number) => {
    // If user is on review page, show step 3 as current (which makes steps 1&2 completed)
    if (pathname?.includes('/review')) {
      return Math.max(actualCurrentStep, 3);
    }
    // If user is on behaviors page, show step 2 as current (which makes step 1 completed)
    if (pathname?.includes('/behaviors')) {
      return Math.max(actualCurrentStep, 2);
    }
    // If user is on mid-year page, show step 4 as current
    if (pathname?.includes('/mid-year')) {
      return Math.max(actualCurrentStep, 4);
    }
    // If user is on end-year page, show step 5 as current
    if (pathname?.includes('/end-year')) {
      return Math.max(actualCurrentStep, 5);
    }
    // Default to actual current step
    return actualCurrentStep;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Show loading state
  if (authLoading || pdrLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading PDR...</p>
        </div>
      </div>
    );
  }

  // Handle error or not found
  // Note: RLS policies enforce access control at the database level
  // If the PDR exists but user doesn't have access, RLS returns no rows
  // So we only need to check for error or missing PDR
  if (error || !pdr) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-status-error">PDR Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
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

  const handleStepClick = (step: number) => {
    // Only allow navigation to completed steps or current step
    if (step <= pdr.currentStep && !pdr.isLocked) {
      // Allow navigation to mid-year when in SUBMITTED state
      // Mid-year is accessible after submission
      if (false) { // Disabled this check to allow mid-year access
        console.log('Mid-year review is now accessible after PDR submission');
        return;
      }
      
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

  const handleDeletePdr = async () => {
    try {
      // Call the delete function from the hook
      await deletePDR();
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      // Navigate back to dashboard on success
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete PDR:', error);
      // The error will be shown in the modal via deleteError
      // Keep the modal open to show the error
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
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
                                       <h1 className="text-2xl font-bold text-foreground">
                         {pdr.fyLabel ? getPDRDisplayName(pdr.fyLabel) : (pdr.period?.name || 'PDR Review')}
                       </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {pdr.isLocked && (
                <div className="flex items-center text-status-warning bg-status-warning/10 px-3 py-1 rounded-full">
                  <Lock className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Locked</span>
                </div>
              )}
              <PDRStatusBadge status={pdr.status} />
              
              {/* PDR Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-status-error focus:text-status-error"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete PDR
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {console.log('🚀 PDR Layout - About to render stepper with:', {
            currentStep: getEffectiveCurrentStep(pdr.currentStep),
            actualCurrentStep: pdr.currentStep,
            pdrStatus: pdr.status,
            pathname
          })}
          <StepperIndicator
            currentStep={getEffectiveCurrentStep(pdr.currentStep)}
            totalSteps={PDR_STEPS.length}
            steps={PDR_STEPS}
            pdrStatus={pdr.status}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-status-error">Delete PDR</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete this PDR? This action cannot be undone and will remove all your goals, behaviors, and progress.
              </p>
              
              {/* Show error message if deletion failed */}
              {deleteError && (
                <div className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-md">
                  <p className="text-status-error text-sm">{deleteError}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeletePdr}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete PDR
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
