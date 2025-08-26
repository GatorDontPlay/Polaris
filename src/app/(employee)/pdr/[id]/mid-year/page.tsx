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
  User
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
  
  const { data: pdr, isLoading: pdrLoading, updatePdr } = useDemoPDR(params.id);
  const { data: goals, isLoading: goalsLoading } = useDemoGoals(params.id);
  const { data: companyValues } = useDemoCompanyValues();

  // Load existing review data if available
  useEffect(() => {
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
  }, [params.id]);
  
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
  
  // Redirect if PDR is in SUBMITTED state - employee cannot access mid-year until CEO has reviewed
  if (pdr && pdr.status === 'SUBMITTED') {
    router.push(`/pdr/${params.id}/review`);
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<MidYearFormData>({
    resolver: zodResolver(midYearReviewSchema),
    defaultValues: {
      progressSummary: '',
      blockersChallenges: '',
      supportNeeded: '',
      employeeComments: '',
    },
  });
  
  // Load saved values if they exist
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
      updatePdr({
        currentStep: 5,
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

  // Skip read-only view in demo mode
  if (false) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Calendar className="h-7 w-7 mr-3 text-green-400" />
              Mid-Year Check-In
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review your progress and reflect on the first half of the year
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completed
          </Badge>
        </div>

        {/* Review Content */}
        <Card>
          <CardHeader>
            <CardTitle>Your Mid-Year Reflection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Submitted on {new Date(midYearReview.submittedAt).toLocaleDateString('en-AU')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-base">Progress Summary</h4>
              <p className="text-foreground whitespace-pre-wrap">{midYearReview.progressSummary}</p>
            </div>

            {midYearReview.blockersChallenges && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Blockers & Challenges</h4>
                <p className="text-foreground whitespace-pre-wrap">{midYearReview.blockersChallenges}</p>
              </div>
            )}

            {midYearReview.supportNeeded && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Support Needed</h4>
                <p className="text-foreground whitespace-pre-wrap">{midYearReview.supportNeeded}</p>
              </div>
            )}

            {midYearReview.employeeComments && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-base">Additional Comments</h4>
                <p className="text-foreground whitespace-pre-wrap">{midYearReview.employeeComments}</p>
              </div>
            )}

            {midYearReview.ceoFeedback && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="font-medium text-foreground mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                  Manager Feedback
                </h4>
                <p className="text-foreground whitespace-pre-wrap">{midYearReview.ceoFeedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={handlePrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
          <Button onClick={handleNext}>
            Continue to End-Year
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* PDR Recap Card */}
        <div className="xl:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Eye className="h-5 w-5 mr-2 text-primary" />
                PDR Recap
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Agreed goals and behaviors from planning stage
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Goals Section */}
              {goals && goals.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <Target className="h-4 w-4 mr-1 text-green-600" />
                    <h4 className="font-medium text-sm">Goals ({goals.length})</h4>
                  </div>
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

              {/* Behaviors Section */}
              <div>
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 mr-1 text-blue-600" />
                  <h4 className="font-medium text-sm">Behaviors ({Object.entries(ceoFeedback.behaviors).filter(([valueId, feedback]) => {
                    const companyValueName = (feedback as any).companyValueName;
                    return companyValueName && companyValueName !== 'Company Value';
                  }).length})</h4>
                </div>
                <div className="space-y-1">
                  {Object.entries(ceoFeedback.behaviors)
                    .filter(([valueId, feedback]) => {
                      // Filter out entries that don't have a proper company value name
                      const companyValueName = (feedback as any).companyValueName;
                      return companyValueName && companyValueName !== 'Company Value';
                    })
                    .map(([valueId, feedback]) => (
                    <div key={valueId} className="border border-border/50 rounded">
                      {/* Behavior Header - Clickable */}
                      <button
                        onClick={() => toggleBehavior(valueId)}
                        className="w-full p-2 text-left hover:bg-muted/50 rounded transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-foreground truncate">
                            {(feedback as any).companyValueName || 'Company Value'}
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
                                <div className="text-sm text-foreground font-medium">{(feedback as any).companyValueName}</div>
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
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Form */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mid-Year Reflection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Share your thoughts on progress, challenges, and support needs
              </p>
            </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress Summary */}
            <div className="space-y-2">
              <Label htmlFor="progressSummary">
                Progress Summary *
              </Label>
              <p className="text-xs text-muted-foreground">
                Summarize your key achievements and progress toward your goals
              </p>
              <Textarea
                id="progressSummary"
                {...register('progressSummary')}
                rows={4}
                placeholder="Describe the progress you've made on your goals and key accomplishments..."
              />
              {errors.progressSummary && (
                <p className="text-sm text-destructive">{errors.progressSummary.message}</p>
              )}
            </div>

            {/* Blockers & Challenges */}
            <div className="space-y-2">
              <Label htmlFor="blockersChallenges">
                Blockers & Challenges
              </Label>
              <p className="text-xs text-muted-foreground">
                What obstacles or challenges have you encountered?
              </p>
              <Textarea
                id="blockersChallenges"
                {...register('blockersChallenges')}
                rows={3}
                placeholder="Describe any blockers, challenges, or obstacles you've faced..."
              />
              {errors.blockersChallenges && (
                <p className="text-sm text-destructive">{errors.blockersChallenges.message}</p>
              )}
            </div>

            {/* Support Needed */}
            <div className="space-y-2">
              <Label htmlFor="supportNeeded">
                Support Needed
              </Label>
              <p className="text-xs text-muted-foreground">
                What support or resources would help you succeed?
              </p>
              <Textarea
                id="supportNeeded"
                {...register('supportNeeded')}
                rows={3}
                placeholder="What support, resources, or assistance would be most helpful..."
              />
              {errors.supportNeeded && (
                <p className="text-sm text-destructive">{errors.supportNeeded.message}</p>
              )}
            </div>

            {/* Additional Comments */}
            <div className="space-y-2">
              <Label htmlFor="employeeComments">
                Additional Comments
              </Label>
              <p className="text-xs text-muted-foreground">
                Any other thoughts or feedback you'd like to share
              </p>
              <Textarea
                id="employeeComments"
                {...register('employeeComments')}
                rows={3}
                placeholder="Share any additional thoughts, concerns, or feedback..."
              />
              {errors.employeeComments && (
                <p className="text-sm text-destructive">{errors.employeeComments.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              {(canEdit || canUpdate) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={!isDirty}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
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
      <div className="flex justify-between">
        <Button onClick={handlePrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review
        </Button>
      </div>
    </div>
  );
}
