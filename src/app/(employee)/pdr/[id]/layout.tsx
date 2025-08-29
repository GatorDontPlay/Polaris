'use client';

import { useDemoPDR } from '@/hooks/use-demo-pdr';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { StepperIndicator } from '@/components/pdr/stepper-indicator';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRErrorBoundary } from '@/components/ui/error-boundary';
import { ArrowLeft, Lock, Trash2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const { user, isAuthenticated, isLoading: authLoading } = useDemoAuth();
  const { data: pdr, isLoading: pdrLoading, error, deletePdr } = useDemoPDR(params.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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

  // Check if user can access this PDR
  if (user?.role !== 'CEO' && pdr.userId !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-status-error">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
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

  const handleDeletePdr = () => {
    deletePdr();
    router.push('/dashboard');
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
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeletePdr}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete PDR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
