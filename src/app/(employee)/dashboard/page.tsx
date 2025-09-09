'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/supabase-auth-provider';
import { useSupabasePDRDashboard, useSupabasePDRHistory } from '@/hooks/use-supabase-pdrs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus,
  FileText,
  CheckCircle2,
  ChevronRight,
  Lock
} from 'lucide-react';
import { getPDRDisplayName } from '@/lib/financial-year';

// Helper function to get score color based on rating value
const getScoreColor = (score: number): string => {
  switch(score) {
    case 1: return 'bg-red-500';
    case 2: return 'bg-orange-500';
    case 3: return 'bg-yellow-500';
    case 4: return 'bg-blue-500';
    case 5: return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};
import { FinancialYearSelectionDialog, FinancialYearOption } from '@/components/pdr/financial-year-selection-dialog';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, session, isLoading: authLoading } = useAuth();
  
  // Get current user's PDRs using Supabase
  const { data: currentPDR, createPDR, isLoading: pdrLoading } = useSupabasePDRDashboard();
  const { data: pdrHistory, isLoading: historyLoading } = useSupabasePDRHistory();
  // User activity removed as requested
  const [isCreatingPDR, setIsCreatingPDR] = useState(false);
  const [showFYDialog, setShowFYDialog] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // Calculate dashboard stats from real data
  const calculateDashboardStats = () => {
    // Active Goals - count goals from current PDR (use real Supabase data)
    const activeGoals = currentPDR?.goals?.length || 0;

    // PDR Status - get status of current PDR
    const pdrStatus = currentPDR ? currentPDR.status : null;

    // Your Self-Assessed Score - calculate from current PDR's self-assessment (use real Supabase data)
    const selfAssessedScore = currentPDR ? (() => {
      // Collect all the ratings from both goals and behaviors
      let totalSelfRating = 0;
      let selfRatingCount = 0;
      const detailedScores: Array<{score: number, title: string, type: string, description?: string}> = [];
      
      // Check for goal self-assessments from real Supabase data
      if (currentPDR.goals && Array.isArray(currentPDR.goals)) {
        currentPDR.goals.forEach((goal: any) => {
          if (goal.employeeRating || goal.employee_rating) {
            const rating = goal.employeeRating || goal.employee_rating;
            totalSelfRating += rating;
            selfRatingCount++;
            detailedScores.push({
              score: rating,
              title: goal.title || 'Goal',
              type: 'Goal',
              description: goal.description
            });
          }
        });
      }
      
      // Check for behavior self-assessments from real Supabase data
      if (currentPDR.behaviors && Array.isArray(currentPDR.behaviors)) {
        currentPDR.behaviors.forEach((behavior: any) => {
          const rating = behavior.employeeRating || behavior.employee_rating;
          if (rating) {
            totalSelfRating += rating;
            selfRatingCount++;
            const valueName = behavior.value?.name || behavior.companyValue?.name || 'Company Value';
            detailedScores.push({
              score: rating,
              title: valueName,
              type: 'Behavior',
              description: behavior.description || behavior.employee_self_assessment
            });
          }
        });
      }
      
      // Check for end-year self-assessments from real Supabase data
      if (currentPDR.endYearReview || currentPDR.end_year_review) {
        const endYearReview = currentPDR.endYearReview || currentPDR.end_year_review;
        if (endYearReview && endYearReview.employee_overall_rating) {
          totalSelfRating += endYearReview.employee_overall_rating;
          selfRatingCount++;
          detailedScores.push({
            score: endYearReview.employee_overall_rating,
            title: 'End-Year Overall',
            type: 'End-Year Review',
            description: endYearReview.employee_reflection || 'Overall self-assessment'
          });
        }
      }
      
      // Calculate the average rating
      const average = selfRatingCount > 0 ? Number((totalSelfRating / selfRatingCount).toFixed(1)) : 0;
      
      return {
        average,
        detailedScores,
        scores: detailedScores.map(item => item.score)
      };
    })() : { average: 0, scores: [] };

    return {
      activeGoals,
      pdrStatus,
      selfAssessedScore
    };
  };

  const stats = calculateDashboardStats();

  // Handle PDR creation
  const handleCreatePDR = async () => {
    // Clear any previous error
    setCreationError(null);
    // Show financial year selection dialog
    setShowFYDialog(true);
  };

  // Handle financial year confirmation
  const handleFYConfirm = async (selectedFY: FinancialYearOption) => {
    setIsCreatingPDR(true);
    setShowFYDialog(false);
    
    try {
      // Create a new PDR with selected financial year
      console.log('Creating PDR with selectedFY:', selectedFY);
      const newPDR = await createPDR(selectedFY);
      console.log('PDR created successfully:', newPDR);
      if (newPDR && newPDR.id) {
        console.log('Redirecting to:', `/pdr/${newPDR.id}/goals`);
        router.push(`/pdr/${newPDR.id}/goals`);
      } else {
        console.error('Failed to create PDR: No ID returned', newPDR);
      }
    } catch (error) {
      console.error('Failed to create PDR:', error);
      
      // Store the error for display
      if (error instanceof Error) {
        setCreationError(error.message);
        
        // If PDR already exists, wait a moment for queries to refresh, then check if PDR is now available
        if (error.message.includes('already exists')) {
          console.log('PDR already exists - waiting for refresh...');
          
          // Wait 2 seconds for the invalidated queries to refetch
          setTimeout(() => {
            // The queries should have been invalidated by the onError handler in the hook
            // If a PDR is found after refresh, the component will automatically re-render
            console.log('Checking if PDR appeared after refresh...');
            // Clear the error if we're expecting a refresh
            setCreationError(null);
          }, 2000);
        }
      }
    } finally {
      setIsCreatingPDR(false);
    }
  };

  // Handle financial year selection cancellation
  const handleFYCancel = () => {
    setShowFYDialog(false);
  };

  // Handle manual refresh of PDR data
  const handleRefreshPDR = () => {
    setCreationError(null);
    // The queries will automatically refetch due to the enabled condition
    window.location.reload();
  };

  // Handle continue PDR - Always redirects to goals page
  const handleContinuePDR = () => {
    if (currentPDR) {
      router.push(`/pdr/${currentPDR.id}/goals`);
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
  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user.firstName || user.first_name || 'User'}!
          </h1>
          <p className="mt-2 text-white">
            Manage your performance and development reviews
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-muted-foreground">PDR Status</p>
                  <p className="text-2xl font-bold">
                    {!stats.pdrStatus ? '-' : 
                     stats.pdrStatus === 'Created' ? 'In Progress' :
                     stats.pdrStatus === 'SUBMITTED' ? 'Submitted' :
                     stats.pdrStatus === 'OPEN_FOR_REVIEW' || stats.pdrStatus === 'PLAN_LOCKED' || stats.pdrStatus === 'UNDER_REVIEW' ? 'Under Review' :
                     stats.pdrStatus === 'MID_YEAR_CHECK' ? 'Mid-Year Review' :
                     stats.pdrStatus === 'END_YEAR_REVIEW' ? 'End-Year Review' :
                     stats.pdrStatus === 'COMPLETED' ? 'Completed' : '-'}
                  </p>
                  {stats.pdrStatus === 'SUBMITTED' && (
                    <p className="text-sm text-white mt-1">Pending Review with Manager & Approval</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Your Self-Assessed Score</p>
                    <p className="text-2xl font-bold">{stats.selfAssessedScore.average > 0 ? `${stats.selfAssessedScore.average}/5` : '-'}</p>
                  </div>
                </div>
                
                {stats.selfAssessedScore.scores.length > 0 && (
                  <div className="mt-4">
                    <div className="flex mt-2">
                      {/* Y-axis labels */}
                      <div className="flex flex-col justify-between h-[60px] pr-2 text-xs text-muted-foreground">
                        <span>Outstanding</span>
                        <span>Needs Improvement</span>
                      </div>
                      
                      {/* Graph with columns */}
                      <div className="h-[60px] flex items-end justify-start space-x-2">
                        <TooltipProvider>
                          {stats.selfAssessedScore.detailedScores.map((item, index) => (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center cursor-help">
                                  <div 
                                    className={`w-8 rounded-t-sm ${getScoreColor(item.score)}`} 
                                    style={{ height: `${item.score * 10}px` }}
                                  ></div>
                                  <span className="text-xs mt-1 text-muted-foreground">{item.score}/5</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[250px] text-left p-3 bg-card border border-border shadow-lg">
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                                  <p className="text-xs text-muted-foreground">{item.type}</p>
                                  {item.description && (
                                    <p className="text-xs mt-1 text-foreground/80 line-clamp-3">{item.description}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                )}
                
                {stats.selfAssessedScore.scores.length === 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    No ratings available yet. Complete your self-assessment in the Goals, Behaviors, or End-Year review sections.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current PDR */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Current PDR */}
          {currentPDR ? (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Current PDR - {currentPDR.fyLabel ? getPDRDisplayName(currentPDR.fyLabel) : 'Annual Review'}
              </CardTitle>
              <CardDescription>
                {currentPDR.status === 'SUBMITTED' 
                  ? 'Your PDR has been submitted and is awaiting CEO review'
                  : currentPDR.status === 'OPEN_FOR_REVIEW'
                  ? 'Your PDR is being reviewed by your manager. Mid-year check-in will be available once approved and plan is locked in.'
                  : currentPDR.status === 'PLAN_LOCKED'
                  ? 'Your plan has been approved and locked in. You can now access the mid-year check-in.'
                  : currentPDR.status === 'UNDER_REVIEW'
                  ? 'Your PDR is currently under review by the CEO'
                  : currentPDR.status === 'COMPLETED'
                  ? 'Your PDR review process has been completed'
                  : 'Complete your performance development review for this cycle'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Process Flow with Arrows - Centered and Prominent */}
              <div className="flex flex-col items-center mb-6">
                {/* Status Badge - Positioned at top */}
                <div className="flex flex-col items-center mb-4">
                  <Badge variant={
                    currentPDR.status === 'SUBMITTED' ? 'secondary' : 
                    currentPDR.status === 'COMPLETED' ? 'default' :
                    'outline'
                  } className="mb-2 px-3 py-1">
                    {currentPDR.status === 'Created' && 'In Progress'}
                    {currentPDR.status === 'SUBMITTED' && 'Submitted'}
                    {currentPDR.status === 'OPEN_FOR_REVIEW' && 'Under Review'}
                    {currentPDR.status === 'PLAN_LOCKED' && 'Under Review'}
                    {currentPDR.status === 'UNDER_REVIEW' && 'Under Review'}
                    {currentPDR.status === 'MID_YEAR_CHECK' && 'Mid-Year Review'}
                    {currentPDR.status === 'END_YEAR_REVIEW' && 'End-Year Review'}
                    {currentPDR.status === 'COMPLETED' && 'Completed'}
                  </Badge>
                  
                  {currentPDR.status === 'SUBMITTED' && (
                    <p className="text-sm text-white text-center max-w-lg">
                      Your manager will review your PDR proposal for the year and book a time to discuss with you. 
                      There is nothing else to do until you agree on the plan with your manager.
                    </p>
                  )}
                </div>
                
                {/* Process Flow with Arrows */}
                <div className="flex items-center justify-center flex-wrap gap-1 md:gap-0 w-full max-w-3xl">
                  {/* Goals */}
                  <div 
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
(currentPDR.currentStep || currentPDR.current_step || 1) >= 1 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
                    }`}
onClick={() => (currentPDR.currentStep || currentPDR.current_step || 1) >= 1 && router.push(`/pdr/${currentPDR.id}/goals`)}
role={(currentPDR.currentStep || currentPDR.current_step || 1) >= 1 ? "button" : undefined}
tabIndex={(currentPDR.currentStep || currentPDR.current_step || 1) >= 1 ? 0 : undefined}
                    onKeyDown={(e) => {
if ((currentPDR.currentStep || currentPDR.current_step || 1) >= 1 && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        router.push(`/pdr/${currentPDR.id}/goals`);
                      }
                    }}
                  >
{(currentPDR.currentStep || currentPDR.current_step || 1) >= 1 ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Target className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>Goals</span>
                  </div>
                  
                  {/* Arrow 1 */}
                  <ChevronRight className="h-5 w-5 mx-0.5 text-muted-foreground/70" />
                  
                  {/* Behaviors */}
                  <div 
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
(currentPDR.currentStep || currentPDR.current_step || 1) >= 2 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
                    }`}
onClick={() => (currentPDR.currentStep || currentPDR.current_step || 1) >= 2 && router.push(`/pdr/${currentPDR.id}/behaviors`)}
role={(currentPDR.currentStep || currentPDR.current_step || 1) >= 2 ? "button" : undefined}
tabIndex={(currentPDR.currentStep || currentPDR.current_step || 1) >= 2 ? 0 : undefined}
                    onKeyDown={(e) => {
if ((currentPDR.currentStep || currentPDR.current_step || 1) >= 2 && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        router.push(`/pdr/${currentPDR.id}/behaviors`);
                      }
                    }}
                  >
{(currentPDR.currentStep || currentPDR.current_step || 1) >= 2 ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>Behaviors</span>
                  </div>
                  
                  {/* Arrow 2 */}
                  <ChevronRight className="h-5 w-5 mx-0.5 text-muted-foreground/70" />
                  
                  {/* Review */}
                  <div 
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
(currentPDR.currentStep || currentPDR.current_step || 1) >= 3 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
                    }`}
onClick={() => (currentPDR.currentStep || currentPDR.current_step || 1) >= 3 && router.push(`/pdr/${currentPDR.id}/review`)}
role={(currentPDR.currentStep || currentPDR.current_step || 1) >= 3 ? "button" : undefined}
tabIndex={(currentPDR.currentStep || currentPDR.current_step || 1) >= 3 ? 0 : undefined}
                    onKeyDown={(e) => {
if ((currentPDR.currentStep || currentPDR.current_step || 1) >= 3 && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        router.push(`/pdr/${currentPDR.id}/review`);
                      }
                    }}
                  >
{(currentPDR.currentStep || currentPDR.current_step || 1) >= 3 ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>Review</span>
                  </div>
                  
                  {/* Arrow 3 */}
                  <ChevronRight className="h-5 w-5 mx-0.5 text-muted-foreground/70" />
                  
                  {/* Mid-Year */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      (currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status)
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                              : currentPDR.status === 'OPEN_FOR_REVIEW'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 opacity-70'
                              : currentPDR.status === 'SUBMITTED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 opacity-70'
                              : 'bg-muted/50 text-muted-foreground border border-border/50'
                          }`}
onClick={() => ((currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status)) && router.push(`/pdr/${currentPDR.id}/mid-year`)}
role={((currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status)) ? "button" : undefined}
tabIndex={((currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status)) ? 0 : undefined}
                          onKeyDown={(e) => {
if (((currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status)) && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              router.push(`/pdr/${currentPDR.id}/mid-year`);
                            }
                          }}
                        >
{(currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status) ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                          ) : currentPDR.status === 'OPEN_FOR_REVIEW' ? (
                            <Clock className="h-4 w-4 flex-shrink-0" />
                          ) : currentPDR.status === 'SUBMITTED' ? (
                            <Lock className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span>Mid-Year</span>
                        </div>
                      </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-[250px]">
                        {(currentPDR.currentStep || currentPDR.current_step || 1) >= 4 && ['PLAN_LOCKED', 'PDR_BOOKED'].includes(currentPDR.status) 
                          ? "Click to access your Mid-Year Check-in"
                          : currentPDR.status === 'OPEN_FOR_REVIEW'
                          ? "Your PDR is under review. Mid-year will be available once your manager approves and locks in your plan."
                          : currentPDR.status === 'SUBMITTED'
                          ? "Waiting for manager review before Mid-Year Check-in becomes available"
                          : "Complete previous steps first"
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Arrow 4 */}
                  <ChevronRight className="h-5 w-5 mx-0.5 text-muted-foreground/70" />
                  
                  {/* End-Year */}
                  <div 
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
(currentPDR.currentStep || currentPDR.current_step || 1) >= 5 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
                    }`}
onClick={() => (currentPDR.currentStep || currentPDR.current_step || 1) >= 5 && router.push(`/pdr/${currentPDR.id}/end-year`)}
role={(currentPDR.currentStep || currentPDR.current_step || 1) >= 5 ? "button" : undefined}
tabIndex={(currentPDR.currentStep || currentPDR.current_step || 1) >= 5 ? 0 : undefined}
                    onKeyDown={(e) => {
if ((currentPDR.currentStep || currentPDR.current_step || 1) >= 5 && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        router.push(`/pdr/${currentPDR.id}/end-year`);
                      }
                    }}
                  >
{(currentPDR.currentStep || currentPDR.current_step || 1) >= 5 ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>End-Year</span>
                  </div>
                </div>
              </div>

              {/* Improved Button Design */}
              <div className="flex justify-center">
                <Button 
                  onClick={() => router.push(`/pdr/${currentPDR.id}/goals`)}
                  className="px-6 py-2"
                  variant={currentPDR.status === 'Created' ? 'default' : 'outline'}
                  size="sm"
                >
                  {currentPDR.status === 'Created' ? 'Edit/Continue PDR' : 'View Current PDR'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card>
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

                {creationError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 mb-2">{creationError}</p>
                    {creationError.includes('already exists') && (
                      <div className="flex gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleRefreshPDR}
                        >
                          Refresh Page
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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

          {/* Recent Activity removed as requested */}
        </div>

        {/* PDR History */}
        <div className="grid grid-cols-1 gap-6">
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
                ) : (
                  // Filter PDRs to ensure they have valid dates and required fields
                  (() => {
                    
                    // Ensure we have a valid array
                    const safeHistory = Array.isArray(pdrHistory) ? pdrHistory : [];
                    const validPdrs = safeHistory.filter(pdr => 
                      // Check that it has a valid creation date that can be parsed
                      !isNaN(new Date(pdr.created_at).getTime()) &&
                      // Make sure required fields exist
                      pdr.id && pdr.status
                    );
                    
                    if (validPdrs.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No PDRs to show</p>
                        </div>
                      );
                    }
                    
                    return validPdrs.map((pdr) => (
                      <div key={pdr.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {pdr.fyLabel ? getPDRDisplayName(pdr.fyLabel) : 'Annual Review'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {pdr.status === 'COMPLETED' ? 'Completed' : 
                             pdr.status === 'SUBMITTED' ? 'Submitted for review' :
                             pdr.status === 'UNDER_REVIEW' ? 'Under review' :
                             'In Progress'} • Started {!isNaN(new Date(pdr.created_at).getTime()) ? new Date(pdr.created_at).toLocaleDateString() : 'recently'}
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
                  })()
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