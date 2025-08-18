'use client';

import { useRouter } from 'next/navigation';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { useDemoPDRDashboard, useDemoPDRHistory } from '@/hooks/use-demo-pdr';
import { useDemoUserActivity } from '@/hooks/use-demo-activity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecentActivity } from '@/components/admin/recent-activity';
import { useEffect, useState } from 'react';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { getPDRDisplayName } from '@/lib/financial-year';
import { FinancialYearSelectionDialog, FinancialYearOption } from '@/components/pdr/financial-year-selection-dialog';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useDemoAuth();
  
  console.log('EmployeeDashboard - Auth Debug:', { 
    user, 
    isAuthenticated, 
    authLoading,
    userRole: user?.role 
  });
  
  // Get current user's PDRs using demo system
  const { data: currentPDR, createPDR, isLoading: pdrLoading } = useDemoPDRDashboard();
  const { data: pdrHistory, isLoading: historyLoading } = useDemoPDRHistory();
  const { data: userActivity, isLoading: activityLoading } = useDemoUserActivity(5);
  const [isCreatingPDR, setIsCreatingPDR] = useState(false);
  const [showFYDialog, setShowFYDialog] = useState(false);
  
  console.log('EmployeeDashboard - PDR Debug:', { 
    currentPDR, 
    pdrLoading,
    hasPDR: !!currentPDR 
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Calculate dashboard stats from real data
  const calculateDashboardStats = () => {
    // Active Goals - count goals from current PDR
    const activeGoals = currentPDR ? (() => {
      const savedGoals = localStorage.getItem(`demo_goals_${currentPDR.id}`);
      if (savedGoals) {
        try {
          const goals = JSON.parse(savedGoals);
          return Array.isArray(goals) ? goals.length : 0;
        } catch {
          return 0;
        }
      }
      return 0;
    })() : 0;

    // Completed PDRs - count PDRs with COMPLETED status
    const completedPDRs = pdrHistory ? pdrHistory.filter(pdr => pdr.status === 'COMPLETED').length : 0;

    // Average Rating - calculate from completed PDRs with ratings
    const averageRating = pdrHistory ? (() => {
      const ratedPDRs = pdrHistory.filter(pdr => pdr.status === 'COMPLETED');
      if (ratedPDRs.length === 0) return 0;
      
      let totalRating = 0;
      let ratingCount = 0;
      
      ratedPDRs.forEach(pdr => {
        // Check for end year review rating
        if (pdr.endYearReview?.ceoOverallRating) {
          totalRating += pdr.endYearReview.ceoOverallRating;
          ratingCount++;
        }
        // Also check individual goal ratings as fallback
        const savedGoals = localStorage.getItem(`demo_goals_${pdr.id}`);
        if (savedGoals) {
          try {
            const goals = JSON.parse(savedGoals);
            goals.forEach((goal: any) => {
              if (goal.employeeRating) {
                totalRating += goal.employeeRating;
                ratingCount++;
              }
            });
          } catch {}
        }
      });
      
      return ratingCount > 0 ? totalRating / ratingCount : 0;
    })() : 0;

    // Days Until Due - calculate based on current PDR period or default
    const daysUntilDue = currentPDR && currentPDR.period ? (() => {
      const endDate = new Date(currentPDR.period.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    })() : (() => {
      // Default: assume PDR is due at end of current year
      const endOfYear = new Date(new Date().getFullYear(), 11, 31);
      const today = new Date();
      const diffTime = endOfYear.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    })();

    return {
      activeGoals,
      completedPDRs,
      averageRating: Number(averageRating.toFixed(1)),
      daysUntilDue
    };
  };

  const stats = calculateDashboardStats();

  // Handle PDR creation
  const handleCreatePDR = async () => {
    // Show financial year selection dialog
    setShowFYDialog(true);
  };

  // Handle financial year confirmation
  const handleFYConfirm = async (selectedFY: FinancialYearOption) => {
    setIsCreatingPDR(true);
    setShowFYDialog(false);
    
    try {
      // Create a new PDR using demo system with selected financial year
      const newPDR = createPDR(selectedFY);
      if (newPDR) {
        router.push(`/pdr/${newPDR.id}/goals`);
      } else {
        console.error('Failed to create PDR');
      }
    } catch (error) {
      console.error('Failed to create PDR:', error);
    } finally {
      setIsCreatingPDR(false);
    }
  };

  // Handle financial year selection cancellation
  const handleFYCancel = () => {
    setShowFYDialog(false);
  };

  // Handle continue PDR
  const handleContinuePDR = () => {
    if (currentPDR) {
      // Navigate based on current step
      const stepPaths = {
        1: `/pdr/${currentPDR.id}/goals`,
        2: `/pdr/${currentPDR.id}/behaviors`, 
        3: `/pdr/${currentPDR.id}/review`,
        4: `/pdr/${currentPDR.id}/mid-year`,
        5: `/pdr/${currentPDR.id}/end-year`,
      };
      
      const currentPath = stepPaths[currentPDR.currentStep as keyof typeof stepPaths] || `/pdr/${currentPDR.id}/goals`;
      router.push(currentPath);
    }
  };

  // Show loading state
  if (authLoading) {
    console.log('EmployeeDashboard: Auth still loading');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (pdrLoading) {
    console.log('EmployeeDashboard: PDRs still loading');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading PDRs...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your performance and development reviews
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold">{stats.activeGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed PDRs</p>
                  <p className="text-2xl font-bold">{stats.completedPDRs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating > 0 ? stats.averageRating : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Days Until Due</p>
                  <p className="text-2xl font-bold">{stats.daysUntilDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current PDR & Recent Activity Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current PDR - Takes 2 columns */}
          {currentPDR ? (
            <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Current PDR - 2024 Annual Review
              </CardTitle>
              <CardDescription>
                {currentPDR.status === 'SUBMITTED' 
                  ? 'Your PDR has been submitted and is awaiting CEO review'
                  : currentPDR.status === 'UNDER_REVIEW'
                  ? 'Your PDR is currently under review by the CEO'
                  : currentPDR.status === 'COMPLETED'
                  ? 'Your PDR review process has been completed'
                  : 'Complete your performance development review for this cycle'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Modern Progress and Pills */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 mr-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(currentPDR.status === 'SUBMITTED' ? 3 : currentPDR.currentStep) / 5 * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-foreground/80 font-medium whitespace-nowrap">
                      {currentPDR.status === 'SUBMITTED' ? '3' : currentPDR.currentStep}/5
                    </span>
                  </div>
                  
                  {/* Modern Minimal Pills - Symmetrical */}
                  <div className="flex gap-1 flex-wrap">
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[4.5rem] sm:min-w-[5.5rem] ${
                      currentPDR.currentStep >= 1 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                    }`}>
                      {currentPDR.currentStep >= 1 ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <Target className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="hidden sm:inline">Goals</span>
                      <span className="sm:hidden">G</span>
                    </div>
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[4.5rem] sm:min-w-[5.5rem] ${
                      currentPDR.currentStep >= 2 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                    }`}>
                      {currentPDR.currentStep >= 2 ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="hidden sm:inline">Behaviors</span>
                      <span className="sm:hidden">B</span>
                    </div>
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[4.5rem] sm:min-w-[5.5rem] ${
                      currentPDR.currentStep >= 3 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                    }`}>
                      {currentPDR.currentStep >= 3 ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="hidden sm:inline">Review</span>
                      <span className="sm:hidden">R</span>
                    </div>
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[4.5rem] sm:min-w-[5.5rem] ${
                      currentPDR.currentStep >= 4 && currentPDR.status !== 'SUBMITTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : currentPDR.status === 'SUBMITTED'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                    }`}>
                      {currentPDR.currentStep >= 4 && currentPDR.status !== 'SUBMITTED' ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : currentPDR.status === 'SUBMITTED' ? (
                        <Clock className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="hidden sm:inline">Mid-Year</span>
                      <span className="sm:hidden">M</span>
                    </div>
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[4.5rem] sm:min-w-[5.5rem] ${
                      currentPDR.currentStep >= 5 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                    }`}>
                      {currentPDR.currentStep >= 5 ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="hidden sm:inline">End-Year</span>
                      <span className="sm:hidden">E</span>
                    </div>
                  </div>
                </div>
                <Badge variant={
                  currentPDR.status === 'SUBMITTED' ? 'secondary' : 
                  currentPDR.status === 'COMPLETED' ? 'default' :
                  'outline'
                } className="text-xs px-1.5 py-0.5 h-5 flex-shrink-0">
                  {currentPDR.status === 'Created' && 'In Progress'}
                  {currentPDR.status === 'SUBMITTED' && 'Submitted'}
                  {currentPDR.status === 'OPEN_FOR_REVIEW' && 'Under Review'}
                  {currentPDR.status === 'PLAN_LOCKED' && 'Under Review'}
                  {currentPDR.status === 'UNDER_REVIEW' && 'Under Review'}
                  {currentPDR.status === 'COMPLETED' && 'Completed'}
                </Badge>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleContinuePDR}
                  className="flex-1"
                  variant={currentPDR.status === 'Created' ? 'default' : 'outline'}
                >
                  {currentPDR.status === 'Created' ? 'Edit/Continue PDR' : 'View Current PDR'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/pdr/${currentPDR.id}/goals`)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Create New PDR</CardTitle>
              <CardDescription>
                Start your performance development review for the current period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div 
                  className="mx-auto w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 cursor-pointer hover:bg-blue-500/30 transition-colors duration-200" 
                  onClick={handleCreatePDR}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCreatePDR();
                    }
                  }}
                >
                  <Plus className="h-7 w-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  No Active PDR
                </h3>
                <p className="text-foreground/80 mb-6 text-base font-medium leading-relaxed max-w-sm mx-auto">
                  Start your performance review by creating a new PDR for the current period.
                </p>
                <Button 
                  onClick={handleCreatePDR} 
                  disabled={isCreatingPDR}
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreatingPDR ? 'Creating...' : 'Create New PDR'}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Recent Activity - Takes 1 column */}
          <RecentActivity 
            activities={userActivity || []}
            isLoading={activityLoading}
            isUserActivity={true}
          />
        </div>

        {/* Quick Actions and PDR History - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  className="h-10 text-sm px-3 justify-start"
                  onClick={() => router.push(`/pdr/${currentPDR?.id}/goals`)}
                  disabled={!currentPDR}
                >
                  <Target className="mr-2 h-4 w-4" />
                  Update Goals
                </Button>
                <Button 
                  variant="outline" 
                  className="h-10 text-sm px-3 justify-start"
                  onClick={() => router.push(`/pdr/${currentPDR?.id}/behaviors`)}
                  disabled={!currentPDR}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Rate Behaviors
                </Button>
                <Button 
                  variant="outline" 
                  className="h-10 text-sm px-3 justify-start"
                  onClick={() => router.push(`/pdr/${currentPDR?.id}/mid-year`)}
                  disabled={!currentPDR || currentPDR.status !== 'SUBMITTED'}
                  title={currentPDR?.status !== 'SUBMITTED' ? 'Complete and submit your PDR first' : 'Available during mid-year period'}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Mid-Year Check-in
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-10 text-sm px-3 justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => router.push(`/pdr/${currentPDR?.id}/review`)}
                  disabled={!currentPDR}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Review Progress
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-10 text-sm px-3 justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => router.push(`/pdr/${currentPDR?.id}`)}
                  disabled={!currentPDR}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue PDR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PDR History */}
          <Card>
          <CardHeader>
            <CardTitle>PDR History</CardTitle>
            <CardDescription>
              Your previous performance reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pdrHistory.length > 0 ? (
                pdrHistory.map((pdr) => (
                  <div key={pdr.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">
                        {pdr.fyLabel ? getPDRDisplayName(pdr.fyLabel) : 'Annual Review'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {pdr.status === 'COMPLETED' ? 'Completed' : 
                         pdr.status === 'SUBMITTED' ? 'Submitted for review' :
                         pdr.status === 'UNDER_REVIEW' ? 'Under review' :
                         'In Progress'} • Started {new Date(pdr.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        pdr.status === 'SUBMITTED' ? 'secondary' : 
                        pdr.status === 'COMPLETED' ? 'success' : 
                        'default'
                      }>
                        {pdr.status === 'Created' && 'In Progress'}
                        {pdr.status === 'SUBMITTED' && 'Submitted'}
                        {pdr.status === 'OPEN_FOR_REVIEW' && 'Under Review'}
                        {pdr.status === 'PLAN_LOCKED' && 'Under Review'}
                        {pdr.status === 'UNDER_REVIEW' && 'Under Review'}
                        {pdr.status === 'COMPLETED' && 'Completed'}
                      </Badge>
                      <Button size="sm" onClick={() => router.push(`/pdr/${pdr.id}`)}>
                        {pdr.status === 'COMPLETED' || pdr.status === 'SUBMITTED' || pdr.status === 'UNDER_REVIEW' ? 'View' : 'Continue'}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No PDR history available.</p>
                  <p className="text-sm mt-1">Create your first PDR to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Financial Year Selection Dialog */}
      <FinancialYearSelectionDialog
        open={showFYDialog}
        onOpenChange={setShowFYDialog}
        onConfirm={handleFYConfirm}
        onCancel={handleFYCancel}
        isCreating={isCreatingPDR}
      />
    </div>
  );
}