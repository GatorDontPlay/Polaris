'use client';

import { useRouter } from 'next/navigation';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { useDemoPDRDashboard, useDemoPDRHistory } from '@/hooks/use-demo-pdr';
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
  CheckCircle2
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
  // User activity removed as requested
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

    // PDR Status - get status of current PDR
    const pdrStatus = currentPDR ? currentPDR.status : null;

    // Your Self-Assessed Score - calculate from current PDR's self-assessment
    const selfAssessedScore = currentPDR ? (() => {
      // Collect all the ratings from both goals and behaviors
      let totalSelfRating = 0;
      let selfRatingCount = 0;
      let detailedScores: Array<{score: number, title: string, type: string, description?: string}> = [];
      
      // Check for goal self-assessments
      const savedGoals = localStorage.getItem(`demo_goals_${currentPDR.id}`);
      if (savedGoals) {
        try {
          const goals = JSON.parse(savedGoals);
          goals.forEach((goal: any) => {
            if (goal.employeeRating) {
              totalSelfRating += goal.employeeRating;
              selfRatingCount++;
              detailedScores.push({
                score: goal.employeeRating,
                title: goal.title || 'Goal',
                type: 'Goal',
                description: goal.description
              });
            }
          });
        } catch (e) {
          console.error('Error parsing goals for ratings:', e);
        }
      }
      
      // Check for behavior self-assessments
      const savedBehaviors = localStorage.getItem(`demo_behaviors_${currentPDR.id}`);
      const companyValues = localStorage.getItem('demo_company_values');
      let valueMap: Record<string, string> = {};
      
      // Use hardcoded company values for consistency - only the 4 scorable values
      const demoCompanyValues = [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Lean Thinking' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Craftsmanship' },
        { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Value-Centric Innovation' },
        { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Blameless Problem-Solving' }
      ];
      
      // IDs of informational-only values that should be excluded from scoring
      const informationalValueIds = [
        '550e8400-e29b-41d4-a716-446655440005', // Self Reflection
        '550e8400-e29b-41d4-a716-446655440006'  // CodeFish 3D
      ];
      
      // Create a map of value IDs to their names
      demoCompanyValues.forEach(value => {
        valueMap[value.id] = value.name;
      });
      
      // Also try loading from localStorage if available
      if (companyValues) {
        try {
          const values = JSON.parse(companyValues);
          values.forEach((value: any) => {
            if (value.id && value.name) {
              valueMap[value.id] = value.name;
            }
          });
        } catch (e) {
          console.error('Error parsing company values:', e);
        }
      }
      
      if (savedBehaviors) {
        try {
          const behaviors = JSON.parse(savedBehaviors);
          behaviors.forEach((behavior: any) => {
            // Skip informational-only values
            if (behavior.valueId && informationalValueIds.includes(behavior.valueId)) {
              return;
            }
            
            if (behavior.employeeRating) {
              totalSelfRating += behavior.employeeRating;
              selfRatingCount++;
              const valueName = behavior.valueId && valueMap[behavior.valueId] ? valueMap[behavior.valueId] : 'Company Value';
              detailedScores.push({
                score: behavior.employeeRating,
                title: valueName,
                type: 'Behavior',
                description: behavior.description
              });
            }
          });
        } catch (e) {
          console.error('Error parsing behaviors for ratings:', e);
        }
      }
      
      // Check for end-year self-assessments (more detailed)
      const endYearGoals = localStorage.getItem(`end_year_goal_assessments_${currentPDR.id}`);
      const endYearBehaviors = localStorage.getItem(`end_year_behavior_assessments_${currentPDR.id}`);
      
      if (endYearGoals) {
        try {
          const goalAssessments = JSON.parse(endYearGoals);
          Object.entries(goalAssessments).forEach(([goalId, assessment]: [string, any]) => {
            if (assessment.rating) {
              // Try to find goal details
              let goalTitle = 'Goal Assessment';
              let goalDescription;
              if (savedGoals) {
                try {
                  const goals = JSON.parse(savedGoals);
                  const matchingGoal = goals.find((g: any) => g.id === goalId);
                  if (matchingGoal) {
                    goalTitle = matchingGoal.title || goalTitle;
                    goalDescription = matchingGoal.description;
                  }
                } catch {}
              }
              
              totalSelfRating += assessment.rating;
              selfRatingCount++;
              detailedScores.push({
                score: assessment.rating,
                title: goalTitle,
                type: 'End-Year Goal',
                description: assessment.reflection || goalDescription
              });
            }
          });
        } catch (e) {
          console.error('Error parsing end-year goal assessments:', e);
        }
      }
      
      if (endYearBehaviors) {
        try {
          const behaviorAssessments = JSON.parse(endYearBehaviors);
          Object.entries(behaviorAssessments).forEach(([behaviorId, assessment]: [string, any]) => {
            // Skip informational-only values
            if (informationalValueIds.includes(behaviorId)) {
              return;
            }
            
            if (assessment.rating) {
              // Try to find behavior value name
              let valueName = 'Behavior Assessment';
              if (valueMap[behaviorId]) {
                valueName = valueMap[behaviorId];
              }
              
              totalSelfRating += assessment.rating;
              selfRatingCount++;
              detailedScores.push({
                score: assessment.rating,
                title: valueName,
                type: 'End-Year Behavior',
                description: assessment.reflection
              });
            }
          });
        } catch (e) {
          console.error('Error parsing end-year behavior assessments:', e);
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
                     stats.pdrStatus === 'COMPLETED' ? 'Completed' : '-'}
                  </p>
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

              <div className="flex">
                <Button 
                  onClick={() => router.push(`/pdr/${currentPDR.id}/goals`)}
                  className="flex-1"
                  variant={currentPDR.status === 'Created' ? 'default' : 'outline'}
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
                    const validPdrs = pdrHistory.filter(pdr => 
                      // Check that it has a valid creation date that can be parsed
                      !isNaN(new Date(pdr.createdAt).getTime()) &&
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
                             'In Progress'} • Started {!isNaN(new Date(pdr.createdAt).getTime()) ? new Date(pdr.createdAt).toLocaleDateString() : 'recently'}
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