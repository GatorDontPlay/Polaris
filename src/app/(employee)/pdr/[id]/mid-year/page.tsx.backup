'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemoPDR, useDemoGoals, useDemoCompanyValues } from '@/hooks/use-demo-pdr';
import { midYearReviewSchema } from '@/lib/validations';
import { MidYearFormData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Send,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronRight,
  User,
  Lock
} from 'lucide-react';

interface MidYearPageProps {
  params: { id: string };
}

export default function MidYearPage({ params }: MidYearPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());
  const [existingReviewData, setExistingReviewData] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showAccessDeniedView, setShowAccessDeniedView] = useState(false);
  
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useDemoGoals(params.id);
  const { data: companyValues } = useDemoCompanyValues();
  
  // Initialize form at the top of the component
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors, isDirty } 
  } = useForm<MidYearFormData>({
    resolver: zodResolver(midYearReviewSchema),
    defaultValues: {
      progressSummary: existingReviewData?.progressSummary || '',
      blockersChallenges: existingReviewData?.blockersChallenges || '',
      supportNeeded: existingReviewData?.supportNeeded || '',
      employeeComments: existingReviewData?.employeeComments || '',
    }
  });

  // Form is already initialized above

  // Check if the user has access to the mid-year review and load existing review data
  useEffect(() => {
    if (pdr) {
      // Check if the PDR has been reviewed by the CEO
      const canAccess = ['PLAN_LOCKED', 'OPEN_FOR_REVIEW', 'UNDER_REVIEW', 'SUBMITTED'].includes(pdr.status);
      
      if (!canAccess) {
        setAccessDenied(true);
        setShowAccessDeniedView(true);
        return;
      }
      
      // Try to load existing review or draft data
      const savedReview = localStorage.getItem(`mid_year_review_${params.id}`);
      const savedDraft = localStorage.getItem(`mid_year_draft_${params.id}`);
      
      if (savedReview) {
        try {
          const reviewData = JSON.parse(savedReview);
          setExistingReviewData(reviewData);
        } catch (error) {
          console.error('Error parsing saved mid-year review:', error);
        }
      } else if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          setExistingReviewData(draftData);
        } catch (error) {
          console.error('Error parsing saved mid-year draft:', error);
        }
      }
    }
  }, [params.id, pdr]);
  
  // Get CEO feedback data for the recap
  const getCeoFeedbackData = () => {
    if (typeof window === 'undefined') return { goals: {}, behaviors: {} };
    
    const ceoGoalFeedback = localStorage.getItem(`ceo_goal_feedback_${params.id}`);
    const ceoBehaviorFeedback = localStorage.getItem(`ceo_behavior_feedback_${params.id}`);
    
    return {
      goals: ceoGoalFeedback ? JSON.parse(ceoGoalFeedback) : {},
      behaviors: ceoBehaviorFeedback ? JSON.parse(ceoBehaviorFeedback) : {},
    };
  };
  
  // Get employee behavior data
  const getEmployeeBehaviorData = () => {
    if (typeof window === 'undefined') return {};
    const employeeBehaviors = localStorage.getItem(`demo_behaviors_${params.id}`);
    if (employeeBehaviors) {
      try {
        const behaviorsArray = JSON.parse(employeeBehaviors);
        // Convert array to object keyed by valueId for easier lookup
        const behaviorsMap: { [key: string]: any } = {};
        behaviorsArray.forEach((behavior: any) => {
          behaviorsMap[behavior.valueId] = behavior;
        });
        return behaviorsMap;
      } catch (error) {
        console.error('Error parsing employee behaviors:', error);
        return {};
      }
    }
    return {};
  };
  
  const ceoFeedback = getCeoFeedbackData();
  const employeeBehaviors = getEmployeeBehaviorData();

  // Toggle functions for expanding/collapsing items
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleBehavior = (behaviorId: string) => {
    const newExpanded = new Set(expandedBehaviors);
    if (newExpanded.has(behaviorId)) {
      newExpanded.delete(behaviorId);
    } else {
      newExpanded.add(behaviorId);
    }
    setExpandedBehaviors(newExpanded);
  };

  const isLoading = pdrLoading || goalsLoading;
  const canEdit = pdr && !pdr.isLocked && pdr.status !== 'SUBMITTED' && pdr.status !== 'Created';
  const canUpdate = pdr && !pdr.isLocked;
  
  // Load saved values if they exist - this useEffect must be called unconditionally
  useEffect(() => {
    if (existingReviewData) {
      reset({
        progressSummary: existingReviewData.progressSummary || '',
        blockersChallenges: existingReviewData.blockersChallenges || '',
        supportNeeded: existingReviewData.supportNeeded || '',
        employeeComments: existingReviewData.employeeComments || '',
      });
    }
  }, [existingReviewData, reset]);

  // Check access using state variable instead of conditional return
  // This ensures all hooks are called unconditionally
  if (showAccessDeniedView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-status-info" />
              Mid-Year Check-in
            </h1>
            <p className="text-muted-foreground mt-1">
              Review your progress and set goals for the remainder of the year
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <Card className="border-status-error/30 bg-status-error/5">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-status-error/20 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-status-error" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              The Mid-Year Check-in is not available until your manager has reviewed your PDR and provided feedback.
              Please check back after your manager has completed their review.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Form is already initialized at the top of the component
  
  // Form reset is handled by the useEffect above

  const handlePrevious = () => {
    router.push(`/pdr/${params.id}/review`);
  };

  const handleNext = () => {
    router.push(`/pdr/${params.id}/end-year`);
  };

  const onSubmit = async (data: MidYearFormData) => {
    setIsSubmitting(true);
    try {
      // Save the mid-year review data to localStorage
      localStorage.setItem(`mid_year_review_${params.id}`, JSON.stringify({
        ...data,
        submittedAt: new Date().toISOString(),
      }));
      
      // Also save individual field comments for goal and behavior tracking
      const goalComments = {};
      const behaviorComments = {};
      
      // If there are specific comments for goals or behaviors, we could save those here
      if (data.progressSummary) {
        localStorage.setItem(`mid_year_goal_comments_${params.id}`, JSON.stringify(goalComments));
        localStorage.setItem(`mid_year_behavior_comments_${params.id}`, JSON.stringify(behaviorComments));
      }
      
      // For demo mode, simulate submission by updating PDR state
      // When submitting Mid-Year review, advance to step 5 (End-Year)
      updatePdr({
        currentStep: 5, // Advance to End-Year step after submitting Mid-Year
        status: 'UNDER_REVIEW',
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message to user
      console.log('Mid-year review submitted successfully!', data);
      
      // Redirect to next step after successful submission
      router.push(`/pdr/${params.id}/end-year`);
    } catch (error) {
      console.error('Failed to submit mid-year review:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Get the current form data
      const formData = watch();
      
      // Save draft data to localStorage
      localStorage.setItem(`mid_year_draft_${params.id}`, JSON.stringify({
        ...formData,
        lastSaved: new Date().toISOString(),
      }));
      
      // For demo mode, show feedback
      console.log('Mid-year review draft saved successfully!', formData);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to save mid-year review draft:', error);
      // TODO: Show error toast
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Main form view (always show in demo mode)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="h-7 w-7 mr-3 text-green-400" />
            Mid-Year Check-In
          </h1>
          <p className="text-muted-foreground mt-2">
            Reflect on your progress and identify areas for support
          </p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <FileText className="h-4 w-4 mr-1" />
          New Review
        </Badge>
      </div>

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-foreground">
                Mid-Year Reflection
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Take a moment to reflect on your progress so far. This is an opportunity to 
                celebrate achievements, identify challenges, and get the support you need.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Single Column Layout */}
      <div className="space-y-8">
        {/* PDR Recap Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Performance Progress</h2>
              <p className="text-sm text-muted-foreground">Review your goals and behaviors from the planning stage</p>
            </div>
          </div>

          <Card className="border-l-4 border-l-primary/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Goals Progress ({goals?.length || 0} goals)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Goals Section */}
              {goals && goals.length > 0 ? (
                <div>
                  <div className="space-y-1">
                    {goals.map((goal) => (
                      <div key={goal.id} className="border border-border/50 rounded">
                        {/* Goal Header - Clickable */}
                        <button
                          onClick={() => toggleGoal(goal.id)}
                          className="w-full p-2 text-left hover:bg-muted/50 rounded transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-foreground truncate">
                              {ceoFeedback.goals[goal.id]?.ceoTitle || goal.title}
                            </div>
                          </div>
                          {expandedGoals.has(goal.id) ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                          )}
                        </button>
                        
                        {/* Goal Content - Expandable */}
                        {expandedGoals.has(goal.id) && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border/50 bg-muted/20">
                            {/* Employee Original */}
                            <div className="bg-card border border-blue-200 rounded-md p-3 shadow-sm">
                              <div className="flex items-center mb-2">
                                <User className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="font-semibold text-sm text-blue-700">Employee Original</span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Title</div>
                                  <div className="text-sm text-foreground font-medium">{goal.title}</div>
                                </div>
                                {goal.description && (
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                                    <div className="text-sm text-foreground leading-relaxed">{goal.description}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* CEO Modifications */}
                            {ceoFeedback.goals[goal.id] && (
                              <div className="bg-card border border-green-200 rounded-md p-3 shadow-sm">
                                <div className="flex items-center mb-2">
                                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                                  <span className="font-semibold text-sm text-green-700">CEO Planning Input</span>
                                </div>
                                <div className="space-y-2">
                                  {ceoFeedback.goals[goal.id].ceoTitle && (
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Modified Title</div>
                                      <div className="text-sm text-foreground font-medium">{ceoFeedback.goals[goal.id].ceoTitle}</div>
                                    </div>
                                  )}
                                  {ceoFeedback.goals[goal.id].ceoDescription && (
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Modified Description</div>
                                      <div className="text-sm text-foreground leading-relaxed">{ceoFeedback.goals[goal.id].ceoDescription}</div>
                                    </div>
                                  )}
                                  {ceoFeedback.goals[goal.id].ceoComments && (
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground mb-1">CEO Comments</div>
                                      <div className="text-sm text-foreground leading-relaxed">{ceoFeedback.goals[goal.id].ceoComments}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No goals have been set yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Behaviors Section */}
          <Card className="border-l-4 border-l-blue-500/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Behaviors Assessment ({companyValues ? 
                  companyValues.filter(cv => 
                    cv.id !== '550e8400-e29b-41d4-a716-446655440005' && 
                    cv.id !== '550e8400-e29b-41d4-a716-446655440006'
                  ).length : 4} behaviors)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div className="space-y-1">
                  {companyValues && companyValues.map(companyValue => {
                    const valueId = companyValue.id;
                    const feedback = ceoFeedback.behaviors[valueId];
                    const employeeBehavior = employeeBehaviors[valueId];
                    
                    // Skip informational-only values (Self Reflection and CodeFish 3D)
                    if (valueId === '550e8400-e29b-41d4-a716-446655440005' || 
                        valueId === '550e8400-e29b-41d4-a716-446655440006') {
                      return null;
                    }
                    
                    // Skip if no feedback or behavior data exists
                    if (!feedback && !employeeBehavior) {
                      return null;
                    }
                    
                    return (
                    <div key={valueId} className="border border-border/50 rounded">
                      {/* Behavior Header - Clickable */}
                      <button
                        onClick={() => toggleBehavior(valueId)}
                        className="w-full p-2 text-left hover:bg-muted/50 rounded transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-foreground truncate">
                            {companyValue.name}
                          </div>
                        </div>
                        {expandedBehaviors.has(valueId) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                        )}
                      </button>
                      
                      {/* Behavior Content - Expandable */}
                      {expandedBehaviors.has(valueId) && (
                        <div className="px-3 pb-3 space-y-3 border-t border-border/50 bg-muted/20">
                          {/* Employee Original - Note: Employee behaviors would come from separate data source */}
                          <div className="bg-card border border-blue-200 rounded-md p-3 shadow-sm">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-semibold text-sm text-blue-700">Employee Assessment</span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Company Value</div>
                                <div className="text-sm text-foreground font-medium">{companyValue.name}</div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Behavior Description</div>
                                <div className="text-sm text-foreground leading-relaxed">
                                  {employeeBehaviors[valueId]?.description || 
                                   companyValues?.find(cv => cv.id === valueId)?.description ||
                                   'Employee assessment pending'}
                                </div>
                              </div>
                              {employeeBehaviors[valueId]?.examples && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Examples</div>
                                  <div className="text-sm text-foreground leading-relaxed">
                                    {employeeBehaviors[valueId].examples}
                                  </div>
                                </div>
                              )}
                              {employeeBehaviors[valueId]?.employeeSelfAssessment && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Self Assessment</div>
                                  <div className="text-sm text-foreground leading-relaxed">
                                    {employeeBehaviors[valueId].employeeSelfAssessment}
                                  </div>
                                </div>
                              )}
                              {employeeBehaviors[valueId]?.employeeRating && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Employee Rating</div>
                                  <div className="text-sm text-foreground font-medium">
                                    {employeeBehaviors[valueId].employeeRating}/5
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* CEO Modifications */}
                          <div className="bg-card border border-green-200 rounded-md p-3 shadow-sm">
                            <div className="flex items-center mb-2">
                              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                              <span className="font-semibold text-sm text-green-700">CEO Planning Input</span>
                            </div>
                            <div className="space-y-2">
                              {(feedback as any).description && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Modified Description</div>
                                  <div className="text-sm text-foreground leading-relaxed">{(feedback as any).description}</div>
                                </div>
                              )}
                              {(feedback as any).comments && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">CEO Feedback</div>
                                  <div className="text-sm text-foreground leading-relaxed">{(feedback as any).comments}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mid-Year Reflection Form */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Mid-Year Reflection</h2>
              <p className="text-sm text-muted-foreground">Share your thoughts on progress, challenges, and support needs</p>
            </div>
            {pdr && pdr.currentStep >= 5 && (
              <div className="ml-auto">
                <Button 
                  onClick={() => router.push(`/pdr/${params.id}/end-year`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to End Year Review
                </Button>
              </div>
            )}
          </div>

          <Card className="border-l-4 border-l-green-500/50">
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Progress Summary */}
                <div className="space-y-4 p-6 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="progressSummary" className="text-base font-semibold text-foreground">
                        Progress Summary *
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Summarize your key achievements and progress toward your goals
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="progressSummary"
                    {...register('progressSummary')}
                    rows={4}
                    className="border-green-200 dark:border-green-800 focus:border-green-500 focus:ring-green-500/20"
                    placeholder="Describe the progress you've made on your goals and key accomplishments..."
                  />
                  {errors.progressSummary && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.progressSummary.message}
                    </p>
                  )}
                </div>

                {/* Blockers & Challenges */}
                <div className="space-y-4 p-6 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="blockersChallenges" className="text-base font-semibold text-foreground">
                        Blockers & Challenges
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        What obstacles or challenges have you encountered?
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="blockersChallenges"
                    {...register('blockersChallenges')}
                    rows={3}
                    className="border-orange-200 dark:border-orange-800 focus:border-orange-500 focus:ring-orange-500/20"
                    placeholder="Describe any blockers, challenges, or obstacles you've faced..."
                  />
                  {errors.blockersChallenges && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.blockersChallenges.message}
                    </p>
                  )}
                </div>

                {/* Support Needed */}
                <div className="space-y-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="supportNeeded" className="text-base font-semibold text-foreground">
                        Support Needed
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        What support or resources would help you succeed?
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="supportNeeded"
                    {...register('supportNeeded')}
                    rows={3}
                    className="border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500/20"
                    placeholder="What support, resources, or assistance would be most helpful..."
                  />
                  {errors.supportNeeded && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.supportNeeded.message}
                    </p>
                  )}
                </div>

                {/* Additional Comments */}
                <div className="space-y-4 p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="employeeComments" className="text-base font-semibold text-foreground">
                        Additional Comments
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Any other thoughts or feedback you'd like to share
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="employeeComments"
                    {...register('employeeComments')}
                    rows={3}
                    className="border-purple-200 dark:border-purple-800 focus:border-purple-500 focus:ring-purple-500/20"
                    placeholder="Share any additional thoughts, concerns, or feedback..."
                  />
                  {errors.employeeComments && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.employeeComments.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                  <div className="flex-1">
                    {(canEdit || canUpdate) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={!isDirty}
                        className="w-full sm:w-auto"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </Button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto px-8"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button onClick={handlePrevious} variant="outline" className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Review</span>
        </Button>
        <div className="text-sm text-muted-foreground">
          Step 4 of 5 - Mid-Year Check-In
        </div>
      </div>
    </div>
  );
}
